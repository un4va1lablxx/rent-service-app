package edu.belsu.rent_service.domain.model;

import java.util.Locale;

public enum RentalType {
    LONG_TERM("long_term"),
    SHORT_TERM("short_term");

    private final String code;

    RentalType(String code) {
        this.code = code;
    }

    public String code() {
        return code;
    }

    public static RentalType from(String value) {
        if (value == null || value.isBlank()) {
            return LONG_TERM;
        }

        String normalized = value.trim().toLowerCase(Locale.ROOT);
        for (RentalType type : values()) {
            if (type.code.equals(normalized)) {
                return type;
            }
        }

        throw new IllegalArgumentException("Unknown rental type: " + value);
    }
}
