package edu.belsu.rent_service.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.Map;

@Entity
@Table(name = "reviews", uniqueConstraints = {
        @UniqueConstraint(name = "uk_reviews_contract_reviewer", columnNames = {"contract_id", "from_user_id"})
}, indexes = {
        @Index(name = "idx_reviews_contract", columnList = "contract_id"),
        @Index(name = "idx_reviews_booking", columnList = "booking_id"),
        @Index(name = "idx_reviews_to_user", columnList = "to_user_id"),
        @Index(name = "idx_reviews_from_user", columnList = "from_user_id"),
        @Index(name = "idx_reviews_role", columnList = "role_of_reviewer")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Review {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "contract_id", nullable = false)
    private Long contractId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id", nullable = false)
    private Booking booking;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "from_user_id", nullable = false)
    private User fromUser;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "to_user_id", nullable = false)
    private User toUser;

    @Column(name = "role_of_reviewer", nullable = false, length = 20)
    private String roleOfReviewer;

    @Column(name = "score", nullable = false)
    private Integer score;

    @Column(name = "comment", nullable = false, columnDefinition = "TEXT")
    private String comment;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "categories", columnDefinition = "JSONB")
    private Map<String, Integer> categories;

    @Column(name = "moderation_status", nullable = false, length = 30)
    @Builder.Default
    private String moderationStatus = "approved";

    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}