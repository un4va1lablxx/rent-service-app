package edu.belsu.rent_service.application.dto.auth;

public record LoginRequest(
        String phoneNumber,
        String password,
        String smsCode
) {
}
