package edu.belsu.rent_service.application.dto.auth;

public record SmsCodeRequest(
        String phoneNumber,
        String purpose
) {
}
