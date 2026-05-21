package edu.belsu.rent_service.dto.admin;

public record UserVerificationUpdateRequest(
        boolean verified,
        boolean smsVerified,
        boolean gosuslugiVerified
) {
}
