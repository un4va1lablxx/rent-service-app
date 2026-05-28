package edu.belsu.rent_service.application.dto.review;

import java.util.Map;

public record ReviewCreateRequest(
        Long bookingId,
        Integer rating,
        String comment,
        Map<String, Integer> categories
) {
}
