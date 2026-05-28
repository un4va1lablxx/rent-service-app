package edu.belsu.rent_service.application.dto.verification;

public record VerificationDecisionRequest(
        String status,
        String failureReason
) {
}
