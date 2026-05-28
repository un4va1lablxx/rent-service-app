package edu.belsu.rent_service.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "viewing_requests", indexes = {
        @Index(name = "idx_viewing_ad", columnList = "ad_id"),
        @Index(name = "idx_viewing_tenant", columnList = "tenant_id"),
        @Index(name = "idx_viewing_landlord", columnList = "landlord_id"),
        @Index(name = "idx_viewing_status", columnList = "status")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ViewingRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ad_id", nullable = false)
    private Ad ad;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tenant_id", nullable = false)
    private User tenant;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "landlord_id", nullable = false)
    private User landlord;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "proposed_by_user_id", nullable = false)
    private User proposedByUser;

    @Column(name = "proposed_datetime", nullable = false)
    private LocalDateTime proposedDateTime;

    @Column(name = "status", nullable = false, length = 30)
    @Builder.Default
    private String status = "confirmed";

    @Column(name = "result_prompt_sent")
    @Builder.Default
    private boolean resultPromptSent = false;

    @Column(name = "tenant_ready")
    @Builder.Default
    private boolean tenantReady = false;

    @Column(name = "landlord_ready")
    @Builder.Default
    private boolean landlordReady = false;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id")
    private Booking booking;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
