package edu.belsu.rent_service.adapters.in.web.controller;

import edu.belsu.rent_service.application.dto.admin.AdModerationRequest;
import edu.belsu.rent_service.application.dto.admin.AdminStatsResponse;
import edu.belsu.rent_service.application.dto.admin.UserBlockRequest;
import edu.belsu.rent_service.application.dto.admin.UserRoleUpdateRequest;
import edu.belsu.rent_service.application.dto.admin.UserVerificationUpdateRequest;
import edu.belsu.rent_service.application.dto.ad.AdDetailsResponse;
import edu.belsu.rent_service.application.dto.ad.AdSummaryResponse;
import edu.belsu.rent_service.application.dto.auth.UserProfileResponse;
import edu.belsu.rent_service.application.dto.verification.VerificationDecisionRequest;
import edu.belsu.rent_service.application.dto.verification.VerificationRequestResponse;
import edu.belsu.rent_service.application.service.AdminService;
import edu.belsu.rent_service.application.service.VerificationService;
import org.springframework.data.domain.Page;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final AdminService adminService;

    private final VerificationService verificationService;

    public AdminController(AdminService adminService, VerificationService verificationService) {
        this.adminService = adminService;
        this.verificationService = verificationService;
    }

    @GetMapping("/users")
    public Page<UserProfileResponse> getUsers(@RequestParam(defaultValue = "0") int page,
                                              @RequestParam(defaultValue = "20") int size) {
        return adminService.getUsers(page, size);
    }

    @PatchMapping("/users/{userId}/role")
    public UserProfileResponse updateUserRole(@PathVariable Long userId,
                                              @RequestBody UserRoleUpdateRequest request) {
        return adminService.updateUserRole(userId, request);
    }

    @PatchMapping("/users/{userId}/block")
    public UserProfileResponse updateUserBlockStatus(@PathVariable Long userId,
                                                     @RequestBody UserBlockRequest request) {
        return adminService.updateUserBlockStatus(userId, request);
    }

    @PatchMapping("/users/{userId}/verification")
    public UserProfileResponse updateUserVerification(@PathVariable Long userId,
                                                      @RequestBody UserVerificationUpdateRequest request,
                                                      Authentication authentication) {
        return adminService.updateUserVerification(userId, request, authentication);
    }

    @GetMapping("/ads/all")
    public Page<AdSummaryResponse> getAllAds(@RequestParam(required = false) String status,
                                             @RequestParam(defaultValue = "0") int page,
                                             @RequestParam(defaultValue = "20") int size) {
        return adminService.getAllAds(status, page, size);
    }

    @GetMapping("/ads/{adId}")
    public AdDetailsResponse getAdDetails(@PathVariable Long adId) {
        return adminService.getAdDetails(adId);
    }

    @PatchMapping("/ads/{adId}/moderation")
    public AdDetailsResponse moderateAd(@PathVariable Long adId,
                                        @RequestBody AdModerationRequest request,
                                        Authentication authentication) {
        return adminService.moderateAd(adId, request, authentication);
    }

    @GetMapping("/verifications")
    public List<VerificationRequestResponse> getAdminRequests(
            @RequestParam(defaultValue = "pending") String status
    ) {
        return verificationService.getRequestsByStatus(status);
    }

    @PatchMapping("/verifications/{requestId}")
    public VerificationRequestResponse decideVerification(
            @PathVariable Long requestId,
            @RequestBody VerificationDecisionRequest request,
            Authentication authentication
    ) {
        return verificationService.decide(requestId, request, authentication);
    }

    @GetMapping("/stats")
    public AdminStatsResponse getStats() {
        return adminService.getStats();
    }
}
