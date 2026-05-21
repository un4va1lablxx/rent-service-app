package edu.belsu.rent_service.dto.verification;

public record VerificationDecisionRequest(
        String status,
        String failureReason
) {
}
