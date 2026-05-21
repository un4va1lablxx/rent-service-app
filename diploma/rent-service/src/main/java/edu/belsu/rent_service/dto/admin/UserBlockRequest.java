package edu.belsu.rent_service.dto.admin;

public record UserBlockRequest(
        boolean blocked,
        String reason
) {
}
