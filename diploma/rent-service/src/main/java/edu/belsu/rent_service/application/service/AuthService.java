package edu.belsu.rent_service.application.service;

import edu.belsu.rent_service.domain.User;
import edu.belsu.rent_service.application.dto.auth.AuthResponse;
import edu.belsu.rent_service.application.dto.auth.LoginRequest;
import edu.belsu.rent_service.application.dto.auth.PasswordResetConfirmRequest;
import edu.belsu.rent_service.application.dto.auth.PasswordResetStartRequest;
import edu.belsu.rent_service.application.dto.auth.RegisterRequest;
import edu.belsu.rent_service.application.dto.auth.TelegramAuthStartRequest;
import edu.belsu.rent_service.application.dto.auth.TelegramAuthStartResponse;
import edu.belsu.rent_service.application.dto.auth.TelegramAuthStatusResponse;
import edu.belsu.rent_service.application.dto.auth.UserProfileResponse;
import edu.belsu.rent_service.application.exception.ApiException;
import edu.belsu.rent_service.adapters.out.persistence.repository.UserRepository;
import edu.belsu.rent_service.adapters.out.security.AuthUserDetails;
import edu.belsu.rent_service.adapters.out.security.JwtService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final RoleService roleService;
    private final PasswordEncoder passwordEncoder;
    private final TelegramVerificationService telegramVerificationService;
    private final SensitiveDataService sensitiveDataService;
    private final UserReviewStatsService userReviewStatsService;
    private final Map<String, PendingTelegramAuth> pendingTelegramAuth = new ConcurrentHashMap<>();
    private final Map<String, PendingPasswordReset> pendingPasswordResets = new ConcurrentHashMap<>();
    private final SecureRandom random = new SecureRandom();

    @Value("${telegram.bot.username:RussiaRentBot}")
    private String telegramBotUsername;

    public AuthService(UserRepository userRepository,
                       JwtService jwtService,
                       RoleService roleService,
                       PasswordEncoder passwordEncoder,
                       TelegramVerificationService telegramVerificationService,
                       SensitiveDataService sensitiveDataService,
                       UserReviewStatsService userReviewStatsService) {
        this.userRepository = userRepository;
        this.jwtService = jwtService;
        this.roleService = roleService;
        this.passwordEncoder = passwordEncoder;
        this.telegramVerificationService = telegramVerificationService;
        this.sensitiveDataService = sensitiveDataService;
        this.userReviewStatsService = userReviewStatsService;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String phoneNumber = normalizePhone(request.phoneNumber());
        if (request.fullName() == null || request.fullName().isBlank()) {
            throw new ApiException("Требуется ввести ФИО");
        }
        validatePassword(request.password());
        if (userRepository.existsByPhoneNumber(phoneNumber)) {
            throw new ApiException("Пользователь с таким номером телефона уже существует");
        }

        String defaultRole = userRepository.count() == 0 ? "admin" : "user";
        User user = User.builder()
                .phoneNumber(phoneNumber)
                .passwordHash(passwordEncoder.encode(request.password()))
                .fullName(request.fullName().trim())
                .role(roleService.normalizeRole(defaultRole))
                .build();

        return buildAuthResponse(userRepository.save(user));
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        String phoneNumber = normalizePhone(request.phoneNumber());
        User user = userRepository.findByPhoneNumber(phoneNumber)
                .orElseThrow(() -> new ApiException("Пользователь с таким номером телефона не существует"));

        if (user.isBlocked()) {
            throw new ApiException("Пользователь заблокирован");
        }
        if (user.getPasswordHash() == null || !passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new ApiException("Неверный пароль");
        }

        return buildAuthResponse(userRepository.save(user));
    }

    @Transactional(readOnly = true)
    public UserProfileResponse me(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof AuthUserDetails principal)) {
            throw new ApiException("Неавторизован");
        }

        User user = userRepository.findById(principal.getId())
                .orElseThrow(() -> new ApiException("Пользователь не найден"));

        UserReviewStatsService.UserReviewStats stats = userReviewStatsService.getStats(user.getId());
        return UserProfileResponse.builder()
                .id(user.getId())
                .phoneNumber(user.getPhoneNumber())
                .telegramId(user.getTelegramId())
                .telegramUsername(user.getTelegramUsername())
                .fullName(user.getFullName())
                .avatarUrl(user.getAvatarUrl())
                .role(user.getRole())
                .verificationStatus(user.getVerificationStatus())
                .rating(stats.rating())
                .reviewsCount(stats.reviewsCount())
                .landlordRating(stats.landlordRating())
                .landlordReviewsCount(stats.landlordReviewsCount())
                .tenantRating(stats.tenantRating())
                .tenantReviewsCount(stats.tenantReviewsCount())
                .trustLevel(stats.trustLevel())
                .passportCitizenship(sensitiveDataService.decrypt(user.getPassportCitizenshipEncrypted()))
                .passportNumber(sensitiveDataService.decrypt(user.getPassportNumberEncrypted()))
                .passportIssuedBy(sensitiveDataService.decrypt(user.getPassportIssuedByEncrypted()))
                .passportIssuedAt(sensitiveDataService.decrypt(user.getPassportIssuedAtEncrypted()))
                .passportRegistrationAddress(sensitiveDataService.decrypt(user.getPassportRegistrationAddressEncrypted()))
                .payoutBankName(user.getPayoutBankName())
                .payoutAccountNumber(sensitiveDataService.decryptCardNumberOrOriginal(user.getPayoutAccountNumber()))
                .verified(userReviewStatsService.isVerified(user.getVerificationStatus()))
                .blocked(user.isBlocked())
                .build();
    }


    public TelegramAuthStartResponse startTelegramRegistration(TelegramAuthStartRequest request) {
        String phoneNumber = normalizePhone(request.phoneNumber());
        if (request.fullName() == null || request.fullName().isBlank()) {
            throw new ApiException("Требуется ввести ФИО");
        }
        validatePassword(request.password());
        if (userRepository.existsByPhoneNumber(phoneNumber)) {
            throw new ApiException("Пользователь с таким номером телефона уже существует");
        }
        return createPendingTelegramAuth("web_register", phoneNumber, request.fullName().trim(), request.password());
    }

    public TelegramAuthStartResponse startTelegramLogin(TelegramAuthStartRequest request) {
        String phoneNumber = normalizePhone(request.phoneNumber());
        User user = userRepository.findByPhoneNumber(phoneNumber)
                .orElseThrow(() -> new ApiException("Пользователь не найден"));
        if (user.isBlocked()) {
            throw new ApiException("Пользователь заблокирован");
        }
        return createPendingTelegramAuth("web_login", phoneNumber, null, null);
    }

    public TelegramAuthStatusResponse getTelegramAuthStatus(String requestId) {
        PendingTelegramAuth pending = pendingTelegramAuth.get(requestId);
        if (pending == null || pending.isExpired()) {
            pendingTelegramAuth.remove(requestId);
            return new TelegramAuthStatusResponse("expired", null);
        }
        return new TelegramAuthStatusResponse(pending.authResponse() == null ? "pending" : "completed", pending.authResponse());
    }

    @Transactional
    public void completeTelegramWebAuth(String requestId, String phoneNumber, Long telegramId, String telegramUsername) {
        PendingTelegramAuth pending = pendingTelegramAuth.get(requestId);
        if (pending == null || pending.isExpired()) {
            throw new ApiException("Запрос не найден или истек");
        }

        String normalizedPhone = normalizePhone(phoneNumber);
        if (!pending.phoneNumber().equals(normalizedPhone)) {
            throw new ApiException("Полученный номер телефона не совпадает с введенным при регистрации на сайте!");
        }

        AuthResponse authResponse = "web_register".equals(pending.type())
                ? registerFromTelegram(normalizedPhone, pending.fullName(), pending.password(), telegramId, telegramUsername)
                : loginFromTelegram(normalizedPhone, null, telegramId, telegramUsername, true);
        pendingTelegramAuth.put(requestId, pending.complete(authResponse));
    }

    @Transactional
    public AuthResponse registerFromTelegram(String phoneNumber, String fullName, String password, Long telegramId, String telegramUsername) {
        String normalizedPhone = normalizePhone(phoneNumber);
        if (fullName == null || fullName.isBlank()) {
            throw new ApiException("Требуется ввести ФИО");
        }
        validatePassword(password);
        if (userRepository.existsByPhoneNumber(normalizedPhone)) {
            throw new ApiException("Пользователь с таким номером уже существует");
        }

        String defaultRole = userRepository.count() == 0 ? "admin" : "user";
        User user = User.builder()
                .phoneNumber(normalizedPhone)
                .passwordHash(passwordEncoder.encode(password))
                .fullName(fullName.trim())
                .telegramId(telegramId)
                .telegramUsername(telegramUsername)
                .role(roleService.normalizeRole(defaultRole))
                .build();
        return buildAuthResponse(userRepository.save(user));
    }

    @Transactional
    public AuthResponse loginFromTelegram(String phoneNumber,
                                          String password,
                                          Long telegramId,
                                          String telegramUsername,
                                          boolean trustedTelegramContact) {
        String normalizedPhone = normalizePhone(phoneNumber);
        User user = userRepository.findByPhoneNumber(normalizedPhone)
                .orElseThrow(() -> new ApiException("Пользователь не найден"));

        if (user.isBlocked()) {
            throw new ApiException("Пользователь заблокирован");
        }
        if (!trustedTelegramContact && (user.getPasswordHash() == null || !passwordEncoder.matches(password, user.getPasswordHash()))) {
            throw new ApiException("Неверный пароль");
        }

        user.setTelegramId(telegramId);
        user.setTelegramUsername(telegramUsername);
        return buildAuthResponse(userRepository.save(user));
    }

    public boolean userExists(String phoneNumber) {
        return userRepository.existsByPhoneNumber(normalizePhone(phoneNumber));
    }

    public void startPasswordReset(PasswordResetStartRequest request) {
        String phoneNumber = normalizePhone(request.phoneNumber());
        User user = userRepository.findByPhoneNumber(phoneNumber)
                .orElseThrow(() -> new ApiException("Пользователь с таким номером телефона не существует"));
        if (user.isBlocked()) {
            throw new ApiException("Пользователь заблокирован");
        }
        if (user.getTelegramId() == null) {
            throw new ApiException("К этому аккаунту не привязан Telegram. Восстановление пароля через Telegram недоступно");
        }

        String code = String.format("%06d", random.nextInt(1_000_000));
        long expiresAt = System.currentTimeMillis() + 10 * 60 * 1000;
        pendingPasswordResets.put(phoneNumber, new PendingPasswordReset(code, expiresAt));
        telegramVerificationService.sendPasswordResetCode(user.getTelegramId(), code);
    }

    @Transactional
    public void confirmPasswordReset(PasswordResetConfirmRequest request) {
        String phoneNumber = normalizePhone(request.phoneNumber());
        PendingPasswordReset pending = pendingPasswordResets.get(phoneNumber);
        if (pending == null || pending.isExpired()) {
            pendingPasswordResets.remove(phoneNumber);
            throw new ApiException("Код подтверждения не найден или истек");
        }
        if (request.code() == null || !pending.code().equals(request.code().trim())) {
            throw new ApiException("Неверный код подтверждения");
        }

        validatePassword(request.newPassword());
        User user = userRepository.findByPhoneNumber(phoneNumber)
                .orElseThrow(() -> new ApiException("Пользователь с таким номером телефона не существует"));
        if (user.getPasswordHash() != null && passwordEncoder.matches(request.newPassword(), user.getPasswordHash())) {
            throw new ApiException("Новый пароль не может совпадать со старым");
        }
        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);
        pendingPasswordResets.remove(phoneNumber);
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
        if (phoneNumber == null || !phoneNumber.matches("^\\+?[0-9]{10,15}$")) {
            throw new ApiException("Phone must match +79991234567 format");
        }
        return phoneNumber.trim();
    }

    private TelegramAuthStartResponse createPendingTelegramAuth(String type, String phoneNumber, String fullName, String password) {
        String requestId = UUID.randomUUID().toString();
        long expiresAt = System.currentTimeMillis() + 10 * 60 * 1000;
        pendingTelegramAuth.put(requestId, new PendingTelegramAuth(type, phoneNumber, fullName, password, expiresAt, null));
        String botLink = "https://t.me/" + telegramBotUsername + "?start=" + type + "_" + requestId;
        String qrCodeUrl = "https://api.qrserver.com/v1/create-qr-code/?size=220x220&data="
                + URLEncoder.encode(botLink, StandardCharsets.UTF_8);
        return new TelegramAuthStartResponse(requestId, botLink, qrCodeUrl, expiresAt);
    }

    private void validatePassword(String password) {
        if (password == null || password.isBlank()) {
            throw new ApiException("Поле пароля обязательно для заполнения");
        }
        if (password.length() < 6) {
            throw new ApiException("Пароль должен быть не короче 6 символов");
        }
    }

    private record PendingTelegramAuth(
            String type,
            String phoneNumber,
            String fullName,
            String password,
            long expiresAt,
            AuthResponse authResponse
    ) {
        boolean isExpired() {
            return System.currentTimeMillis() > expiresAt;
        }

        PendingTelegramAuth complete(AuthResponse authResponse) {
            return new PendingTelegramAuth(type, phoneNumber, fullName, password, expiresAt, authResponse);
        }
    }

    private record PendingPasswordReset(
            String code,
            long expiresAt
    ) {
        boolean isExpired() {
            return System.currentTimeMillis() > expiresAt;
        }
    }
}
