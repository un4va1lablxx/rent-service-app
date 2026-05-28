package edu.belsu.rent_service.adapters.out.persistence.repository;

import edu.belsu.rent_service.domain.VerificationRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface VerificationRequestRepository extends JpaRepository<VerificationRequest, Long> {
    List<VerificationRequest> findByUserIdOrderByCreatedAtDesc(Long userId);
    Optional<VerificationRequest> findByUserIdAndStatus(Long userId, String status);
    Optional<VerificationRequest> findByUserIdAndVerificationTypeAndStatus(Long userId, String verificationType, String status);
    List<VerificationRequest> findByStatusOrderByCreatedAtAsc(String status);
    List<VerificationRequest> findByStatusOrderByCreatedAtDesc(String status);
}
