package edu.belsu.rent_service.application.dto.admin;

public record AdModerationRequest(
        String status,
        String comment
) {
}
