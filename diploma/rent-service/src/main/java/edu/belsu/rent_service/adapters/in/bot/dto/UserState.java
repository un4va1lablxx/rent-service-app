package edu.belsu.rent_service.adapters.in.bot.dto;

public enum UserState {
    AWAITING_PHONE,
    AWAITING_PASSWORD,
    AWAITING_FULL_NAME,
    AWAITING_WEB_CONTACT,
    AWAITING_SMS_CODE,
    AUTHENTICATED,
    CREATING_AD,
    AWAITING_PHOTOS,
    SEARCHING
}
