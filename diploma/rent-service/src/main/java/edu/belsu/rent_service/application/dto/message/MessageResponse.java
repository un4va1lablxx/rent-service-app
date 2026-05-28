package edu.belsu.rent_service.application.dto.message;

import lombok.Builder;

import java.time.LocalDateTime;

@Builder
public record MessageResponse(
        Long id,
        Long adId,
        Long fromUserId,
        String fromUserName,
        Long toUserId,
        String toUserName,
        String text,
        Long relatedId,
        String messageType,
        boolean containsContactDetails,
        boolean read,
        LocalDateTime deliveredAt,
        LocalDateTime readAt,
        LocalDateTime createdAt
) {
}
