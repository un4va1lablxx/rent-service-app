package edu.belsu.rent_service.controller;

import edu.belsu.rent_service.dto.review.ReviewCreateRequest;
import edu.belsu.rent_service.dto.review.ReviewResponse;
import edu.belsu.rent_service.service.ReviewService;
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

    @GetMapping("/me")
    public Page<ReviewResponse> getMyReviews(Authentication authentication,
                                             @RequestParam(defaultValue = "received") String scope,
                                             @RequestParam(defaultValue = "0") int page,
                                             @RequestParam(defaultValue = "50") int size) {
        return reviewService.getMyReviews(authentication, scope, page, size);
    }
}
