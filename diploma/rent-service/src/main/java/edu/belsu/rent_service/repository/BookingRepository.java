package edu.belsu.rent_service.repository;

import edu.belsu.rent_service.domain.Booking;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface BookingRepository extends JpaRepository<Booking, Long> {
    Page<Booking> findByTenantIdOrderByCreatedAtDesc(Long tenantId, Pageable pageable);
    Page<Booking> findByLandlordIdOrderByCreatedAtDesc(Long landlordId, Pageable pageable);
    Page<Booking> findByAdIdOrderByCreatedAtDesc(Long adId, Pageable pageable);
    Optional<Booking> findByIdAndStatus(Long id, String status);
    boolean existsByAdIdAndTenantIdAndStatus(Long adId, Long tenantId, String status);
}
