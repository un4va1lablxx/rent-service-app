package edu.belsu.rent_service.application.service;

import edu.belsu.rent_service.adapters.out.persistence.repository.ReviewRepository;
import edu.belsu.rent_service.domain.Review;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;

@Service
public class UserReviewStatsService {

    private static final ZoneId MOSCOW_ZONE = ZoneId.of("Europe/Moscow");

    private final ReviewRepository reviewRepository;

    public UserReviewStatsService(ReviewRepository reviewRepository) {
        this.reviewRepository = reviewRepository;
    }

    public UserReviewStats getStats(Long userId) {
        List<Review> reviews = reviewRepository.findByToUser_Id(userId);

        ScoreAggregate total = calculateAggregate(reviews);
        ScoreAggregate landlord = calculateAggregate(reviews.stream()
                .filter(review -> "tenant".equalsIgnoreCase(review.getRoleOfReviewer()))
                .toList());
        ScoreAggregate tenant = calculateAggregate(reviews.stream()
                .filter(review -> "landlord".equalsIgnoreCase(review.getRoleOfReviewer()))
                .toList());

        return new UserReviewStats(
                total.score(),
                total.count(),
                landlord.score(),
                landlord.count(),
                tenant.score(),
                tenant.count(),
                resolveTrustLevel(total.score(), total.count())
        );
    }

    public boolean isVerified(String verificationStatus) {
        if (verificationStatus == null) {
            return false;
        }
        String normalized = verificationStatus.trim().toLowerCase();
        return "owner_verified".equals(normalized) || "trusted_partner".equals(normalized);
    }

    public String resolveTrustLevel(double score, int count) {
        if (count < 3) {
            return "new";
        }
        if (score < 3.5) {
            return "attention";
        }
        if (score < 4.5) {
            return "regular";
        }
        if (score < 4.9 || count < 5) {
            return "trusted";
        }
        return count >= 10 ? "gold" : "trusted";
    }

    private ScoreAggregate calculateAggregate(List<Review> reviews) {
        if (reviews.isEmpty()) {
            return new ScoreAggregate(0.0, 0);
        }

        double weightedSum = 0.0;
        double totalWeight = 0.0;
        for (Review review : reviews) {
            long days = Math.max(0, Duration.between(review.getCreatedAt(), LocalDateTime.now(MOSCOW_ZONE)).toDays());
            double weight = Math.max(0.5, 1.0 - (days / 365.0));
            weightedSum += review.getScore() * weight;
            totalWeight += weight;
        }

        double score = totalWeight == 0.0 ? 0.0 : Math.round((weightedSum / totalWeight) * 100.0) / 100.0;
        return new ScoreAggregate(score, reviews.size());
    }

    public record UserReviewStats(
            double rating,
            int reviewsCount,
            double landlordRating,
            int landlordReviewsCount,
            double tenantRating,
            int tenantReviewsCount,
            String trustLevel
    ) {
    }

    private record ScoreAggregate(double score, int count) {
    }
}
