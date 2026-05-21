package edu.belsu.rent_service.service;

import edu.belsu.rent_service.domain.Ad;
import edu.belsu.rent_service.domain.Favorite;
import edu.belsu.rent_service.domain.User;
import edu.belsu.rent_service.dto.favorite.FavoriteResponse;
import edu.belsu.rent_service.exception.ApiException;
import edu.belsu.rent_service.repository.AdRepository;
import edu.belsu.rent_service.repository.FavoriteRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class FavoriteService {

    private final FavoriteRepository favoriteRepository;
    private final AdRepository adRepository;
    private final AdService adService;
    private final AuthenticatedUserService authenticatedUserService;

    public FavoriteService(FavoriteRepository favoriteRepository,
                           AdRepository adRepository,
                           AdService adService,
                           AuthenticatedUserService authenticatedUserService) {
        this.favoriteRepository = favoriteRepository;
        this.adRepository = adRepository;
        this.adService = adService;
        this.authenticatedUserService = authenticatedUserService;
    }

    @Transactional
    public FavoriteResponse addFavorite(Long adId, Authentication authentication) {
        User user = authenticatedUserService.getCurrentUser(authentication);
        Ad ad = getVisibleAd(adId);

        if (ad.getUser().getId().equals(user.getId())) {
            throw new ApiException("You cannot add your own ad to favorites");
        }
        if (favoriteRepository.existsByUserIdAndAdId(user.getId(), adId)) {
            throw new ApiException("Ad is already in favorites");
        }

        Favorite favorite = Favorite.builder()
                .user(user)
                .ad(ad)
                .build();

        Favorite savedFavorite = favoriteRepository.save(favorite);
        return mapToResponse(savedFavorite);
    }

    @Transactional(readOnly = true)
    public Page<FavoriteResponse> getMyFavorites(Authentication authentication, int page, int size) {
        User user = authenticatedUserService.getCurrentUser(authentication);
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return favoriteRepository.findByUserId(user.getId(), pageable)
                .map(this::mapToResponse);
    }

    @Transactional
    public void removeFavorite(Long adId, Authentication authentication) {
        User user = authenticatedUserService.getCurrentUser(authentication);
        if (!favoriteRepository.existsByUserIdAndAdId(user.getId(), adId)) {
            throw new ApiException("Favorite not found");
        }
        favoriteRepository.deleteByUserIdAndAdId(user.getId(), adId);
    }

    @Transactional(readOnly = true)
    public boolean isFavorite(Long adId, Authentication authentication) {
        User user = authenticatedUserService.getCurrentUser(authentication);
        return favoriteRepository.existsByUserIdAndAdId(user.getId(), adId);
    }

    private Ad getVisibleAd(Long adId) {
        Ad ad = adRepository.findById(adId)
                .orElseThrow(() -> new ApiException("Ad not found"));
        if (!ad.isActive() || !"approved".equalsIgnoreCase(ad.getModerationStatus())) {
            throw new ApiException("Ad is unavailable");
        }
        return ad;
    }

    private FavoriteResponse mapToResponse(Favorite favorite) {
        return FavoriteResponse.builder()
                .id(favorite.getId())
                .adId(favorite.getAd().getId())
                .createdAt(favorite.getCreatedAt())
                .ad(adService.toSummary(favorite.getAd()))
                .build();
    }
}
