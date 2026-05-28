package edu.belsu.rent_service.adapters.in.web.controller;

import edu.belsu.rent_service.application.dto.verification.VerificationRequestPayload;
import edu.belsu.rent_service.application.dto.verification.VerificationRequestResponse;
import edu.belsu.rent_service.application.service.VerificationService;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/verifications")
public class VerificationController {

    private final VerificationService verificationService;

    public VerificationController(VerificationService verificationService) {
        this.verificationService = verificationService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public VerificationRequestResponse createRequest(@RequestBody VerificationRequestPayload payload,
                                                     Authentication authentication) {
        return verificationService.createRequest(payload, authentication);
    }

    @GetMapping("/me")
    public List<VerificationRequestResponse> getMyRequests(Authentication authentication) {
        return verificationService.getMyRequests(authentication);
    }

    @DeleteMapping("/{requestId}/documents/{fieldKey}")
    public VerificationRequestResponse removeMyDocument(@PathVariable Long requestId,
                                                        @PathVariable String fieldKey,
                                                        Authentication authentication) {
        return verificationService.removeMyDocument(requestId, fieldKey, authentication);
    }
}
