package edu.belsu.rent_service.domain.policy;

import edu.belsu.rent_service.domain.exception.DomainException;
import edu.belsu.rent_service.domain.model.PropertyType;
import edu.belsu.rent_service.domain.model.RentalType;

public final class AdPolicy {

    private AdPolicy() {
    }

    public static RentalType normalizeRentalType(String rentalType) {
        return RentalType.from(rentalType);
    }

    public static PropertyType normalizePropertyType(String propertyType) {
        return PropertyType.from(propertyType);
    }

    public static void validateDraft(String title,
                                     RentalType rentalType,
                                     Integer pricePerMonth,
                                     Integer pricePerDay,
                                     Integer maxGuests) {
        if (title == null || title.isBlank()) {
            throw new DomainException("Title required");
        }

        if (rentalType == RentalType.LONG_TERM && pricePerMonth == null) {
            throw new DomainException("Monthly price required");
        }

        if (rentalType == RentalType.SHORT_TERM) {
            if (pricePerDay == null) {
                throw new DomainException("Daily price required");
            }
            if (maxGuests == null) {
                throw new DomainException("Guests required");
            }
        }
    }
}
