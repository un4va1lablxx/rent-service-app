package edu.belsu.rent_service.dto.verification;

public record VerificationRequestPayload(
        String verificationType,
        String gosuslugiId,
        String note
) {
}
