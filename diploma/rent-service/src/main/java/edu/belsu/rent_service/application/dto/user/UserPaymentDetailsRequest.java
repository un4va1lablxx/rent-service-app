package edu.belsu.rent_service.application.dto.user;

public record UserPaymentDetailsRequest(
        String payoutBankName,
        String payoutAccountNumber,
        String payoutCardCvc,
        String payoutCardExpiry
) {
}
