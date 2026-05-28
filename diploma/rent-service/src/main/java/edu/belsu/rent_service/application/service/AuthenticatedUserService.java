package edu.belsu.rent_service.application.service;

import edu.belsu.rent_service.domain.User;
import edu.belsu.rent_service.application.exception.ApiException;
import edu.belsu.rent_service.adapters.out.persistence.repository.UserRepository;
import edu.belsu.rent_service.adapters.out.security.AuthUserDetails;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

@Service
public class AuthenticatedUserService {

    private final UserRepository userRepository;

    public AuthenticatedUserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public User getCurrentUser(Authentication authentication) {
        AuthUserDetails principal = getPrincipal(authentication);
        return userRepository.findById(principal.getId())
                .orElseThrow(() -> new ApiException("User not found"));
    }

    public AuthUserDetails getPrincipal(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof AuthUserDetails principal)) {
            throw new ApiException("Unauthorized");
        }
        return principal;
    }
}
