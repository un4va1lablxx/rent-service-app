package edu.belsu.rent_service.application.dto.review;

import lombok.Builder;

import java.time.LocalDateTime;
import java.util.Map;

@Builder
public record ReviewResponse(
        Long id,
        Long contractId,
        Long bookingId,
        Long adId,
        String adTitle,
        Long authorId,
        String authorName,
        String authorAvatarUrl,
        Long targetUserId,
        String targetUserName,
        String roleOfReviewer,
        Integer rating,
        String comment,
        Map<String, Integer> categories,
        boolean visible,
        String moderationStatus,
        LocalDateTime createdAt
) {
}
