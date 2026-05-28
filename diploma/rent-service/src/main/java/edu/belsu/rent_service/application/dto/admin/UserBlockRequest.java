package edu.belsu.rent_service.application.dto.admin;

public record UserBlockRequest(
        boolean blocked,
        String reason
) {
}
