package edu.belsu.rent_service.dto.bot;

public enum UserState {
    AWAITING_PHONE,
    AWAITING_SMS_CODE,
    AUTHENTICATED,
    CREATING_AD,
    AWAITING_PHOTOS,
    SEARCHING
}