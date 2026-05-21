package edu.belsu.rent_service.repository;

import edu.belsu.rent_service.domain.SmsCode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface SmsCodeRepository extends JpaRepository<SmsCode, Long> {
    Optional<SmsCode> findTopByPhoneNumberAndPurposeAndUsedFalseOrderByCreatedAtDesc(String phoneNumber, String purpose);
    List<SmsCode> findByExpiresAtBefore(LocalDateTime expiresAt);
}
