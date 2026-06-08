package edu.belsu.rent_service.adapters.out.persistence.repository;

import edu.belsu.rent_service.domain.Ad;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;

@Repository
public interface AdRepository extends JpaRepository<Ad, Long> {
    Page<Ad> findByUserIdAndDeletedFalse(Long userId, Pageable pageable);
    Page<Ad> findByUserIdAndActiveTrue(Long userId, Pageable pageable);
    java.util.Optional<Ad> findByIdAndUserIdAndDeletedFalse(Long id, Long userId);
    Page<Ad> findByCityIgnoreCaseAndActiveTrueAndModerationStatus(String city, String moderationStatus, Pageable pageable);
    Page<Ad> findByActiveTrueAndModerationStatus(String moderationStatus, Pageable pageable);
    Page<Ad> findByModerationStatus(String moderationStatus, Pageable pageable);
    Page<Ad> findByModerationStatusAndDeletedFalse(String moderationStatus, Pageable pageable);
    Page<Ad> findByDeletedFalse(Pageable pageable);
    List<Ad> findByUserIdAndActiveTrueAndModerationStatusOrderByCreatedAtDesc(Long userId, String moderationStatus);
    List<Ad> findByUserIdAndModerationStatusAndDeletedFalseOrderByCreatedAtDesc(Long userId, String moderationStatus);
    long countByActiveTrueAndModerationStatus(String moderationStatus);
    long countByActiveTrue();
    long countByModerationStatus(String moderationStatus);
    long countByDeletedFalse();
    long countByActiveTrueAndDeletedFalse();
    long countByModerationStatusAndDeletedFalse(String moderationStatus);
    @Query("SELECT a FROM Ad a WHERE a.moderationStatus = 'approved' AND a.active = true AND a.deleted = false") Page<Ad> findAllApproved(Pageable pageable);

    @Query("""
SELECT a FROM Ad a
WHERE a.moderationStatus = 'approved'
AND a.active = true
AND a.deleted = false
AND a.user.id <> :userId
""")
    Page<Ad> findAllApprovedExceptUser(@Param("userId") Long userId, Pageable pageable);

    @Query("""
SELECT a FROM Ad a
WHERE a.moderationStatus = 'approved'
AND a.active = true
AND a.deleted = false
AND (:rentalType IS NULL OR a.rentalType = :rentalType)
""")
    Page<Ad> search(@Param("rentalType") String rentalType, Pageable pageable);
}
