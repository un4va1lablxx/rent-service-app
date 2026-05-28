package edu.belsu.rent_service.adapters.out.persistence.repository;

import edu.belsu.rent_service.domain.ViewingRequest;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface ViewingRequestRepository extends JpaRepository<ViewingRequest, Long> {
    List<ViewingRequest> findByStatusAndResultPromptSentFalseAndProposedDateTimeLessThanEqual(String status, LocalDateTime dateTime);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select vr from ViewingRequest vr where vr.id = :id")
    Optional<ViewingRequest> findByIdForUpdate(@Param("id") Long id);

    Optional<ViewingRequest> findFirstByBookingId(Long bookingId);
}
