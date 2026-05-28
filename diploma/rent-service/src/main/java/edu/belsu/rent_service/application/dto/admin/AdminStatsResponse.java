package edu.belsu.rent_service.application.dto.admin;

import lombok.Builder;

@Builder
public record AdminStatsResponse(
        long usersCount,
        long adsCount,
        long activeAdsCount,
        long pendingAdsCount,
        long approvedAdsCount,
        long messagesCount
) {
}
