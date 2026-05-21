package edu.belsu.rent_service.dto.auth;

public record SmsCodeRequest(
        String phoneNumber,
        String purpose
) {
}
