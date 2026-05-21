package edu.belsu.rent_service.service;

import edu.belsu.rent_service.domain.Booking;
import edu.belsu.rent_service.domain.Review;
import edu.belsu.rent_service.domain.User;
import edu.belsu.rent_service.dto.review.ReviewCreateRequest;
import edu.belsu.rent_service.dto.review.ReviewResponse;
import edu.belsu.rent_service.exception.ApiException;
import edu.belsu.rent_service.repository.BookingRepository;
import edu.belsu.rent_service.repository.ReviewRepository;
import edu.belsu.rent_service.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final BookingRepository bookingRepository;
    private final UserRepository userRepository;
    private final AuthenticatedUserService authenticatedUserService;

    public ReviewService(ReviewRepository reviewRepository,
                         BookingRepository bookingRepository,
                         UserRepository userRepository,
                         AuthenticatedUserService authenticatedUserService) {
        this.reviewRepository = reviewRepository;
        this.bookingRepository = bookingRepository;
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
            throw new ApiException("Rating must be between 1 and 5");
        }

        Booking booking = bookingRepository.findById(request.bookingId())
                .orElseThrow(() -> new ApiException("Booking not found"));
        if (!booking.getTenant().getId().equals(author.getId())) {
            throw new ApiException("Only the tenant can leave a review for this booking");
        }
        if (!"completed".equalsIgnoreCase(booking.getStatus())) {
            throw new ApiException("A review can be left only after the deal is completed");
        }
        if (reviewRepository.findByBookingId(booking.getId()).isPresent()) {
            throw new ApiException("A review for this booking already exists");
        }

        Review review = Review.builder()
                .booking(booking)
                .ad(booking.getAd())
                .author(author)
                .targetUser(booking.getLandlord())
                .rating(request.rating())
                .comment(request.comment() == null ? null : request.comment().trim())
                .moderationStatus("approved")
                .build();

        Review saved = reviewRepository.save(review);
        recalculateRating(booking.getLandlord().getId());
        return map(saved);
    }

    @Transactional(readOnly = true)
    public Page<ReviewResponse> getMyReviews(Authentication authentication, String scope, int page, int size) {
        User currentUser = authenticatedUserService.getCurrentUser(authentication);
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        String normalized = scope == null ? "received" : scope.trim().toLowerCase();

        if ("written".equals(normalized)) {
            return reviewRepository.findByAuthorIdOrderByCreatedAtDesc(currentUser.getId(), pageable).map(this::map);
        }
        return reviewRepository.findByTargetUserIdAndModerationStatusOrderByCreatedAtDesc(currentUser.getId(), "approved", pageable)
                .map(this::map);
    }

    private void recalculateRating(Long userId) {
        User user = userRepository.findById(userId).orElseThrow(() -> new ApiException("User not found"));
        var reviews = reviewRepository.findByTargetUserIdAndModerationStatusOrderByCreatedAtDesc(userId, "approved", Pageable.unpaged()).getContent();
        double avg = reviews.stream().mapToInt(Review::getRating).average().orElse(0.0);
        user.setRating(avg);
        user.setReviewsCount(reviews.size());
        userRepository.save(user);
    }

    private ReviewResponse map(Review review) {
        return ReviewResponse.builder()
                .id(review.getId())
                .bookingId(review.getBooking().getId())
                .adId(review.getAd().getId())
                .adTitle(review.getAd().getTitle())
                .authorId(review.getAuthor().getId())
                .authorName(review.getAuthor().getFullName())
                .targetUserId(review.getTargetUser().getId())
                .targetUserName(review.getTargetUser().getFullName())
                .rating(review.getRating())
                .comment(review.getComment())
                .moderationStatus(review.getModerationStatus())
                .createdAt(review.getCreatedAt())
                .build();
    }
}
