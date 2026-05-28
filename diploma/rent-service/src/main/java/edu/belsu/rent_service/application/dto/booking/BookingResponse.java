package edu.belsu.rent_service.application.dto.booking;

import lombok.Builder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Builder
public record BookingResponse(
        Long id,
        Long adId,
        String adTitle,
        Long tenantId,
        String tenantName,
        Long landlordId,
        String landlordName,
        String status,
        LocalDate startDate,
        LocalDate endDate,
        BigDecimal agreedPrice,
        boolean contactRevealed,
        LocalDateTime completedAt,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
