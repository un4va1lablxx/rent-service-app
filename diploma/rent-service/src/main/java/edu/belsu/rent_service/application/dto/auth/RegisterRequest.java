package edu.belsu.rent_service.application.dto.auth;

public record RegisterRequest(
        String phoneNumber,
        String fullName,
        String password,
        String smsCode
) {
}
