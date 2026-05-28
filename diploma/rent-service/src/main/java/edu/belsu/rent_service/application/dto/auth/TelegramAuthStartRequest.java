package edu.belsu.rent_service.application.dto.auth;

public record TelegramAuthStartRequest(
        String phoneNumber,
        String fullName,
        String password
) {
}
