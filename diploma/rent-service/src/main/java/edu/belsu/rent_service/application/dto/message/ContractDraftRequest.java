package edu.belsu.rent_service.application.dto.message;

import java.time.LocalDate;

public record ContractDraftRequest(
        Long bookingId,
        LocalDate startDate,
        LocalDate endDate,
        String deposit,
        String rules,
        Boolean utilitiesIncluded,
        String checkInTime,
        String checkOutTime,
        String landlordCitizenship,
        String landlordPassportNumber,
        String landlordPassportIssuedBy,
        LocalDate landlordPassportIssuedAt,
        String landlordRegistrationAddress,
        boolean signImmediately
) {
}
