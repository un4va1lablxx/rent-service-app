package edu.belsu.rent_service.application.service;

import edu.belsu.rent_service.application.dto.auth.UserProfileResponse;
import edu.belsu.rent_service.application.dto.user.UserAvatarRequest;
import edu.belsu.rent_service.application.dto.user.UserPassportDetailsRequest;
import edu.belsu.rent_service.application.dto.user.UserPaymentDetailsRequest;
import edu.belsu.rent_service.application.dto.user.UserRoleRequest;
import edu.belsu.rent_service.application.exception.ApiException;
import edu.belsu.rent_service.domain.User;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class UserProfileService {

    private final AuthenticatedUserService authenticatedUserService;
    private final RoleService roleService;
    private final SensitiveDataService sensitiveDataService;
    private final UserReviewStatsService userReviewStatsService;

    public UserProfileService(AuthenticatedUserService authenticatedUserService,
                              RoleService roleService,
                              SensitiveDataService sensitiveDataService,
                              UserReviewStatsService userReviewStatsService) {
        this.authenticatedUserService = authenticatedUserService;
        this.roleService = roleService;
        this.sensitiveDataService = sensitiveDataService;
        this.userReviewStatsService = userReviewStatsService;
    }

    @Transactional
    public UserProfileResponse updateMyRole(UserRoleRequest request, Authentication authentication) {
        User user = authenticatedUserService.getCurrentUser(authentication);
        user.setRole(roleService.normalizeSelfAssignableRole(request.role()));
        return mapUser(user);
    }

    @Transactional
    public UserProfileResponse updateMyPaymentDetails(UserPaymentDetailsRequest request, Authentication authentication) {
        User user = authenticatedUserService.getCurrentUser(authentication);
        String bankName = request == null ? null : normalizeOptional(request.payoutBankName());
        String accountNumber = request == null ? null : normalizeOptional(request.payoutAccountNumber());

        if (!StringUtils.hasText(bankName)) {
            throw new ApiException("Укажите банк для зачисления");
        }
        if (!StringUtils.hasText(accountNumber)) {
            throw new ApiException("Укажите номер карты для зачисления");
        }

        String normalizedDigits = accountNumber.replaceAll("\\s+", "");
        if (!normalizedDigits.matches("\\d{16,19}")) {
            throw new ApiException("Номер карты должен содержать от 16 до 19 цифр");
        }

        user.setPayoutBankName(bankName);
        user.setPayoutAccountNumber(sensitiveDataService.encryptCardNumber(normalizedDigits));
        return mapUser(user);
    }

    @Transactional
    public UserProfileResponse deleteMyPaymentDetails(Authentication authentication) {
        User user = authenticatedUserService.getCurrentUser(authentication);
        user.setPayoutBankName(null);
        user.setPayoutAccountNumber(null);
        return mapUser(user);
    }

    @Transactional
    public UserProfileResponse updateMyAvatar(UserAvatarRequest request, Authentication authentication) {
        User user = authenticatedUserService.getCurrentUser(authentication);
        String avatarUrl = request == null ? null : normalizeOptional(request.avatarUrl());

        if (!StringUtils.hasText(avatarUrl)) {
            throw new ApiException("Загрузите фото профиля");
        }

        user.setAvatarUrl(avatarUrl);
        return mapUser(user);
    }

    @Transactional
    public UserProfileResponse updateMyPassportDetails(UserPassportDetailsRequest request, Authentication authentication) {
        User user = authenticatedUserService.getCurrentUser(authentication);

        String citizenship = request == null ? null : normalizeOptional(request.citizenship());
        String passportNumber = request == null ? null : normalizeOptional(request.passportNumber());
        String passportIssuedBy = request == null ? null : normalizeOptional(request.passportIssuedBy());
        String passportIssuedAt = request == null ? null : normalizeOptional(request.passportIssuedAt());
        String registrationAddress = request == null ? null : normalizeOptional(request.registrationAddress());

        if (!StringUtils.hasText(citizenship)) {
            throw new ApiException("Укажите гражданство");
        }
        if (!StringUtils.hasText(passportNumber)) {
            throw new ApiException("Укажите серию и номер паспорта");
        }
        if (!StringUtils.hasText(passportIssuedBy)) {
            throw new ApiException("Укажите, кем выдан паспорт");
        }
        if (!StringUtils.hasText(passportIssuedAt)) {
            throw new ApiException("Укажите дату выдачи паспорта");
        }
        if (!passportIssuedAt.matches("\\d{4}-\\d{2}-\\d{2}")) {
            throw new ApiException("Дата выдачи паспорта должна быть в формате YYYY-MM-DD");
        }
        if (!StringUtils.hasText(registrationAddress)) {
            throw new ApiException("Укажите адрес регистрации");
        }

        user.setPassportCitizenshipEncrypted(sensitiveDataService.encrypt(citizenship));
        user.setPassportNumberEncrypted(sensitiveDataService.encrypt(passportNumber));
        user.setPassportIssuedByEncrypted(sensitiveDataService.encrypt(passportIssuedBy));
        user.setPassportIssuedAtEncrypted(sensitiveDataService.encrypt(passportIssuedAt));
        user.setPassportRegistrationAddressEncrypted(sensitiveDataService.encrypt(registrationAddress));
        return mapUser(user);
    }

    @Transactional
    public UserProfileResponse deleteMyPassportDetails(Authentication authentication) {
        User user = authenticatedUserService.getCurrentUser(authentication);
        user.setPassportCitizenshipEncrypted(null);
        user.setPassportNumberEncrypted(null);
        user.setPassportIssuedByEncrypted(null);
        user.setPassportIssuedAtEncrypted(null);
        user.setPassportRegistrationAddressEncrypted(null);
        return mapUser(user);
    }

    private UserProfileResponse mapUser(User user) {
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

    private String normalizeOptional(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
