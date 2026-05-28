package edu.belsu.rent_service.application.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import edu.belsu.rent_service.adapters.out.persistence.repository.BookingRepository;
import edu.belsu.rent_service.adapters.out.persistence.repository.ContractRepository;
import edu.belsu.rent_service.adapters.out.persistence.repository.RatingRepository;
import edu.belsu.rent_service.adapters.out.persistence.repository.UserRepository;
import edu.belsu.rent_service.application.dto.review.ReviewCreateRequest;
import edu.belsu.rent_service.application.dto.review.ReviewResponse;
import edu.belsu.rent_service.application.dto.review.ReviewUpdateRequest;
import edu.belsu.rent_service.application.exception.ApiException;
import edu.belsu.rent_service.domain.Booking;
import edu.belsu.rent_service.domain.Rating;
import edu.belsu.rent_service.domain.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class ReviewService {

    private static final ZoneId MOSCOW_ZONE = ZoneId.of("Europe/Moscow");

    private final RatingRepository ratingRepository;
    private final BookingRepository bookingRepository;
    private final ContractRepository contractRepository;
    private final UserRepository userRepository;
    private final AuthenticatedUserService authenticatedUserService;
    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

    public ReviewService(RatingRepository ratingRepository,
                         BookingRepository bookingRepository,
                         ContractRepository contractRepository,
                         UserRepository userRepository,
                         AuthenticatedUserService authenticatedUserService) {
        this.ratingRepository = ratingRepository;
        this.bookingRepository = bookingRepository;
        this.contractRepository = contractRepository;
        this.userRepository = userRepository;
        this.authenticatedUserService = authenticatedUserService;
    }

    @Transactional
    public ReviewResponse createReview(ReviewCreateRequest request, Authentication authentication) {
        User author = authenticatedUserService.getCurrentUser(authentication);
        if (request == null || request.bookingId() == null) {
            throw new ApiException("bookingId is required");
        }
        if (request.rating() == null || request.rating() < 1 || request.rating() > 5) {
            throw new ApiException("Оценка должна быть от 1 до 5");
        }
        String comment = normalizeComment(request.comment());

        Booking booking = bookingRepository.findById(request.bookingId())
                .orElseThrow(() -> new ApiException("Booking not found"));
        if (!"completed".equalsIgnoreCase(booking.getStatus())) {
            throw new ApiException("Оставить отзыв можно только после завершения аренды");
        }
        if (booking.getCompletedAt() == null || booking.getCompletedAt().plusDays(14).isBefore(LocalDateTime.now(MOSCOW_ZONE))) {
            throw new ApiException("Срок для выставления оценки по этой сделке уже истек");
        }

        Long contractId = contractRepository.findByBookingId(booking.getId())
                .orElseThrow(() -> new ApiException("Contract not found for completed booking"))
                .getId();

        boolean authorIsTenant = booking.getTenant().getId().equals(author.getId());
        boolean authorIsLandlord = booking.getLandlord().getId().equals(author.getId());
        if (!authorIsTenant && !authorIsLandlord) {
            throw new ApiException("Оценить сделку может только ее участник");
        }
        if (ratingRepository.findByContractIdAndFromUserId(contractId, author.getId()).isPresent()) {
            throw new ApiException("Вы уже оставили отзыв по этой сделке");
        }

        User targetUser = authorIsTenant ? booking.getLandlord() : booking.getTenant();
        String roleOfReviewer = authorIsTenant ? "tenant" : "landlord";
        String moderationStatus = request.rating() == 1 && comment.length() < 20 ? "pending" : "approved";

        Rating rating = Rating.builder()
                .contractId(contractId)
                .booking(booking)
                .fromUser(author)
                .toUser(targetUser)
                .roleOfReviewer(roleOfReviewer)
                .score(request.rating())
                .comment(comment)
                .categories(toJson(request.categories() == null ? Map.of() : request.categories()))
                .moderationStatus(moderationStatus)
                .visible(!"pending".equals(moderationStatus))
                .expiresAt(booking.getCompletedAt().plusDays(14))
                .build();

        Rating saved = ratingRepository.save(rating);
        recalculateReputation(targetUser.getId());
        return map(saved);
    }

    @Transactional
    public ReviewResponse updateReview(Long reviewId, ReviewUpdateRequest request, Authentication authentication) {
        User author = authenticatedUserService.getCurrentUser(authentication);
        Rating rating = ratingRepository.findById(reviewId)
                .orElseThrow(() -> new ApiException("Review not found"));

        validateAuthor(author, rating);
        validateEditable(rating);

        if (request == null || request.rating() == null || request.rating() < 1 || request.rating() > 5) {
            throw new ApiException("Оценка должна быть от 1 до 5");
        }

        String comment = normalizeComment(request.comment());
        String moderationStatus = request.rating() == 1 && comment.length() < 20 ? "pending" : "approved";

        rating.setScore(request.rating());
        rating.setComment(comment);
        rating.setCategories(toJson(request.categories() == null ? Map.of() : request.categories()));
        rating.setModerationStatus(moderationStatus);
        rating.setVisible(!"pending".equals(moderationStatus));

        Rating saved = ratingRepository.save(rating);
        recalculateReputation(saved.getToUser().getId());
        return map(saved);
    }

    @Transactional
    public void deleteReview(Long reviewId, Authentication authentication) {
        User author = authenticatedUserService.getCurrentUser(authentication);
        Rating rating = ratingRepository.findById(reviewId)
                .orElseThrow(() -> new ApiException("Review not found"));

        validateAuthor(author, rating);
        validateEditable(rating);

        Long targetUserId = rating.getToUser().getId();
        ratingRepository.delete(rating);
        recalculateReputation(targetUserId);
    }

    @Transactional(readOnly = true)
    public Page<ReviewResponse> getMyReviews(Authentication authentication, String scope, int page, int size) {
        User currentUser = authenticatedUserService.getCurrentUser(authentication);
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        String normalized = scope == null ? "received" : scope.trim().toLowerCase();

        return switch (normalized) {
            case "written" -> ratingRepository.findByFromUserIdOrderByCreatedAtDesc(currentUser.getId(), pageable).map(this::map);
            case "landlord" -> ratingRepository.findByToUserIdAndRoleOfReviewerAndVisibleTrueOrderByCreatedAtDesc(currentUser.getId(), "tenant", pageable).map(this::map);
            case "tenant" -> ratingRepository.findByToUserIdAndRoleOfReviewerAndVisibleTrueOrderByCreatedAtDesc(currentUser.getId(), "landlord", pageable).map(this::map);
            default -> ratingRepository.findByToUserIdAndVisibleTrueOrderByCreatedAtDesc(currentUser.getId(), pageable).map(this::map);
        };
    }

    @Transactional
    public void recalculateReputation(Long userId) {
        User user = userRepository.findById(userId).orElseThrow(() -> new ApiException("User not found"));
        List<Rating> ratings = ratingRepository.findByToUserIdAndVisibleTrue(userId);

        ScoreAggregate total = calculateAggregate(ratings);
        ScoreAggregate landlord = calculateAggregate(ratings.stream()
                .filter(rating -> "tenant".equalsIgnoreCase(rating.getRoleOfReviewer()))
                .toList());
        ScoreAggregate tenant = calculateAggregate(ratings.stream()
                .filter(rating -> "landlord".equalsIgnoreCase(rating.getRoleOfReviewer()))
                .toList());

        user.setRating(total.score());
        user.setReviewsCount(total.count());
        user.setLandlordRating(landlord.score());
        user.setLandlordReviewsCount(landlord.count());
        user.setTenantRating(tenant.score());
        user.setTenantReviewsCount(tenant.count());
        user.setTrustLevel(resolveTrustLevel(total.score(), total.count()));
        userRepository.save(user);
    }

    private ScoreAggregate calculateAggregate(List<Rating> ratings) {
        if (ratings.isEmpty()) {
            return new ScoreAggregate(0.0, 0);
        }
        double weightedSum = 0.0;
        double totalWeight = 0.0;
        for (Rating rating : ratings) {
            long days = Math.max(0, Duration.between(rating.getCreatedAt(), LocalDateTime.now(MOSCOW_ZONE)).toDays());
            double weight = Math.max(0.5, 1.0 - (days / 365.0));
            weightedSum += rating.getScore() * weight;
            totalWeight += weight;
        }
        double score = totalWeight == 0.0 ? 0.0 : Math.round((weightedSum / totalWeight) * 100.0) / 100.0;
        return new ScoreAggregate(score, ratings.size());
    }

    private String resolveTrustLevel(double score, int count) {
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

    private ReviewResponse map(Rating rating) {
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
                .categories(parseCategories(rating.getCategories()))
                .visible(rating.isVisible())
                .moderationStatus(rating.getModerationStatus())
                .createdAt(rating.getCreatedAt())
                .build();
    }

    private void validateAuthor(User author, Rating rating) {
        if (!rating.getFromUser().getId().equals(author.getId())) {
            throw new ApiException("Редактировать отзыв может только его автор");
        }
    }

    private void validateEditable(Rating rating) {
        LocalDateTime expiresAt = rating.getExpiresAt();
        if (expiresAt != null && expiresAt.isBefore(LocalDateTime.now(MOSCOW_ZONE))) {
            throw new ApiException("Срок для редактирования или удаления этого отзыва уже истек");
        }
    }

    private String normalizeComment(String comment) {
        if (!StringUtils.hasText(comment)) {
            throw new ApiException("Комментарий обязателен");
        }
        String trimmed = comment.trim();
        if (trimmed.length() < 10) {
            throw new ApiException("Комментарий должен содержать не менее 10 символов");
        }
        return trimmed;
    }

    private String toJson(Map<String, Integer> categories) {
        try {
            return objectMapper.writeValueAsString(categories == null ? Map.of() : categories);
        } catch (JsonProcessingException e) {
            throw new ApiException("Не удалось сохранить категории оценки");
        }
    }

    private Map<String, Integer> parseCategories(String json) {
        if (!StringUtils.hasText(json)) {
            return new LinkedHashMap<>();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<>() {});
        } catch (JsonProcessingException e) {
            return new LinkedHashMap<>();
        }
    }

    private record ScoreAggregate(double score, int count) {
    }
}
