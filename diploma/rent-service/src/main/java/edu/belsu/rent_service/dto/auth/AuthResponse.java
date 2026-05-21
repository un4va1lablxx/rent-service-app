package edu.belsu.rent_service.dto.auth;

import lombok.Builder;

@Builder
public record AuthResponse(
        String token,
        Long userId,
        String phoneNumber,
        String role
) {
}
