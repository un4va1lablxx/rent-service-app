package edu.belsu.rent_service.service;

import edu.belsu.rent_service.domain.Ad;
import edu.belsu.rent_service.domain.Message;
import edu.belsu.rent_service.domain.User;
import edu.belsu.rent_service.dto.message.DialogSummaryResponse;
import edu.belsu.rent_service.dto.message.MessageRequest;
import edu.belsu.rent_service.dto.message.MessageResponse;
import edu.belsu.rent_service.exception.ApiException;
import edu.belsu.rent_service.repository.AdRepository;
import edu.belsu.rent_service.repository.MessageRepository;
import edu.belsu.rent_service.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class MessageService {

    private final MessageRepository messageRepository;
    private final AdRepository adRepository;
    private final UserRepository userRepository;
    private final AuthenticatedUserService authenticatedUserService;

    public MessageService(MessageRepository messageRepository,
                          AdRepository adRepository,
                          UserRepository userRepository,
                          AuthenticatedUserService authenticatedUserService) {
        this.messageRepository = messageRepository;
        this.adRepository = adRepository;
        this.userRepository = userRepository;
        this.authenticatedUserService = authenticatedUserService;
    }

    @Transactional
    public MessageResponse sendMessage(MessageRequest request, Authentication authentication) {
        User currentUser = authenticatedUserService.getCurrentUser(authentication);
        validateMessageRequest(request);

        Ad ad = adRepository.findById(request.adId())
                .orElseThrow(() -> new ApiException("Ad not found"));
        User recipient = userRepository.findById(request.toUserId())
                .orElseThrow(() -> new ApiException("Recipient not found"));

        boolean currentUserIsOwner = ad.getUser().getId().equals(currentUser.getId());
        boolean recipientIsOwner = ad.getUser().getId().equals(recipient.getId());

        if (!currentUserIsOwner && !recipientIsOwner) {
            throw new ApiException("One side of the dialog must be the ad owner");
        }
        if (recipient.getId().equals(currentUser.getId())) {
            throw new ApiException("You cannot send messages to yourself");
        }
        if (!currentUserIsOwner && (!ad.isActive() || !"approved".equalsIgnoreCase(ad.getModerationStatus()))) {
            throw new ApiException("Ad is unavailable for messaging");
        }

        String text = request.text().trim();
        Message message = Message.builder()
                .ad(ad)
                .fromUser(currentUser)
                .toUser(recipient)
                .encryptedText(encode(text))
                .messageType("text")
                .containsContactDetails(containsContactDetails(text))
                .deliveredAt(LocalDateTime.now())
                .build();

        return mapToResponse(messageRepository.save(message));
    }

    @Transactional
    public Page<MessageResponse> getDialog(Long adId,
                                           Long otherUserId,
                                           Authentication authentication,
                                           int page,
                                           int size) {
        User currentUser = authenticatedUserService.getCurrentUser(authentication);
        Ad ad = adRepository.findById(adId)
                .orElseThrow(() -> new ApiException("Ad not found"));

        if (!isDialogParticipant(ad, currentUser.getId(), otherUserId)) {
            throw new ApiException("Access denied to this dialog");
        }

        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.ASC, "createdAt"));
        Page<MessageResponse> dialog = messageRepository.findDialog(adId, currentUser.getId(), otherUserId, pageable)
                .map(this::mapToResponse);
        messageRepository.markAsRead(currentUser.getId(), adId, otherUserId);
        return dialog;
    }

    @Transactional(readOnly = true)
    public Page<DialogSummaryResponse> getMyDialogs(Authentication authentication, int page, int size) {
        User currentUser = authenticatedUserService.getCurrentUser(authentication);
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<Message> messages = messageRepository.findByFromUserIdOrToUserIdOrderByCreatedAtDesc(currentUser.getId(), currentUser.getId(), pageable);

        Map<String, DialogSummaryResponse> dialogs = new LinkedHashMap<>();
        for (Message message : messages) {
            Long otherUserId = message.getFromUser().getId().equals(currentUser.getId())
                    ? message.getToUser().getId()
                    : message.getFromUser().getId();
            String key = message.getAd().getId() + ":" + otherUserId;
            DialogSummaryResponse existing = dialogs.get(key);
            long unreadIncrement = message.getToUser().getId().equals(currentUser.getId()) && !message.isRead() ? 1 : 0;

            if (existing == null) {
                dialogs.put(key, DialogSummaryResponse.builder()
                        .adId(message.getAd().getId())
                        .adTitle(message.getAd().getTitle())
                        .otherUserId(otherUserId)
                        .otherUserName(message.getFromUser().getId().equals(currentUser.getId())
                                ? message.getToUser().getFullName()
                                : message.getFromUser().getFullName())
                        .lastMessageText(decode(message.getEncryptedText()))
                        .lastMessageRead(message.isRead())
                        .unreadCount(unreadIncrement)
                        .lastMessageAt(message.getCreatedAt())
                        .build());
            } else if (unreadIncrement > 0) {
                dialogs.put(key, DialogSummaryResponse.builder()
                        .adId(existing.adId())
                        .adTitle(existing.adTitle())
                        .otherUserId(existing.otherUserId())
                        .otherUserName(existing.otherUserName())
                        .lastMessageText(existing.lastMessageText())
                        .lastMessageRead(existing.lastMessageRead())
                        .unreadCount(existing.unreadCount() + unreadIncrement)
                        .lastMessageAt(existing.lastMessageAt())
                        .build());
            }
        }

        return new org.springframework.data.domain.PageImpl<>(dialogs.values().stream().toList(), pageable, dialogs.size());
    }

    @Transactional(readOnly = true)
    public long getUnreadCount(Authentication authentication) {
        User currentUser = authenticatedUserService.getCurrentUser(authentication);
        return messageRepository.countByToUserIdAndReadFalse(currentUser.getId());
    }

    private boolean isDialogParticipant(Ad ad, Long currentUserId, Long otherUserId) {
        return ad.getUser().getId().equals(currentUserId) || ad.getUser().getId().equals(otherUserId);
    }

    private void validateMessageRequest(MessageRequest request) {
        if (request == null || request.adId() == null || request.toUserId() == null) {
            throw new ApiException("adId and toUserId are required");
        }
        if (request.text() == null || request.text().isBlank()) {
            throw new ApiException("Message text is required");
        }
    }

    private MessageResponse mapToResponse(Message message) {
        return MessageResponse.builder()
                .id(message.getId())
                .adId(message.getAd().getId())
                .fromUserId(message.getFromUser().getId())
                .fromUserName(message.getFromUser().getFullName())
                .toUserId(message.getToUser().getId())
                .toUserName(message.getToUser().getFullName())
                .text(decode(message.getEncryptedText()))
                .messageType(message.getMessageType())
                .containsContactDetails(message.isContainsContactDetails())
                .read(message.isRead())
                .deliveredAt(message.getDeliveredAt())
                .readAt(message.getReadAt())
                .createdAt(message.getCreatedAt())
                .build();
    }

    private String encode(String value) {
        return Base64.getEncoder().encodeToString(value.getBytes(StandardCharsets.UTF_8));
    }

    private String decode(String value) {
        return new String(Base64.getDecoder().decode(value), StandardCharsets.UTF_8);
    }

    private boolean containsContactDetails(String text) {
        String normalized = text.replaceAll("\\s+", "");
        return normalized.matches(".*(\\+?\\d{10,}|@\\w+|t\\.me/\\w+).*");
    }
}
