package edu.belsu.rent_service.service;

import edu.belsu.rent_service.domain.Ad;
import edu.belsu.rent_service.domain.User;
import edu.belsu.rent_service.dto.admin.AdModerationRequest;
import edu.belsu.rent_service.dto.admin.AdminStatsResponse;
import edu.belsu.rent_service.dto.admin.UserBlockRequest;
import edu.belsu.rent_service.dto.admin.UserRoleUpdateRequest;
import edu.belsu.rent_service.dto.admin.UserVerificationUpdateRequest;
import edu.belsu.rent_service.dto.auth.UserProfileResponse;
import edu.belsu.rent_service.dto.ad.AdDetailsResponse;
import edu.belsu.rent_service.dto.ad.AdSummaryResponse;
import edu.belsu.rent_service.exception.ApiException;
import edu.belsu.rent_service.repository.AdRepository;
import edu.belsu.rent_service.repository.MessageRepository;
import edu.belsu.rent_service.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminService {

    private final UserRepository userRepository;
    private final AdRepository adRepository;
    private final MessageRepository messageRepository;
    private final RoleService roleService;
    private final AdService adService;

    public AdminService(UserRepository userRepository,
                        AdRepository adRepository,
                        MessageRepository messageRepository,
                        RoleService roleService,
                        AdService adService) {
        this.userRepository = userRepository;
        this.adRepository = adRepository;
        this.messageRepository = messageRepository;
        this.roleService = roleService;
        this.adService = adService;
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
        return mapUser(userRepository.save(user));
    }

    @Transactional
    public UserProfileResponse updateUserVerification(Long userId, UserVerificationUpdateRequest request) {
        User user = getUser(userId);
        user.setVerified(request.verified());
        user.setSmsVerified(request.smsVerified());
        user.setGosuslugiVerified(request.gosuslugiVerified());
        return mapUser(userRepository.save(user));
    }

    @Transactional(readOnly = true)
    public Page<AdSummaryResponse> getAllAds(String status, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));

        if (status != null && !status.isBlank()) {
            String normalizedStatus = status.trim().toLowerCase();
            return adRepository.findByModerationStatus(normalizedStatus, pageable)
                    .map(adService::toSummary);
        }

        return adRepository.findAll(pageable)
                .map(adService::toSummary);
    }

    @Transactional(readOnly = true)
    public Page<AdSummaryResponse> getAdsForModeration(String status, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        String normalizedStatus = status == null || status.isBlank() ? "pending" : status.trim().toLowerCase();
        return adRepository.findByModerationStatus(normalizedStatus, pageable)
                .map(adService::toSummary);
    }

    @Transactional
    public AdDetailsResponse moderateAd(Long adId, AdModerationRequest request) {
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
        }
        return adService.toDetails(adRepository.save(ad), ad.getUser(), true);
    }

    @Transactional(readOnly = true)
    public AdminStatsResponse getStats() {
        return AdminStatsResponse.builder()
                .usersCount(userRepository.count())
                .adsCount(adRepository.count())
                .activeAdsCount(adRepository.countByActiveTrue())
                .pendingAdsCount(adRepository.countByModerationStatus("pending"))
                .approvedAdsCount(adRepository.countByModerationStatus("approved"))
                .messagesCount(messageRepository.count())
                .build();
    }

    private User getUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ApiException("User not found"));
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
}
