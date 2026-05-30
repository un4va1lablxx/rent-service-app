package edu.belsu.rent_service.application.service;

import edu.belsu.rent_service.domain.Ad;
import edu.belsu.rent_service.domain.Photo;
import edu.belsu.rent_service.domain.User;
import edu.belsu.rent_service.domain.exception.DomainException;
import edu.belsu.rent_service.domain.model.PropertyType;
import edu.belsu.rent_service.domain.model.RentalType;
import edu.belsu.rent_service.domain.policy.AdPolicy;
import edu.belsu.rent_service.application.dto.ad.AdDetailsResponse;
import edu.belsu.rent_service.application.dto.ad.AdRequest;
import edu.belsu.rent_service.application.dto.ad.AdSummaryResponse;
import edu.belsu.rent_service.application.exception.ApiException;
import edu.belsu.rent_service.adapters.out.persistence.repository.AdRepository;
import edu.belsu.rent_service.adapters.out.persistence.repository.FavoriteRepository;
import edu.belsu.rent_service.adapters.out.persistence.repository.MessageRepository;
import edu.belsu.rent_service.adapters.out.persistence.repository.PhotoRepository;
import edu.belsu.rent_service.adapters.out.persistence.repository.UserRepository;
import edu.belsu.rent_service.adapters.out.security.AuthUserDetails;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class AdService {

    private final AdRepository adRepository;
    private final UserRepository userRepository;
    private final PhotoRepository photoRepository;
    private final FavoriteRepository favoriteRepository;
    private final MessageRepository messageRepository;
    private final AuthenticatedUserService authenticatedUserService;
    private final UserReviewStatsService userReviewStatsService;

    @Value("${file.upload-dir:./uploads}")
    private String uploadDir;

    public AdService(AdRepository adRepository,
                     UserRepository userRepository,
                     PhotoRepository photoRepository,
                     FavoriteRepository favoriteRepository,
                     MessageRepository messageRepository,
                     AuthenticatedUserService authenticatedUserService,
                     UserReviewStatsService userReviewStatsService) {
        this.adRepository = adRepository;
        this.userRepository = userRepository;
        this.photoRepository = photoRepository;
        this.favoriteRepository = favoriteRepository;
        this.messageRepository = messageRepository;
        this.authenticatedUserService = authenticatedUserService;
        this.userReviewStatsService = userReviewStatsService;
    }

    @Transactional
    public AdDetailsResponse createAd(AdRequest request, Authentication authentication) {
        User owner = getCurrentUser(authentication);
        assertCanManageAds(owner);
        validateAdRequest(request);

        RentalType rentalType = AdPolicy.normalizeRentalType(request.rentalType());
        PropertyType propertyType = AdPolicy.normalizePropertyType(request.propertyType());

        Ad ad = Ad.builder()
                .user(owner)
                .title(request.title().trim())
                .description(request.description().trim())
                .address(request.address().trim())
                .city(request.city().trim())
                .district(trimToNull(request.district()))
                .region(request.region().trim())
                .propertyType(propertyType.code())
                .rentalType(rentalType.code())
                .maxGuests(request.maxGuests())
                .rooms(request.rooms())
                .pricePerMonth(request.pricePerMonth())
                .pricePerDay(request.pricePerDay())
                .area(request.area())
                .floor(request.floor())
                .totalFloors(request.totalFloors())
                .active(true)
                .moderationStatus("pending")
                .publishedAt(LocalDateTime.now())
                .deactivatedAt(null)
                .build();
        //applyRentalTypeRules(ad);

        Ad savedAd = adRepository.save(ad);
        replacePhotos(savedAd, request.photoUrls());
        return mapToDetails(savedAd, owner, false);
    }

    @Transactional
    public AdDetailsResponse updateAd(Long adId, AdRequest request, Authentication authentication) {
        validateAdRequest(request);

        RentalType rentalType = AdPolicy.normalizeRentalType(request.rentalType());
        PropertyType propertyType = AdPolicy.normalizePropertyType(request.propertyType());

        User currentUser = getCurrentUser(authentication);
        assertCanManageAds(currentUser);
        Ad ad = getOwnedAd(adId, currentUser.getId());

        ad.setTitle(request.title().trim());
        ad.setDescription(request.description().trim());
        ad.setAddress(request.address().trim());
        ad.setCity(request.city().trim());
        ad.setDistrict(trimToNull(request.district()));
        ad.setRegion(request.region().trim());
        ad.setPropertyType(propertyType.code());
        ad.setRentalType(rentalType.code());
        ad.setRooms(request.rooms());
        ad.setPricePerMonth(request.pricePerMonth());
        ad.setPricePerDay(request.pricePerDay());
        ad.setMaxGuests(request.maxGuests());
        ad.setArea(request.area());
        ad.setFloor(request.floor());
        ad.setTotalFloors(request.totalFloors());
        ad.setModerationStatus("pending");
        ad.setModerationComment(null);
        //applyRentalTypeRules(ad);

        Ad savedAd = adRepository.save(ad);
        replacePhotos(savedAd, request.photoUrls());
        return mapToDetails(savedAd, currentUser, true);
    }

    @Transactional(readOnly = true)
    public Page<AdSummaryResponse> getMyAds(Authentication authentication, int page, int size) {
        User currentUser = getCurrentUser(authentication);
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return adRepository.findByUserIdAndDeletedFalse(currentUser.getId(), pageable)
                .map(this::mapToSummary);
    }

    @Transactional(readOnly = true)
    public Page<AdSummaryResponse> searchAds(String city,
                                             String district,
                                             Integer minPrice,
                                             Integer maxPrice,
                                             Integer rooms,
                                             BigDecimal minArea,
                                             BigDecimal maxArea,
                                             String rentalType,
                                             Integer maxGuests,
                                             int page,
                                             int size,
                                             Authentication authentication) {
        AuthUserDetails principal = tryExtractPrincipal(authentication);
        Long currentUserId = principal != null ? principal.getId() : null;

        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "publishedAt", "createdAt"));

        Page<Ad> adPage;

        if (currentUserId != null) {
            adPage = adRepository.findAllApprovedExceptUser(currentUserId, pageable);
        } else {
            adPage = adRepository.findAllApproved(pageable);
        }

        return adPage.map(this::mapToSummary);
    }

    @Transactional
    public AdDetailsResponse getAdById(Long adId, Authentication authentication) {
        AuthUserDetails principal = tryExtractPrincipal(authentication);
        Ad ad = adRepository.findById(adId)
                .orElseThrow(() -> new ApiException("Ad not found"));
        if (ad.isDeleted()) {
            throw new ApiException("Ad is unavailable");
        }

        boolean isOwner = principal != null && Objects.equals(principal.getId(), ad.getUser().getId());
        if (!isOwner && (!ad.isActive() || !"approved".equalsIgnoreCase(ad.getModerationStatus()))) {
            throw new ApiException("Ad is unavailable");
        }

        if (!isOwner) {
            ad.setViewsCount(ad.getViewsCount() == null ? 1 : ad.getViewsCount() + 1);
            adRepository.save(ad);
        }

        List<String> photoUrls = getPhotoUrls(ad.getId());

        return mapToDetails(ad, ad.getUser(), isOwner);
    }

    @Transactional
    public AdDetailsResponse deactivateAd(Long adId, Authentication authentication) {
        User currentUser = getCurrentUser(authentication);
        Ad ad = getOwnedAd(adId, currentUser.getId());
        ad.setActive(false);
        ad.setDeactivatedAt(LocalDateTime.now());
        return mapToDetails(adRepository.save(ad), currentUser, true);
    }

    @Transactional
    public AdDetailsResponse activateAd(Long adId, Authentication authentication) {
        User currentUser = getCurrentUser(authentication);
        assertCanManageAds(currentUser);
        Ad ad = getOwnedAd(adId, currentUser.getId());
        ad.setActive(true);
        ad.setDeactivatedAt(null);
        ad.setModerationStatus("pending");
        ad.setPublishedAt(LocalDateTime.now());
        return mapToDetails(adRepository.save(ad), currentUser, true);
    }

    @Transactional
    public void deleteAd(Long adId, Authentication authentication) {
        User currentUser = getCurrentUser(authentication);
        Ad ad = getOwnedAd(adId, currentUser.getId());
        ad.setDeleted(true);
        ad.setActive(false);
        ad.setModerationStatus("deleted");
        ad.setModerationComment(null);
        ad.setTitle("Удалено");
        ad.setDescription("Удалено");
        ad.setAddress("Удалено");
        ad.setCity("Удалено");
        ad.setDistrict(null);
        ad.setRegion("Удалено");
        ad.setRooms(null);
        ad.setPricePerMonth(null);
        ad.setPricePerDay(null);
        ad.setArea(null);
        ad.setFloor(null);
        ad.setTotalFloors(null);
        ad.setMaxGuests(null);
        photoRepository.deleteByAdId(ad.getId());
        adRepository.save(ad);
    }

    private Ad getOwnedAd(Long adId, Long userId) {
        return adRepository.findByIdAndUserIdAndDeletedFalse(adId, userId)
                .orElseThrow(() -> new ApiException("Ad not found or access denied"));
    }

    public AdSummaryResponse toSummary(Ad ad) {
        return mapToSummary(ad);
    }

    public AdDetailsResponse toDetails(Ad ad, User owner, boolean includePrivateContact) {
        return mapToDetails(ad, owner, includePrivateContact);
    }

    private User getCurrentUser(Authentication authentication) {
        return authenticatedUserService.getCurrentUser(authentication);
    }

    private AuthUserDetails tryExtractPrincipal(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof AuthUserDetails principal)) {
            return null;
        }
        return principal;
    }

    private void validateAdRequest(AdRequest request) {
        try {
            AdPolicy.validateDraft(
                    request.title(),
                    AdPolicy.normalizeRentalType(request.rentalType()),
                    request.pricePerMonth(),
                    request.pricePerDay(),
                    request.maxGuests()
            );
        } catch (DomainException | IllegalArgumentException ex) {
            throw new ApiException(ex.getMessage());
        }
    }

    private void assertCanManageAds(User user) {
        String role = user.getRole() == null ? "user" : user.getRole().trim().toLowerCase();
        if (!role.equals("landlord") && !role.equals("admin")) {
            throw new ApiException("Публиковать объявления могут только арендодатели");
        }
    }

    private AdSummaryResponse mapToSummary(Ad ad) {
        List<String> photoUrls = getPhotoUrls(ad.getId());
        UserReviewStatsService.UserReviewStats stats = userReviewStatsService.getStats(ad.getUser().getId());
        return AdSummaryResponse.builder()
                .id(ad.getId())
                .ownerId(ad.getUser().getId())
                .title(ad.getTitle())
                .userFullName(ad.getUser().getFullName())
                .ownerAvatarUrl(ad.getUser().getAvatarUrl())
                .ownerRating(stats.landlordRating())
                .ownerReviewsCount(stats.landlordReviewsCount())
                .ownerTrustLevel(stats.trustLevel())
                .ownerVerificationStatus(ad.getUser().getVerificationStatus())
                .userPhone(ad.getUser().getPhoneNumber())
                .description(ad.getDescription())
                .city(ad.getCity())
                .district(ad.getDistrict())
                .region(ad.getRegion())
                .propertyType(ad.getPropertyType())
                .rentalType(ad.getRentalType())
                .rooms(ad.getRooms())
                .pricePerMonth(ad.getPricePerMonth())
                .pricePerDay(ad.getPricePerDay())
                .maxGuests(ad.getMaxGuests())
                .area(ad.getArea())
                .moderationStatus(ad.getModerationStatus())
                .active(ad.isActive())
                .duplicatePhotoDetected(false)
                .viewsCount(ad.getViewsCount())
                .primaryPhotoUrl(photoUrls.isEmpty() ? null : photoUrls.get(0))
                .photoUrls(photoUrls)
                .publishedAt(ad.getPublishedAt())
                .createdAt(ad.getCreatedAt())
                .build();
    }

    private AdDetailsResponse mapToDetails(Ad ad, User owner, boolean includePrivateContact) {
        List<String> photoUrls = getPhotoUrls(ad.getId());
        UserReviewStatsService.UserReviewStats stats = userReviewStatsService.getStats(owner.getId());
        return AdDetailsResponse.builder()
                .id(ad.getId())
                .ownerId(owner.getId())
                .ownerName(owner.getFullName())
                .ownerAvatarUrl(owner.getAvatarUrl())
                .ownerRating(stats.landlordRating())
                .ownerReviewsCount(stats.landlordReviewsCount())
                .ownerTrustLevel(stats.trustLevel())
                .ownerVerificationStatus(owner.getVerificationStatus())
                .ownerPhoneNumber(includePrivateContact ? owner.getPhoneNumber() : null)
                .title(ad.getTitle())
                .description(ad.getDescription())
                .address(ad.getAddress())
                .city(ad.getCity())
                .district(ad.getDistrict())
                .region(ad.getRegion())
                .propertyType(ad.getPropertyType())
                .rentalType(ad.getRentalType())
                .latitude(null)
                .longitude(null)
                .rooms(ad.getRooms())
                .pricePerMonth(ad.getPricePerMonth())
                .pricePerDay(ad.getPricePerDay())
                .maxGuests(ad.getMaxGuests())
                .area(ad.getArea())
                .floor(ad.getFloor())
                .totalFloors(ad.getTotalFloors())
                .moderationStatus(ad.getModerationStatus())
                .moderationComment(ad.getModerationComment())
                .active(ad.isActive())
                .autoModerationFlagged(false)
                .duplicatePhotoDetected(false)
                .viewsCount(ad.getViewsCount())
                .favoritesCount(favoriteRepository.countByAdId(ad.getId()))
                .messagesCount(messageRepository.countByAdId(ad.getId()))
                .photoUrls(photoUrls)
                .duplicateAds(findDuplicateAds(ad.getId()))
                .publishedAt(ad.getPublishedAt())
                .createdAt(ad.getCreatedAt())
                .updatedAt(ad.getUpdatedAt())
                .build();
    }

    private List<AdSummaryResponse> findDuplicateAds(Long adId) {
        Map<Long, Ad> duplicates = new LinkedHashMap<>();
        photoRepository.findByAdIdOrderBySortOrderAsc(adId).forEach(photo ->
                photoRepository.findByPhotoHash(photo.getPhotoHash()).forEach(candidatePhoto -> {
                    Ad duplicateAd = candidatePhoto.getAd();
                    if (duplicateAd != null && !Objects.equals(duplicateAd.getId(), adId)) {
                        duplicates.putIfAbsent(duplicateAd.getId(), duplicateAd);
                    }
                })
        );
        return duplicates.values().stream()
                .map(this::mapToSummary)
                .toList();
    }

    private List<String> getPhotoUrls(Long adId) {
        return photoRepository.findByAdIdOrderBySortOrderAsc(adId).stream()
                .map(Photo::getPhotoUrl)
                .toList();
    }

    @Transactional
    public AdDetailsResponse createFromBot(AdRequest request, Long userId) {
        User owner = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException("Пользователь не найден"));

        assertCanManageAds(owner);
        validateAdRequest(request);
        RentalType rentalType = AdPolicy.normalizeRentalType(request.rentalType());
        PropertyType propertyType = AdPolicy.normalizePropertyType(request.propertyType());

        Ad ad = Ad.builder()
                .user(owner)
                .title(request.title().trim())
                .description(request.description().trim())
                .address(request.address().trim())
                .city(request.city().trim())
                .district(trimToNull(request.district()))
                .region(request.region().trim())
                .propertyType(propertyType.code())
                .rentalType(rentalType.code())
                .rooms(request.rooms())
                .pricePerMonth(request.pricePerMonth())
                .pricePerDay(request.pricePerDay())
                .maxGuests(request.maxGuests())
                .area(request.area())
                .floor(request.floor())
                .totalFloors(request.totalFloors())
                .active(true)
                .moderationStatus("pending")
                .publishedAt(LocalDateTime.now())
                .deactivatedAt(null)
                .build();

        Ad savedAd = adRepository.save(ad);

        // Сохраняем фото
        if (request.photoUrls() != null && !request.photoUrls().isEmpty()) {
            List<String> urls = request.photoUrls();
            for (int i = 0; i < urls.size(); i++) {
                Photo photo = Photo.builder()
                        .ad(savedAd)
                        .photoUrl(urls.get(i))
                        .photoHash(buildPhotoHash(urls.get(i)))
                        .primaryPhoto(i == 0)
                        .sortOrder(i)
                        .build();
                photoRepository.save(photo);
            }
        }

        return mapToDetails(savedAd, owner, true);
    }

    private void replacePhotos(Ad ad, List<String> photoUrls) {
        photoRepository.deleteByAdId(ad.getId());

        List<String> safeUrls = photoUrls == null ? Collections.emptyList() : photoUrls.stream()
                .filter(url -> url != null && !url.isBlank())
                .map(String::trim)
                .distinct()
                .limit(10)
                .toList();

        for (int i = 0; i < safeUrls.size(); i++) {
            String url = safeUrls.get(i);
            String hash = buildPhotoHash(url);
            boolean duplicateDetected = photoRepository.existsByPhotoHash(hash);

            Photo photo = Photo.builder()
                    .ad(ad)
                    .photoUrl(url)
                    .photoHash(hash)
                    .primaryPhoto(i == 0)
                    .duplicateDetected(duplicateDetected)
                    .sortOrder(i)
                    .build();
            photoRepository.save(photo);
        }
    }

    private String buildPhotoHash(String photoUrl) {
        Path filePath = resolveUploadPath(photoUrl);
        if (filePath == null || !Files.exists(filePath)) {
            return sha256(photoUrl);
        }
        try {
            return sha256(Files.readAllBytes(filePath));
        } catch (IOException e) {
            return sha256(photoUrl);
        }
    }

    private Path resolveUploadPath(String photoUrl) {
        if (photoUrl == null || photoUrl.isBlank()) {
            return null;
        }
        int markerIndex = photoUrl.indexOf("/uploads/");
        if (markerIndex < 0) {
            return null;
        }

        String fileName = photoUrl.substring(markerIndex + "/uploads/".length());
        int queryIndex = fileName.indexOf('?');
        if (queryIndex >= 0) {
            fileName = fileName.substring(0, queryIndex);
        }
        if (fileName.isBlank()) {
            return null;
        }

        Path baseDir = Paths.get(System.getProperty("user.dir"), uploadDir).normalize();
        return baseDir.resolve(fileName).normalize();
    }

    private String sha256(String value) {
        return sha256(value.getBytes(StandardCharsets.UTF_8));
    }

    private String sha256(byte[] value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(value);
            StringBuilder hex = new StringBuilder();
            for (byte b : hash) {
                hex.append(String.format("%02x", b));
            }
            return hex.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 algorithm unavailable", e);
        }
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private void applyRentalTypeRules(Ad ad) {
        if (RentalType.LONG_TERM.code().equals(ad.getRentalType())) {
            ad.setPricePerDay(null);
            ad.setMaxGuests(null);
        } else if (RentalType.SHORT_TERM.code().equals(ad.getRentalType())) {
            ad.setPricePerMonth(null);
        }
    }
}
