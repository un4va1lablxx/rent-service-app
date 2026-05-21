package edu.belsu.rent_service.service;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import okhttp3.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import java.io.IOException;
import java.util.concurrent.TimeUnit;

@Service
public class SmsService {

    private final OkHttpClient client = new OkHttpClient.Builder()
            .connectTimeout(30, TimeUnit.SECONDS)
            .build();

    private String authToken;

    @Value("${sigma.username}")
    private String username;

    @Value("${sigma.password}")
    private String password;

    @Value("${app.sms.debug}")
    private boolean debugMode;

    private static final String TOKEN_URL = "https://online.sigmasms.ru/api/login";
    private static final String SEND_URL = "https://online.sigmasms.ru/api/sendings";

    private synchronized String getToken() {
        if (authToken != null) return authToken;

        try {
            String json = String.format("{\"username\":\"%s\",\"password\":\"%s\"}", username, password);
            Request request = new Request.Builder()
                    .url(TOKEN_URL)
                    .post(RequestBody.create(json, MediaType.parse("application/json")))
                    .build();

            try (Response response = client.newCall(request).execute()) {
                String body = response.body().string();
                System.out.println("🔐 Ответ сервера при получении токена: " + body);

                if (response.code() == 200 && body != null && !body.isEmpty()) {
                    JsonObject jsonObject = JsonParser.parseString(body).getAsJsonObject();
                    if (jsonObject.has("token")) {
                        authToken = jsonObject.get("token").getAsString();
                        System.out.println("✅ SIGMA: Токен успешно получен");
                        return authToken;
                    } else {
                        System.err.println("❌ В ответе нет поля 'token': " + body);
                    }
                } else {
                    System.err.println("❌ Ошибка получения токена. HTTP код: " + response.code() + ", тело: " + body);
                }
            }
        } catch (Exception e) {
            System.err.println("Исключение при получении токена: " + e.getMessage());
        }
        return null;
    }

    public boolean sendSms(String phoneNumber, String code) {

        if (debugMode) {
            System.out.println("🔧 [DEBUG MODE] Код подтверждения для " + phoneNumber + ": " + code);
            return true;
        }

        String token = getToken();
        if (token == null) {
            System.err.println("❌ SIGMA: Нет токена, отправка невозможна");
            return false;
        }

        try {
            // Нормализуем номер телефона: убираем всё кроме цифр, затем добавляем +
            String rawNumber = phoneNumber.replaceAll("[^0-9]", "");
            // Убираем ведущий 8, если есть, заменяем на 7
            if (rawNumber.startsWith("8") && rawNumber.length() == 11) {
                rawNumber = "7" + rawNumber.substring(1);
            }
            // Если номер начинается с 9, добавляем 7
            if (rawNumber.startsWith("9")) {
                rawNumber = "7" + rawNumber;
            }
            String recipient;
            if (rawNumber.length() == 11 && rawNumber.startsWith("7")) {
                recipient = "+" + rawNumber;
            } else {
                recipient = rawNumber;
            }

            // Используем имя отправителя, которое гарантированно существует (например, B-Media)
            // Если вы зарегистрировали своё, замените ниже
            String senderName = "B-Media";  // ← стандартное имя для тестов

            String json = String.format(
                    "{\"recipient\":\"%s\",\"type\":\"sms\",\"payload\":{\"sender\":\"%s\",\"text\":\"Ваш код: %s\"}}",
                    recipient, senderName, code
            );

            System.out.println("📤 Отправляем JSON в SIGMA: " + json);

            Request request = new Request.Builder()
                    .url(SEND_URL)
                    .post(RequestBody.create(json, MediaType.parse("application/json")))
                    .addHeader("Authorization", token)
                    .addHeader("Content-Type", "application/json")
                    .build();

            try (Response response = client.newCall(request).execute()) {
                String responseBody = response.body().string();
                System.out.println("📥 Ответ SIGMA (HTTP " + response.code() + "): " + responseBody);

                if (response.code() == 200 && responseBody != null && !responseBody.isEmpty()) {
                    try {
                        JsonObject jsonObject = JsonParser.parseString(responseBody).getAsJsonObject();
                        if (jsonObject.has("id")) {
                            String messageId = jsonObject.get("id").getAsString();
                            System.out.println("✅ SIGMA: SMS отправлено. ID сообщения: " + messageId);
                            return true;
                        } else {
                            System.err.println("❌ Ответ не содержит 'id': " + responseBody);
                        }
                    } catch (Exception e) {
                        System.err.println("❌ Не удалось распарсить JSON ответа: " + e.getMessage());
                        System.err.println("Тело ответа: " + responseBody);
                    }
                } else {
                    System.err.println("❌ Ошибка отправки SMS. HTTP код: " + response.code() + ", тело: " + responseBody);
                }
            }
        } catch (IOException e) {
            System.err.println("IO ошибка при отправке SMS: " + e.getMessage());
        } catch (Exception e) {
            System.err.println("Неизвестная ошибка при отправке SMS: " + e.getMessage());
            e.printStackTrace();
        }
        return false;
    }
}