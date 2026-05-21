package edu.belsu.rent_service.exception;

public class ApiException extends RuntimeException {
    public ApiException(String message) {
        super(message);
    }
}
