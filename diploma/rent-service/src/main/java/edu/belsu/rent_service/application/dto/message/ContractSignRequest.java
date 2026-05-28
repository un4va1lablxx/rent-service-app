package edu.belsu.rent_service.application.dto.message;

import java.time.LocalDate;

public record ContractSignRequest(
        String tenantCitizenship,
        String tenantPassportNumber,
        String tenantPassportIssuedBy,
        LocalDate tenantPassportIssuedAt,
        String tenantRegistrationAddress,
        boolean signConfirmed
) {
}
