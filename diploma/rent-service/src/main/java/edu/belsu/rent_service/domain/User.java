package edu.belsu.rent_service.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "users", indexes = {
        @Index(name = "idx_users_telegram", columnList = "telegram_id"),
        @Index(name = "idx_users_max", columnList = "max_id"),
        @Index(name = "idx_users_role", columnList = "role"),
        @Index(name = "idx_users_verified", columnList = "is_verified"),
        @Index(name = "idx_users_blocked", columnList = "is_blocked")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "telegram_id", unique = true)
    private Long telegramId;

    @Column(name = "max_id", unique = true)
    private Long maxId;

    @Column(name = "phone_number", nullable = false, unique = true, length = 20)
    private String phoneNumber;

    @Column(name = "encrypted_phone", nullable = false)
    private String encryptedPhone;

    @Column(name = "password_hash")
    private String passwordHash;

    @Column(name = "full_name")
    private String fullName;

    @Column(name = "role", nullable = false)
    @Builder.Default
    private String role = "user";

    @Column(name = "sms_verified")
    @Builder.Default
    private boolean smsVerified = false;

    @Column(name = "gosuslugi_verified")
    @Builder.Default
    private boolean gosuslugiVerified = false;

    @Column(name = "is_verified")
    @Builder.Default
    private boolean verified = false;

    @Column(name = "rating")
    @Builder.Default
    private Double rating = 0.0;

    @Column(name = "reviews_count")
    @Builder.Default
    private Integer reviewsCount = 0;

    @Column(name = "is_blocked")
    @Builder.Default
    private boolean blocked = false;

    @Column(name = "block_reason")
    private String blockReason;

    @Column(name = "public_key", columnDefinition = "TEXT")
    private String publicKey;

    @Column(name = "preferred_messenger", length = 20)
    private String preferredMessenger;

    @Column(name = "last_seen_at")
    private LocalDateTime lastSeenAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
