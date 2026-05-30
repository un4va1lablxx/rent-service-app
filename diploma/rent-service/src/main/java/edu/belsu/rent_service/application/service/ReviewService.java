package edu.belsu.rent_service.application.service;

import edu.belsu.rent_service.adapters.out.persistence.repository.BookingRepository;
import edu.belsu.rent_service.adapters.out.persistence.repository.ContractRepository;
import edu.belsu.rent_service.adapters.out.persistence.repository.ReviewRepository;
import edu.belsu.rent_service.adapters.out.persistence.repository.UserRepository;
import edu.belsu.rent_service.application.dto.review.ReviewCreateRequest;
import edu.belsu.rent_service.application.dto.review.ReviewResponse;
import edu.belsu.rent_service.application.dto.review.ReviewUpdateRequest;
import edu.belsu.rent_service.application.exception.ApiException;
import edu.belsu.rent_service.domain.Booking;
import edu.belsu.rent_service.domain.Review;
import edu.belsu.rent_service.domain.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class ReviewService {

    private static final ZoneId MOSCOW_ZONE = ZoneId.of("Europe/Moscow");

    private final ReviewRepository reviewRepository;
    private final BookingRepository bookingRepository;
    private final ContractRepository contractRepository;
    private final UserRepository userRepository;
    private final AuthenticatedUserService authenticatedUserService;
    private final UserReviewStatsService userReviewStatsService;

    public ReviewService(ReviewRepository reviewRepository,
                         BookingRepository bookingRepository,
                         ContractRepository contractRepository,
                         UserRepository userRepository,
                         AuthenticatedUserService authenticatedUserService,
                         UserReviewStatsService userReviewStatsService) {
        this.reviewRepository = reviewRepository;
        this.bookingRepository = bookingRepository;
        this.contractRepository = contractRepository;
        this.userRepository = userRepository;
        this.authenticatedUserService = authenticatedUserService;
        this.userReviewStatsService = userReviewStatsService;
    }

    @Transactional
    public ReviewResponse createReview(ReviewCreateRequest request, Authentication authentication) {
        User author = authenticatedUserService.getCurrentUser(authentication);
        if (request == null || request.bookingId() == null) {
            throw new ApiException("bookingId is required");
        }
        validateRating(request.rating());
        String comment = normalizeComment(request.comment());

        Booking booking = bookingRepository.findById(request.bookingId())
                .orElseThrow(() -> new ApiException("Booking not found"));
        if (!"completed".equalsIgnoreCase(booking.getStatus())) {
            throw new ApiException("Review can only be left after booking completion");
        }
        if (booking.getCompletedAt() == null || booking.getCompletedAt().plusDays(14).isBefore(LocalDateTime.now(MOSCOW_ZONE))) {
            throw new ApiException("Review window for this booking has expired");
        }

        Long contractId = contractRepository.findByBookingId(booking.getId())
                .orElseThrow(() -> new ApiException("Contract not found for completed booking"))
                .getId();

        boolean authorIsTenant = booking.getTenant().getId().equals(author.getId());
        boolean authorIsLandlord = booking.getLandlord().getId().equals(author.getId());
        if (!authorIsTenant && !authorIsLandlord) {
            throw new ApiException("Only booking participants can leave a review");
        }
        if (reviewRepository.findByContractIdAndFromUser_Id(contractId, author.getId()).isPresent()) {
            throw new ApiException("Review for this contract already exists");
        }

        User targetUser = authorIsTenant ? booking.getLandlord() : booking.getTenant();
        String roleOfReviewer = authorIsTenant ? "tenant" : "landlord";
        String moderationStatus = request.rating() == 1 && comment.length() < 20 ? "pending" : "approved";

        Review review = Review.builder()
                .contractId(contractId)
                .booking(booking)
                .fromUser(author)
                .toUser(targetUser)
                .roleOfReviewer(roleOfReviewer)
                .score(request.rating())
                .comment(comment)
                .categories(safeCategories(request.categories()))
                .moderationStatus(moderationStatus)
                .expiresAt(booking.getCompletedAt().plusDays(14))
                .build();

        Review saved = reviewRepository.save(review);
        recalculateReputation(targetUser.getId());
        return map(saved);
    }

    @Transactional
    public ReviewResponse updateReview(Long reviewId, ReviewUpdateRequest request, Authentication authentication) {
        User author = authenticatedUserService.getCurrentUser(authentication);
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new ApiException("Review not found"));

        validateAuthor(author, review);
        validateEditable(review);
        validateRating(request == null ? null : request.rating());

        String comment = normalizeComment(request.comment());
        String moderationStatus = request.rating() == 1 && comment.length() < 20 ? "pending" : "approved";

        review.setScore(request.rating());
        review.setComment(comment);
        review.setCategories(safeCategories(request.categories()));
        review.setModerationStatus(moderationStatus);

        Review saved = reviewRepository.save(review);
        recalculateReputation(saved.getToUser().getId());
        return map(saved);
    }

    @Transactional
    public void deleteReview(Long reviewId, Authentication authentication) {
        User author = authenticatedUserService.getCurrentUser(authentication);
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new ApiException("Review not found"));

        validateAuthor(author, review);
        validateEditable(review);

        Long targetUserId = review.getToUser().getId();
        reviewRepository.delete(review);
        recalculateReputation(targetUserId);
    }

    @Transactional(readOnly = true)
    public Page<ReviewResponse> getMyReviews(Authentication authentication, String scope, int page, int size) {
        User currentUser = authenticatedUserService.getCurrentUser(authentication);
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        String normalized = scope == null ? "received" : scope.trim().toLowerCase();

        return switch (normalized) {
            case "written" -> reviewRepository.findByFromUser_IdOrderByCreatedAtDesc(currentUser.getId(), pageable).map(this::map);
            case "landlord" -> reviewRepository.findByToUser_IdAndRoleOfReviewerOrderByCreatedAtDesc(currentUser.getId(), "tenant", pageable).map(this::map);
            case "tenant" -> reviewRepository.findByToUser_IdAndRoleOfReviewerOrderByCreatedAtDesc(currentUser.getId(), "landlord", pageable).map(this::map);
            default -> reviewRepository.findByToUser_IdOrderByCreatedAtDesc(currentUser.getId(), pageable).map(this::map);
        };
    }

    @Transactional
    public void recalculateReputation(Long userId) {
        User user = userRepository.findById(userId).orElseThrow(() -> new ApiException("User not found"));
        UserReviewStatsService.UserReviewStats stats = userReviewStatsService.getStats(userId);
        user.setTrustLevel(stats.trustLevel());
        userRepository.save(user);
    }

    private ReviewResponse map(Review review) {
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
                .categories(safeCategories(review.getCategories()))
                .visible(!"pending".equalsIgnoreCase(review.getModerationStatus()))
                .moderationStatus(review.getModerationStatus())
                .createdAt(review.getCreatedAt())
                .build();
    }

    private void validateAuthor(User author, Review review) {
        if (!review.getFromUser().getId().equals(author.getId())) {
            throw new ApiException("Only the author can edit or delete this review");
        }
    }

    private void validateEditable(Review review) {
        LocalDateTime expiresAt = review.getExpiresAt();
        if (expiresAt != null && expiresAt.isBefore(LocalDateTime.now(MOSCOW_ZONE))) {
            throw new ApiException("Review edit window has expired");
        }
    }

    private void validateRating(Integer rating) {
        if (rating == null || rating < 1 || rating > 5) {
            throw new ApiException("Rating must be between 1 and 5");
        }
    }

    private String normalizeComment(String comment) {
        if (!StringUtils.hasText(comment)) {
            throw new ApiException("Comment is required");
        }
        String trimmed = comment.trim();
        if (trimmed.length() < 10) {
            throw new ApiException("Comment must be at least 10 characters long");
        }
        return trimmed;
    }

    private Map<String, Integer> safeCategories(Map<String, Integer> categories) {
        return categories == null ? new LinkedHashMap<>() : new LinkedHashMap<>(categories);
    }
}
