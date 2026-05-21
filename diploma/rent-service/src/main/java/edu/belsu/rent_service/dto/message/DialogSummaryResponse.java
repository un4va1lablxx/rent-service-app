package edu.belsu.rent_service.dto.message;

import lombok.Builder;

import java.time.LocalDateTime;

@Builder
public record DialogSummaryResponse(
        Long adId,
        String adTitle,
        Long otherUserId,
        String otherUserName,
        String lastMessageText,
        boolean lastMessageRead,
        long unreadCount,
        LocalDateTime lastMessageAt
) {
}
