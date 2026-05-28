package edu.belsu.rent_service.application.dto.message;

public record ContractDeclineRequest(
        Long bookingId,
        Long contractId
) {
}
