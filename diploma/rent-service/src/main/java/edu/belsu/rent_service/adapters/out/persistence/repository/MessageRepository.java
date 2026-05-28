package edu.belsu.rent_service.adapters.out.persistence.repository;

import edu.belsu.rent_service.domain.Message;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.List;

@Repository
public interface MessageRepository extends JpaRepository<Message, Long> {
    Page<Message> findByAdIdOrderByCreatedAtAsc(Long adId, Pageable pageable);
    Page<Message> findByFromUserIdOrToUserIdOrderByCreatedAtDesc(Long fromUserId, Long toUserId, Pageable pageable);

    @Query("SELECT m FROM Message m WHERE m.ad.id = :adId AND ((m.fromUser.id = :userId AND m.toUser.id = :otherId) OR (m.fromUser.id = :otherId AND m.toUser.id = :userId)) ORDER BY m.createdAt ASC")
    Page<Message> findDialog(@Param("adId") Long adId,
                             @Param("userId") Long userId,
                             @Param("otherId") Long otherId,
                             Pageable pageable);

    @Modifying
    @Transactional
    @Query("""
UPDATE Message m 
SET m.read = true, m.readAt = CURRENT_TIMESTAMP 
WHERE m.toUser.id = :userId 
AND m.ad.id = :adId 
AND m.fromUser.id = :otherUserId
AND m.read = false
""")
    int markAsRead(@Param("userId") Long userId,
                   @Param("adId") Long adId,
                   @Param("otherUserId") Long otherUserId);

    Optional<Message> findFirstByMessageTypeAndRelatedIdOrderByCreatedAtAsc(String messageType, Long relatedId);
    List<Message> findByMessageTypeAndRelatedIdOrderByCreatedAtAsc(String messageType, Long relatedId);

    long countByToUserIdAndReadFalse(Long toUserId);
    long countByAdId(Long adId);
}
