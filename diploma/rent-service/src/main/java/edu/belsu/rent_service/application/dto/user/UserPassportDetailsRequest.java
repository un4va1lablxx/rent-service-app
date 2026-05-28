package edu.belsu.rent_service.application.dto.user;

public record UserPassportDetailsRequest(
        String citizenship,
        String passportNumber,
        String passportIssuedBy,
        String passportIssuedAt,
        String registrationAddress
) {
}
