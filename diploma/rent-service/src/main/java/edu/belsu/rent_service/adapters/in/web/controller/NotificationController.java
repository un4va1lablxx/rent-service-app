package edu.belsu.rent_service.adapters.in.web.controller;

import edu.belsu.rent_service.application.dto.notification.NotificationResponse;
import edu.belsu.rent_service.application.dto.notification.UnreadNotificationsCountResponse;
import edu.belsu.rent_service.application.service.NotificationService;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService NotificationService;

    public NotificationController(NotificationService NotificationService) {
        this.NotificationService = NotificationService;
    }

    @GetMapping
    public List<NotificationResponse> getMine(Authentication authentication) {
        return NotificationService.getMyNotifications(authentication);
    }

    @GetMapping("/unread-count")
    public UnreadNotificationsCountResponse getUnreadCount(Authentication authentication) {
        return NotificationService.getUnreadCount(authentication);
    }

    @PatchMapping("/{notificationId}/read")
    public NotificationResponse markAsRead(@PathVariable Long notificationId, Authentication authentication) {
        return NotificationService.markAsRead(notificationId, authentication);
    }

    @DeleteMapping("/{notificationId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteOne(@PathVariable Long notificationId, Authentication authentication) {
        NotificationService.deleteOne(notificationId, authentication);
    }

    @DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteAll(Authentication authentication) {
        NotificationService.deleteAll(authentication);
    }
}
