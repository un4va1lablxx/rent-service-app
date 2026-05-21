package edu.belsu.rent_service.dto.admin;

public record AdModerationRequest(
        String status,
        String comment
) {
}
