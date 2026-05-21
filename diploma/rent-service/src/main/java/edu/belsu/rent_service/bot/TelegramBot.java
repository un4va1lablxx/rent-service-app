package edu.belsu.rent_service.bot;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import edu.belsu.rent_service.dto.ad.AdSummaryResponse;
import edu.belsu.rent_service.dto.bot.AdData;
import edu.belsu.rent_service.dto.bot.UserSession;
import edu.belsu.rent_service.dto.bot.UserState;
import edu.belsu.rent_service.dto.auth.AuthResponse;
import edu.belsu.rent_service.dto.ad.AdRequest;
import edu.belsu.rent_service.service.AdService;
import edu.belsu.rent_service.service.AuthService;
import edu.belsu.rent_service.service.FileUploadService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import jakarta.annotation.PostConstruct;

import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
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
            } else {
                handleUserInput(chatId, session, text, message);
            }
        } else if (update.has("callback_query")) {
            handleCallbackQuery(update);
        }
    }

    private void handleCallbackQuery(JsonNode update) {
        JsonNode callback = update.get("callback_query");
        long chatId = callback.get("message").get("chat").get("id").asLong();
        String data = callback.get("data").asText();
        UserSession session = userSessions.get(chatId);

        if (session == null || session.getSearchResults() == null) return;

        List<AdSummaryResponse> results = session.getSearchResults();
        int currentIndex = session.getCurrentSearchIndex();

        if (data.equals("next") && currentIndex < results.size() - 1) {
            session.setCurrentSearchIndex(currentIndex + 1);
            sendAdCard(chatId, session, results.get(currentIndex + 1), currentIndex + 1, results.size());
        } else if (data.equals("prev") && currentIndex > 0) {
            session.setCurrentSearchIndex(currentIndex - 1);
            sendAdCard(chatId, session, results.get(currentIndex - 1), currentIndex - 1, results.size());
        } else if (data.equals("close")) {
            sendMessage(chatId, "🔍 Поиск завершён. Используйте /search для нового запроса.");
            session.setState(UserState.AUTHENTICATED);
            session.setSearchResults(null);
        } else if (data.equals("contact")) {
            sendMessage(chatId, "📞 Свяжитесь с продавцом по телефону, указанному в объявлении, или напишите через веб-версию");
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

            String url = "http://localhost:8080/api/ads?" + String.join("&", params);
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
                            .title(item.has("title") ? item.get("title").asText() : "")
                            .description(item.has("description") ? item.get("description").asText() : null)
                            .city(item.has("city") ? item.get("city").asText() : "")
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

        String description = ad.description() != null
                ? ad.description()
                : "Описание отсутствует";

        if (description.length() > 500) {
            description = description.substring(0, 497) + "...";
        }

        String text = String.format(
                "%s\n\n" +
                        "📍 Город: %s\n" +
                        "💰 Цена: %s / %s\n" +
                        "🛏️ Комнат: %d\n" +
                        "👥 Гостей: %d\n\n" +
                        "📊 %d из %d",
                ad.title(),
                ad.city(),
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

        String keyboard = String.format(
                "{\"inline_keyboard\":[[%s%s%s%s]]}",
                index > 0
                        ? "{\"text\":\"◀️ Назад\",\"callback_data\":\"prev\"},"
                        : "",
                index < total - 1
                        ? "{\"text\":\"Вперёд ▶️\",\"callback_data\":\"next\"},"
                        : "",
                "{\"text\":\"💬 Написать сообщение\",\"callback_data\":\"contact\"},",
                "{\"text\":\"❌ Закрыть\",\"callback_data\":\"close\"}"
        );

        sendPhotoAlbum(chatId, photos);
        sendMessageWithKeyboard(chatId, text, keyboard);
    }

    private String getFullPhotoUrl(String photoPath) {
        if (photoPath == null) return null;
        // Если уже полный URL, возвращаем как есть
        if (photoPath.startsWith("http")) return photoPath;
        // Если относительный путь, добавляем базовый URL
        if (photoPath.startsWith("/uploads/")) {
            return "http://localhost:8080" + photoPath;
        }
        // Если просто имя файла
        return "http://localhost:8080/uploads/" + photoPath;
    }

    private void sendPhotoAlbum(long chatId, List<String> photoUrls) {
        try {
            List<Map<String, Object>> media = new ArrayList<>();
            for (int i = 0; i < Math.min(photoUrls.size(), 10); i++) {
                String fullUrl = getFullPhotoUrl(photoUrls.get(i));
                if (fullUrl == null) continue;

                Map<String, Object> photoItem = new HashMap<>();
                photoItem.put("type", "photo");
                photoItem.put("media", fullUrl);
                media.add(photoItem);
            }

            if (media.isEmpty()) return;

            String url = "https://api.telegram.org/bot" + botToken + "/sendMediaGroup";
            String body = "{\"chat_id\":" + chatId + ",\"media\":" + objectMapper.writeValueAsString(media) + "}";

            HttpURLConnection conn = createConnection(url);
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setDoOutput(true);

            try (OutputStream os = conn.getOutputStream()) {
                os.write(body.getBytes(StandardCharsets.UTF_8));
                os.flush();
            }

            int responseCode = conn.getResponseCode();
            if (responseCode != 200) {
                System.err.println("Ошибка отправки альбома: " + responseCode);
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
            String body = "{\"chat_id\":" + chatId + ",\"photo\":\"" + fullUrl + "\"}";

            HttpURLConnection conn = createConnection(urlToSend);
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
            System.err.println("Ошибка отправки фото: " + e.getMessage());
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

    private void handleUserInput(long chatId, UserSession session, String text, JsonNode message) {
        switch (session.getState()) {
            case AWAITING_PHONE:
                session.setPhoneNumber(text);
                session.setState(UserState.AWAITING_SMS_CODE);
                try {
                    authService.issueSmsCode(text, "login");
                    sendMessage(chatId, "📱 На ваш номер отправлен SMS-код. Введите его для входа:");
                } catch (Exception e) {
                    sendMessage(chatId, "❌ Ошибка: " + e.getMessage());
                    session.setState(UserState.AWAITING_PHONE);
                }
                break;

            case AWAITING_SMS_CODE:
                try {
                    AuthResponse response = authService.authenticateUser(session.getPhoneNumber(), text);
                    session.setUserId(response.userId());
                    session.setToken(response.token());
                    session.setState(UserState.AUTHENTICATED);
                    sendMessage(chatId, "✅ Вы успешно авторизованы!\n\nКоманды:\n/new_ad - Создать новое объявление\n/search - Поиск объявлений\n/cancel - Отменить");
                } catch (Exception e) {
                    sendMessage(chatId, "❌ Неверный код. Попробуйте ещё раз:");
                }
                break;

            case AUTHENTICATED:
                if (text.equals("/new_ad")) {
                    startCreateAd(chatId, session);
                } else {
                    sendMessage(chatId, "Используйте /new_ad для создания объявления, /search для поиска или /cancel для отмены");
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
        session.setState(UserState.CREATING_AD);
        session.resetAdData();
        sendMessage(chatId, "🏠 Выберите тип аренды:\n1. Долгосрочная\n2. Посуточная");
    }

    private void handleAdCreation(long chatId, UserSession session, String text) {
        AdData adData = session.getAdData();

        switch (session.getAdStep()) {
            case 0:
                if (text.equals("1")) {
                    adData.setRentalType("long_term");
                    session.nextStep();
                    sendMessage(chatId, "📝 Введите название объявления:");
                } else if (text.equals("2")) {
                    adData.setRentalType("short_term");
                    session.nextStep();
                    sendMessage(chatId, "📝 Введите название объявления:");
                } else {
                    sendMessage(chatId, "Пожалуйста, выберите 1 или 2");
                }
                break;

            case 1:
                adData.setTitle(text);
                session.nextStep();
                sendMessage(chatId, "📍 Введите город:");
                break;

            case 2:
                adData.setCity(text);
                session.nextStep();
                sendMessage(chatId, "🏘️ Введите адрес:");
                break;

            case 3:
                adData.setAddress(text);
                session.nextStep();
                sendMessage(chatId, "💰 Введите цену " + (adData.getRentalType().equals("long_term") ? "в месяц (₽)" : "за сутки (₽)"));
                break;

            case 4:
                try {
                    int price = Integer.parseInt(text);
                    if (adData.getRentalType().equals("long_term")) {
                        adData.setPricePerMonth(price);
                    } else {
                        adData.setPricePerDay(price);
                    }
                    session.nextStep();
                    if (adData.getRentalType().equals("long_term")) {
                        sendMessage(chatId, "🛏️ Введите количество комнат:");
                    } else {
                        sendMessage(chatId, "👥 Введите максимальное количество гостей:");
                    }
                } catch (NumberFormatException e) {
                    sendMessage(chatId, "❌ Введите число");
                }
                break;

            case 5:
                try {
                    int value = Integer.parseInt(text);
                    if (adData.getRentalType().equals("long_term")) {
                        adData.setRooms(value);
                    } else {
                        adData.setMaxGuests(value);
                    }
                    session.nextStep();
                    sendMessage(chatId, "📏 Введите площадь (м²):");
                } catch (NumberFormatException e) {
                    sendMessage(chatId, "❌ Введите число");
                }
                break;

            case 6:
                try {
                    double area = Double.parseDouble(text);
                    adData.setArea(area);
                    session.nextStep();
                    sendMessage(chatId, "📝 Введите описание объявления:");
                } catch (NumberFormatException e) {
                    sendMessage(chatId, "❌ Введите число");
                }
                break;

            case 7:
                adData.setDescription(text);
                session.nextStep();
                sendMessage(chatId, "📸 Отправьте фотографии (можно несколько). Когда закончите, напишите /done");
                session.setState(UserState.AWAITING_PHOTOS);
                break;
        }
    }

    private void handlePhotoUpload(long chatId, UserSession session, JsonNode message) {
        if (message.has("photo")) {
            try {
                JsonNode photoArray = message.get("photo");
                String fileId = photoArray.get(photoArray.size() - 1).get("file_id").asText();
                String photoUrl = saveTelegramPhoto(fileId, session.getUserId());
                session.getAdData().addPhotoUrl(photoUrl);
                sendMessage(chatId, "✅ Фото добавлено! Отправьте ещё или /done");
            } catch (Exception e) {
                sendMessage(chatId, "❌ Ошибка при загрузке фото: " + e.getMessage());
            }
        } else if (message.has("text") && message.get("text").asText().equals("/done")) {
            try {
                AdRequest adRequest = session.getAdData().buildRequest();
                adService.createFromBot(adRequest, session.getUserId());
                sendMessage(chatId, "✅ Объявление создано и отправлено на модерацию!");
                session.setState(UserState.AUTHENTICATED);
                session.resetAdData();
            } catch (Exception e) {
                sendMessage(chatId, "❌ Ошибка: " + e.getMessage());
            }
        } else {
            sendMessage(chatId, "📸 Отправьте фото или /done");
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

        if (urlString.contains("localhost") || urlString.contains("127.0.0.1")) {
            conn = (HttpURLConnection) url.openConnection();
        } else {
            Proxy proxy = new Proxy(Proxy.Type.HTTP, new InetSocketAddress(proxyHost, proxyPort));
            conn = (HttpURLConnection) url.openConnection(proxy);
        }

        conn.setConnectTimeout(30000);
        conn.setReadTimeout(30000);
        return conn;
    }

    private String escapeJson(String s) {
        return s.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t");
    }
}