package edu.belsu.rent_service.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "ads", indexes = {
        @Index(name = "idx_ads_user", columnList = "user_id"),
        @Index(name = "idx_ads_search", columnList = "region, city, district, moderation_status, is_active"),
        @Index(name = "idx_ads_price", columnList = "price_per_month"),
        @Index(name = "idx_ads_created_at", columnList = "created_at")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Ad {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "description", nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(name = "address", nullable = false)
    private String address;

    @Column(name = "city", nullable = false)
    private String city;

    @Column(name = "district")
    private String district;

    @Column(name = "region", nullable = false)
    private String region;

    @Column(name = "property_type", nullable = false, length = 50)
    @Builder.Default
    private String propertyType = "apartment";

    @Column(name = "rental_type", nullable = false)
    @Builder.Default
    private String rentalType = "long_term";

    @Column(name = "rooms")
    private Integer rooms;

    @Column(name = "price_per_month", nullable = true)
    private Integer pricePerMonth;

    @Column(name = "price_per_day")
    private Integer pricePerDay;

    @Column(name = "area", precision = 6, scale = 2)
    private BigDecimal area;

    @Column(name = "floor")
    private Integer floor;

    @Column(name = "total_floors")
    private Integer totalFloors;

    @Column(name = "max_guests")
    private Integer maxGuests;

    @Column(name = "is_active")
    @Builder.Default
    private boolean active = true;

    @Column(name = "moderation_status", nullable = false)
    @Builder.Default
    private String moderationStatus = "pending";

    @Column(name = "moderation_comment", columnDefinition = "TEXT")
    private String moderationComment;

    @Column(name = "views_count")
    @Builder.Default
    private Integer viewsCount = 0;

    @Column(name = "published_at")
    private LocalDateTime publishedAt;

    @Column(name = "deactivated_at")
    private LocalDateTime deactivatedAt;

    @Column(name = "is_deleted", nullable = false)
    @Builder.Default
    private boolean deleted = false;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
