package edu.belsu.rent_service.application.dto.message;

public record PaymentChargeRequest(
        String cardholderName,
        String cardNumber,
        String expiryMonth,
        String expiryYear,
        String cvv
) {
}
