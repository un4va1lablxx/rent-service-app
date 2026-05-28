package edu.belsu.rent_service.application.service;

import edu.belsu.rent_service.domain.SmsCode;
import edu.belsu.rent_service.application.dto.auth.SmsCodeResponse;
import edu.belsu.rent_service.application.exception.ApiException;
import edu.belsu.rent_service.adapters.out.persistence.repository.SmsCodeRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;

@Service
public class SmsCodeService {

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final PasswordEncoder PASSWORD_ENCODER = new BCryptPasswordEncoder();

    private final SmsService smsService;
    private final SmsCodeRepository smsCodeRepository;
    private final int codeLength;
    private final long codeTtlSeconds;
    private final boolean debugMode;

    public SmsCodeService(SmsService smsService,
                          SmsCodeRepository smsCodeRepository,
                          @Value("${app.sms.code-length}") int codeLength,
                          @Value("${app.sms.code-ttl-seconds}") long codeTtlSeconds,
                          @Value("${app.sms.debug}") boolean debugMode) {
        this.smsService = smsService;
        this.smsCodeRepository = smsCodeRepository;
        this.codeLength = codeLength;
        this.codeTtlSeconds = codeTtlSeconds;
        this.debugMode = debugMode;
    }

    @Transactional
    public SmsCodeResponse issueCode(String phoneNumber, String purpose) {
        validatePhone(phoneNumber);
        String normalizedPurpose = normalizePurpose(purpose);

        // Генерируем код
        String plainCode = generateNumericCode(codeLength);
        String codeHash = PASSWORD_ENCODER.encode(plainCode);

        LocalDateTime expiresAt = LocalDateTime.now().plusSeconds(codeTtlSeconds);

        // Сохраняем код в БД
        SmsCode smsCode = SmsCode.builder()
                .phoneNumber(phoneNumber)
                .purpose(normalizedPurpose)
                .codeHash(codeHash)
                .expiresAt(expiresAt)
                .build();
        smsCodeRepository.save(smsCode);

        // Отправляем SMS через SIGMA
        boolean sent = smsService.sendSms(phoneNumber, plainCode);
        if (!sent && !debugMode) {
            throw new ApiException("Не удалось отправить SMS. Попробуйте позже.");
        }

        if (debugMode) {
            System.out.println("🔧 [DEBUG MODE] Код для " + phoneNumber + ": " + plainCode);
        }

        return SmsCodeResponse.builder()
                .phoneNumber(phoneNumber)
                .purpose(normalizedPurpose)
                .expiresInSeconds(codeTtlSeconds)
                .debugCode(debugMode ? plainCode : null)
                .build();
    }

    @Transactional
    public void verifyCode(String phoneNumber, String purpose, String code) {
        validatePhone(phoneNumber);
        if (code == null || code.isBlank()) {
            throw new ApiException("SMS код обязателен");
        }

        String normalizedPurpose = normalizePurpose(purpose);

        SmsCode smsCode = smsCodeRepository
                .findTopByPhoneNumberAndPurposeAndUsedFalseOrderByCreatedAtDesc(phoneNumber, normalizedPurpose)
                .orElseThrow(() -> new ApiException("Код не найден. Запросите новый код."));

        if (LocalDateTime.now().isAfter(smsCode.getExpiresAt())) {
            smsCode.setUsed(true);
            smsCode.setUsedAt(LocalDateTime.now());
            smsCodeRepository.save(smsCode);
            throw new ApiException("Срок действия кода истёк. Запросите новый код.");
        }

        if (!PASSWORD_ENCODER.matches(code, smsCode.getCodeHash())) {
            throw new ApiException("Неверный код подтверждения");
        }

        smsCode.setUsed(true);
        smsCode.setUsedAt(LocalDateTime.now());
        smsCodeRepository.save(smsCode);
    }

    public void validatePhone(String phoneNumber) {
        if (phoneNumber == null || !phoneNumber.matches("^\\+?[0-9]{10,15}$")) {
            throw new ApiException("Телефон должен соответствовать формату +7ХХХХХХХХХХ");
        }
    }

    private String normalizePurpose(String purpose) {
        String normalized = (purpose == null || purpose.isBlank()) ? "login" : purpose.trim().toLowerCase();
        if (!normalized.equals("login") && !normalized.equals("register")) {
            throw new ApiException("SMS code purpose must be 'login' or 'register'");
        }
        return normalized;
    }

    private String generateNumericCode(int length) {
        int min = (int) Math.pow(10, length - 1);
        int max = (int) Math.pow(10, length) - 1;
        int codeValue = min + RANDOM.nextInt(max - min + 1);
        return String.format("%0" + length + "d", codeValue);
    }
}