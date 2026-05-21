package edu.belsu.rent_service.dto.ad;

import lombok.Builder;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Builder
public record AdSummaryResponse(
        Long id,
        String title,
        String userFullName,
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
        Integer viewsCount,
        String primaryPhotoUrl,
        List<String> photoUrls,
        LocalDateTime publishedAt,
        LocalDateTime createdAt
) {

    public AdSummaryResponse(Long id, String title, String city, String rentalType,
                             Integer pricePerMonth, Integer pricePerDay, Integer maxGuests,
                             Integer rooms, Double area, String primaryPhotoUrl) {
        this(id, title, null, null, null, city, null, null, null, rentalType,
                rooms, pricePerMonth, pricePerDay, maxGuests,
                area != null ? BigDecimal.valueOf(area) : null,
                null, false, null, primaryPhotoUrl, null, null, null);
    }
}
