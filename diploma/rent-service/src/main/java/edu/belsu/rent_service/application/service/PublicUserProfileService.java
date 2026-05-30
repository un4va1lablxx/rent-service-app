package edu.belsu.rent_service.application.service;

import edu.belsu.rent_service.adapters.out.persistence.repository.AdRepository;
import edu.belsu.rent_service.adapters.out.persistence.repository.ReviewRepository;
import edu.belsu.rent_service.adapters.out.persistence.repository.UserRepository;
import edu.belsu.rent_service.application.dto.ad.AdSummaryResponse;
import edu.belsu.rent_service.application.dto.review.ReviewResponse;
import edu.belsu.rent_service.application.dto.user.PublicUserProfileResponse;
import edu.belsu.rent_service.application.exception.ApiException;
import edu.belsu.rent_service.domain.Review;
import edu.belsu.rent_service.domain.User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Service
public class PublicUserProfileService {

    private final UserRepository userRepository;
    private final AdRepository adRepository;
    private final ReviewRepository reviewRepository;
    private final AdService adService;
    private final UserReviewStatsService userReviewStatsService;

    public PublicUserProfileService(UserRepository userRepository,
                                    AdRepository adRepository,
                                    ReviewRepository reviewRepository,
                                    AdService adService,
                                    UserReviewStatsService userReviewStatsService) {
        this.userRepository = userRepository;
        this.adRepository = adRepository;
        this.reviewRepository = reviewRepository;
        this.adService = adService;
        this.userReviewStatsService = userReviewStatsService;
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

        List<ReviewResponse> reviews = reviewRepository
                .findTop20ByToUser_IdOrderByCreatedAtDesc(userId)
                .stream()
                .map(this::mapReview)
                .toList();
        UserReviewStatsService.UserReviewStats stats = userReviewStatsService.getStats(userId);

        return PublicUserProfileResponse.builder()
                .id(user.getId())
                .fullName(user.getFullName())
                .avatarUrl(user.getAvatarUrl())
                .verificationStatus(user.getVerificationStatus())
                .landlordRating(stats.landlordRating())
                .landlordReviewsCount(stats.landlordReviewsCount())
                .tenantRating(stats.tenantRating())
                .tenantReviewsCount(stats.tenantReviewsCount())
                .trustLevel(stats.trustLevel())
                .ads(ads)
                .reviews(reviews)
                .build();
    }

    private ReviewResponse mapReview(Review review) {
        return ReviewResponse.builder()
                .id(review.getId())
                .contractId(review.getContractId())
                .bookingId(review.getBooking().getId())
                .adId(review.getBooking().getAd().getId())
                .adTitle(review.getBooking().getAd().getTitle())
                .authorId(review.getFromUser().getId())
                .authorName(review.getFromUser().getFullName())
                .authorAvatarUrl(review.getFromUser().getAvatarUrl())
                .targetUserId(review.getToUser().getId())
                .targetUserName(review.getToUser().getFullName())
                .roleOfReviewer(review.getRoleOfReviewer())
                .rating(review.getScore())
                .comment(review.getComment())
                .categories(review.getCategories() == null ? Map.of() : review.getCategories())
                .visible(!"pending".equalsIgnoreCase(review.getModerationStatus()))
                .moderationStatus(review.getModerationStatus())
                .createdAt(review.getCreatedAt())
                .build();
    }
}
