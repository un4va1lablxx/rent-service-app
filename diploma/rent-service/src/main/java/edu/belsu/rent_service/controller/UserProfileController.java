package edu.belsu.rent_service.controller;

import edu.belsu.rent_service.dto.auth.UserProfileResponse;
import edu.belsu.rent_service.dto.user.UserRoleRequest;
import edu.belsu.rent_service.service.UserProfileService;
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
}
