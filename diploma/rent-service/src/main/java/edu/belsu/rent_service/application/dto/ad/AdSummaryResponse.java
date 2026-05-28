package edu.belsu.rent_service.application.dto.ad;

import lombok.Builder;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Builder
public record AdSummaryResponse(
        Long id,
        Long ownerId,
        String title,
        String userFullName,
        String ownerAvatarUrl,
        Double ownerRating,
        Integer ownerReviewsCount,
        String ownerTrustLevel,
        String ownerVerificationStatus,
        String description,
        String userPhone,
        String city,
        String district,
        String region,
        String propertyType,
        String rentalType,
        Integer rooms,
        Integer pricePerMonth,
        Integer pricePerDay,
        Integer maxGuests,
        BigDecimal area,
        String moderationStatus,
        boolean active,
        boolean duplicatePhotoDetected,
        Integer viewsCount,
        String primaryPhotoUrl,
        List<String> photoUrls,
        LocalDateTime publishedAt,
        LocalDateTime createdAt
) {

    public AdSummaryResponse(Long id, String title, String city, String rentalType,
                             Integer pricePerMonth, Integer pricePerDay, Integer maxGuests,
                             Integer rooms, Double area, String primaryPhotoUrl) {
        this(id, null, title, null, null, null, null, null, null, null, null, city, null, null, null, rentalType,
                rooms, pricePerMonth, pricePerDay, maxGuests,
                area != null ? BigDecimal.valueOf(area) : null,
                null, false, false, null, primaryPhotoUrl, null, null, null);
    }
}
