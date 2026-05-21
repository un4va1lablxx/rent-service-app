package edu.belsu.rent_service.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;

@Entity
@Table(name = "user_actions", indexes = {
        @Index(name = "idx_user_actions_user", columnList = "user_id"),
        @Index(name = "idx_user_actions_type_time", columnList = "action_type, created_at"),
        @Index(name = "idx_user_actions_suspicious", columnList = "is_suspicious, created_at")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserAction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(name = "action_type", nullable = false, length = 50)
    private String actionType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ad_id")
    private Ad ad;

    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    @Column(name = "user_agent", columnDefinition = "TEXT")
    private String userAgent;

    @Column(name = "is_suspicious")
    @Builder.Default
    private boolean suspicious = false;

    @Column(name = "risk_score")
    @Builder.Default
    private Double riskScore = 0.0;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "action_data", columnDefinition = "JSONB")
    private String actionData;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
