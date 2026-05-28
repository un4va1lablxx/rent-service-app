package edu.belsu.rent_service.adapters.in.web.controller;

import edu.belsu.rent_service.application.dto.notification.AdminNotificationResponse;
import edu.belsu.rent_service.application.dto.notification.UnreadNotificationsCountResponse;
import edu.belsu.rent_service.application.service.AdminNotificationService;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final AdminNotificationService adminNotificationService;

    public NotificationController(AdminNotificationService adminNotificationService) {
        this.adminNotificationService = adminNotificationService;
    }

    @GetMapping
    public List<AdminNotificationResponse> getMine(Authentication authentication) {
        return adminNotificationService.getMyNotifications(authentication);
    }

    @GetMapping("/unread-count")
    public UnreadNotificationsCountResponse getUnreadCount(Authentication authentication) {
        return adminNotificationService.getUnreadCount(authentication);
    }

    @PatchMapping("/{notificationId}/read")
    public AdminNotificationResponse markAsRead(@PathVariable Long notificationId, Authentication authentication) {
        return adminNotificationService.markAsRead(notificationId, authentication);
    }

    @DeleteMapping("/{notificationId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteOne(@PathVariable Long notificationId, Authentication authentication) {
        adminNotificationService.deleteOne(notificationId, authentication);
    }

    @DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteAll(Authentication authentication) {
        adminNotificationService.deleteAll(authentication);
    }
}
