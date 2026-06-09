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

    @Value("${telegram.bot.proxy.enabled:false}")
    private boolean proxyEnabled;

    @Value("${telegram.bot.proxy.host:}")
    private String proxyHost;

    @Value("${telegram.bot.proxy.port:0}")
    private int proxyPort;

    @Value("${rent.web-app-url:https://rent-service-app.vercel.app}")
    private String webAppUrl;

    @Value("${rent.api-base-url:https://rent-service-app.onrender.com}")
    private String apiBaseUrl;

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
            Integer messageId = messageId(message);

            UserSession session = userSessions.getOrDefault(chatId, new UserSession(chatId));
            userSessions.put(chatId, session);

            if (text.startsWith("/start")) {
                deleteMessage(chatId, messageId);
                handleStartCommand(chatId, session, text);
                return;
            }

            if (text.equals("/start")) {
                session.setState(UserState.AWAITING_PHONE);
                sendMessage(chatId, "🔐 Добро пожаловать в Rent Service!\n\nВведите номер телефона для входа или регистрации:\nПример: +79991234567");
            } else if (text.equals("/cancel")) {
                deleteMessage(chatId, messageId);
                session.setState(UserState.AUTHENTICATED);
                session.resetAdData();
                session.resetSearchFilters();
                clearScenarioMessages(chatId, session);
                sendMessage(chatId, "Операция отменена");
            } else if (text.equals("/search")) {
                deleteMessage(chatId, messageId);
                startSearch(chatId, session);
            } else if (text.equals("/new_ad")) {
                deleteMessage(chatId, messageId);
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
            clearScenarioMessages(chatId, session);
            session.setWebAuthRequestId(parts[1].replaceFirst("^web_(register|login)_", ""));
            session.setState(UserState.AWAITING_WEB_CONTACT);
            sendContactRequest(chatId, "Поделитесь номером телефона для завершения операции.");
            return;
        }

        clearScenarioMessages(chatId, session);
        session.setState(UserState.AWAITING_PHONE);
        sendContactRequest(chatId, "Добро пожаловать в Rent Service. Поделитесь номером телефона для входа или регистрации.");
    }

    private void handleCallbackQuery(JsonNode update) {
        JsonNode callback = update.get("callback_query");
        long chatId = callback.get("message").get("chat").get("id").asLong();
        int callbackMessageId = callback.get("message").get("message_id").asInt();
        String data = callback.get("data").asText();
        UserSession session = userSessions.get(chatId);

        if (session == null) return;
        answerCallback(callback.get("id").asText());

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
            clearScenarioMessages(chatId, session);
            sendMessage(chatId, "Операция отменена");
            return;
        }
        if (handleSearchCallback(chatId, callbackMessageId, session, data)) {
            return;
        }
        if (data.startsWith("ad:property:")) {
            session.getAdData().setPropertyType(data.substring("ad:property:".length()));
            session.nextStep();
            session.rememberCleanupMessage(sendRentalTypePicker(chatId));
            return;
        }
        if (data.startsWith("ad:rental:")) {
            session.getAdData().setRentalType(data.substring("ad:rental:".length()));
            session.nextStep();
            session.rememberCleanupMessage(sendMessage(chatId, "📍 Введите город:"));
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
            deleteSearchResultMessages(chatId, session);
        }
    }

    private void startSearch(long chatId, UserSession session) {
        if (session.getState() != UserState.AUTHENTICATED) {
            sendMessage(chatId, "Авторизуйтесь, поделившись номером телефона.");
            return;
        }

        session.setState(UserState.SEARCHING);
        session.resetSearchFilters();
        clearScenarioMessages(chatId, session);

        String keyboard = "{\"inline_keyboard\":["
                + "[{\"text\":\"Посуточная аренда\",\"callback_data\":\"search:type:short_term\"}],"
                + "[{\"text\":\"Долгосрочная аренда\",\"callback_data\":\"search:type:long_term\"}]"
                + "]}";
        session.rememberCleanupMessage(sendMessageWithKeyboard(chatId, "Выберите тип аренды:", keyboard));
    }

    private void handleSearch(long chatId, UserSession session, String text) {
        try {
            if (session.getAwaitingSearchField() == null) {
                sendSearchBuilder(chatId, session);
                return;
            }
            applySearchFieldValue(session, text);
            deleteMessage(chatId, session.getSearchInputPromptMessageId());
            session.setSearchInputPromptMessageId(null);
            updateSearchBuilder(chatId, session);

        } catch (Exception e) {
            session.rememberCleanupMessage(sendMessage(chatId, "Не удалось применить фильтр. Проверьте формат ввода."));
        }
    }

    private boolean handleSearchCallback(long chatId, int callbackMessageId, UserSession session, String data) {
        if (!data.startsWith("search:")) {
            return false;
        }

        if (data.startsWith("search:type:")) {
            session.setSearchRentalType(data.substring("search:type:".length()));
            deleteMessage(chatId, callbackMessageId);
            sendSearchBuilder(chatId, session);
            return true;
        }

        if (data.equals("search:edit")) {
            editMessageText(chatId, callbackMessageId, buildSearchBuilderText(session), buildSearchEditKeyboard(session));
            return true;
        }

        if (data.startsWith("search:field:")) {
            session.setAwaitingSearchField(data.substring("search:field:".length()));
            session.setSearchInputPromptMessageId(sendMessage(chatId, searchFieldPrompt(session.getAwaitingSearchField())));
            session.rememberCleanupMessage(session.getSearchInputPromptMessageId());
            return true;
        }

        if (data.equals("search:reset")) {
            String rentalType = session.getSearchRentalType();
            Integer builderMessageId = session.getSearchBuilderMessageId();
            session.resetSearchFilters();
            session.setSearchRentalType(rentalType);
            session.setSearchBuilderMessageId(builderMessageId);
            updateSearchBuilder(chatId, session);
            return true;
        }

        if (data.equals("search:results")) {
            List<AdSummaryResponse> ads = searchAds(
                    session.getSearchCity(),
                    session.getSearchRentalType(),
                    session.getSearchMinPrice(),
                    session.getSearchMaxPrice(),
                    session.getSearchRooms(),
                    session.getUserId()
            );
            if (ads.isEmpty()) {
                session.rememberCleanupMessage(sendMessage(chatId, "По выбранным фильтрам ничего не найдено."));
                return true;
            }
            session.setSearchResults(ads);
            session.setCurrentSearchIndex(0);
            deleteMessage(chatId, session.getSearchBuilderMessageId());
            session.setSearchBuilderMessageId(null);
            clearScenarioMessages(chatId, session);
            sendAdCard(chatId, session, ads.get(0), 0, ads.size());
            return true;
        }

        return true;
    }

    private void sendSearchBuilder(long chatId, UserSession session) {
        Integer messageId = sendMessageWithKeyboard(chatId, buildSearchBuilderText(session), buildSearchMainKeyboard());
        session.setSearchBuilderMessageId(messageId);
    }

    private void updateSearchBuilder(long chatId, UserSession session) {
        session.setAwaitingSearchField(null);
        Integer builderMessageId = session.getSearchBuilderMessageId();
        if (builderMessageId == null) {
            sendSearchBuilder(chatId, session);
            return;
        }
        editMessageText(chatId, builderMessageId, buildSearchBuilderText(session), buildSearchMainKeyboard());
    }

    private String buildSearchBuilderText(UserSession session) {
        StringBuilder text = new StringBuilder();
        text.append("Ваши фильтры:\n");
        text.append("Тип аренды: ").append(rentalTypeLabel(session.getSearchRentalType())).append("\n");
        text.append("Город: ").append(session.getSearchCity() == null ? "[Не выбрано]" : session.getSearchCity()).append("\n");
        text.append("Комнат: ").append(session.getSearchRooms() == null ? "[Любые]" : session.getSearchRooms()).append("\n");
        text.append("Ценовой диапазон: ").append(formatPriceRange(session)).append("\n");
        if ("short_term".equals(session.getSearchRentalType())) {
            text.append("Даты: ").append(session.getSearchDates() == null ? "[Не выбраны]" : session.getSearchDates()).append("\n");
        }
        return text.toString();
    }

    private String buildSearchMainKeyboard() {
        return "{\"inline_keyboard\":["
                + "[{\"text\":\"Изменить\",\"callback_data\":\"search:edit\"}],"
                + "[{\"text\":\"Показать результаты\",\"callback_data\":\"search:results\"}],"
                + "[{\"text\":\"Сбросить\",\"callback_data\":\"search:reset\"}]"
                + "]}";
    }

    private String buildSearchEditKeyboard(UserSession session) {
        List<String> rows = new ArrayList<>();
        rows.add("[{\"text\":\"Изменить город\",\"callback_data\":\"search:field:city\"}]");
        rows.add("[{\"text\":\"Изменить ценовой диапазон\",\"callback_data\":\"search:field:price\"}]");
        rows.add("[{\"text\":\"Изменить кол-во комнат\",\"callback_data\":\"search:field:rooms\"}]");
        if ("short_term".equals(session.getSearchRentalType())) {
            rows.add("[{\"text\":\"Изменить даты\",\"callback_data\":\"search:field:dates\"}]");
        }
        rows.add("[{\"text\":\"Показать результаты\",\"callback_data\":\"search:results\"}]");
        rows.add("[{\"text\":\"Сбросить\",\"callback_data\":\"search:reset\"}]");
        return "{\"inline_keyboard\":[" + String.join(",", rows) + "]}";
    }

    private String searchFieldPrompt(String field) {
        return switch (field) {
            case "city" -> "Введите город:";
            case "price" -> "Введите ценовой диапазон в формате: от-до. Например: 30000-50000";
            case "rooms" -> "Введите количество комнат:";
            case "dates" -> "Введите даты поиска в свободном формате, например: 10.06.2026-15.06.2026";
            default -> "Введите значение:";
        };
    }

    private void applySearchFieldValue(UserSession session, String text) {
        String value = text == null ? "" : text.trim();
        switch (session.getAwaitingSearchField()) {
            case "city" -> session.setSearchCity(value.isBlank() ? null : value);
            case "rooms" -> session.setSearchRooms(value.isBlank() ? null : Integer.parseInt(value));
            case "dates" -> session.setSearchDates(value.isBlank() ? null : value);
            case "price" -> {
                String[] parts = value.split("[-–—]");
                session.setSearchMinPrice(parts.length > 0 && !parts[0].trim().isBlank() ? Integer.parseInt(parts[0].trim()) : null);
                session.setSearchMaxPrice(parts.length > 1 && !parts[1].trim().isBlank() ? Integer.parseInt(parts[1].trim()) : null);
            }
            default -> {
            }
        }
    }

    private String formatPriceRange(UserSession session) {
        if (session.getSearchMinPrice() == null && session.getSearchMaxPrice() == null) {
            return "[Не выбран]";
        }
        return (session.getSearchMinPrice() == null ? "0" : session.getSearchMinPrice())
                + " - "
                + (session.getSearchMaxPrice() == null ? "∞" : session.getSearchMaxPrice())
                + " ₽";
    }

    private List<AdSummaryResponse> searchAds(String city, String rentalType, Integer minPrice, Integer maxPrice, Integer rooms, Long currentUserId) {
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
            if (rooms != null) {
                params.add("rooms=" + rooms);
            }

            String url = apiBase() + "/api/ads?" + String.join("&", params);
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
                            .area(item.has("area") && !item.get("area").isNull() ? item.get("area").decimalValue() : null)
                            .moderationStatus(item.has("moderationStatus") && !item.get("moderationStatus").isNull() ? item.get("moderationStatus").asText() : null)
                            .active(item.has("active") && item.get("active").asBoolean())
                            .viewsCount(item.has("viewsCount") && !item.get("viewsCount").isNull() ? item.get("viewsCount").asInt() : null)
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
                    .filter(ad -> currentUserId == null || !Objects.equals(ad.ownerId(), currentUserId))

                    .filter(ad -> city == null || city.isBlank()
                            || ad.city().equalsIgnoreCase(city.trim()))

                    .filter(ad -> rentalType == null
                            || ad.rentalType().equalsIgnoreCase(rentalType))

                    .filter(ad -> rooms == null || Objects.equals(ad.rooms(), rooms))

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
        deleteSearchResultMessages(chatId, session);
        Optional<JsonNode> detailJson = fetchAdDetailsJson(ad.id());
        AdSummaryResponse details = detailJson.map(this::summaryFromJson).orElse(ad);

        Integer price = "short_term".equals(details.rentalType())
                ? details.pricePerDay()
                : details.pricePerMonth();

        String priceStr = price != null ? price + " ₽" : "—";
        String priceType = "short_term".equals(details.rentalType())
                ? "сутки"
                : "месяц";

        String text = "Объявление " + (index + 1) + " из " + total + "\n\n"
                + nullSafe(details.title()) + "\n\n"
                + "Тип жилья: " + propertyTypeLabel(details.propertyType()) + "\n"
                + "Цена: " + priceStr + " / " + priceType + "\n"
                + "Город: " + nullSafe(details.city()) + "\n"
                + "Адрес: " + detailText(detailJson, "address") + "\n"
                + "Комнат: " + valueOrAny(details.rooms()) + "\n"
                + "Площадь: " + (details.area() != null ? details.area().stripTrailingZeros().toPlainString() + " м²" : "Не указана") + "\n"
                + "Этаж: " + floorText(detailJson) + "\n"
                + ("short_term".equals(details.rentalType()) ? "Макс. гостей: " + valueOrAny(details.maxGuests()) + "\n" : "")
                + "Просмотров: " + valueOrAny(details.viewsCount()) + "\n\n"
                + "Собственник: " + nullSafe(details.userFullName()) + "\n"
                + "Рейтинг собственника: " + (details.ownerRating() != null ? details.ownerRating() : "Нет оценок") + "\n"
                + "Отзывы: " + valueOrAny(details.ownerReviewsCount()) + "\n"
                + "Верификация: " + verificationLabel(details.ownerVerificationStatus()) + "\n\n"
                + nullSafe(details.description());

        List<String> photos = new ArrayList<>();

        if (details.photoUrls() != null && !details.photoUrls().isEmpty()) {
            photos.addAll(details.photoUrls());
        } else if (details.primaryPhotoUrl() != null) {
            photos.add(details.primaryPhotoUrl());
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
        rows.add("[{\"text\":\"Связаться\",\"url\":\"" + escapeJson(buildChatUrl(details)) + "\"}]");
        rows.add("[{\"text\":\"Выйти из поиска\",\"callback_data\":\"close\"}]");

        String keyboard = "{\"inline_keyboard\":[" + String.join(",", rows) + "]}";

        List<Integer> sentMessages = new ArrayList<>();
        if (!photos.isEmpty()) {
            sentMessages.addAll(sendPhotoAlbum(chatId, photos));
        }
        sentMessages.add(sendMessageWithKeyboard(chatId, text, keyboard));
        session.rememberSearchResultMessages(sentMessages);
    }

    private String buildChatUrl(AdSummaryResponse ad) {
        String base = webBase();
        String appLink = mobileDeepLinkScheme + "://chat?adId=" + ad.id()
                + (ad.ownerId() != null ? "&sellerId=" + ad.ownerId() : "")
                + "&adTitle=" + URLEncoder.encode(nullSafe(ad.title()), StandardCharsets.UTF_8)
                + "&ownerName=" + URLEncoder.encode(nullSafe(ad.userFullName()), StandardCharsets.UTF_8);
        return base + "/?openMobile=1&chatAdId=" + ad.id()
                + (ad.ownerId() != null ? "&sellerId=" + ad.ownerId() : "")
                + "&adTitle=" + URLEncoder.encode(nullSafe(ad.title()), StandardCharsets.UTF_8)
                + "&ownerName=" + URLEncoder.encode(nullSafe(ad.userFullName()), StandardCharsets.UTF_8)
                + "&appLink=" + URLEncoder.encode(appLink, StandardCharsets.UTF_8);
    }

    private Optional<JsonNode> fetchAdDetailsJson(Long adId) {
        if (adId == null) {
            return Optional.empty();
        }
        try {
            String url = apiBase() + "/api/ads/" + adId;
            HttpURLConnection conn = createConnection(url);
            conn.setRequestMethod("GET");
            conn.setRequestProperty("Accept", "application/json");
            conn.setConnectTimeout(10000);
            conn.setReadTimeout(10000);

            if (conn.getResponseCode() != 200) {
                conn.disconnect();
                return Optional.empty();
            }

            JsonNode json = objectMapper.readTree(conn.getInputStream());
            conn.disconnect();
            return Optional.of(json);
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    private AdSummaryResponse summaryFromJson(JsonNode item) {
        return AdSummaryResponse.builder()
                .id(item.get("id").asLong())
                .ownerId(item.has("ownerId") && !item.get("ownerId").isNull() ? item.get("ownerId").asLong() : null)
                .title(textOrNull(item, "title"))
                .userFullName(textOrNull(item, "ownerName"))
                .ownerAvatarUrl(textOrNull(item, "ownerAvatarUrl"))
                .ownerRating(item.has("ownerRating") && !item.get("ownerRating").isNull() ? item.get("ownerRating").asDouble() : null)
                .ownerReviewsCount(item.has("ownerReviewsCount") && !item.get("ownerReviewsCount").isNull() ? item.get("ownerReviewsCount").asInt() : null)
                .ownerTrustLevel(textOrNull(item, "ownerTrustLevel"))
                .ownerVerificationStatus(textOrNull(item, "ownerVerificationStatus"))
                .description(textOrNull(item, "description"))
                .city(textOrNull(item, "city"))
                .district(textOrNull(item, "district"))
                .region(textOrNull(item, "region"))
                .propertyType(textOrNull(item, "propertyType"))
                .rentalType(textOrNull(item, "rentalType"))
                .rooms(item.has("rooms") && !item.get("rooms").isNull() ? item.get("rooms").asInt() : null)
                .pricePerMonth(item.has("pricePerMonth") && !item.get("pricePerMonth").isNull() ? item.get("pricePerMonth").asInt() : null)
                .pricePerDay(item.has("pricePerDay") && !item.get("pricePerDay").isNull() ? item.get("pricePerDay").asInt() : null)
                .maxGuests(item.has("maxGuests") && !item.get("maxGuests").isNull() ? item.get("maxGuests").asInt() : null)
                .area(item.has("area") && !item.get("area").isNull() ? item.get("area").decimalValue() : null)
                .moderationStatus(textOrNull(item, "moderationStatus"))
                .active(item.has("active") && item.get("active").asBoolean())
                .viewsCount(item.has("viewsCount") && !item.get("viewsCount").isNull() ? item.get("viewsCount").asInt() : null)
                .photoUrls(item.has("photoUrls")
                        ? objectMapper.convertValue(item.get("photoUrls"), new com.fasterxml.jackson.core.type.TypeReference<List<String>>() {})
                        : null)
                .build();
    }

    private String textOrNull(JsonNode node, String field) {
        return node.has(field) && !node.get(field).isNull() ? node.get(field).asText() : null;
    }

    private String detailText(Optional<JsonNode> node, String field) {
        return node.map(json -> textOrNull(json, field)).filter(value -> !value.isBlank()).orElse("Не указано");
    }

    private String nullSafe(String value) {
        return value == null || value.isBlank() ? "Не указано" : value;
    }

    private String valueOrAny(Integer value) {
        return value == null ? "Любые" : String.valueOf(value);
    }

    private String floorText(Optional<JsonNode> node) {
        String floor = detailText(node, "floor");
        String totalFloors = detailText(node, "totalFloors");
        if ("Не указано".equals(floor)) {
            return "—";
        }
        return floor + "/" + ("Не указано".equals(totalFloors) ? "?" : totalFloors);
    }

    private String rentalTypeLabel(String rentalType) {
        if ("short_term".equals(rentalType)) {
            return "Посуточная";
        }
        if ("long_term".equals(rentalType)) {
            return "Долгосрочная";
        }
        return "Не выбран";
    }

    private String propertyTypeLabel(String propertyType) {
        if ("house".equals(propertyType)) {
            return "Дом";
        }
        if ("apartment".equals(propertyType)) {
            return "Квартира";
        }
        return nullSafe(propertyType);
    }

    private String verificationLabel(String status) {
        if ("trusted_partner".equalsIgnoreCase(status)) {
            return "Надежный партнер";
        }
        if ("owner_verified".equalsIgnoreCase(status)) {
            return "Собственник подтвержден";
        }
        return "Базовая";
    }

    private String getFullPhotoUrl(String photoPath) {
        if (photoPath == null) return null;
        if (photoPath.startsWith("http")) return photoPath;
        if (photoPath.startsWith("/uploads/")) {
            return apiBase() + photoPath;
        }
        return apiBase() + "/uploads/" + photoPath;
    }

    private List<Integer> sendPhotoAlbum(long chatId, List<String> photoUrls) {
        try {
            List<String> safePhotoUrls = photoUrls == null ? Collections.emptyList() : photoUrls.stream()
                    .filter(url -> url != null && !url.isBlank())
                    .limit(10)
                    .toList();

            if (safePhotoUrls.isEmpty()) return Collections.emptyList();
            if (safePhotoUrls.size() == 1) {
                Integer messageId = sendPhoto(chatId, safePhotoUrls.get(0));
                return messageId == null ? Collections.emptyList() : List.of(messageId);
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

            if (media.isEmpty()) return Collections.emptyList();

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

            List<Integer> messageIds = extractSentMessageIds(conn);
            conn.disconnect();
            return messageIds;
        } catch (Exception e) {
            System.err.println("Ошибка отправки альбома: " + e.getMessage());
            return Collections.emptyList();
        }
    }
    private Integer sendMessageWithKeyboard(long chatId, String text, String keyboardJson) {
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

            Integer messageId = extractSentMessageId(conn);
            conn.disconnect();
            return messageId;
        } catch (Exception e) {
            System.err.println("Ошибка отправки: " + e.getMessage());
            return null;
        }
    }

    private Integer sendPhoto(long chatId, String photoUrl) {
        try {
            String fullUrl = getFullPhotoUrl(photoUrl);
            if (fullUrl == null) return null;

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
            Integer messageId = responseCode == 200 ? extractSentMessageId(conn) : null;
            conn.disconnect();
            return messageId;
        } catch (Exception e) {
            System.err.println("Ошибка отправки фото: " + e.getMessage());
            return null;
        }
    }

    private Integer sendPhotoWithCaptionKeyboard(long chatId, String photoUrl, String caption, String keyboardJson) {
        try {
            String fullUrl = getFullPhotoUrl(photoUrl);
            if (fullUrl == null) {
                return sendMessageWithKeyboard(chatId, caption, keyboardJson);
            }

            String urlToSend = "https://api.telegram.org/bot" + botToken + "/sendPhoto";
            Path localPath = resolveLocalPhotoPath(photoUrl);
            String safeCaption = caption.length() > 1000 ? caption.substring(0, 997) + "..." : caption;

            HttpURLConnection conn = createConnection(urlToSend);
            conn.setRequestMethod("POST");
            conn.setDoOutput(true);

            if (localPath != null && Files.exists(localPath)) {
                String boundary = "RentServiceBoundary" + System.currentTimeMillis();
                conn.setRequestProperty("Content-Type", "multipart/form-data; boundary=" + boundary);
                try (OutputStream os = conn.getOutputStream()) {
                    writeFormField(os, boundary, "chat_id", String.valueOf(chatId));
                    writeFormField(os, boundary, "caption", safeCaption);
                    writeFormField(os, boundary, "reply_markup", keyboardJson);
                    writeFileField(os, boundary, "photo", localPath);
                    os.write(("--" + boundary + "--\r\n").getBytes(StandardCharsets.UTF_8));
                    os.flush();
                }
            } else {
                conn.setRequestProperty("Content-Type", "application/json");
                String body = "{\"chat_id\":" + chatId
                        + ",\"photo\":\"" + escapeJson(fullUrl)
                        + "\",\"caption\":\"" + escapeJson(safeCaption)
                        + "\",\"reply_markup\":" + keyboardJson + "}";
                try (OutputStream os = conn.getOutputStream()) {
                    os.write(body.getBytes(StandardCharsets.UTF_8));
                    os.flush();
                }
            }

            Integer messageId = extractSentMessageId(conn);
            conn.disconnect();
            return messageId;
        } catch (Exception e) {
            System.err.println("Ошибка отправки фото: " + e.getMessage());
            return sendMessageWithKeyboard(chatId, caption, keyboardJson);
        }
    }

    private void editMessageText(long chatId, int messageId, String text, String keyboardJson) {
        try {
            String url = "https://api.telegram.org/bot" + botToken + "/editMessageText";
            String body = "{\"chat_id\":" + chatId
                    + ",\"message_id\":" + messageId
                    + ",\"text\":\"" + escapeJson(text)
                    + "\",\"reply_markup\":" + keyboardJson + "}";

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
            System.err.println("Ошибка редактирования: " + e.getMessage());
        }
    }

    private void deleteMessage(long chatId, Integer messageId) {
        if (messageId == null) return;
        try {
            String url = "https://api.telegram.org/bot" + botToken + "/deleteMessage";
            String body = "{\"chat_id\":" + chatId + ",\"message_id\":" + messageId + "}";

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
            System.err.println("Ошибка удаления сообщения: " + e.getMessage());
        }
    }

    private void answerCallback(String callbackId) {
        try {
            String url = "https://api.telegram.org/bot" + botToken + "/answerCallbackQuery";
            String body = "{\"callback_query_id\":\"" + escapeJson(callbackId) + "\"}";

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
            System.err.println("Ошибка ответа callback: " + e.getMessage());
        }
    }

    private String normalizeBaseUrl(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }
        String trimmed = value.trim();
        return trimmed.endsWith("/") ? trimmed.substring(0, trimmed.length() - 1) : trimmed;
    }

    private String apiBase() {
        return normalizeBaseUrl(apiBaseUrl);
    }

    private String webBase() {
        return normalizeBaseUrl(webAppUrl);
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

    private Integer sendMessage(long chatId, String text) {
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

            Integer messageId = extractSentMessageId(conn);
            conn.disconnect();
            return messageId;
        } catch (Exception e) {
            System.err.println("Ошибка отправки: " + e.getMessage());
            return null;
        }
    }

    private Integer sendMessageRemoveKeyboard(long chatId, String text) {
        String keyboard = "{\"remove_keyboard\":true}";
        return sendMessageWithKeyboard(chatId, text, keyboard);
    }

    private Integer extractSentMessageId(HttpURLConnection conn) throws IOException {
        int responseCode = conn.getResponseCode();
        InputStream stream = responseCode >= 200 && responseCode < 300 ? conn.getInputStream() : conn.getErrorStream();
        if (stream == null) {
            return null;
        }
        String response = new String(stream.readAllBytes(), StandardCharsets.UTF_8);
        if (responseCode < 200 || responseCode >= 300) {
            System.err.println("Ошибка Telegram API: " + responseCode + " " + response);
            return null;
        }
        JsonNode json = objectMapper.readTree(response);
        return json.has("result") && json.get("result").has("message_id")
                ? json.get("result").get("message_id").asInt()
                : null;
    }

    private List<Integer> extractSentMessageIds(HttpURLConnection conn) throws IOException {
        int responseCode = conn.getResponseCode();
        InputStream stream = responseCode >= 200 && responseCode < 300 ? conn.getInputStream() : conn.getErrorStream();
        if (stream == null) {
            return Collections.emptyList();
        }
        String response = new String(stream.readAllBytes(), StandardCharsets.UTF_8);
        if (responseCode < 200 || responseCode >= 300) {
            System.err.println("Ошибка Telegram API: " + responseCode + " " + response);
            return Collections.emptyList();
        }
        JsonNode json = objectMapper.readTree(response);
        if (!json.has("result") || !json.get("result").isArray()) {
            return Collections.emptyList();
        }
        List<Integer> messageIds = new ArrayList<>();
        for (JsonNode item : json.get("result")) {
            if (item.has("message_id")) {
                messageIds.add(item.get("message_id").asInt());
            }
        }
        return messageIds;
    }

    private Integer messageId(JsonNode message) {
        return message != null && message.has("message_id") ? message.get("message_id").asInt() : null;
    }

    private void clearScenarioMessages(long chatId, UserSession session) {
        for (Integer messageId : session.drainCleanupMessageIds()) {
            deleteMessage(chatId, messageId);
        }
    }

    private void deleteSearchResultMessages(long chatId, UserSession session) {
        List<Integer> messageIds = new ArrayList<>(session.getSearchResultMessageIds());
        if (messageIds.isEmpty() && session.getSearchResultMessageId() != null) {
            messageIds.add(session.getSearchResultMessageId());
        }
        for (Integer messageId : messageIds) {
            deleteMessage(chatId, messageId);
        }
        session.getSearchResultMessageIds().clear();
        session.setSearchResultMessageId(null);
    }

    private void sendMainMenu(long chatId, String text) {
        String keyboard = "{\"inline_keyboard\":["
                + "[{\"text\":\"🏠 Добавить объявление\",\"callback_data\":\"menu:new_ad\"}],"
                + "[{\"text\":\"🔍 Найти жильё\",\"callback_data\":\"menu:search\"}]"
                + "]}";
        sendMessageWithKeyboard(chatId, text, keyboard);
    }

    private Integer sendPropertyTypePicker(long chatId) {
        String keyboard = "{\"inline_keyboard\":["
                + "[{\"text\":\"Квартира\",\"callback_data\":\"ad:property:apartment\"}],"
                + "[{\"text\":\"Дом\",\"callback_data\":\"ad:property:house\"}],"
                + "[{\"text\":\"Отмена\",\"callback_data\":\"menu:cancel\"}]"
                + "]}";
        return sendMessageWithKeyboard(chatId, "🏘️ Выберите тип жилья:", keyboard);
    }

    private Integer sendRentalTypePicker(long chatId) {
        String keyboard = "{\"inline_keyboard\":["
                + "[{\"text\":\"Долгосрочно\",\"callback_data\":\"ad:rental:long_term\"}],"
                + "[{\"text\":\"Посуточно\",\"callback_data\":\"ad:rental:short_term\"}],"
                + "[{\"text\":\"Отмена\",\"callback_data\":\"menu:cancel\"}]"
                + "]}";
        return sendMessageWithKeyboard(chatId, "🏠 Выберите тип аренды:", keyboard);
    }

    private Integer sendPhotoStepPrompt(long chatId) {
        String keyboard = "{\"inline_keyboard\":["
                + "[{\"text\":\"Готово, создать объявление\",\"callback_data\":\"photos:done\"}]"
                + "]}";
        return sendMessageWithKeyboard(chatId, "📸 Отправьте фотографии.", keyboard);
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
                session.rememberCleanupMessage(sendMessageRemoveKeyboard(chatId, existingUser ? "Введите пароль для входа:" : "Придумайте пароль для регистрации:"));
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
                sendMessageRemoveKeyboard(chatId, "Номер подтвержден. Вернитесь в веб-приложение, вход завершится автоматически.");
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
                    deleteMessage(chatId, messageId(message));
                    clearScenarioMessages(chatId, session);
                    sendMainMenu(chatId, "Вы успешно вошли. Выберите действие:");
                } else {
                    deleteMessage(chatId, messageId(message));
                    clearScenarioMessages(chatId, session);
                    session.setPendingPassword(text);
                    session.setState(UserState.AWAITING_FULL_NAME);
                    session.rememberCleanupMessage(sendMessage(chatId, "Пароль установлен. Введите ФИО:"));
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
                deleteMessage(chatId, messageId(message));
                clearScenarioMessages(chatId, session);
                sendMessage(chatId, "Регистрация успешна");
            } catch (Exception e) {
                sendMessage(chatId, "Ошибка: " + e.getMessage());
            }
            return true;
        }

        return false;
    }

    private void handleUserInput(long chatId, UserSession session, String text, JsonNode message) {
        Integer incomingMessageId = messageId(message);
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
                session.rememberCleanupMessage(incomingMessageId);
                handleAdCreation(chatId, session, text);
                break;

            case AWAITING_PHOTOS:
                session.rememberCleanupMessage(incomingMessageId);
                handlePhotoUpload(chatId, session, message);
                break;

            case SEARCHING:
                deleteMessage(chatId, incomingMessageId);
                handleSearch(chatId, session, text);
                break;

            default:
                sendMessage(chatId, "Используйте /start для начала работы");
        }
    }

    private void startCreateAd(long chatId, UserSession session) {
        if (session.getState() != UserState.AUTHENTICATED) {
            sendMessage(chatId, "Авторизуйтесь, поделившись номером телефона.");
            return;
        }
        if (!session.canPublishAds()) {
            sendMessage(chatId, "Публикация доступна только арендодателям. Получите статус собственника в личном кабинете платформы на веб-сайте: " + webBase());
            return;
        }
        session.setState(UserState.CREATING_AD);
        session.resetAdData();
        clearScenarioMessages(chatId, session);
        session.rememberCleanupMessage(sendMessage(chatId, "📝 Введите название объявления:"));
    }

    private void handleAdCreation(long chatId, UserSession session, String text) {
        AdData adData = session.getAdData();

        switch (session.getAdStep()) {
            case 0:
                adData.setTitle(text);
                session.nextStep();
                session.rememberCleanupMessage(sendPropertyTypePicker(chatId));
                break;

            case 1:
                session.rememberCleanupMessage(sendPropertyTypePicker(chatId));
                break;

            case 2:
                session.rememberCleanupMessage(sendRentalTypePicker(chatId));
                break;

            case 3:
                adData.setCity(text);
                session.nextStep();
                session.rememberCleanupMessage(sendMessage(chatId, "📍 Введите район:"));
                break;

            case 4:
                adData.setDistrict(text);
                session.nextStep();
                session.rememberCleanupMessage(sendMessage(chatId, "📍 Введите регион:"));
                break;

            case 5:
                adData.setRegion(text);
                session.nextStep();
                session.rememberCleanupMessage(sendMessage(chatId, "🏘️ Введите адрес:"));
                break;

            case 6:
                adData.setAddress(text);
                session.nextStep();
                session.rememberCleanupMessage(sendMessage(chatId, "💰 Введите цену " + (adData.getRentalType().equals("long_term") ? "в месяц (₽)" : "за сутки (₽)")));
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
                    session.rememberCleanupMessage(sendMessage(chatId, "🛏️ Введите количество комнат:"));
                } catch (NumberFormatException e) {
                    session.rememberCleanupMessage(sendMessage(chatId, "❌ Введите число"));
                }
                break;

            case 8:
                try {
                    adData.setRooms(Integer.parseInt(text));
                    session.nextStep();
                    if (adData.getRentalType().equals("short_term")) {
                        session.rememberCleanupMessage(sendMessage(chatId, "👥 Введите максимальное количество гостей:"));
                    } else {
                        session.rememberCleanupMessage(sendMessage(chatId, "📏 Введите площадь (м²):"));
                    }
                } catch (NumberFormatException e) {
                    session.rememberCleanupMessage(sendMessage(chatId, "❌ Введите число"));
                }
                break;

            case 9:
                if (adData.getRentalType().equals("short_term")) {
                    try {
                        adData.setMaxGuests(Integer.parseInt(text));
                        session.nextStep();
                        session.rememberCleanupMessage(sendMessage(chatId, "📏 Введите площадь (м²):"));
                    } catch (NumberFormatException e) {
                        session.rememberCleanupMessage(sendMessage(chatId, "❌ Введите число"));
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
                    session.rememberCleanupMessage(sendMessage(chatId, "🏢 Введите общее количество этажей:"));
                } catch (NumberFormatException e) {
                    session.rememberCleanupMessage(sendMessage(chatId, "❌ Введите число"));
                }
                break;

            case 11:
                try {
                    if (adData.getRentalType().equals("short_term")) {
                        adData.setFloor(Integer.parseInt(text));
                        session.nextStep();
                        session.rememberCleanupMessage(sendMessage(chatId, "🏢 Введите общее количество этажей:"));
                    } else {
                        adData.setTotalFloors(Integer.parseInt(text));
                        session.nextStep();
                        session.rememberCleanupMessage(sendMessage(chatId, "📝 Введите описание объявления:"));
                    }
                } catch (NumberFormatException e) {
                    session.rememberCleanupMessage(sendMessage(chatId, "❌ Введите число"));
                }
                break;

            case 12:
                if (adData.getRentalType().equals("short_term")) {
                    try {
                        adData.setTotalFloors(Integer.parseInt(text));
                        session.nextStep();
                        session.rememberCleanupMessage(sendMessage(chatId, "📝 Введите описание объявления:"));
                    } catch (NumberFormatException e) {
                        session.rememberCleanupMessage(sendMessage(chatId, "❌ Введите число"));
                    }
                    break;
                }
                adData.setDescription(text);
                session.nextStep();
                session.rememberCleanupMessage(sendPhotoStepPrompt(chatId));
                session.setState(UserState.AWAITING_PHOTOS);
                break;

            case 13:
                adData.setDescription(text);
                session.nextStep();
                session.rememberCleanupMessage(sendPhotoStepPrompt(chatId));
                session.setState(UserState.AWAITING_PHOTOS);
                break;
        }
    }

    private void handleAreaInput(long chatId, UserSession session, AdData adData, String text) {
        try {
            double area = Double.parseDouble(text.replace(',', '.'));
            adData.setArea(area);
            session.nextStep();
            session.rememberCleanupMessage(sendMessage(chatId, "🏢 Введите этаж:"));
        } catch (NumberFormatException e) {
            session.rememberCleanupMessage(sendMessage(chatId, "❌ Введите число"));
        }
    }

    private void handlePhotoUpload(long chatId, UserSession session, JsonNode message) {
        if (message.has("photo")) {
            try {
                JsonNode photoArray = message.get("photo");
                String fileId = photoArray.get(photoArray.size() - 1).get("file_id").asText();
                String photoUrl = saveTelegramPhoto(fileId, session.getUserId());
                session.getAdData().addPhotoUrl(photoUrl);
            } catch (Exception e) {
                sendMessage(chatId, "❌ Ошибка при загрузке фото: " + e.getMessage());
            }
        } else if (message.has("text") && message.get("text").asText().equals("/done")) {
            finishBotAdCreation(chatId, session);
        } else {
            session.rememberCleanupMessage(sendMessage(chatId, "Отправьте фото или нажмите кнопку готовности."));
        }
    }

    private void finishBotAdCreation(long chatId, UserSession session) {
        try {
            if (!session.canPublishAds()) {
                sendMessage(chatId, "Публикация доступна только арендодателям. Получите статус собственника в личном кабинете платформы на веб-сайте: " + webBase());
                return;
            }
            AdRequest adRequest = session.getAdData().buildRequest();
            adService.createFromBot(adRequest, session.getUserId());
            session.setState(UserState.AUTHENTICATED);
            session.resetAdData();
            clearScenarioMessages(chatId, session);
            sendMessage(chatId, "Объявление создано и отправлено на модерацию!");
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

        if (proxyEnabled && proxyHost != null && !proxyHost.isBlank() && proxyPort > 0) {
            Proxy proxy = new Proxy(Proxy.Type.HTTP, new InetSocketAddress(proxyHost, proxyPort));
            HttpURLConnection conn = (HttpURLConnection) url.openConnection(proxy);
            conn.setConnectTimeout(30000);
            conn.setReadTimeout(30000);
            return conn;
        }

        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
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
