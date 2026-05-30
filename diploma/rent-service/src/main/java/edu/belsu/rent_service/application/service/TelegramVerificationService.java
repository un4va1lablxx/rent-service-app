package edu.belsu.rent_service.application.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import edu.belsu.rent_service.domain.User;
import edu.belsu.rent_service.application.exception.ApiException;
import edu.belsu.rent_service.adapters.out.persistence.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.OutputStream;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class TelegramVerificationService {

    @Value("${telegram.bot.token}")
    private String botToken;

    @Value("${telegram.bot.proxy.host:127.0.0.1}")
    private String proxyHost;

    @Value("${telegram.bot.proxy.port:10808}")
    private int proxyPort;

    private final UserRepository userRepository;
    private final Map<Long, TelegramVerification> pendingVerifications = new ConcurrentHashMap<>();
    private final SecureRandom random = new SecureRandom();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public TelegramVerificationService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    // Отправка кода подтверждения в Telegram
    public void sendVerificationCode(Long userId, String telegramUsername) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException("Пользователь не найден"));

        // Получаем chat_id по username
        Long chatId = getChatIdByUsername(telegramUsername);

        if (chatId == null) {
            throw new ApiException("❌ Не удалось найти пользователя @" + telegramUsername +
                    ". Напишите боту @RussiaRentBot любое сообщение, чтобы активировать диалог, и попробуйте снова.");
        }

        // Генерируем 6-значный код
        String code = String.format("%06d", random.nextInt(1000000));

        // Сохраняем код для верификации (действует 5 минут)
        pendingVerifications.put(userId, new TelegramVerification(code, userId, System.currentTimeMillis(), chatId, telegramUsername));

        // Отправляем сообщение в Telegram
        String message = "🔐 *Код подтверждения для Rent Service*\n\n" +
                "Ваш код: `" + code + "`\n\n" +
                "Введите этот код в веб-интерфейсе для подтверждения аккаунта.\n" +
                "Код действителен 5 минут.\n\n" +
                "Если вы не запрашивали код, просто проигнорируйте это сообщение.";

        sendTelegramMessage(chatId, message);
    }

    public void sendPasswordResetCode(Long chatId, String code) {
        String message = "Код подтверждения для смены пароля Rent Service: " + code
                + "\n\nВведите его в форме восстановления пароля. Код действует 10 минут.";
        sendTelegramMessage(chatId, message);
    }

    // Подтверждение кода
    public void verifyCode(Long userId, String code) {
        TelegramVerification verification = pendingVerifications.get(userId);

        if (verification == null) {
            throw new ApiException("Код не найден или истёк. Запросите новый код.");
        }

        if (System.currentTimeMillis() - verification.getTimestamp() > 5 * 60 * 1000) {
            pendingVerifications.remove(userId);
            throw new ApiException("Срок действия кода истёк. Запросите новый.");
        }

        if (!verification.getCode().equals(code)) {
            throw new ApiException("Неверный код подтверждения");
        }

        // Обновляем пользователя
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException("Пользователь не найден"));

        user.setTelegramId(verification.getChatId());
        userRepository.save(user);

        // Удаляем использованный код
        pendingVerifications.remove(userId);

        // Отправляем подтверждение в Telegram
        sendTelegramMessage(verification.getChatId(), "✅ *Telegram успешно подключён к Rent Service!*\n\nТеперь вы можете получать уведомления о новых сообщениях и бронированиях прямо в Telegram.");
    }

    // Получение chat_id по username
    private Long getChatIdByUsername(String username) {

        if (username.equals("un4va1lablxx")) {
            return 1888736157L; // ← ПОДСТАВЬ СВОЙ CHAT_ID ПОЛУЧЕННЫЙ ОТ @userinfobot
        }
        try {
            String cleanUsername = username.startsWith("@") ? username.substring(1) : username;

            // Пробуем через getChat
            String urlString = "https://api.telegram.org/bot" + botToken + "/getChat?chat_id=@" + cleanUsername;

            HttpURLConnection conn = createConnection(urlString);
            conn.setRequestMethod("GET");

            JsonNode response = objectMapper.readTree(conn.getInputStream());
            conn.disconnect();

            if (response.has("ok") && response.get("ok").asBoolean() && response.has("result")) {
                JsonNode result = response.get("result");
                if (result.has("id")) {
                    return result.get("id").asLong();
                }
            }
            return null;
        } catch (Exception e) {
            return null;
        }
    }

    // Отправка сообщения в Telegram
    private void sendTelegramMessage(Long chatId, String text) {
        try {
            String urlString = "https://api.telegram.org/bot" + botToken + "/sendMessage?chat_id=" + chatId + "&text=" + URLEncoder.encode(text, "UTF-8");
            HttpURLConnection conn = createConnection(urlString);
            conn.setRequestMethod("GET");
            conn.getResponseCode();
            conn.disconnect();
        } catch (Exception e) {
            System.err.println("Ошибка: " + e.getMessage());
        }
    }

    private HttpURLConnection createConnection(String urlString) throws Exception {
        URL url = new URL(urlString);
        Proxy proxy = new Proxy(Proxy.Type.HTTP, new InetSocketAddress(proxyHost, proxyPort));
        HttpURLConnection conn = (HttpURLConnection) url.openConnection(proxy);
        conn.setConnectTimeout(30000);
        conn.setReadTimeout(30000);
        return conn;
    }

    private String escapeJson(String s) {
        return s.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t")
                .replace("_", "\\_")
                .replace("*", "\\*")
                .replace("[", "\\[")
                .replace("]", "\\]")
                .replace("(", "\\(")
                .replace(")", "\\)")
                .replace("~", "\\~")
                .replace("`", "\\`")
                .replace(">", "\\>")
                .replace("#", "\\#")
                .replace("+", "\\+")
                .replace("-", "\\-")
                .replace("=", "\\=")
                .replace("|", "\\|")
                .replace("{", "\\{")
                .replace("}", "\\}")
                .replace(".", "\\.")
                .replace("!", "\\!");
    }

    private static class TelegramVerification {
        private final String code;
        private final Long userId;
        private final long timestamp;
        private final Long chatId;
        private final String username;

        public TelegramVerification(String code, Long userId, long timestamp, Long chatId, String username) {
            this.code = code;
            this.userId = userId;
            this.timestamp = timestamp;
            this.chatId = chatId;
            this.username = username;
        }

        public String getCode() { return code; }
        public Long getUserId() { return userId; }
        public long getTimestamp() { return timestamp; }
        public Long getChatId() { return chatId; }
        public String getUsername() { return username; }
    }
}
