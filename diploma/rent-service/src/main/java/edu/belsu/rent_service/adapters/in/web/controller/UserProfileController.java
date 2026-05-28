package edu.belsu.rent_service.adapters.in.web.controller;

import edu.belsu.rent_service.application.dto.auth.UserProfileResponse;
import edu.belsu.rent_service.application.dto.user.UserAvatarRequest;
import edu.belsu.rent_service.application.dto.user.UserPassportDetailsRequest;
import edu.belsu.rent_service.application.dto.user.UserPaymentDetailsRequest;
import edu.belsu.rent_service.application.dto.user.UserRoleRequest;
import edu.belsu.rent_service.application.service.UserProfileService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users/me")
public class UserProfileController {

    private final UserProfileService userProfileService;

    public UserProfileController(UserProfileService userProfileService) {
        this.userProfileService = userProfileService;
    }

    @PatchMapping("/role")
    public UserProfileResponse updateMyRole(@RequestBody UserRoleRequest request,
                                            Authentication authentication) {
        return userProfileService.updateMyRole(request, authentication);
    }

    @PatchMapping("/payment-details")
    public UserProfileResponse updateMyPaymentDetails(@RequestBody UserPaymentDetailsRequest request,
                                                      Authentication authentication) {
        return userProfileService.updateMyPaymentDetails(request, authentication);
    }

    @DeleteMapping("/payment-details")
    public UserProfileResponse deleteMyPaymentDetails(Authentication authentication) {
        return userProfileService.deleteMyPaymentDetails(authentication);
    }

    @PatchMapping("/passport-details")
    public UserProfileResponse updateMyPassportDetails(@RequestBody UserPassportDetailsRequest request,
                                                       Authentication authentication) {
        return userProfileService.updateMyPassportDetails(request, authentication);
    }

    @DeleteMapping("/passport-details")
    public UserProfileResponse deleteMyPassportDetails(Authentication authentication) {
        return userProfileService.deleteMyPassportDetails(authentication);
    }

    @PatchMapping("/avatar")
    public UserProfileResponse updateMyAvatar(@RequestBody UserAvatarRequest request,
                                              Authentication authentication) {
        return userProfileService.updateMyAvatar(request, authentication);
    }
}
