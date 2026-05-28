package edu.belsu.rent_service.application.dto.notification;

import lombok.Builder;

import java.time.LocalDateTime;

@Builder
public record AdminNotificationResponse(
        Long id,
        String title,
        String message,
        boolean read,
        LocalDateTime createdAt
) {
}
