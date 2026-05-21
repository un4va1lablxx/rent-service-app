package edu.belsu.rent_service.service;

import edu.belsu.rent_service.domain.Ad;
import edu.belsu.rent_service.domain.Photo;
import edu.belsu.rent_service.domain.User;
import edu.belsu.rent_service.dto.ad.AdDetailsResponse;
import edu.belsu.rent_service.dto.ad.AdRequest;
import edu.belsu.rent_service.dto.ad.AdSummaryResponse;
import edu.belsu.rent_service.exception.ApiException;
import edu.belsu.rent_service.repository.AdRepository;
import edu.belsu.rent_service.repository.FavoriteRepository;
import edu.belsu.rent_service.repository.MessageRepository;
import edu.belsu.rent_service.repository.PhotoRepository;
import edu.belsu.rent_service.repository.UserRepository;
import edu.belsu.rent_service.security.AuthUserDetails;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Objects;

@Service
public class AdService {

    private final AdRepository adRepository;
    private final UserRepository userRepository;
    private final PhotoRepository photoRepository;
    private final FavoriteRepository favoriteRepository;
    private final MessageRepository messageRepository;
    private final AuthenticatedUserService authenticatedUserService;

    public AdService(AdRepository adRepository,
                     UserRepository userRepository,
                     PhotoRepository photoRepository,
                     FavoriteRepository favoriteRepository,
                     MessageRepository messageRepository,
                     AuthenticatedUserService authenticatedUserService) {
        this.adRepository = adRepository;
        this.userRepository = userRepository;
        this.photoRepository = photoRepository;
        this.favoriteRepository = favoriteRepository;
        this.messageRepository = messageRepository;
        this.authenticatedUserService = authenticatedUserService;
    }

    @Transactional
    public AdDetailsResponse createAd(AdRequest request, Authentication authentication) {
        User owner = getCurrentUser(authentication);
        validateAdRequest(request);

        String rentalType = request.rentalType();
        if (rentalType == null || rentalType.isBlank()) {
            rentalType = "long_term";
        }

        Ad ad = Ad.builder()
                .user(owner)
                .title(request.title().trim())
                .description(request.description().trim())
                .address(request.address().trim())
                .city(request.city().trim())
                .district(trimToNull(request.district()))
                .region(request.region().trim())
                .propertyType(defaultPropertyType(request.propertyType()))
                .rentalType(rentalType)
                .latitude(request.latitude())
                .longitude(request.longitude())
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

        String rentalType = request.rentalType();
        if (rentalType == null || rentalType.isBlank()) {
            rentalType = "long_term";
        }

        User currentUser = getCurrentUser(authentication);
        Ad ad = getOwnedAd(adId, currentUser.getId());

        ad.setTitle(request.title().trim());
        ad.setDescription(request.description().trim());
        ad.setAddress(request.address().trim());
        ad.setCity(request.city().trim());
        ad.setDistrict(trimToNull(request.district()));
        ad.setRegion(request.region().trim());
        ad.setPropertyType(defaultPropertyType(request.propertyType()));
        ad.setRentalType(rentalType);
        ad.setLatitude(request.latitude());
        ad.setLongitude(request.longitude());
        ad.setRooms(request.rooms());
        ad.setPricePerMonth(request.pricePerMonth());
        ad.setPricePerDay(request.pricePerDay());
        ad.setMaxGuests(request.maxGuests());
        ad.setArea(request.area());
        ad.setFloor(request.floor());
        ad.setTotalFloors(request.totalFloors());
        ad.setModerationStatus("pending");
        ad.setModerationComment(null);
        ad.setAutoModerationFlagged(false);
        ad.setDuplicatePhotoDetected(false);
        //applyRentalTypeRules(ad);

        Ad savedAd = adRepository.save(ad);
        replacePhotos(savedAd, request.photoUrls());
        return mapToDetails(savedAd, currentUser, true);
    }

