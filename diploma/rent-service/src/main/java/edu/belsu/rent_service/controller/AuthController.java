package edu.belsu.rent_service.controller;

import edu.belsu.rent_service.dto.auth.AuthResponse;
import edu.belsu.rent_service.dto.auth.LoginRequest;
import edu.belsu.rent_service.dto.auth.RegisterRequest;
import edu.belsu.rent_service.dto.auth.SmsCodeRequest;
import edu.belsu.rent_service.dto.auth.SmsCodeResponse;
import edu.belsu.rent_service.dto.auth.UserProfileResponse;
import edu.belsu.rent_service.service.AuthService;
import edu.belsu.rent_service.service.SmsCodeService;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

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

    @PostMapping("/sms-code")
    public SmsCodeResponse requestSmsCode(@RequestBody SmsCodeRequest request) {
        return smsCodeService.issueCode(request.phoneNumber(), request.purpose());
    }

    @GetMapping("/me")
    public UserProfileResponse me(Authentication authentication) {
        return authService.me(authentication);
    }
}
