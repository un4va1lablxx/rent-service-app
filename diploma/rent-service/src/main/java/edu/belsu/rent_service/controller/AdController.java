package edu.belsu.rent_service.controller;

import edu.belsu.rent_service.dto.ad.AdDetailsResponse;
import edu.belsu.rent_service.dto.ad.AdRequest;
import edu.belsu.rent_service.dto.ad.AdSummaryResponse;
import edu.belsu.rent_service.dto.auth.AuthResponse;
import edu.belsu.rent_service.service.AdService;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;

@RestController
@RequestMapping("/api/ads")
public class AdController {

    private final AdService adService;

    public AdController(AdService adService) {
        this.adService = adService;
    }

    @GetMapping
    public Page<AdSummaryResponse> searchAds(@RequestParam(required = false) String city,
                                             @RequestParam(required = false) String district,
                                             @RequestParam(required = false) Integer minPrice,
                                             @RequestParam(required = false) Integer maxPrice,
                                             @RequestParam(required = false) Integer rooms,
                                             @RequestParam(required = false) BigDecimal minArea,
                                             @RequestParam(required = false) BigDecimal maxArea,
                                             @RequestParam(required = false) String rentalType,
                                             @RequestParam(required = false) Integer maxGuests,
                                             @RequestParam(defaultValue = "0") int page,
                                             @RequestParam(defaultValue = "10") int size,
                                             Authentication authentication) {
        return adService.searchAds(city, district, minPrice, maxPrice, rooms, minArea, maxArea, rentalType, maxGuests, page, size, authentication);
    }
    @GetMapping("/{adId}")
    public AdDetailsResponse getAdById(@PathVariable Long adId, Authentication authentication) {
        return adService.getAdById(adId, authentication);
    }

    @GetMapping("/my")
    @PreAuthorize("isAuthenticated()")
    public Page<AdSummaryResponse> getMyAds(Authentication authentication,
                                            @RequestParam(defaultValue = "0") int page,
                                            @RequestParam(defaultValue = "10") int size) {
        return adService.getMyAds(authentication, page, size);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('LANDLORD','ADMIN')")
    public AdDetailsResponse createAd(@RequestBody AdRequest request, Authentication authentication) {
        return adService.createAd(request, authentication);
    }

    @PutMapping("/{adId}")
    @PreAuthorize("hasAnyRole('LANDLORD','ADMIN')")
    public AdDetailsResponse updateAd(@PathVariable Long adId,
                                      @RequestBody AdRequest request,
                                      Authentication authentication) {
        return adService.updateAd(adId, request, authentication);
    }

    @PatchMapping("/{adId}/deactivate")
    @PreAuthorize("hasAnyRole('LANDLORD','ADMIN')")
    public AdDetailsResponse deactivateAd(@PathVariable Long adId, Authentication authentication) {
        return adService.deactivateAd(adId, authentication);
    }

    @PatchMapping("/{adId}/activate")
    @PreAuthorize("hasAnyRole('LANDLORD','ADMIN')")
    public AdDetailsResponse activateAd(@PathVariable Long adId, Authentication authentication) {
        return adService.activateAd(adId, authentication);
    }
}
