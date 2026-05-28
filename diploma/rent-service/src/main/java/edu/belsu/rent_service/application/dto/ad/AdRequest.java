package edu.belsu.rent_service.application.dto.ad;

import java.math.BigDecimal;
import java.util.List;

public record AdRequest(
        String title,
        String description,
        String address,
        String city,
        String district,
        String region,
        String propertyType,
        String rentalType,
        Double latitude,
        Double longitude,
        Integer rooms,
        Integer pricePerMonth,
        Integer pricePerDay,
        Integer maxGuests,
        BigDecimal area,
        Integer floor,
        Integer totalFloors,
        List<String> photoUrls
) {
}
