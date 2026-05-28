package edu.belsu.rent_service.application.dto.admin;

public record UserVerificationUpdateRequest(
        boolean verified,
        boolean smsVerified,
        boolean gosuslugiVerified,
        String verificationType,
        Boolean revokeOwnerVerification
) {
}
