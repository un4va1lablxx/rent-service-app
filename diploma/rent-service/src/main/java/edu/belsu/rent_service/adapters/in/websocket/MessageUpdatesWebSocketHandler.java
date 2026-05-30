package edu.belsu.rent_service.adapters.in.websocket;

import com.fasterxml.jackson.databind.ObjectMapper;
import edu.belsu.rent_service.adapters.out.security.JwtService;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArraySet;

@Component
public class MessageUpdatesWebSocketHandler extends TextWebSocketHandler {

    private static final String USER_ID_ATTRIBUTE = "userId";

    private final JwtService jwtService;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final Map<Long, Set<WebSocketSession>> sessionsByUserId = new ConcurrentHashMap<>();

    public MessageUpdatesWebSocketHandler(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        Long userId = resolveUserId(session.getUri());
        if (userId == null) {
            session.close(CloseStatus.POLICY_VIOLATION.withReason("Missing or invalid token"));
            return;
        }

        session.getAttributes().put(USER_ID_ATTRIBUTE, userId);
        sessionsByUserId.computeIfAbsent(userId, ignored -> new CopyOnWriteArraySet<>()).add(session);
    }

    public void sendToUser(Long userId, Map<String, Object> payload) {
        if (userId == null) {
            return;
        }

        Set<WebSocketSession> userSessions = sessionsByUserId.get(userId);
        if (userSessions == null || userSessions.isEmpty()) {
            return;
        }

        try {
            TextMessage message = new TextMessage(objectMapper.writeValueAsString(payload));
            userSessions.removeIf(session -> !session.isOpen());
            for (WebSocketSession session : userSessions) {
                try {
                    session.sendMessage(message);
                } catch (IOException ignored) {
                    unregister(session);
                }
            }
        } catch (IOException ignored) {
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        unregister(session);
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) throws Exception {
        unregister(session);
        if (session.isOpen()) {
            session.close(CloseStatus.SERVER_ERROR);
        }
    }

    private void unregister(WebSocketSession session) {
        Object userIdValue = session.getAttributes().get(USER_ID_ATTRIBUTE);
        if (!(userIdValue instanceof Long userId)) {
            return;
        }

        Set<WebSocketSession> userSessions = sessionsByUserId.get(userId);
        if (userSessions == null) {
            return;
        }
        userSessions.remove(session);
        if (userSessions.isEmpty()) {
            sessionsByUserId.remove(userId);
        }
    }

    private Long resolveUserId(URI uri) {
        if (uri == null || uri.getRawQuery() == null || uri.getRawQuery().isBlank()) {
            return null;
        }

        String token = null;
        for (String entry : uri.getRawQuery().split("&")) {
            String[] parts = entry.split("=", 2);
            if (parts.length == 2 && "token".equals(parts[0])) {
                token = URLDecoder.decode(parts[1], StandardCharsets.UTF_8);
                break;
            }
        }

        if (token == null || token.isBlank()) {
            return null;
        }

        try {
            return jwtService.extractUserId(token);
        } catch (Exception ignored) {
            return null;
        }
    }
}
