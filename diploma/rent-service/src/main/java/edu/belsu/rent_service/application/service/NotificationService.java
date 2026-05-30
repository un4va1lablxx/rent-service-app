package edu.belsu.rent_service.application.service;

import edu.belsu.rent_service.adapters.out.persistence.repository.NotificationRepository;
import edu.belsu.rent_service.adapters.out.persistence.repository.UserRepository;
import edu.belsu.rent_service.application.dto.notification.NotificationResponse;
import edu.belsu.rent_service.application.dto.notification.UnreadNotificationsCountResponse;
import edu.belsu.rent_service.application.exception.ApiException;
import edu.belsu.rent_service.domain.Notification;
import edu.belsu.rent_service.domain.User;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;

@Service
public class NotificationService {

    private final NotificationRepository NotificationRepository;
    private final UserRepository userRepository;
    private final AuthenticatedUserService authenticatedUserService;

    public NotificationService(NotificationRepository NotificationRepository,
                                    UserRepository userRepository,
                                    AuthenticatedUserService authenticatedUserService) {
        this.NotificationRepository = NotificationRepository;
        this.userRepository = userRepository;
        this.authenticatedUserService = authenticatedUserService;
    }

    @Transactional
    public void notifyUser(Long userId, String title, String message) {
        if (userId == null || !StringUtils.hasText(title) || !StringUtils.hasText(message)) {
            return;
        }
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            return;
        }
        NotificationRepository.save(Notification.builder()
                .user(user)
                .title(title.trim())
                .message(message.trim())
                .read(false)
                .build());
    }

    @Transactional(readOnly = true)
    public List<NotificationResponse> getMyNotifications(Authentication authentication) {
        User user = authenticatedUserService.getCurrentUser(authentication);
        return NotificationRepository.findByUserIdOrderByCreatedAtDesc(user.getId()).stream()
                .map(this::map)
                .toList();
    }

    @Transactional(readOnly = true)
    public UnreadNotificationsCountResponse getUnreadCount(Authentication authentication) {
        User user = authenticatedUserService.getCurrentUser(authentication);
        return new UnreadNotificationsCountResponse(NotificationRepository.countByUserIdAndReadFalse(user.getId()));
    }

    @Transactional
    public NotificationResponse markAsRead(Long notificationId, Authentication authentication) {
        User user = authenticatedUserService.getCurrentUser(authentication);
        Notification notification = getOwnedNotification(notificationId, user.getId());
        notification.setRead(true);
        return map(NotificationRepository.save(notification));
    }

    @Transactional
    public void deleteOne(Long notificationId, Authentication authentication) {
        User user = authenticatedUserService.getCurrentUser(authentication);
        Notification notification = getOwnedNotification(notificationId, user.getId());
        NotificationRepository.delete(notification);
    }

    @Transactional
    public void deleteAll(Authentication authentication) {
        User user = authenticatedUserService.getCurrentUser(authentication);
        NotificationRepository.deleteByUserId(user.getId());
    }

    private Notification getOwnedNotification(Long notificationId, Long userId) {
        Notification notification = NotificationRepository.findById(notificationId)
                .orElseThrow(() -> new ApiException("Notification not found"));
        if (!notification.getUser().getId().equals(userId)) {
            throw new ApiException("Access denied");
        }
        return notification;
    }

    private NotificationResponse map(Notification notification) {
        return NotificationResponse.builder()
                .id(notification.getId())
                .title(notification.getTitle())
                .message(notification.getMessage())
                .read(notification.isRead())
                .createdAt(notification.getCreatedAt())
                .build();
    }
}
