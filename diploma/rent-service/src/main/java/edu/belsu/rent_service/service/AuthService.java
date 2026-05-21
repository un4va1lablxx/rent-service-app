package edu.belsu.rent_service.service;

import edu.belsu.rent_service.domain.User;
import edu.belsu.rent_service.dto.auth.AuthResponse;
import edu.belsu.rent_service.dto.auth.LoginRequest;
import edu.belsu.rent_service.dto.auth.RegisterRequest;
import edu.belsu.rent_service.dto.auth.UserProfileResponse;
import edu.belsu.rent_service.exception.ApiException;
import edu.belsu.rent_service.repository.UserRepository;
import edu.belsu.rent_service.security.AuthUserDetails;
import edu.belsu.rent_service.security.JwtService;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final SmsCodeService smsCodeService;
    private final RoleService roleService;

    public AuthService(UserRepository userRepository,
                       JwtService jwtService,
                       SmsCodeService smsCodeService,
                       RoleService roleService) {
        this.userRepository = userRepository;
        this.jwtService = jwtService;
        this.smsCodeService = smsCodeService;
        this.roleService = roleService;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String phoneNumber = normalizePhone(request.phoneNumber());
        if (request.fullName() == null || request.fullName().isBlank()) {
            throw new ApiException("Требуется ввести ФИО");
        }
        if (userRepository.existsByPhoneNumber(phoneNumber)) {
            throw new ApiException("Пользователь с таким номером телефона уже существует");
        }

        boolean hasSmsCode = request.smsCode() != null && !request.smsCode().isBlank();
        if (!hasSmsCode) {
            throw new ApiException("Для регистрации нужно ввести код подтверждения");
        }

        String defaultRole = userRepository.count() == 0 ? "admin" : "user";

        User user = User.builder()
                .phoneNumber(phoneNumber)
                .encryptedPhone(phoneNumber)
                .fullName(request.fullName().trim())
                .role(roleService.normalizeRole(defaultRole))
                .preferredMessenger("web")
                .lastSeenAt(LocalDateTime.now())
                .build();

        smsCodeService.verifyCode(phoneNumber, "register", request.smsCode());
        user.setSmsVerified(true);
        user.setVerified(true);

        User savedUser = userRepository.save(user);
        return buildAuthResponse(savedUser);
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        String phoneNumber = normalizePhone(request.phoneNumber());
        User user = userRepository.findByPhoneNumber(phoneNumber)
                .orElseThrow(() -> new ApiException("Пользователь не найден"));

        if (user.isBlocked()) {
            throw new ApiException("Пользователь заблокирован");
        }

        boolean hasSmsCode = request.smsCode() != null && !request.smsCode().isBlank();
        if (!hasSmsCode) {
            throw new ApiException("Для входа в систему необходимо ввести код подтверждения");
        }

        smsCodeService.verifyCode(phoneNumber, "login", request.smsCode());
        user.setSmsVerified(true);
        user.setVerified(true);

        user.setLastSeenAt(LocalDateTime.now());
        User savedUser = userRepository.save(user);
        return buildAuthResponse(savedUser);
    }

    @Transactional(readOnly = true)
    public UserProfileResponse me(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof AuthUserDetails principal)) {
            throw new ApiException("Неавторизован");
        }

        User user = userRepository.findById(principal.getId())
                .orElseThrow(() -> new ApiException("Пользователь не найден"));

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

    private AuthResponse buildAuthResponse(User user) {
        return AuthResponse.builder()
                .token(jwtService.generateToken(user))
                .userId(user.getId())
                .phoneNumber(user.getPhoneNumber())
                .role(user.getRole())
                .build();
    }

    private String normalizePhone(String phoneNumber) {
        smsCodeService.validatePhone(phoneNumber);
        return phoneNumber.trim();
    }

    @Transactional
    public void issueSmsCode(String phoneNumber, String purpose) {
        smsCodeService.issueCode(phoneNumber, purpose);
    }

    @Transactional
    public AuthResponse authenticateUser(String phoneNumber, String smsCode) {
        String normalizedPhone = normalizePhone(phoneNumber);
        User user = userRepository.findByPhoneNumber(normalizedPhone)
                .orElseGet(() -> {
                    // Если пользователь не найден, создаём нового
                    String defaultRole = userRepository.count() == 0 ? "admin" : "user";
                    User newUser = User.builder()
                            .phoneNumber(normalizedPhone)
                            .encryptedPhone(normalizedPhone)
                            .fullName("Пользователь Telegram")
                            .role(roleService.normalizeRole(defaultRole))
                            .preferredMessenger("telegram")
                            .lastSeenAt(LocalDateTime.now())
                            .build();
                    return userRepository.save(newUser);
                });

        if (user.isBlocked()) {
            throw new ApiException("Пользователь заблокирован");
        }

        // Проверяем SMS код
        smsCodeService.verifyCode(normalizedPhone, "login", smsCode);

        user.setSmsVerified(true);
        user.setVerified(true);
        user.setLastSeenAt(LocalDateTime.now());
        user.setPreferredMessenger("telegram");

        User savedUser = userRepository.save(user);
        return buildAuthResponse(savedUser);
    }

}
