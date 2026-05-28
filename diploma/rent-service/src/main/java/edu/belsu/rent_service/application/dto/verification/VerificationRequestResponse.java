package edu.belsu.rent_service.application.dto.verification;

import lombok.Builder;

import java.time.LocalDateTime;

@Builder
public record VerificationRequestResponse(
        Long id,
        Long userId,
        String userName,
        String phoneNumber,
        String passportCitizenship,
        String passportNumber,
        String passportIssuedBy,
        String passportIssuedAt,
        String passportRegistrationAddress,
        String userVerificationStatus,
        String verificationType,
        String status,
        String cadastralNumber,
        String gosuslugiId,
        String failureReason,
        String requestData,
        String responseData,
        LocalDateTime createdAt,
        LocalDateTime completedAt
) {
}
