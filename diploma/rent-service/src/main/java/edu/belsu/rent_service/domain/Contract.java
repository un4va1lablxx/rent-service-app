package edu.belsu.rent_service.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "contracts")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Contract {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id", nullable = false)
    private Booking booking;

    @Column(name = "pdf_url")
    private String pdfUrl;

    @Column(name = "contract_data", columnDefinition = "TEXT")
    private String contractData;

    @Column(name = "status", nullable = false, length = 30)
    @Builder.Default
    private String status = "draft";

    @Column(name = "landlord_signature_hash", length = 128)
    private String landlordSignatureHash;

    @Column(name = "tenant_signature_hash", length = 128)
    private String tenantSignatureHash;

    @Column(name = "tenant_signed_at")
    private LocalDateTime tenantSignedAt;

    @Column(name = "landlord_signed_at")
    private LocalDateTime landlordSignedAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
