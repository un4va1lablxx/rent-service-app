package edu.belsu.rent_service.config;

import edu.belsu.rent_service.adapters.in.websocket.MessageUpdatesWebSocketHandler;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    private final MessageUpdatesWebSocketHandler messageUpdatesWebSocketHandler;

    public WebSocketConfig(MessageUpdatesWebSocketHandler messageUpdatesWebSocketHandler) {
        this.messageUpdatesWebSocketHandler = messageUpdatesWebSocketHandler;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(messageUpdatesWebSocketHandler, "/ws/messages")
                .setAllowedOriginPatterns(
                        "http://localhost:*",
                        "http://127.0.0.1:*",
                        "http://192.168.0.23:*",
                        "https://rent-service-app.onrender.com",
                        "https://*.onrender.com",
                        "https://rent-service-app.vercel.app",
                        "https://*.vercel.app"
                );
    }
}
