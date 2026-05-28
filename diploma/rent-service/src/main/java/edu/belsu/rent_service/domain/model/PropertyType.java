package edu.belsu.rent_service.domain.model;

import java.util.Locale;

public enum PropertyType {
    APARTMENT("apartment"),
    HOUSE("house");

    private final String code;

    PropertyType(String code) {
        this.code = code;
    }

    public String code() {
        return code;
    }

    public static PropertyType from(String value) {
        if (value == null || value.isBlank()) {
            return APARTMENT;
        }

        String normalized = value.trim().toLowerCase(Locale.ROOT);
        for (PropertyType type : values()) {
            if (type.code.equals(normalized)) {
                return type;
            }
        }

        throw new IllegalArgumentException("Unknown property type: " + value);
    }
}
