package edu.belsu.rent_service.adapters.out.security;

import edu.belsu.rent_service.domain.User;
import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;

@Getter
public class AuthUserDetails implements UserDetails {

    private final Long id;
    private final String phoneNumber;
    private final String password;
    private final boolean blocked;
    private final String role;

    public AuthUserDetails(User user) {
        this.id = user.getId();
        this.phoneNumber = user.getPhoneNumber();
        this.password = user.getPasswordHash();
        this.blocked = user.isBlocked();
        this.role = user.getRole();
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role.toUpperCase()));
    }

    @Override
    public String getPassword() {
        return password;
    }

    @Override
    public String getUsername() {
        return phoneNumber;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return !blocked;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return !blocked;
    }
}
