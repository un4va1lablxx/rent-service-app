package edu.belsu.rent_service.dto.verification;

import lombok.Builder;

import java.time.LocalDateTime;

@Builder
public record VerificationRequestResponse(
        Long id,
        Long userId,
        String userName,
        String phoneNumber,
        String verificationType,
        String status,
        String gosuslugiId,
        String failureReason,
        String requestData,
        LocalDateTime createdAt,
        LocalDateTime completedAt
) {
}
