package edu.belsu.rent_service.service;

import edu.belsu.rent_service.exception.ApiException;
import org.springframework.stereotype.Service;

import java.util.Set;

@Service
public class RoleService {

    private static final Set<String> ALLOWED_ROLES = Set.of("user", "landlord", "admin");
    private static final Set<String> SELF_ASSIGNABLE_ROLES = Set.of("user", "landlord");

    public String normalizeRole(String role) {
        if (role == null || role.isBlank()) {
            return "user";
        }
        String normalized = role.trim().toLowerCase();
        if (!ALLOWED_ROLES.contains(normalized)) {
            throw new ApiException("Unsupported role: " + role);
        }
        return normalized;
    }

    public String normalizeSelfAssignableRole(String role) {
        String normalized = normalizeRole(role);
        if (!SELF_ASSIGNABLE_ROLES.contains(normalized)) {
            throw new ApiException("You cannot assign this role to yourself");
        }
        return normalized;
    }
}
