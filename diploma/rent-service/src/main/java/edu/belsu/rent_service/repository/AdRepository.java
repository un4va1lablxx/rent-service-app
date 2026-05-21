package edu.belsu.rent_service.repository;

import edu.belsu.rent_service.domain.Ad;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;

@Repository
public interface AdRepository extends JpaRepository<Ad, Long> {
    Page<Ad> findByUserId(Long userId, Pageable pageable);
    Page<Ad> findByUserIdAndActiveTrue(Long userId, Pageable pageable);
    java.util.Optional<Ad> findByIdAndUserId(Long id, Long userId);
    Page<Ad> findByCityIgnoreCaseAndActiveTrueAndModerationStatus(String city, String moderationStatus, Pageable pageable);
    Page<Ad> findByActiveTrueAndModerationStatus(String moderationStatus, Pageable pageable);
    Page<Ad> findByModerationStatus(String moderationStatus, Pageable pageable);
    long countByActiveTrueAndModerationStatus(String moderationStatus);
    long countByActiveTrue();
    long countByModerationStatus(String moderationStatus);
    @Query("SELECT a FROM Ad a WHERE a.moderationStatus = 'approved' AND a.active = true") Page<Ad> findAllApproved(Pageable pageable);

    @Query("""
SELECT a FROM Ad a
WHERE a.moderationStatus = 'approved'
AND a.active = true
AND a.user.id <> :userId
""")
    Page<Ad> findAllApprovedExceptUser(@Param("userId") Long userId, Pageable pageable);

    @Query("""
SELECT a FROM Ad a
WHERE a.moderationStatus = 'approved'
AND a.active = true
AND (:rentalType IS NULL OR a.rentalType = :rentalType)
""")
    Page<Ad> search(@Param("rentalType") String rentalType, Pageable pageable);
}
