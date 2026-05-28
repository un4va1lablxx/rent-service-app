package edu.belsu.rent_service.adapters.in.web.controller;

import edu.belsu.rent_service.adapters.out.security.AuthUserDetails;
import edu.belsu.rent_service.application.service.TelegramVerificationService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/telegram")
public class TelegramVerificationController {

    private final TelegramVerificationService telegramVerificationService;

    public TelegramVerificationController(TelegramVerificationService telegramVerificationService) {
        this.telegramVerificationService = telegramVerificationService;
    }

    @PostMapping("/send-code")
    public ResponseEntity<?> sendCode(@RequestBody Map<String, String> request, Authentication authentication) {
        System.out.println("🔵 Получен запрос /send-code");
        System.out.println("📝 Тело запроса: " + request);

        AuthUserDetails principal = (AuthUserDetails) authentication.getPrincipal();
        Long userId = principal.getId();
        String username = request.get("username");

        System.out.println("👤 userId: " + userId + ", username: " + username);

        telegramVerificationService.sendVerificationCode(userId, username);
        return ResponseEntity.ok(Map.of("message", "Код отправлен в Telegram"));
    }

    @PostMapping("/verify")
    public ResponseEntity<?> verify(@RequestBody Map<String, String> request, Authentication authentication) {
        AuthUserDetails principal = (AuthUserDetails) authentication.getPrincipal();
        Long userId = principal.getId();
        String code = request.get("code");

        telegramVerificationService.verifyCode(userId, code);
        return ResponseEntity.ok(Map.of("message", "Telegram успешно подключён"));
    }
}