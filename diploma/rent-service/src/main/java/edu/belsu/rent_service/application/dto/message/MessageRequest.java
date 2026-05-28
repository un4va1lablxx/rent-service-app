package edu.belsu.rent_service.application.dto.message;

public record MessageRequest(
        Long adId,
        Long toUserId,
        String text
) {
}
