package edu.belsu.rent_service.dto.review;

import lombok.Builder;

import java.time.LocalDateTime;

@Builder
public record ReviewResponse(
        Long id,
        Long bookingId,
        Long adId,
        String adTitle,
        Long authorId,
        String authorName,
        Long targetUserId,
        String targetUserName,
        Integer rating,
        String comment,
        String moderationStatus,
        LocalDateTime createdAt
) {
}
