package edu.belsu.rent_service.application.dto.auth;

public record PasswordResetConfirmRequest(
        String phoneNumber,
        String code,
        String newPassword
) {
}
