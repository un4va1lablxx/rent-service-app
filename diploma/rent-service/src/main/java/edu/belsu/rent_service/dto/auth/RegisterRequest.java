package edu.belsu.rent_service.dto.auth;

public record RegisterRequest(
        String phoneNumber,
        String fullName,
        String password,
        String smsCode
) {
}
