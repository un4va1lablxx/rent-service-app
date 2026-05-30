package edu.belsu.rent_service.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "messages", indexes = {
        @Index(name = "idx_messages_ad", columnList = "ad_id"),
        @Index(name = "idx_messages_from_to", columnList = "from_user_id, to_user_id"),
        @Index(name = "idx_messages_read", columnList = "to_user_id, is_read")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Message {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ad_id", nullable = false)
    private Ad ad;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "from_user_id", nullable = false)
    private User fromUser;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "to_user_id", nullable = false)
    private User toUser;

    @Column(name = "encrypted_text", nullable = false, columnDefinition = "TEXT")
    private String encryptedText;

    @Column(name = "message_type", nullable = false, length = 30)
    @Builder.Default
    private String messageType = "text";

    @Column(name = "related_id")
    private Long relatedId;

    @Column(name = "is_read")
    @Builder.Default
    private boolean read = false;

    @Column(name = "delivered_at")
    private LocalDateTime deliveredAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
