package edu.belsu.rent_service.application.dto.ad;

import lombok.Builder;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Builder
public record AdDetailsResponse(
        Long id,
        Long ownerId,
        String ownerName,
        String ownerAvatarUrl,
        Double ownerRating,
        Integer ownerReviewsCount,
        String ownerTrustLevel,
        String ownerVerificationStatus,
        String ownerPhoneNumber,
        String title,
        String description,
        String address,
        String city,
        String district,
        String region,
        String propertyType,
        String rentalType,
        Double latitude,
        Double longitude,
        Integer rooms,
        Integer pricePerMonth,
        Integer pricePerDay,
        Integer maxGuests,
        BigDecimal area,
        Integer floor,
        Integer totalFloors,
        String moderationStatus,
        String moderationComment,
        boolean active,
        boolean autoModerationFlagged,
        boolean duplicatePhotoDetected,
        Integer viewsCount,
        Long favoritesCount,
        Long messagesCount,
        List<String> photoUrls,
        List<AdSummaryResponse> duplicateAds,
        LocalDateTime publishedAt,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
