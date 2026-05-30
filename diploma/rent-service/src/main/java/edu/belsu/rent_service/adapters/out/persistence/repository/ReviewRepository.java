package edu.belsu.rent_service.adapters.out.persistence.repository;

import edu.belsu.rent_service.domain.Review;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ReviewRepository extends JpaRepository<Review, Long> {
    Optional<Review> findByContractIdAndFromUser_Id(Long contractId, Long fromUserId);
    Page<Review> findByToUser_IdOrderByCreatedAtDesc(Long toUserId, Pageable pageable);
    Page<Review> findByFromUser_IdOrderByCreatedAtDesc(Long fromUserId, Pageable pageable);
    Page<Review> findByToUser_IdAndRoleOfReviewerOrderByCreatedAtDesc(Long toUserId, String roleOfReviewer, Pageable pageable);
    List<Review> findByToUser_Id(Long toUserId);
    List<Review> findTop20ByToUser_IdOrderByCreatedAtDesc(Long toUserId);
}
