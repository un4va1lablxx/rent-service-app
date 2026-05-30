package edu.belsu.rent_service.adapters.out.persistence.repository;

import edu.belsu.rent_service.domain.Notification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findByUserIdOrderByCreatedAtDesc(Long userId);
    long countByUserIdAndReadFalse(Long userId);
    void deleteByUserId(Long userId);
}
