package edu.belsu.rent_service.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;

@Entity
@Table(name = "verification_requests", indexes = {
        @Index(name = "idx_verification_requests_user", columnList = "user_id"),
        @Index(name = "idx_verification_requests_status", columnList = "status"),
        @Index(name = "idx_verification_requests_type", columnList = "verification_type")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VerificationRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "verification_type", nullable = false, length = 30)
    @Builder.Default
    private String verificationType = "sms";

    @Column(name = "status", nullable = false)
    @Builder.Default
    private String status = "pending";

    @Column(name = "phone_number", length = 20)
    private String phoneNumber;

    @Column(name = "gosuslugi_id", length = 100)
    private String gosuslugiId;

    @Column(name = "failure_reason", columnDefinition = "TEXT")
    private String failureReason;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "request_data", columnDefinition = "JSONB")
    private String requestData;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "response_data", columnDefinition = "JSONB")
    private String responseData;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;
}
