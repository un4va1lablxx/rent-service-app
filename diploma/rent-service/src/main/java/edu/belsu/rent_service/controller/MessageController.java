package edu.belsu.rent_service.controller;

import edu.belsu.rent_service.dto.message.DialogSummaryResponse;
import edu.belsu.rent_service.dto.message.MessageRequest;
import edu.belsu.rent_service.dto.message.MessageResponse;
import edu.belsu.rent_service.service.MessageService;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/messages")
public class MessageController {

    private final MessageService messageService;

    public MessageController(MessageService messageService) {
        this.messageService = messageService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public MessageResponse sendMessage(@RequestBody MessageRequest request, Authentication authentication) {
        return messageService.sendMessage(request, authentication);
    }

    @GetMapping("/dialogs")
    public Page<DialogSummaryResponse> getMyDialogs(Authentication authentication,
                                                    @RequestParam(defaultValue = "0") int page,
                                                    @RequestParam(defaultValue = "20") int size) {
        return messageService.getMyDialogs(authentication, page, size);
    }

    @GetMapping("/dialogs/{adId}/{otherUserId}")
    public Page<MessageResponse> getDialog(@PathVariable Long adId,
                                           @PathVariable Long otherUserId,
                                           Authentication authentication,
                                           @RequestParam(defaultValue = "0") int page,
                                           @RequestParam(defaultValue = "50") int size) {
        return messageService.getDialog(adId, otherUserId, authentication, page, size);
    }

    @GetMapping("/unread-count")
    public Map<String, Long> getUnreadCount(Authentication authentication) {
        return Map.of("unreadCount", messageService.getUnreadCount(authentication));
    }
}
