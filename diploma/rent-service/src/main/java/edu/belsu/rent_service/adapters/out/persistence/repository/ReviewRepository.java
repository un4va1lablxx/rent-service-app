package edu.belsu.rent_service.adapters.out.persistence.repository;

import edu.belsu.rent_service.domain.Review;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ReviewRepository extends JpaRepository<Review, Long> {
    Page<Review> findByTargetUserIdAndModerationStatusOrderByCreatedAtDesc(Long targetUserId, String moderationStatus, Pageable pageable);
    Page<Review> findByAuthorIdOrderByCreatedAtDesc(Long authorId, Pageable pageable);
    Optional<Review> findByBookingId(Long bookingId);
}
