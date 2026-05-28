package edu.belsu.rent_service.application.dto.auth;

public record TelegramAuthStartResponse(
        String requestId,
        String botLink,
        String qrCodeUrl,
        long expiresAt
) {
}
