package edu.belsu.rent_service.application.service;

import edu.belsu.rent_service.domain.User;
import edu.belsu.rent_service.application.dto.auth.UserProfileResponse;
import edu.belsu.rent_service.application.dto.user.UserAvatarRequest;
import edu.belsu.rent_service.application.dto.user.UserPassportDetailsRequest;
import edu.belsu.rent_service.application.dto.user.UserPaymentDetailsRequest;
import edu.belsu.rent_service.application.dto.user.UserRoleRequest;
import edu.belsu.rent_service.application.exception.ApiException;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class UserProfileService {

    private final AuthenticatedUserService authenticatedUserService;
    private final RoleService roleService;
    private final SensitiveDataService sensitiveDataService;

    public UserProfileService(AuthenticatedUserService authenticatedUserService,
                              RoleService roleService,
                              SensitiveDataService sensitiveDataService) {
        this.authenticatedUserService = authenticatedUserService;
        this.roleService = roleService;
        this.sensitiveDataService = sensitiveDataService;
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
        String cardCvc = request == null ? null : normalizeOptional(request.payoutCardCvc());
        String cardExpiry = request == null ? null : normalizeOptional(request.payoutCardExpiry());

        if (!StringUtils.hasText(bankName)) {
            throw new ApiException("Укажите банк для зачисления");
        }
        if (!StringUtils.hasText(accountNumber)) {
            throw new ApiException("Укажите номер счета или карты для зачисления");
        }
        if (!StringUtils.hasText(cardCvc)) {
            throw new ApiException("Укажите CVC");
        }
        if (!cardCvc.matches("\\d{3,4}")) {
            throw new ApiException("CVC должен содержать 3 или 4 цифры");
        }
        if (!StringUtils.hasText(cardExpiry)) {
            throw new ApiException("Укажите срок действия карты");
        }
        if (!cardExpiry.matches("(0[1-9]|1[0-2])/[0-9]{4}")) {
            throw new ApiException("Срок действия карты должен быть в формате MM/YYYY");
        }

        user.setPayoutBankName(bankName);
        user.setPayoutAccountNumber(accountNumber);
        user.setPayoutCardCvc(cardCvc);
        user.setPayoutCardExpiry(cardExpiry);
        return mapUser(user);
    }

    @Transactional
    public UserProfileResponse deleteMyPaymentDetails(Authentication authentication) {
        User user = authenticatedUserService.getCurrentUser(authentication);
        user.setPayoutBankName(null);
        user.setPayoutAccountNumber(null);
        user.setPayoutCardCvc(null);
        user.setPayoutCardExpiry(null);
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
        return UserProfileResponse.builder()
                .id(user.getId())
                .phoneNumber(user.getPhoneNumber())
                .telegramId(user.getTelegramId())
                .telegramUsername(user.getTelegramUsername())
                .fullName(user.getFullName())
                .avatarUrl(user.getAvatarUrl())
                .role(user.getRole())
                .verificationStatus(user.getVerificationStatus())
                .rating(user.getRating())
                .reviewsCount(user.getReviewsCount())
                .landlordRating(user.getLandlordRating())
                .landlordReviewsCount(user.getLandlordReviewsCount())
                .tenantRating(user.getTenantRating())
                .tenantReviewsCount(user.getTenantReviewsCount())
                .trustLevel(user.getTrustLevel())
                .passportCitizenship(sensitiveDataService.decrypt(user.getPassportCitizenshipEncrypted()))
                .passportNumber(sensitiveDataService.decrypt(user.getPassportNumberEncrypted()))
                .passportIssuedBy(sensitiveDataService.decrypt(user.getPassportIssuedByEncrypted()))
                .passportIssuedAt(sensitiveDataService.decrypt(user.getPassportIssuedAtEncrypted()))
                .passportRegistrationAddress(sensitiveDataService.decrypt(user.getPassportRegistrationAddressEncrypted()))
                .payoutBankName(user.getPayoutBankName())
                .payoutAccountNumber(user.getPayoutAccountNumber())
                .payoutCardCvc(user.getPayoutCardCvc())
                .payoutCardExpiry(user.getPayoutCardExpiry())
                .verified(user.isVerified())
                .smsVerified(user.isSmsVerified())
                .gosuslugiVerified(user.isGosuslugiVerified())
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