    @Transactional(readOnly = true)
    public Page<AdSummaryResponse> getMyAds(Authentication authentication, int page, int size) {
        User currentUser = getCurrentUser(authentication);
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return adRepository.findByUserId(currentUser.getId(), pageable)
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
        Ad ad = getOwnedAd(adId, currentUser.getId());
        ad.setActive(true);
        ad.setDeactivatedAt(null);
        ad.setModerationStatus("pending");
        ad.setPublishedAt(LocalDateTime.now());
        return mapToDetails(adRepository.save(ad), currentUser, true);
    }

    private Ad getOwnedAd(Long adId, Long userId) {
        return adRepository.findByIdAndUserId(adId, userId)
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

        if (request.title() == null || request.title().isBlank()) {
            throw new ApiException("Title required");
        }

        if ("long_term".equals(request.rentalType())) {
            if (request.pricePerMonth() == null) {
                throw new ApiException("Monthly price required");
            }
        }

        if ("short_term".equals(request.rentalType())) {
            if (request.pricePerDay() == null) {
                throw new ApiException("Daily price required");
            }

            if (request.maxGuests() == null) {
                throw new ApiException("Guests required");
            }
        }
    }

    private AdSummaryResponse mapToSummary(Ad ad) {
        List<String> photoUrls = getPhotoUrls(ad.getId());
        return AdSummaryResponse.builder()
                .id(ad.getId())
                .title(ad.getTitle())
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
                .viewsCount(ad.getViewsCount())
                .primaryPhotoUrl(photoUrls.isEmpty() ? null : photoUrls.get(0))
                .photoUrls(photoUrls)
                .publishedAt(ad.getPublishedAt())
                .createdAt(ad.getCreatedAt())
                .build();
    }

    private AdDetailsResponse mapToDetails(Ad ad, User owner, boolean includePrivateContact) {
        List<String> photoUrls = getPhotoUrls(ad.getId());
        return AdDetailsResponse.builder()
                .id(ad.getId())
                .ownerId(owner.getId())
                .ownerName(owner.getFullName())
                .ownerPhoneNumber(includePrivateContact ? owner.getPhoneNumber() : null)
                .title(ad.getTitle())
                .description(ad.getDescription())
                .address(ad.getAddress())
                .city(ad.getCity())
                .district(ad.getDistrict())
                .region(ad.getRegion())
                .propertyType(ad.getPropertyType())
                .rentalType(ad.getRentalType())
                .latitude(ad.getLatitude())
                .longitude(ad.getLongitude())
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
                .viewsCount(ad.getViewsCount())
                .favoritesCount(favoriteRepository.countByAdId(ad.getId()))
                .messagesCount(messageRepository.countByAdId(ad.getId()))
                .photoUrls(photoUrls)
                .publishedAt(ad.getPublishedAt())
                .createdAt(ad.getCreatedAt())
                .updatedAt(ad.getUpdatedAt())
                .build();
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

        validateAdRequest(request);

        Ad ad = Ad.builder()
                .user(owner)
                .title(request.title().trim())
                .description(request.description().trim())
                .address(request.address().trim())
                .city(request.city().trim())
                .district(trimToNull(request.district()))
                .region(request.region().trim())
                .propertyType(defaultPropertyType(request.propertyType()))
                .rentalType(request.rentalType())
                .latitude(request.latitude())
                .longitude(request.longitude())
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
                        .photoHash(sha256(urls.get(i)))
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

        boolean hasDuplicates = false;
        for (int i = 0; i < safeUrls.size(); i++) {
            String url = safeUrls.get(i);
            String hash = sha256(url);
            boolean duplicateDetected = photoRepository.existsByPhotoHash(hash);
            if (duplicateDetected) {
                hasDuplicates = true;
            }

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

        ad.setDuplicatePhotoDetected(hasDuplicates);
        adRepository.save(ad);
    }

    private String sha256(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(value.getBytes(StandardCharsets.UTF_8));
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

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private String defaultPropertyType(String propertyType) {
        return trimToNull(propertyType) == null ? "apartment" : propertyType.trim().toLowerCase();
    }

    private void applyRentalTypeRules(Ad ad) {
        if ("long_term".equals(ad.getRentalType())) {
            ad.setPricePerDay(null);
            ad.setMaxGuests(null);
        } else if ("short_term".equals(ad.getRentalType())) {
            ad.setPricePerMonth(null);
        }
    }
}
