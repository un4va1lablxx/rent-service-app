package edu.belsu.rent_service.adapters.in.bot;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import edu.belsu.rent_service.application.dto.ad.AdSummaryResponse;
import edu.belsu.rent_service.adapters.in.bot.dto.AdData;
import edu.belsu.rent_service.adapters.in.bot.dto.UserSession;
import edu.belsu.rent_service.adapters.in.bot.dto.UserState;
import edu.belsu.rent_service.application.dto.auth.AuthResponse;
import edu.belsu.rent_service.application.dto.ad.AdRequest;
import edu.belsu.rent_service.application.service.AdService;
import edu.belsu.rent_service.application.service.AuthService;
import edu.belsu.rent_service.application.service.FileUploadService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import jakarta.annotation.PostConstruct;

import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class TelegramBot {

    @Value("${telegram.bot.token}")
    private String botToken;

    @Value("${telegram.bot.proxy.host:127.0.0.1}")
    private String proxyHost;

    @Value("${telegram.bot.proxy.port:10808}")
    private int proxyPort;

    @Value("${rent.web-app-url:http://192.168.0.23:5173}")
    private String webAppUrl;

    @Value("${rent.mobile-deep-link-scheme:rentservice}")
    private String mobileDeepLinkScheme;

    private final AuthService authService;
    private final AdService adService;
    private final FileUploadService fileUploadService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private final ConcurrentHashMap<Long, UserSession> userSessions = new ConcurrentHashMap<>();
    private long lastUpdateId = 0;

    public TelegramBot(AuthService authService, AdService adService, FileUploadService fileUploadService) {
        this.authService = authService;
        this.adService = adService;
        this.fileUploadService = fileUploadService;
    }

    @PostConstruct
    public void start() {
        System.out.println("🤖 Запуск Telegram бота через прокси " + proxyHost + ":" + proxyPort);

        Thread pollingThread = new Thread(() -> {
            while (true) {
                try {
                    getUpdates();
                    Thread.sleep(1000);
                } catch (Exception e) {
                    System.err.println("Ошибка: " + e.getMessage());
                }
            }
        });
        pollingThread.setDaemon(true);
        pollingThread.start();
    }

    private void getUpdates() throws Exception {
        String url = "https://api.telegram.org/bot" + botToken + "/getUpdates?offset=" + (lastUpdateId + 1) + "&timeout=30";
        HttpURLConnection conn = createConnection(url);
        conn.setRequestMethod("GET");

        int responseCode = conn.getResponseCode();
        if (responseCode == 200) {
            BufferedReader reader = new BufferedReader(new InputStreamReader(conn.getInputStream()));
            StringBuilder response = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                response.append(line);
            }
            reader.close();

            JsonNode json = objectMapper.readTree(response.toString());
            if (json.has("result") && json.get("result").isArray()) {
                for (JsonNode update : json.get("result")) {
                    lastUpdateId = update.get("update_id").asLong();
                    handleUpdate(update);
                }
            }
        }
        conn.disconnect();
    }

    private void handleUpdate(JsonNode update) {
        if (update.has("message")) {
            JsonNode message = update.get("message");
            long chatId = message.get("chat").get("id").asLong();
            String text = message.has("text") ? message.get("text").asText() : "";

            UserSession session = userSessions.getOrDefault(chatId, new UserSession(chatId));
            userSessions.put(chatId, session);

            if (text.startsWith("/start")) {
                handleStartCommand(chatId, session, text);
                return;
            }

            if (text.equals("/start")) {
                session.setState(UserState.AWAITING_PHONE);
                sendMessage(chatId, "🔐 Добро пожаловать в Rent Service!\n\nВведите номер телефона для входа или регистрации:\nПример: +79991234567");
            } else if (text.equals("/cancel")) {
                session.setState(UserState.AUTHENTICATED);
                session.resetAdData();
                session.resetSearchFilters();
                sendMessage(chatId, "❌ Операция отменена");
            } else if (text.equals("/search")) {
                startSearch(chatId, session);
            } else if (text.equals("/new_ad")) {
                startCreateAd(chatId, session);
            } else {
                handleUserInput(chatId, session, text, message);
            }
        } else if (update.has("callback_query")) {
            handleCallbackQuery(update);
        }
    }

    private void handleStartCommand(long chatId, UserSession session, String text) {
        String[] parts = text.split("\\s+", 2);
        if (parts.length > 1 && (parts[1].startsWith("web_register_") || parts[1].startsWith("web_login_"))) {
            session.setWebAuthRequestId(parts[1].replaceFirst("^web_(register|login)_", ""));
            session.setState(UserState.AWAITING_WEB_CONTACT);
            sendContactRequest(chatId, "Поделитесь номером телефона для завершения операции.");
            return;
        }

        session.setState(UserState.AWAITING_PHONE);
        sendContactRequest(chatId, "Добро пожаловать в Rent Service. Поделитесь номером телефона для входа или регистрации.");
    }

    private void handleCallbackQuery(JsonNode update) {
        JsonNode callback = update.get("callback_query");
        long chatId = callback.get("message").get("chat").get("id").asLong();
        String data = callback.get("data").asText();
        UserSession session = userSessions.get(chatId);

        if (session == null) return;

        if (data.equals("menu:new_ad")) {
            startCreateAd(chatId, session);
            return;
        }
        if (data.equals("menu:search")) {
            startSearch(chatId, session);
            return;
        }
        if (data.equals("menu:cancel")) {
            session.setState(UserState.AUTHENTICATED);
            session.resetAdData();
            session.resetSearchFilters();
            sendMainMenu(chatId, "Операция отменена. Выберите действие:");
            return;
        }
        if (data.startsWith("ad:property:")) {
            session.getAdData().setPropertyType(data.substring("ad:property:".length()));
            session.nextStep();
            sendRentalTypePicker(chatId);
            return;
        }
        if (data.startsWith("ad:rental:")) {
            session.getAdData().setRentalType(data.substring("ad:rental:".length()));
            session.nextStep();
            sendMessage(chatId, "📍 Введите город:");
            return;
        }
        if (data.equals("photos:done")) {
            finishBotAdCreation(chatId, session);
            return;
        }

        List<AdSummaryResponse> results = session.getSearchResults();
        if (results == null || results.isEmpty()) return;

        int currentIndex = session.getCurrentSearchIndex();

        if (data.equals("next") && currentIndex < results.size() - 1) {
            session.setCurrentSearchIndex(currentIndex + 1);
            sendAdCard(chatId, session, results.get(currentIndex + 1), currentIndex + 1, results.size());
        } else if (data.equals("prev") && currentIndex > 0) {
            session.setCurrentSearchIndex(currentIndex - 1);
            sendAdCard(chatId, session, results.get(currentIndex - 1), currentIndex - 1, results.size());
        } else if (data.equals("close")) {
            session.setState(UserState.AUTHENTICATED);
            session.setSearchResults(null);
            sendMainMenu(chatId, "🔍 Поиск завершён. Выберите следующее действие:");
        }
    }

    private void startSearch(long chatId, UserSession session) {
        if (session.getState() != UserState.AUTHENTICATED) {
            sendMessage(chatId, "❌ Пожалуйста, сначала авторизуйтесь через /start");
            return;
        }

        session.setState(UserState.SEARCHING);
        session.resetSearchFilters();

        sendMessage(chatId, "🔍 Поиск объявлений\n\n" +
                "Введите параметры поиска одной строкой в формате:\n" +
                "город, тип аренды, цена от, цена до\n\n" +
                "Примеры:\n" +
                "• Москва, долгосрочная, 30000, 50000\n" +
                "• Санкт-Петербург, посуточно, 2000, 4000\n\n" +
                "Или отправьте /cancel для отмены");
    }

    private void handleSearch(long chatId, UserSession session, String text) {
        try {
            String[] parts = text.split(",");
            String city = parts.length > 0 ? parts[0].trim() : null;
            String rentalTypeRaw = parts.length > 1 ? parts[1].trim() : null;
            Integer minPrice = parts.length > 2 ? Integer.parseInt(parts[2].trim()) : null;
            Integer maxPrice = parts.length > 3 ? Integer.parseInt(parts[3].trim()) : null;

            String rentalType = null;
            if (rentalTypeRaw != null) {
                if (rentalTypeRaw.equalsIgnoreCase("посуточно") || rentalTypeRaw.equalsIgnoreCase("short")) {
                    rentalType = "short_term";
                } else if (rentalTypeRaw.equalsIgnoreCase("долгосрочная") || rentalTypeRaw.equalsIgnoreCase("long")) {
                    rentalType = "long_term";
                }
            }

            List<AdSummaryResponse> ads = searchAds(city, rentalType, minPrice, maxPrice);

            if (ads.isEmpty()) {
                sendMessage(chatId, "😔 По вашему запросу ничего не найдено.\n\n" +
                        "Попробуйте изменить параметры поиска или введите /search для нового запроса.");
                session.setState(UserState.AUTHENTICATED);
                return;
            }

            session.setSearchResults(ads);
            session.setCurrentSearchIndex(0);
            session.setCurrentSearchIndex(0);
            sendAdCard(chatId, session, ads.get(0), 0, ads.size());

        } catch (Exception e) {
            sendMessage(chatId, "❌ Ошибка при поиске. Проверьте формат ввода.\n\n" +
                    "Пример: `Москва, долгосрочная, 30000, 50000`");
        }
    }

    private List<AdSummaryResponse> searchAds(String city, String rentalType, Integer minPrice, Integer maxPrice) {
        try {
            List<String> params = new ArrayList<>();
            params.add("page=0");
            params.add("size=20");
            if (city != null && !city.isEmpty()) {
                params.add("city=" + URLEncoder.encode(city, "UTF-8"));
            }
            if (rentalType != null) {
                params.add("rentalType=" + rentalType);
            }
            if (minPrice != null) {
                params.add("minPrice=" + minPrice);
            }
            if (maxPrice != null) {
                params.add("maxPrice=" + maxPrice);
            }

            String url = "http://192.168.0.23:8080/api/ads?" + String.join("&", params);
            System.out.println("🔍 ПОЛНЫЙ URL ЗАПРОСА: " + url);

            HttpURLConnection conn = createConnection(url);
            conn.setRequestMethod("GET");
            conn.setRequestProperty("Accept", "application/json");
            conn.setConnectTimeout(10000);
            conn.setReadTimeout(10000);

            int responseCode = conn.getResponseCode();
            System.out.println("📡 Код ответа: " + responseCode);

            if (responseCode != 200) {
                return Collections.emptyList();
            }

            BufferedReader reader = new BufferedReader(new InputStreamReader(conn.getInputStream()));
            StringBuilder response = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                response.append(line);
            }
            reader.close();
            conn.disconnect();

            JsonNode json = objectMapper.readTree(response.toString());
            List<AdSummaryResponse> ads = new ArrayList<>();

            if (json.has("content")) {
                for (JsonNode item : json.get("content")) {

                    AdSummaryResponse ad = AdSummaryResponse.builder()
                            .id(item.get("id").asLong())
                            .ownerId(item.has("ownerId") && !item.get("ownerId").isNull() ? item.get("ownerId").asLong() : null)
                            .title(item.has("title") ? item.get("title").asText() : "")
                            .userFullName(item.has("userFullName") ? item.get("userFullName").asText() : null)
                            .ownerAvatarUrl(item.has("ownerAvatarUrl") ? item.get("ownerAvatarUrl").asText() : null)
                            .description(item.has("description") ? item.get("description").asText() : null)
                            .city(item.has("city") ? item.get("city").asText() : "")
                            .district(item.has("district") && !item.get("district").isNull() ? item.get("district").asText() : null)
                            .region(item.has("region") && !item.get("region").isNull() ? item.get("region").asText() : null)
                            .propertyType(item.has("propertyType") ? item.get("propertyType").asText() : "apartment")
                            .rentalType(item.has("rentalType") ? item.get("rentalType").asText() : "long_term")
                            .rooms(item.has("rooms") ? item.get("rooms").asInt() : null)
                            .pricePerMonth(item.has("pricePerMonth") ? item.get("pricePerMonth").asInt() : null)
                            .pricePerDay(item.has("pricePerDay") ? item.get("pricePerDay").asInt() : null)
                            .maxGuests(item.has("maxGuests") ? item.get("maxGuests").asInt() : null)
                            .primaryPhotoUrl(item.has("primaryPhotoUrl") ? item.get("primaryPhotoUrl").asText() : null)
                            .photoUrls(item.has("photoUrls")
                                    ? objectMapper.convertValue(
                                    item.get("photoUrls"),
                                    new com.fasterxml.jackson.core.type.TypeReference<List<String>>() {})
                                    : null)
                            .build();

                    ads.add(ad);
                }
            }

            /* ======= 🔥 ХАРДКОД ФИЛЬТР ======= */
            ads = ads.stream()
                    .filter(ad -> city == null || city.isBlank()
                            || ad.city().equalsIgnoreCase(city.trim()))

                    .filter(ad -> rentalType == null
                            || ad.rentalType().equalsIgnoreCase(rentalType))

                    .filter(ad -> {
                        if (minPrice == null && maxPrice == null) return true;

                        Integer price = "short_term".equals(ad.rentalType())
                                ? ad.pricePerDay()
                                : ad.pricePerMonth();

                        if (price == null) return false;

                        if (minPrice != null && price < minPrice) return false;
                        if (maxPrice != null && price > maxPrice) return false;

                        return true;
                    })
                    .toList();
            /* ======= /ФИЛЬТР ======= */

            return ads;
        } catch (Exception e) {
            System.err.println("❌ Ошибка: " + e.getMessage());
            return Collections.emptyList();
        }
    }
    private void sendAdCard(long chatId, UserSession session,
                            AdSummaryResponse ad,
                            int index,
                            int total) {

        Integer price = "short_term".equals(ad.rentalType())
                ? ad.pricePerDay()
                : ad.pricePerMonth();

        String priceStr = price != null ? price + " ₽" : "—";
        String priceType = "short_term".equals(ad.rentalType())
                ? "сутки"
                : "месяц";

        String location = ad.city()
                + (ad.district() != null && !ad.district().isBlank() ? ", " + ad.district() : "")
                + (ad.region() != null && !ad.region().isBlank() ? ", " + ad.region() : "");

        String description = ad.description() != null
                ? ad.description()
                : "Описание отсутствует";

        if (description.length() > 500) {
            description = description.substring(0, 497) + "...";
        }

        String text = String.format(
                "%s\n\n" +
                        "%s\n\n" +
                        "📍 Локация: %s\n" +
                        "💰 Цена: %s / %s\n" +
                        "🛏️ Комнат: %d\n" +
                        "👥 Гостей: %d\n\n" +
                        "📊 %d из %d",
                ad.title(),
                description,
                location,
                priceStr,
                priceType,
                ad.rooms() != null ? ad.rooms() : 0,
                ad.maxGuests() != null ? ad.maxGuests() : 0,
                index + 1,
                total
        );

        List<String> photos = new ArrayList<>();

        if (ad.photoUrls() != null && !ad.photoUrls().isEmpty()) {
            photos.addAll(ad.photoUrls());
        } else if (ad.primaryPhotoUrl() != null) {
            photos.add(ad.primaryPhotoUrl());
        }

        List<String> rows = new ArrayList<>();
        List<String> navigation = new ArrayList<>();
        if (index > 0) {
            navigation.add("{\"text\":\"◀️ Назад\",\"callback_data\":\"prev\"}");
        }
        if (index < total - 1) {
            navigation.add("{\"text\":\"Вперёд ▶️\",\"callback_data\":\"next\"}");
        }
        if (!navigation.isEmpty()) {
            rows.add("[" + String.join(",", navigation) + "]");
        }
        rows.add("[{\"text\":\"💬 Связаться\",\"url\":\"" + escapeJson(buildChatUrl(ad)) + "\"}]");
        rows.add("[{\"text\":\"❌ Закрыть\",\"callback_data\":\"close\"}]");

        String keyboard = "{\"inline_keyboard\":[" + String.join(",", rows) + "]}";

        sendPhotoAlbum(chatId, photos);
        sendMessageWithKeyboard(chatId, text, keyboard);
    }

    private String buildChatUrl(AdSummaryResponse ad) {
        String base = webAppUrl.endsWith("/") ? webAppUrl.substring(0, webAppUrl.length() - 1) : webAppUrl;
        String appLink = mobileDeepLinkScheme + "://chat?adId=" + ad.id()
                + (ad.ownerId() != null ? "&sellerId=" + ad.ownerId() : "");
        return base + "/?openMobile=1&chatAdId=" + ad.id()
                + (ad.ownerId() != null ? "&sellerId=" + ad.ownerId() : "")
                + "&appLink=" + URLEncoder.encode(appLink, StandardCharsets.UTF_8);
    }

    private String getFullPhotoUrl(String photoPath) {
        if (photoPath == null) return null;
        // Если уже полный URL, возвращаем как есть
        if (photoPath.startsWith("http")) return photoPath;
        // Если относительный путь, добавляем базовый URL
        if (photoPath.startsWith("/uploads/")) {
            return "http://192.168.0.23:8080" + photoPath;
        }
        // Если просто имя файла
        return "http://192.168.0.23:8080/uploads/" + photoPath;
    }

    private void sendPhotoAlbum(long chatId, List<String> photoUrls) {
        try {
            List<String> safePhotoUrls = photoUrls == null ? Collections.emptyList() : photoUrls.stream()
                    .filter(url -> url != null && !url.isBlank())
                    .limit(10)
                    .toList();

            if (safePhotoUrls.isEmpty()) return;
            if (safePhotoUrls.size() == 1) {
                sendPhoto(chatId, safePhotoUrls.get(0));
                return;
            }

            List<Map<String, Object>> media = new ArrayList<>();
            Map<String, Path> localFiles = new LinkedHashMap<>();
            for (int i = 0; i < safePhotoUrls.size(); i++) {
                String photoUrl = safePhotoUrls.get(i);
                String fullUrl = getFullPhotoUrl(photoUrl);
                if (fullUrl == null) continue;

                Map<String, Object> photoItem = new HashMap<>();
                photoItem.put("type", "photo");
                Path localPath = resolveLocalPhotoPath(photoUrl);
                if (localPath != null && Files.exists(localPath)) {
                    String attachmentName = "photo" + i;
                    photoItem.put("media", "attach://" + attachmentName);
                    localFiles.put(attachmentName, localPath);
                } else {
                    photoItem.put("media", fullUrl);
                }
                media.add(photoItem);
            }

            if (media.isEmpty()) return;

            String url = "https://api.telegram.org/bot" + botToken + "/sendMediaGroup";
            String boundary = "RentServiceBoundary" + System.currentTimeMillis();

            HttpURLConnection conn = createConnection(url);
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Content-Type", "multipart/form-data; boundary=" + boundary);
            conn.setDoOutput(true);

            try (OutputStream os = conn.getOutputStream()) {
                writeFormField(os, boundary, "chat_id", String.valueOf(chatId));
                writeFormField(os, boundary, "media", objectMapper.writeValueAsString(media));
                for (Map.Entry<String, Path> entry : localFiles.entrySet()) {
                    writeFileField(os, boundary, entry.getKey(), entry.getValue());
                }
                os.write(("--" + boundary + "--\r\n").getBytes(StandardCharsets.UTF_8));
                os.flush();
            }

            int responseCode = conn.getResponseCode();
            if (responseCode != 200) {
                System.err.println("Ошибка отправки альбома: " + responseCode + " " + readErrorBody(conn));
            }
            conn.disconnect();
        } catch (Exception e) {
            System.err.println("Ошибка отправки альбома: " + e.getMessage());
        }
    }
    private void sendMessageWithKeyboard(long chatId, String text, String keyboardJson) {
        try {
            String url = "https://api.telegram.org/bot" + botToken + "/sendMessage";
            String body = "{\"chat_id\":" + chatId + ",\"text\":\"" + escapeJson(text) + "\",\"reply_markup\":" + keyboardJson + "}";

            HttpURLConnection conn = createConnection(url);
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setDoOutput(true);

            try (OutputStream os = conn.getOutputStream()) {
                os.write(body.getBytes(StandardCharsets.UTF_8));
                os.flush();
            }

            conn.getResponseCode();
            conn.disconnect();
        } catch (Exception e) {
            System.err.println("Ошибка отправки: " + e.getMessage());
        }
    }

    private void sendPhoto(long chatId, String photoUrl) {
        try {
            String fullUrl = getFullPhotoUrl(photoUrl);
            if (fullUrl == null) return;

            String urlToSend = "https://api.telegram.org/bot" + botToken + "/sendPhoto";
            Path localPath = resolveLocalPhotoPath(photoUrl);

            HttpURLConnection conn = createConnection(urlToSend);
            conn.setRequestMethod("POST");
            conn.setDoOutput(true);

            if (localPath != null && Files.exists(localPath)) {
                String boundary = "RentServiceBoundary" + System.currentTimeMillis();
                conn.setRequestProperty("Content-Type", "multipart/form-data; boundary=" + boundary);
                try (OutputStream os = conn.getOutputStream()) {
                    writeFormField(os, boundary, "chat_id", String.valueOf(chatId));
                    writeFileField(os, boundary, "photo", localPath);
                    os.write(("--" + boundary + "--\r\n").getBytes(StandardCharsets.UTF_8));
                    os.flush();
                }
            } else {
                conn.setRequestProperty("Content-Type", "application/json");
                String body = "{\"chat_id\":" + chatId + ",\"photo\":\"" + fullUrl + "\"}";
                try (OutputStream os = conn.getOutputStream()) {
                    os.write(body.getBytes(StandardCharsets.UTF_8));
                    os.flush();
                }
            }

            int responseCode = conn.getResponseCode();
            if (responseCode != 200) {
                System.err.println("Ошибка отправки фото: " + responseCode + " " + readErrorBody(conn));
            }
            conn.disconnect();
        } catch (Exception e) {
            System.err.println("Ошибка отправки фото: " + e.getMessage());
        }
    }

    private Path resolveLocalPhotoPath(String photoUrl) {
        if (photoUrl == null || photoUrl.isBlank()) {
            return null;
        }

        String normalized = photoUrl.trim();
        int markerIndex = normalized.indexOf("/uploads/");
        String fileName;
        if (markerIndex >= 0) {
            fileName = normalized.substring(markerIndex + "/uploads/".length());
        } else if (!normalized.startsWith("http")) {
            fileName = normalized.replace("\\", "/");
            int slashIndex = fileName.lastIndexOf('/');
            fileName = slashIndex >= 0 ? fileName.substring(slashIndex + 1) : fileName;
        } else {
            return null;
        }

        try {
            fileName = URLDecoder.decode(fileName, StandardCharsets.UTF_8);
        } catch (IllegalArgumentException ignored) {
            return null;
        }

        Path uploadDir = Paths.get(System.getProperty("user.dir"), "./uploads").normalize();
        Path filePath = uploadDir.resolve(fileName).normalize();
        return filePath.startsWith(uploadDir) ? filePath : null;
    }

    private void writeFormField(OutputStream os, String boundary, String name, String value) throws IOException {
        os.write(("--" + boundary + "\r\n").getBytes(StandardCharsets.UTF_8));
        os.write(("Content-Disposition: form-data; name=\"" + name + "\"\r\n\r\n").getBytes(StandardCharsets.UTF_8));
        os.write(value.getBytes(StandardCharsets.UTF_8));
        os.write("\r\n".getBytes(StandardCharsets.UTF_8));
    }

    private void writeFileField(OutputStream os, String boundary, String name, Path filePath) throws IOException {
        String fileName = filePath.getFileName().toString();
        os.write(("--" + boundary + "\r\n").getBytes(StandardCharsets.UTF_8));
        os.write(("Content-Disposition: form-data; name=\"" + name + "\"; filename=\"" + fileName + "\"\r\n").getBytes(StandardCharsets.UTF_8));
        os.write("Content-Type: application/octet-stream\r\n\r\n".getBytes(StandardCharsets.UTF_8));
        Files.copy(filePath, os);
        os.write("\r\n".getBytes(StandardCharsets.UTF_8));
    }

    private String readErrorBody(HttpURLConnection conn) {
        try (InputStream errorStream = conn.getErrorStream()) {
            if (errorStream == null) {
                return "";
            }
            return new String(errorStream.readAllBytes(), StandardCharsets.UTF_8);
        } catch (IOException ignored) {
            return "";
        }
    }

    private void sendMessage(long chatId, String text) {
        try {
            String url = "https://api.telegram.org/bot" + botToken + "/sendMessage";
            String body = "{\"chat_id\":" + chatId + ",\"text\":\"" + escapeJson(text) + "\"}";

            HttpURLConnection conn = createConnection(url);
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setDoOutput(true);

            try (OutputStream os = conn.getOutputStream()) {
                os.write(body.getBytes(StandardCharsets.UTF_8));
                os.flush();
            }

            conn.getResponseCode();
            conn.disconnect();
        } catch (Exception e) {
            System.err.println("Ошибка отправки: " + e.getMessage());
        }
    }

    private void sendMainMenu(long chatId, String text) {
        String keyboard = "{\"inline_keyboard\":["
                + "[{\"text\":\"🏠 Добавить объявление\",\"callback_data\":\"menu:new_ad\"}],"
                + "[{\"text\":\"🔍 Найти жильё\",\"callback_data\":\"menu:search\"}],"
                + "[{\"text\":\"❌ Отмена\",\"callback_data\":\"menu:cancel\"}]"
                + "]}";
        sendMessageWithKeyboard(chatId, text, keyboard);
    }

    private void sendPropertyTypePicker(long chatId) {
        String keyboard = "{\"inline_keyboard\":["
                + "[{\"text\":\"Квартира\",\"callback_data\":\"ad:property:apartment\"}],"
                + "[{\"text\":\"Дом\",\"callback_data\":\"ad:property:house\"}],"
                + "[{\"text\":\"Отмена\",\"callback_data\":\"menu:cancel\"}]"
                + "]}";
        sendMessageWithKeyboard(chatId, "🏘️ Выберите тип жилья:", keyboard);
    }

    private void sendRentalTypePicker(long chatId) {
        String keyboard = "{\"inline_keyboard\":["
                + "[{\"text\":\"Долгосрочно\",\"callback_data\":\"ad:rental:long_term\"}],"
                + "[{\"text\":\"Посуточно\",\"callback_data\":\"ad:rental:short_term\"}],"
                + "[{\"text\":\"Отмена\",\"callback_data\":\"menu:cancel\"}]"
                + "]}";
        sendMessageWithKeyboard(chatId, "🏠 Выберите тип аренды:", keyboard);
    }

    private void sendPhotoStepPrompt(long chatId) {
        String keyboard = "{\"inline_keyboard\":["
                + "[{\"text\":\"Готово, создать объявление\",\"callback_data\":\"photos:done\"}],"
                + "[{\"text\":\"Отмена\",\"callback_data\":\"menu:cancel\"}]"
                + "]}";
        sendMessageWithKeyboard(chatId, "📸 Отправьте фотографии. Когда закончите, нажмите кнопку готовности или напишите /done.", keyboard);
    }

    private void sendContactRequest(long chatId, String text) {
        String keyboard = "{\"keyboard\":[[{\"text\":\"Поделиться номером\",\"request_contact\":true}]],\"resize_keyboard\":true,\"one_time_keyboard\":true}";
        sendMessageWithKeyboard(chatId, text, keyboard);
    }

    private String extractContactPhone(JsonNode message) {
        if (message.has("contact") && message.get("contact").has("phone_number")) {
            if (message.get("contact").has("user_id") && telegramUserId(message) != null
                    && message.get("contact").get("user_id").asLong() != telegramUserId(message)) {
                return null;
            }
            String phone = message.get("contact").get("phone_number").asText();
            return phone.startsWith("+") ? phone : "+" + phone;
        }
        return null;
    }

    private Long telegramUserId(JsonNode message) {
        return message.has("from") && message.get("from").has("id") ? message.get("from").get("id").asLong() : null;
    }

    private String telegramUsername(JsonNode message) {
        if (!message.has("from") || !message.get("from").has("username")) {
            return null;
        }
        return message.get("from").get("username").asText();
    }

    private boolean handleAuthInput(long chatId, UserSession session, String text, JsonNode message) {
        if (session.getState() == UserState.AWAITING_PHONE) {
            String sharedPhone = extractContactPhone(message);
            if (sharedPhone == null) {
                sendContactRequest(chatId, "Нажмите кнопку «Поделиться номером», чтобы продолжить.");
                return true;
            }
            session.setPhoneNumber(sharedPhone);
            try {
                boolean existingUser = authService.userExists(sharedPhone);
                session.setExistingUser(existingUser);
                session.setState(UserState.AWAITING_PASSWORD);
                sendMessage(chatId, existingUser ? "Введите пароль для входа:" : "Придумайте пароль для регистрации:");
            } catch (Exception e) {
                sendMessage(chatId, "Ошибка: " + e.getMessage());
                session.setState(UserState.AWAITING_PHONE);
            }
            return true;
        }

        if (session.getState() == UserState.AWAITING_WEB_CONTACT) {
            String webPhone = extractContactPhone(message);
            if (webPhone == null) {
                sendContactRequest(chatId, "Нажмите кнопку «Поделиться номером», чтобы подтвердить Ваш номер.");
                return true;
            }
            try {
                authService.completeTelegramWebAuth(
                        session.getWebAuthRequestId(),
                        webPhone,
                        telegramUserId(message),
                        telegramUsername(message)
                );
                session.setState(UserState.AUTHENTICATED);
                sendMessage(chatId, "Номер подтвержден. Вернитесь в веб-приложение, вход завершится автоматически.");
            } catch (Exception e) {
                sendMessage(chatId, e.getMessage());
            }
            return true;
        }

        if (session.getState() == UserState.AWAITING_PASSWORD) {
            try {
                if (session.isExistingUser()) {
                    AuthResponse response = authService.loginFromTelegram(
                            session.getPhoneNumber(),
                            text,
                            telegramUserId(message),
                            telegramUsername(message),
                            false
                    );
                    session.setUserId(response.userId());
                    session.setToken(response.token());
                    session.setRole(response.role());
                    session.setState(UserState.AUTHENTICATED);
                    sendMainMenu(chatId, "Вы успешно вошли. Выберите действие:");
                } else {
                    session.setPendingPassword(text);
                    session.setState(UserState.AWAITING_FULL_NAME);
                    sendMessage(chatId, "Введите ФИО:");
                }
            } catch (Exception e) {
                sendMessage(chatId, "Ошибка: " + e.getMessage());
            }
            return true;
        }

        if (session.getState() == UserState.AWAITING_FULL_NAME) {
            try {
                AuthResponse response = authService.registerFromTelegram(
                        session.getPhoneNumber(),
                        text,
                        session.getPendingPassword(),
                        telegramUserId(message),
                        telegramUsername(message)
                );
                session.setUserId(response.userId());
                session.setToken(response.token());
                session.setRole(response.role());
                session.setState(UserState.AUTHENTICATED);
                sendMainMenu(chatId, "Регистрация завершена. Выберите действие:");
            } catch (Exception e) {
                sendMessage(chatId, "Ошибка: " + e.getMessage());
            }
            return true;
        }

        return false;
    }

    private void handleUserInput(long chatId, UserSession session, String text, JsonNode message) {
        if (handleAuthInput(chatId, session, text, message)) {
            return;
        }

        switch (session.getState()) {

            case AUTHENTICATED:
                if (text.equals("/new_ad")) {
                    startCreateAd(chatId, session);
                } else {
                    sendMainMenu(chatId, "Выберите действие:");
                }
                break;

            case CREATING_AD:
                handleAdCreation(chatId, session, text);
                break;

            case AWAITING_PHOTOS:
                handlePhotoUpload(chatId, session, message);
                break;

            case SEARCHING:
                handleSearch(chatId, session, text);
                break;

            default:
                sendMessage(chatId, "Используйте /start для начала работы");
        }
    }

    private void startCreateAd(long chatId, UserSession session) {
        if (session.getState() != UserState.AUTHENTICATED) {
            sendMessage(chatId, "❌ Пожалуйста, сначала авторизуйтесь через /start");
            return;
        }
        if (!session.canPublishAds()) {
            sendMainMenu(chatId, "❌ Публикация доступна только арендодателям и администраторам. Получите статус арендодателя в профиле веб-приложения.");
            return;
        }
        session.setState(UserState.CREATING_AD);
        session.resetAdData();
        sendMessage(chatId, "📝 Введите название объявления:");
    }

    private void handleAdCreation(long chatId, UserSession session, String text) {
        AdData adData = session.getAdData();

        switch (session.getAdStep()) {
            case 0:
                adData.setTitle(text);
                session.nextStep();
                sendPropertyTypePicker(chatId);
                break;

            case 1:
                sendPropertyTypePicker(chatId);
                break;

            case 2:
                sendRentalTypePicker(chatId);
                break;

            case 3:
                adData.setCity(text);
                session.nextStep();
                sendMessage(chatId, "📍 Введите район:");
                break;

            case 4:
                adData.setDistrict(text);
                session.nextStep();
                sendMessage(chatId, "📍 Введите регион:");
                break;

            case 5:
                adData.setRegion(text);
                session.nextStep();
                sendMessage(chatId, "🏘️ Введите адрес:");
                break;

            case 6:
                adData.setAddress(text);
                session.nextStep();
                sendMessage(chatId, "💰 Введите цену " + (adData.getRentalType().equals("long_term") ? "в месяц (₽)" : "за сутки (₽)"));
                break;

            case 7:
                try {
                    int price = Integer.parseInt(text);
                    if (adData.getRentalType().equals("long_term")) {
                        adData.setPricePerMonth(price);
                    } else {
                        adData.setPricePerDay(price);
                    }
                    session.nextStep();
                    sendMessage(chatId, "🛏️ Введите количество комнат:");
                } catch (NumberFormatException e) {
                    sendMessage(chatId, "❌ Введите число");
                }
                break;

            case 8:
                try {
                    adData.setRooms(Integer.parseInt(text));
                    session.nextStep();
                    if (adData.getRentalType().equals("short_term")) {
                        sendMessage(chatId, "👥 Введите максимальное количество гостей:");
                    } else {
                        sendMessage(chatId, "📏 Введите площадь (м²):");
                    }
                } catch (NumberFormatException e) {
                    sendMessage(chatId, "❌ Введите число");
                }
                break;

            case 9:
                if (adData.getRentalType().equals("short_term")) {
                    try {
                        adData.setMaxGuests(Integer.parseInt(text));
                        session.nextStep();
                        sendMessage(chatId, "📏 Введите площадь (м²):");
                    } catch (NumberFormatException e) {
                        sendMessage(chatId, "❌ Введите число");
                    }
                    break;
                }
                handleAreaInput(chatId, session, adData, text);
                break;

            case 10:
                if (adData.getRentalType().equals("short_term")) {
                    handleAreaInput(chatId, session, adData, text);
                    break;
                }
                try {
                    adData.setFloor(Integer.parseInt(text));
                    session.nextStep();
                    sendMessage(chatId, "🏢 Введите общее количество этажей:");
                } catch (NumberFormatException e) {
                    sendMessage(chatId, "❌ Введите число");
                }
                break;

            case 11:
                try {
                    if (adData.getRentalType().equals("short_term")) {
                        adData.setFloor(Integer.parseInt(text));
                        session.nextStep();
                        sendMessage(chatId, "🏢 Введите общее количество этажей:");
                    } else {
                        adData.setTotalFloors(Integer.parseInt(text));
                        session.nextStep();
                        sendMessage(chatId, "📝 Введите описание объявления:");
                    }
                } catch (NumberFormatException e) {
                    sendMessage(chatId, "❌ Введите число");
                }
                break;

            case 12:
                if (adData.getRentalType().equals("short_term")) {
                    try {
                        adData.setTotalFloors(Integer.parseInt(text));
                        session.nextStep();
                        sendMessage(chatId, "📝 Введите описание объявления:");
                    } catch (NumberFormatException e) {
                        sendMessage(chatId, "❌ Введите число");
                    }
                    break;
                }
                adData.setDescription(text);
                session.nextStep();
                sendPhotoStepPrompt(chatId);
                session.setState(UserState.AWAITING_PHOTOS);
                break;

            case 13:
                adData.setDescription(text);
                session.nextStep();
                sendPhotoStepPrompt(chatId);
                session.setState(UserState.AWAITING_PHOTOS);
                break;
        }
    }

    private void handleAreaInput(long chatId, UserSession session, AdData adData, String text) {
        try {
            double area = Double.parseDouble(text.replace(',', '.'));
            adData.setArea(area);
            session.nextStep();
            sendMessage(chatId, "🏢 Введите этаж:");
        } catch (NumberFormatException e) {
            sendMessage(chatId, "❌ Введите число");
        }
    }

    private void handlePhotoUpload(long chatId, UserSession session, JsonNode message) {
        if (message.has("photo")) {
            try {
                JsonNode photoArray = message.get("photo");
                String fileId = photoArray.get(photoArray.size() - 1).get("file_id").asText();
                String photoUrl = saveTelegramPhoto(fileId, session.getUserId());
                session.getAdData().addPhotoUrl(photoUrl);
                sendPhotoStepPrompt(chatId);
            } catch (Exception e) {
                sendMessage(chatId, "❌ Ошибка при загрузке фото: " + e.getMessage());
            }
        } else if (message.has("text") && message.get("text").asText().equals("/done")) {
            finishBotAdCreation(chatId, session);
        } else {
            sendPhotoStepPrompt(chatId);
        }
    }

    private void finishBotAdCreation(long chatId, UserSession session) {
        try {
            if (!session.canPublishAds()) {
                sendMainMenu(chatId, "❌ Публикация доступна только арендодателям и администраторам.");
                return;
            }
            AdRequest adRequest = session.getAdData().buildRequest();
            adService.createFromBot(adRequest, session.getUserId());
            session.setState(UserState.AUTHENTICATED);
            session.resetAdData();
            sendMainMenu(chatId, "✅ Объявление создано и отправлено на модерацию!");
        } catch (Exception e) {
            sendMessage(chatId, "❌ Ошибка: " + e.getMessage());
        }
    }

    private String saveTelegramPhoto(String fileId, Long userId) throws Exception {
        String getFileUrl = "https://api.telegram.org/bot" + botToken + "/getFile?file_id=" + fileId;
        HttpURLConnection conn = createConnection(getFileUrl);
        conn.setRequestMethod("GET");

        JsonNode response = objectMapper.readTree(conn.getInputStream());
        conn.disconnect();

        String filePath = response.get("result").get("file_path").asText();
        String fileUrl = "https://api.telegram.org/file/bot" + botToken + "/" + filePath;

        HttpURLConnection fileConn = createConnection(fileUrl);
        fileConn.setRequestMethod("GET");

        try (InputStream inputStream = fileConn.getInputStream()) {
            String filename = "telegram_" + userId + "_" + System.currentTimeMillis() + ".jpg";
            return fileUploadService.savePhotoFromStream(inputStream, filename);
        }
    }

    private HttpURLConnection createConnection(String urlString) throws Exception {
        URL url = new URL(urlString);
        HttpURLConnection conn;

        if (isLocalOrPrivateHost(url.getHost())) {
            conn = (HttpURLConnection) url.openConnection();
        } else {
            Proxy proxy = new Proxy(Proxy.Type.HTTP, new InetSocketAddress(proxyHost, proxyPort));
            conn = (HttpURLConnection) url.openConnection(proxy);
        }

        conn.setConnectTimeout(30000);
        conn.setReadTimeout(30000);
        return conn;
    }

    private boolean isLocalOrPrivateHost(String host) {
        if (host == null || host.isBlank()) {
            return false;
        }

        String normalized = host.trim().toLowerCase(Locale.ROOT);
        if (normalized.equals("localhost") || normalized.equals("127.0.0.1") || normalized.equals("::1")) {
            return true;
        }

        if (normalized.startsWith("10.") || normalized.startsWith("192.168.")) {
            return true;
        }

        if (normalized.startsWith("172.")) {
            String[] parts = normalized.split("\\.");
            if (parts.length > 1) {
                try {
                    int secondOctet = Integer.parseInt(parts[1]);
                    return secondOctet >= 16 && secondOctet <= 31;
                } catch (NumberFormatException ignored) {
                    return false;
                }
            }
        }

        return false;
    }

    private String escapeJson(String s) {
        return s.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t");
    }
}
