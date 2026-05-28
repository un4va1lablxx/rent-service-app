package edu.belsu.rent_service.application.dto.message;

import java.time.LocalDateTime;

public record ViewingProposalRequest(
        Long adId,
        Long otherUserId,
        LocalDateTime proposedDateTime
) {
}
