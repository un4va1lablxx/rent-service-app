package edu.belsu.rent_service.service;

import edu.belsu.rent_service.domain.User;
import edu.belsu.rent_service.dto.auth.UserProfileResponse;
import edu.belsu.rent_service.dto.user.UserRoleRequest;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserProfileService {

    private final AuthenticatedUserService authenticatedUserService;
    private final RoleService roleService;

    public UserProfileService(AuthenticatedUserService authenticatedUserService,
                              RoleService roleService) {
        this.authenticatedUserService = authenticatedUserService;
        this.roleService = roleService;
    }

    @Transactional
    public UserProfileResponse updateMyRole(UserRoleRequest request, Authentication authentication) {
        User user = authenticatedUserService.getCurrentUser(authentication);
        user.setRole(roleService.normalizeSelfAssignableRole(request.role()));
        return mapUser(user);
    }

    private UserProfileResponse mapUser(User user) {
        return UserProfileResponse.builder()
                .id(user.getId())
                .phoneNumber(user.getPhoneNumber())
                .fullName(user.getFullName())
                .role(user.getRole())
                .verified(user.isVerified())
                .smsVerified(user.isSmsVerified())
                .gosuslugiVerified(user.isGosuslugiVerified())
                .blocked(user.isBlocked())
                .build();
    }
}
