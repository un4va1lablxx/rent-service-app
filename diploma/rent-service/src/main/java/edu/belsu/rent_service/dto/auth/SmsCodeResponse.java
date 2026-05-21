package edu.belsu.rent_service.dto.auth;

import lombok.Builder;

@Builder
public record SmsCodeResponse(
        String phoneNumber,
        String purpose,
        long expiresInSeconds,
        String debugCode
) {
}
