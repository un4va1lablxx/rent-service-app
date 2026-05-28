package edu.belsu.rent_service.adapters.out.persistence.repository;

import edu.belsu.rent_service.domain.Rating;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RatingRepository extends JpaRepository<Rating, Long> {
    Optional<Rating> findByContractIdAndFromUserId(Long contractId, Long fromUserId);
    Page<Rating> findByToUserIdAndVisibleTrueOrderByCreatedAtDesc(Long toUserId, Pageable pageable);
    Page<Rating> findByFromUserIdOrderByCreatedAtDesc(Long fromUserId, Pageable pageable);
    Page<Rating> findByToUserIdAndRoleOfReviewerAndVisibleTrueOrderByCreatedAtDesc(Long toUserId, String roleOfReviewer, Pageable pageable);
    List<Rating> findByToUserIdAndVisibleTrue(Long toUserId);
    List<Rating> findTop20ByToUserIdAndVisibleTrueOrderByCreatedAtDesc(Long toUserId);
}
