package edu.belsu.rent_service.application.dto.booking;

import java.math.BigDecimal;
import java.time.LocalDate;

public record BookingCreateRequest(
        Long adId,
        LocalDate startDate,
        LocalDate endDate,
        BigDecimal agreedPrice,
        String message
) {
}
