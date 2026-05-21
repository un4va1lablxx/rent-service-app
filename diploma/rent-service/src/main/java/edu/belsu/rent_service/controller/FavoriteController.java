package edu.belsu.rent_service.controller;

import edu.belsu.rent_service.dto.favorite.FavoriteResponse;
import edu.belsu.rent_service.service.FavoriteService;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/favorites")
public class FavoriteController {

    private final FavoriteService favoriteService;

    public FavoriteController(FavoriteService favoriteService) {
        this.favoriteService = favoriteService;
    }

    @GetMapping
    public Page<FavoriteResponse> getMyFavorites(Authentication authentication,
                                                 @RequestParam(defaultValue = "0") int page,
                                                 @RequestParam(defaultValue = "10") int size) {
        return favoriteService.getMyFavorites(authentication, page, size);
    }

    @PostMapping("/{adId}")
    @ResponseStatus(HttpStatus.CREATED)
    public FavoriteResponse addFavorite(@PathVariable Long adId, Authentication authentication) {
        return favoriteService.addFavorite(adId, authentication);
    }

    @DeleteMapping("/{adId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removeFavorite(@PathVariable Long adId, Authentication authentication) {
        favoriteService.removeFavorite(adId, authentication);
    }

    @GetMapping("/{adId}/status")
    public Map<String, Boolean> getFavoriteStatus(@PathVariable Long adId, Authentication authentication) {
        return Map.of("favorite", favoriteService.isFavorite(adId, authentication));
    }
}
