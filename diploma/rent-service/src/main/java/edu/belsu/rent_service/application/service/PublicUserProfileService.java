package edu.belsu.rent_service.application.service;

import edu.belsu.rent_service.adapters.out.persistence.repository.AdRepository;
import edu.belsu.rent_service.adapters.out.persistence.repository.RatingRepository;
import edu.belsu.rent_service.adapters.out.persistence.repository.UserRepository;
import edu.belsu.rent_service.application.dto.ad.AdSummaryResponse;
import edu.belsu.rent_service.application.dto.review.ReviewResponse;
import edu.belsu.rent_service.application.dto.user.PublicUserProfileResponse;
import edu.belsu.rent_service.application.exception.ApiException;
import edu.belsu.rent_service.domain.Rating;
import edu.belsu.rent_service.domain.User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Service
public class PublicUserProfileService {

    private final UserRepository userRepository;
    private final AdRepository adRepository;
    private final RatingRepository ratingRepository;
    private final AdService adService;

    public PublicUserProfileService(UserRepository userRepository,
                                    AdRepository adRepository,
                                    RatingRepository ratingRepository,
                                    AdService adService) {
        this.userRepository = userRepository;
        this.adRepository = adRepository;
        this.ratingRepository = ratingRepository;
        this.adService = adService;
    }

    @Transactional(readOnly = true)
    public PublicUserProfileResponse getPublicProfile(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException("User not found"));

        List<AdSummaryResponse> ads = adRepository
                .findByUserIdAndModerationStatusAndDeletedFalseOrderByCreatedAtDesc(userId, "approved")
                .stream()
                .limit(12)
                .map(adService::toSummary)
                .toList();

        List<ReviewResponse> reviews = ratingRepository
                .findTop20ByToUserIdAndVisibleTrueOrderByCreatedAtDesc(userId)
                .stream()
                .map(this::mapReview)
                .toList();

        return PublicUserProfileResponse.builder()
                .id(user.getId())
                .fullName(user.getFullName())
                .avatarUrl(user.getAvatarUrl())
                .verificationStatus(user.getVerificationStatus())
                .landlordRating(user.getLandlordRating())
                .landlordReviewsCount(user.getLandlordReviewsCount())
                .ads(ads)
                .reviews(reviews)
                .build();
    }

    private ReviewResponse mapReview(Rating rating) {
        return ReviewResponse.builder()
                .id(rating.getId())
                .contractId(rating.getContractId())
                .bookingId(rating.getBooking().getId())
                .adId(rating.getBooking().getAd().getId())
                .adTitle(rating.getBooking().getAd().getTitle())
                .authorId(rating.getFromUser().getId())
                .authorName(rating.getFromUser().getFullName())
                .authorAvatarUrl(rating.getFromUser().getAvatarUrl())
                .targetUserId(rating.getToUser().getId())
                .targetUserName(rating.getToUser().getFullName())
                .roleOfReviewer(rating.getRoleOfReviewer())
                .rating(rating.getScore())
                .comment(rating.getComment())
                .categories(Map.of())
                .visible(rating.isVisible())
                .moderationStatus(rating.getModerationStatus())
                .createdAt(rating.getCreatedAt())
                .build();
    }
}
