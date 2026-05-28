package edu.belsu.rent_service.application.dto.review;

import java.util.Map;

public record ReviewUpdateRequest(
        Integer rating,
        String comment,
        Map<String, Integer> categories
) {
}
