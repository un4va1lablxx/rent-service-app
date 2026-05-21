package edu.belsu.rent_service.dto.review;

public record ReviewCreateRequest(
        Long bookingId,
        Integer rating,
        String comment
) {
}
