package edu.belsu.rent_service.adapters.in.web.controller;

import edu.belsu.rent_service.application.dto.review.ReviewCreateRequest;
import edu.belsu.rent_service.application.dto.review.ReviewResponse;
import edu.belsu.rent_service.application.dto.review.ReviewUpdateRequest;
import edu.belsu.rent_service.application.service.ReviewService;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/reviews")
public class ReviewController {

    private final ReviewService reviewService;

    public ReviewController(ReviewService reviewService) {
        this.reviewService = reviewService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ReviewResponse createReview(@RequestBody ReviewCreateRequest request, Authentication authentication) {
        return reviewService.createReview(request, authentication);
    }

    @PatchMapping("/{reviewId}")
    public ReviewResponse updateReview(@PathVariable Long reviewId,
                                       @RequestBody ReviewUpdateRequest request,
                                       Authentication authentication) {
        return reviewService.updateReview(reviewId, request, authentication);
    }

    @DeleteMapping("/{reviewId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteReview(@PathVariable Long reviewId, Authentication authentication) {
        reviewService.deleteReview(reviewId, authentication);
    }

    @GetMapping("/me")
    public Page<ReviewResponse> getMyReviews(Authentication authentication,
                                             @RequestParam(defaultValue = "received") String scope,
                                             @RequestParam(defaultValue = "0") int page,
                                             @RequestParam(defaultValue = "50") int size) {
        return reviewService.getMyReviews(authentication, scope, page, size);
    }
}
