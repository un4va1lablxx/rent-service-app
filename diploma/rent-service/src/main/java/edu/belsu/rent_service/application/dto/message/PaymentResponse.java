package edu.belsu.rent_service.application.dto.message;

import lombok.Builder;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Builder
public record PaymentResponse(
        Long id,
        Long bookingId,
        Long contractId,
        String status,
        BigDecimal rentAmount,
        BigDecimal depositAmount,
        BigDecimal totalAmount,
        String rentLabel,
        String depositLabel,
        String totalLabel,
        String landlordName,
        String payoutBankName,
        String payoutAccountNumberMasked,
        String receiptUrl,
        LocalDateTime paidAt
) {
}
