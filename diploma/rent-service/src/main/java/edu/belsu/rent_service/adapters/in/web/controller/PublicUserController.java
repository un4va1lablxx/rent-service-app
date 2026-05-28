package edu.belsu.rent_service.adapters.in.web.controller;

import edu.belsu.rent_service.application.dto.user.PublicUserProfileResponse;
import edu.belsu.rent_service.application.service.PublicUserProfileService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
public class PublicUserController {

    private final PublicUserProfileService publicUserProfileService;

    public PublicUserController(PublicUserProfileService publicUserProfileService) {
        this.publicUserProfileService = publicUserProfileService;
    }

    @GetMapping("/{userId}/public")
    public PublicUserProfileResponse getPublicProfile(@PathVariable Long userId) {
        return publicUserProfileService.getPublicProfile(userId);
    }
}
