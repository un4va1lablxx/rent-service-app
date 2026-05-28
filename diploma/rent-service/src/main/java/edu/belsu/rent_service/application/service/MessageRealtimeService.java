package edu.belsu.rent_service.application.service;

import edu.belsu.rent_service.adapters.in.websocket.MessageUpdatesWebSocketHandler;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class MessageRealtimeService {

    private final MessageUpdatesWebSocketHandler webSocketHandler;

    public MessageRealtimeService(MessageUpdatesWebSocketHandler webSocketHandler) {
        this.webSocketHandler = webSocketHandler;
    }

    public void notifyDialogChanged(Long firstUserId, Long secondUserId, Long adId) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("type", "dialog_updated");
        payload.put("adId", adId);
        payload.put("updatedAt", LocalDateTime.now().toString());

        webSocketHandler.sendToUser(firstUserId, payload);
        if (secondUserId != null && !secondUserId.equals(firstUserId)) {
            webSocketHandler.sendToUser(secondUserId, payload);
        }
    }
}
