package edu.belsu.rent_service.application.service;

import edu.belsu.rent_service.domain.Ad;
import edu.belsu.rent_service.domain.User;
import edu.belsu.rent_service.application.dto.admin.AdModerationRequest;
import edu.belsu.rent_service.application.dto.admin.AdminStatsResponse;
import edu.belsu.rent_service.application.dto.admin.UserBlockRequest;
import edu.belsu.rent_service.application.dto.admin.UserRoleUpdateRequest;
import edu.belsu.rent_service.application.dto.admin.UserVerificationUpdateRequest;
import edu.belsu.rent_service.application.dto.auth.UserProfileResponse;
import edu.belsu.rent_service.application.dto.ad.AdDetailsResponse;
import edu.belsu.rent_service.application.dto.ad.AdSummaryResponse;
import edu.belsu.rent_service.application.exception.ApiException;
import edu.belsu.rent_service.adapters.out.persistence.repository.AdRepository;
import edu.belsu.rent_service.adapters.out.persistence.repository.MessageRepository;
import edu.belsu.rent_service.adapters.out.persistence.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminService {

    private final UserRepository userRepository;
    private final AdRepository adRepository;
    private final MessageRepository messageRepository;
    private final RoleService roleService;
    private final AdService adService;
    private final AuthenticatedUserService authenticatedUserService;
    private final SensitiveDataService sensitiveDataService;
    private final NotificationService notificationService;
    private final UserReviewStatsService userReviewStatsService;

    public AdminService(UserRepository userRepository,
                         AdRepository adRepository,
                         MessageRepository messageRepository,
                         RoleService roleService,
                         AdService adService,
                         AuthenticatedUserService authenticatedUserService,
                         SensitiveDataService sensitiveDataService,
                         NotificationService notificationService,
                         UserReviewStatsService userReviewStatsService) {
        this.userRepository = userRepository;
        this.adRepository = adRepository;
        this.messageRepository = messageRepository;
        this.roleService = roleService;
        this.adService = adService;
        this.authenticatedUserService = authenticatedUserService;
        this.sensitiveDataService = sensitiveDataService;
        this.notificationService = notificationService;
        this.userReviewStatsService = userReviewStatsService;
    }

    @Transactional(readOnly = true)
    public Page<UserProfileResponse> getUsers(int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return userRepository.findAll(pageable).map(this::mapUser);
    }

    @Transactional
    public UserProfileResponse updateUserRole(Long userId, UserRoleUpdateRequest request) {
        User user = getUser(userId);
        user.setRole(roleService.normalizeRole(request.role()));
        return mapUser(userRepository.save(user));
    }

    @Transactional
    public UserProfileResponse updateUserBlockStatus(Long userId, UserBlockRequest request) {
        User user = getUser(userId);
        user.setBlocked(request.blocked());
        user.setBlockReason(request.blocked() ? request.reason() : null);
        notificationService.notifyUser(
                user.getId(),
                "Вы получили сообщение от администратора",
                request.blocked()
                        ? "Ваш аккаунт заблокирован администратором. Причина: " + (request.reason() == null ? "не указана" : request.reason())
                        : "Блокировка аккаунта снята администратором."
        );
        return mapUser(userRepository.save(user));
    }

    @Transactional
    public UserProfileResponse updateUserVerification(Long userId,
                                                      UserVerificationUpdateRequest request,
                                                      Authentication authentication) {
        User user = getUser(userId);
        if (request.verified()) {
            user.setVerificationStatus("owner_verified");
            if (!"admin".equalsIgnoreCase(user.getRole())) {
                user.setRole("landlord");
            }
            notificationService.notifyUser(
                    user.getId(),
                    "Вы получили сообщение от администратора",
                    "Ваша верификация подтверждена администратором."
            );
        } else {
            String userRole = user.getRole() == null ? "" : user.getRole().trim().toLowerCase();
            if (!"landlord".equals(userRole)) {
                throw new ApiException("Снимать верификацию можно только у арендодателей");
            }

            String verificationType = normalizeVerificationType(request.verificationType(), user.getVerificationStatus());
            if ("trusted_partner".equals(verificationType)) {
                boolean revokeOwnerVerification = Boolean.TRUE.equals(request.revokeOwnerVerification());
                if (revokeOwnerVerification) {
                    user.setVerificationStatus("basic_verified");
                    if (!"admin".equalsIgnoreCase(user.getRole())) {
                        user.setRole("user");
                    }
                    notificationService.notifyUser(
                            user.getId(),
                            "Вы получили сообщение от администратора",
                            "С вас сняты статусы «Надежный партнер» и «Подтвержденный собственник»."
                    );
                } else {
                    user.setVerificationStatus("owner_verified");
                    notificationService.notifyUser(
                            user.getId(),
                            "Вы получили сообщение от администратора",
                            "С вас снят статус «Надежный партнер»."
                    );
                }
            } else {
                user.setVerificationStatus("basic_verified");
                if (!"admin".equalsIgnoreCase(user.getRole())) {
                    user.setRole("user");
                }
                notificationService.notifyUser(
                        user.getId(),
                        "Вы получили сообщение от администратора",
                        "С вас снят статус «Подтвержденный собственник»."
                );
            }
        }
        return mapUser(userRepository.save(user));
    }

    @Transactional(readOnly = true)
    public Page<AdSummaryResponse> getAllAds(String status, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));

        if (status != null && !status.isBlank()) {
            String normalizedStatus = status.trim().toLowerCase();
            return adRepository.findByModerationStatusAndDeletedFalse(normalizedStatus, pageable)
                    .map(adService::toSummary);
        }

        return adRepository.findByDeletedFalse(pageable)
                .map(adService::toSummary);
    }

    @Transactional(readOnly = true)
    public Page<AdSummaryResponse> getAdsForModeration(String status, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        String normalizedStatus = status == null || status.isBlank() ? "pending" : status.trim().toLowerCase();
        return adRepository.findByModerationStatusAndDeletedFalse(normalizedStatus, pageable)
                .map(adService::toSummary);
    }

    @Transactional(readOnly = true)
    public AdDetailsResponse getAdDetails(Long adId) {
        Ad ad = adRepository.findById(adId)
                .orElseThrow(() -> new ApiException("Ad not found"));
        return adService.toDetails(ad, ad.getUser(), true);
    }

    @Transactional
    public AdDetailsResponse moderateAd(Long adId, AdModerationRequest request, Authentication authentication) {
        Ad ad = adRepository.findById(adId)
                .orElseThrow(() -> new ApiException("Ad not found"));

        String status = normalizeModerationStatus(request.status());
        ad.setModerationStatus(status);
        ad.setModerationComment(request.comment());
        if ("approved".equals(status)) {
            ad.setActive(true);
        }
        if ("rejected".equals(status)) {
            ad.setActive(false);
            User owner = ad.getUser();
            int warningsCount = owner.getWarningsCount() == null ? 0 : owner.getWarningsCount();
            warningsCount += 1;
            owner.setWarningsCount(warningsCount);
            notificationService.notifyUser(
                    owner.getId(),
                    "Вы получили сообщение от администратора",
                    "Ваше объявление отклонено. Причина: " + (request.comment() == null ? "не указана" : request.comment())
                            + ". Предупреждение " + warningsCount + " из 3."
            );
            if (warningsCount >= 3) {
                owner.setBlocked(true);
                owner.setBlockReason("Аккаунт заблокирован автоматически после 3 отклонённых объявлений");
                notificationService.notifyUser(
                        owner.getId(),
                        "Вы получили сообщение от администратора",
                        "Ваш аккаунт автоматически заблокирован после 3 предупреждений."
                );
            }
            userRepository.save(owner);
        }
        return adService.toDetails(adRepository.save(ad), ad.getUser(), true);
    }

    @Transactional(readOnly = true)
    public AdminStatsResponse getStats() {
        return AdminStatsResponse.builder()
                .usersCount(userRepository.count())
                .adsCount(adRepository.countByDeletedFalse())
                .activeAdsCount(adRepository.countByActiveTrueAndDeletedFalse())
                .pendingAdsCount(adRepository.countByModerationStatusAndDeletedFalse("pending"))
                .approvedAdsCount(adRepository.countByModerationStatusAndDeletedFalse("approved"))
                .messagesCount(messageRepository.count())
                .build();
    }

    private User getUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ApiException("User not found"));
    }

    private UserProfileResponse mapUser(User user) {
        UserReviewStatsService.UserReviewStats stats = userReviewStatsService.getStats(user.getId());
        return UserProfileResponse.builder()
                .id(user.getId())
                .phoneNumber(user.getPhoneNumber())
                .fullName(user.getFullName())
                .avatarUrl(user.getAvatarUrl())
                .role(user.getRole())
                .telegramId(user.getTelegramId())
                .telegramUsername(user.getTelegramUsername())
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

    private String normalizeModerationStatus(String status) {
        if (status == null || status.isBlank()) {
            throw new ApiException("Moderation status is required");
        }
        String normalized = status.trim().toLowerCase();
        if (!normalized.equals("pending") && !normalized.equals("approved") && !normalized.equals("rejected")) {
            throw new ApiException("Unsupported moderation status: " + status);
        }
        return normalized;
    }

    private String normalizeVerificationType(String type, String currentStatus) {
        String normalized = type == null || type.isBlank()
                ? (currentStatus == null ? "" : currentStatus.trim().toLowerCase())
                : type.trim().toLowerCase();
        if (!normalized.equals("owner_verified") && !normalized.equals("trusted_partner")) {
            throw new ApiException("Нужно указать тип снимаемой верификации");
        }
        return normalized;
    }
}
