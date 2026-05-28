package edu.belsu.rent_service.application.service;

import edu.belsu.rent_service.adapters.out.persistence.repository.AdminNotificationRepository;
import edu.belsu.rent_service.adapters.out.persistence.repository.UserRepository;
import edu.belsu.rent_service.application.dto.notification.AdminNotificationResponse;
import edu.belsu.rent_service.application.dto.notification.UnreadNotificationsCountResponse;
import edu.belsu.rent_service.application.exception.ApiException;
import edu.belsu.rent_service.domain.AdminNotification;
import edu.belsu.rent_service.domain.User;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;

@Service
public class AdminNotificationService {

    private final AdminNotificationRepository adminNotificationRepository;
    private final UserRepository userRepository;
    private final AuthenticatedUserService authenticatedUserService;

    public AdminNotificationService(AdminNotificationRepository adminNotificationRepository,
                                    UserRepository userRepository,
                                    AuthenticatedUserService authenticatedUserService) {
        this.adminNotificationRepository = adminNotificationRepository;
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
        adminNotificationRepository.save(AdminNotification.builder()
                .user(user)
                .title(title.trim())
                .message(message.trim())
                .read(false)
                .build());
    }

    @Transactional(readOnly = true)
    public List<AdminNotificationResponse> getMyNotifications(Authentication authentication) {
        User user = authenticatedUserService.getCurrentUser(authentication);
        return adminNotificationRepository.findByUserIdOrderByCreatedAtDesc(user.getId()).stream()
                .map(this::map)
                .toList();
    }

    @Transactional(readOnly = true)
    public UnreadNotificationsCountResponse getUnreadCount(Authentication authentication) {
        User user = authenticatedUserService.getCurrentUser(authentication);
        return new UnreadNotificationsCountResponse(adminNotificationRepository.countByUserIdAndReadFalse(user.getId()));
    }

    @Transactional
    public AdminNotificationResponse markAsRead(Long notificationId, Authentication authentication) {
        User user = authenticatedUserService.getCurrentUser(authentication);
        AdminNotification notification = getOwnedNotification(notificationId, user.getId());
        notification.setRead(true);
        return map(adminNotificationRepository.save(notification));
    }

    @Transactional
    public void deleteOne(Long notificationId, Authentication authentication) {
        User user = authenticatedUserService.getCurrentUser(authentication);
        AdminNotification notification = getOwnedNotification(notificationId, user.getId());
        adminNotificationRepository.delete(notification);
    }

    @Transactional
    public void deleteAll(Authentication authentication) {
        User user = authenticatedUserService.getCurrentUser(authentication);
        adminNotificationRepository.deleteByUserId(user.getId());
    }

    private AdminNotification getOwnedNotification(Long notificationId, Long userId) {
        AdminNotification notification = adminNotificationRepository.findById(notificationId)
                .orElseThrow(() -> new ApiException("Notification not found"));
        if (!notification.getUser().getId().equals(userId)) {
            throw new ApiException("Access denied");
        }
        return notification;
    }

    private AdminNotificationResponse map(AdminNotification notification) {
        return AdminNotificationResponse.builder()
                .id(notification.getId())
                .title(notification.getTitle())
                .message(notification.getMessage())
                .read(notification.isRead())
                .createdAt(notification.getCreatedAt())
                .build();
    }
}
