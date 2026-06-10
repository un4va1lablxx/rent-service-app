package edu.belsu.rent_service.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "photos", indexes = {
        @Index(name = "idx_photos_ad", columnList = "ad_id"),
        @Index(name = "idx_photos_hash", columnList = "photo_hash")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Photo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ad_id")
    private Ad ad;

    @Column(name = "photo_url", nullable = false)
    private String photoUrl;

    @Column(name = "photo_hash", length = 64)
    private String photoHash;

    @Column(name = "is_primary")
    @Builder.Default
    private boolean primaryPhoto = false;

    @Column(name = "duplicate_detected")
    @Builder.Default
    private boolean duplicateDetected = false;

    @Column(name = "sort_order")
    @Builder.Default
    private Integer sortOrder = 0;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
