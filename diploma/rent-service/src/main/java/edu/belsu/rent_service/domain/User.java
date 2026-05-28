package edu.belsu.rent_service.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.ColumnDefault;
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

    @Column(name = "telegram_username")
    private String telegramUsername;

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

    @Column(name = "avatar_url")
    private String avatarUrl;

    @Column(name = "role", nullable = false)
    @Builder.Default
    private String role = "user";

    // Important: schema update must be able to add this column to an existing table.
    // Postgres cannot add a NOT NULL column to a non-empty table unless a DEFAULT is provided.
    @Column(name = "verification_status", nullable = false, length = 40, columnDefinition = "varchar(40) default 'basic_verified'")
    @ColumnDefault("'basic_verified'")
    @Builder.Default
    private String verificationStatus = "basic_verified";

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

    @Column(name = "landlord_rating")
    @Builder.Default
    private Double landlordRating = 0.0;

    @Column(name = "tenant_rating")
    @Builder.Default
    private Double tenantRating = 0.0;

    @Column(name = "landlord_reviews_count")
    @Builder.Default
    private Integer landlordReviewsCount = 0;

    @Column(name = "tenant_reviews_count")
    @Builder.Default
    private Integer tenantReviewsCount = 0;

    @Column(name = "trust_level", length = 40)
    @Builder.Default
    private String trustLevel = "new";

    @Column(name = "is_blocked")
    @Builder.Default
    private boolean blocked = false;

    @Column(name = "block_reason")
    private String blockReason;

    @Column(name = "warnings_count")
    @Builder.Default
    private Integer warningsCount = 0;

    @Column(name = "public_key", columnDefinition = "TEXT")
    private String publicKey;

    @Column(name = "preferred_messenger", length = 20)
    private String preferredMessenger;

    @Column(name = "payout_bank_name")
    private String payoutBankName;

    @Column(name = "payout_account_number", length = 64)
    private String payoutAccountNumber;

    @Column(name = "payout_card_cvc", length = 8)
    private String payoutCardCvc;

    @Column(name = "payout_card_expiry", length = 7)
    private String payoutCardExpiry;

    @Column(name = "passport_citizenship_encrypted")
    private String passportCitizenshipEncrypted;

    @Column(name = "passport_number_encrypted")
    private String passportNumberEncrypted;

    @Column(name = "passport_issued_by_encrypted")
    private String passportIssuedByEncrypted;

    @Column(name = "passport_issued_at_encrypted")
    private String passportIssuedAtEncrypted;

    @Column(name = "passport_registration_address_encrypted", columnDefinition = "TEXT")
    private String passportRegistrationAddressEncrypted;

    @Column(name = "last_seen_at")
    private LocalDateTime lastSeenAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
