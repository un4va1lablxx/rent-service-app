package edu.belsu.rent_service.application.exception;

public class ApiException extends RuntimeException {
    public ApiException(String message) {
        super(message);
    }
}
