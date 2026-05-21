package edu.belsu.rent_service.dto.favorite;

import edu.belsu.rent_service.dto.ad.AdSummaryResponse;
import lombok.Builder;

import java.time.LocalDateTime;

@Builder
public record FavoriteResponse(
        Long id,
        Long adId,
        LocalDateTime createdAt,
        AdSummaryResponse ad
) {
}
