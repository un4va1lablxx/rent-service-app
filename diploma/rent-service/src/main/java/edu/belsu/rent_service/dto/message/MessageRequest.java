package edu.belsu.rent_service.dto.message;

public record MessageRequest(
        Long adId,
        Long toUserId,
        String text
) {
}
