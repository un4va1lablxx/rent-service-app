package edu.belsu.rent_service.application.dto.admin;

public record UserVerificationUpdateRequest(
        boolean verified,
        String verificationType,
        Boolean revokeOwnerVerification
) {
}
