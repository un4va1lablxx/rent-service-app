package edu.belsu.rent_service.application.dto.user;

import edu.belsu.rent_service.application.dto.ad.AdSummaryResponse;
import edu.belsu.rent_service.application.dto.review.ReviewResponse;
import lombok.Builder;

import java.util.List;

@Builder
public record PublicUserProfileResponse(
        Long id,
        String fullName,
        String avatarUrl,
        String verificationStatus,
        Double landlordRating,
        Integer landlordReviewsCount,
        Double tenantRating,
        Integer tenantReviewsCount,
        String trustLevel,
        List<AdSummaryResponse> ads,
        List<ReviewResponse> reviews
) {
}
