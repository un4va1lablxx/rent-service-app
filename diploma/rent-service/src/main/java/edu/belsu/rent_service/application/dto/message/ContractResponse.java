package edu.belsu.rent_service.application.dto.message;

import lombok.Builder;

import java.time.LocalDateTime;
import java.util.Map;

@Builder
public record ContractResponse(
        Long id,
        Long bookingId,
        String documentUrl,
        String status,
        LocalDateTime tenantSignedAt,
        LocalDateTime landlordSignedAt,
        LocalDateTime createdAt,
        Map<String, Object> snapshot
) {
}
