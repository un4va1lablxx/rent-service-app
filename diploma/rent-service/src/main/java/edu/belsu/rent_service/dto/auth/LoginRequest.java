package edu.belsu.rent_service.dto.auth;

public record LoginRequest(
        String phoneNumber,
        String password,
        String smsCode
) {
}
