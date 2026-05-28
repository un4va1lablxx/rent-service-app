package edu.belsu.rent_service.application.dto.auth;

public record PasswordResetStartRequest(
        String phoneNumber
) {
}
