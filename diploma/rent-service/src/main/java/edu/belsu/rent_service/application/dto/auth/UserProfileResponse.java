package edu.belsu.rent_service.application.dto.auth;

import lombok.Builder;

@Builder
public record UserProfileResponse(
        Long id,
        String phoneNumber,
        Long telegramId,
        String telegramUsername,
        String fullName,
        String avatarUrl,
        String role,
        String verificationStatus,
        Double rating,
        Integer reviewsCount,
        Double landlordRating,
        Integer landlordReviewsCount,
        Double tenantRating,
        Integer tenantReviewsCount,
        String trustLevel,
        String passportCitizenship,
        String passportNumber,
        String passportIssuedBy,
        String passportIssuedAt,
        String passportRegistrationAddress,
        String payoutBankName,
        String payoutAccountNumber,
        String payoutCardCvc,
        String payoutCardExpiry,
        boolean verified,
        boolean smsVerified,
        boolean gosuslugiVerified,
        boolean blocked
) {
}
