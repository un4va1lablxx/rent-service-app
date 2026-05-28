package edu.belsu.rent_service.adapters.in.web.controller;

import edu.belsu.rent_service.application.dto.auth.AuthResponse;
import edu.belsu.rent_service.application.dto.auth.LoginRequest;
import edu.belsu.rent_service.application.dto.auth.PasswordResetConfirmRequest;
import edu.belsu.rent_service.application.dto.auth.PasswordResetStartRequest;
import edu.belsu.rent_service.application.dto.auth.RegisterRequest;
import edu.belsu.rent_service.application.dto.auth.SmsCodeRequest;
import edu.belsu.rent_service.application.dto.auth.SmsCodeResponse;
import edu.belsu.rent_service.application.dto.auth.TelegramAuthStartRequest;
import edu.belsu.rent_service.application.dto.auth.TelegramAuthStartResponse;
import edu.belsu.rent_service.application.dto.auth.TelegramAuthStatusResponse;
import edu.belsu.rent_service.application.dto.auth.UserProfileResponse;
import edu.belsu.rent_service.application.service.AuthService;
import edu.belsu.rent_service.application.service.SmsCodeService;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final SmsCodeService smsCodeService;

    public AuthController(AuthService authService, SmsCodeService smsCodeService) {
        this.authService = authService;
        this.smsCodeService = smsCodeService;
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponse register(@RequestBody RegisterRequest request) {
        return authService.register(request);
    }

    @PostMapping("/login")
    public AuthResponse login(@RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @PostMapping("/password-reset/start")
    public Map<String, String> startPasswordReset(@RequestBody PasswordResetStartRequest request) {
        authService.startPasswordReset(request);
        return Map.of("message", "Код подтверждения отправлен в Telegram");
    }

    @PostMapping("/password-reset/confirm")
    public Map<String, String> confirmPasswordReset(@RequestBody PasswordResetConfirmRequest request) {
        authService.confirmPasswordReset(request);
        return Map.of("message", "Пароль обновлен");
    }

    @PostMapping("/telegram/register/start")
    public TelegramAuthStartResponse startTelegramRegistration(@RequestBody TelegramAuthStartRequest request) {
        return authService.startTelegramRegistration(request);
    }

    @PostMapping("/telegram/login/start")
    public TelegramAuthStartResponse startTelegramLogin(@RequestBody TelegramAuthStartRequest request) {
        return authService.startTelegramLogin(request);
    }

    @GetMapping("/telegram/status/{requestId}")
    public TelegramAuthStatusResponse telegramAuthStatus(@PathVariable String requestId) {
        return authService.getTelegramAuthStatus(requestId);
    }

    @PostMapping("/sms-code")
    public SmsCodeResponse requestSmsCode(@RequestBody SmsCodeRequest request) {
        return smsCodeService.issueCode(request.phoneNumber(), request.purpose());
    }

    @GetMapping("/me")
    public UserProfileResponse me(Authentication authentication) {
        return authService.me(authentication);
    }
}
