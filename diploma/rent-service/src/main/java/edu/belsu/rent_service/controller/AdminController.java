package edu.belsu.rent_service.controller;

import edu.belsu.rent_service.dto.admin.AdModerationRequest;
import edu.belsu.rent_service.dto.admin.AdminStatsResponse;
import edu.belsu.rent_service.dto.admin.UserBlockRequest;
import edu.belsu.rent_service.dto.admin.UserRoleUpdateRequest;
import edu.belsu.rent_service.dto.admin.UserVerificationUpdateRequest;
import edu.belsu.rent_service.dto.ad.AdDetailsResponse;
import edu.belsu.rent_service.dto.ad.AdSummaryResponse;
import edu.belsu.rent_service.dto.auth.UserProfileResponse;
import edu.belsu.rent_service.service.AdminService;
import org.springframework.data.domain.Page;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final AdminService adminService;

    public AdminController(AdminService adminService) {
        this.adminService = adminService;
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
                                                      @RequestBody UserVerificationUpdateRequest request) {
        return adminService.updateUserVerification(userId, request);
    }

    @GetMapping("/ads/all")
    public Page<AdSummaryResponse> getAllAds(@RequestParam(required = false) String status,
                                             @RequestParam(defaultValue = "0") int page,
                                             @RequestParam(defaultValue = "20") int size) {
        return adminService.getAllAds(status, page, size);
    }

    @PatchMapping("/ads/{adId}/moderation")
    public AdDetailsResponse moderateAd(@PathVariable Long adId,
                                        @RequestBody AdModerationRequest request) {
        return adminService.moderateAd(adId, request);
    }

    @GetMapping("/stats")
    public AdminStatsResponse getStats() {
        return adminService.getStats();
    }
}
