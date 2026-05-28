package edu.belsu.rent_service.adapters.out.persistence.repository;

import edu.belsu.rent_service.domain.UserAction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface UserActionRepository extends JpaRepository<UserAction, Long> {
    List<UserAction> findByUserIdOrderByCreatedAtDesc(Long userId);
    List<UserAction> findBySuspiciousTrueOrderByCreatedAtDesc();
    long countByUserIdAndActionTypeAndCreatedAtAfter(Long userId, String actionType, LocalDateTime since);
    long countBySuspiciousTrueAndCreatedAtAfter(LocalDateTime since);
}
