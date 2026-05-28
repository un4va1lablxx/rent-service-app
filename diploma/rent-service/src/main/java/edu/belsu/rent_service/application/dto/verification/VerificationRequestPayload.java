package edu.belsu.rent_service.application.dto.verification;

public record VerificationRequestPayload(
        String verificationType,
        String cadastralNumber,
        String passportDocumentUrl,
        String snilsDocumentUrl,
        String egrnDocumentUrl,
        String gosuslugiId,
        Boolean consentFsspCheck,
        String preferredVideoSlot,
        String note
) {
}
