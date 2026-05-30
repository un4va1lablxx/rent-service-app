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
        @Index(name = "idx_users_role", columnList = "role"),
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

    @Column(name = "phone_number", nullable = false, unique = true, length = 20)
    private String phoneNumber;

    @Column(name = "password_hash")
    private String passwordHash;

    @Column(name = "full_name")
    private String fullName;

    @Column(name = "avatar_url")
    private String avatarUrl;

    @Column(name = "role", nullable = false)
    @Builder.Default
    private String role = "user";

    @Column(name = "verification_status", nullable = false, length = 40, columnDefinition = "varchar(40) default 'basic_verified'")
    @ColumnDefault("'basic_verified'")
    @Builder.Default
    private String verificationStatus = "basic_verified";

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

    @Column(name = "payout_bank_name")
    private String payoutBankName;

    @Column(name = "payout_account_number", length = 64)
    private String payoutAccountNumber;

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

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
