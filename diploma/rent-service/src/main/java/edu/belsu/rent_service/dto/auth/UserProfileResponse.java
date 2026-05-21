package edu.belsu.rent_service.dto.auth;

import lombok.Builder;

@Builder
public record UserProfileResponse(
        Long id,
        String phoneNumber,
        Long telegramId,
        String fullName,
        String role,
        boolean verified,
        boolean smsVerified,
        boolean gosuslugiVerified,
        boolean blocked
) {
}
