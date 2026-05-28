package edu.belsu.rent_service.adapters.out.persistence.repository;

import edu.belsu.rent_service.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByPhoneNumber(String phoneNumber);
    Optional<User> findByTelegramId(Long telegramId);
    Optional<User> findByMaxId(Long maxId);
    List<User> findByRole(String role);
    List<User> findByBlockedFalseAndVerifiedTrue();
    boolean existsByPhoneNumber(String phoneNumber);
}
