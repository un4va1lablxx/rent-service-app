package edu.belsu.rent_service.application.dto.auth;

public record TelegramAuthStatusResponse(
        String status,
        AuthResponse auth
) {
}
