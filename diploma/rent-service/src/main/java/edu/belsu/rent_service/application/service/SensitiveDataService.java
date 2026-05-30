package edu.belsu.rent_service.application.service;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Arrays;
import java.util.Base64;

@Service
public class SensitiveDataService {

    private static final String TRANSFORMATION = "AES/GCM/NoPadding";
    private static final int GCM_TAG_LENGTH = 128;
    private static final int IV_LENGTH = 12;

    @Value("${app.security.personal-data-secret:${jwt.secret:rent-service-personal-data-secret}}")
    private String secret;

    private final SecureRandom secureRandom = new SecureRandom();
    private SecretKeySpec keySpec;

    @PostConstruct
    void init() {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] key = Arrays.copyOf(digest.digest(secret.getBytes(StandardCharsets.UTF_8)), 16);
            this.keySpec = new SecretKeySpec(key, "AES");
        } catch (Exception exception) {
            throw new IllegalStateException("Failed to initialize sensitive data encryption", exception);
        }
    }

    public String encrypt(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }

        try {
            byte[] iv = new byte[IV_LENGTH];
            secureRandom.nextBytes(iv);

            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            cipher.init(Cipher.ENCRYPT_MODE, keySpec, new GCMParameterSpec(GCM_TAG_LENGTH, iv));
            byte[] encrypted = cipher.doFinal(value.trim().getBytes(StandardCharsets.UTF_8));

            byte[] payload = new byte[IV_LENGTH + encrypted.length];
            System.arraycopy(iv, 0, payload, 0, IV_LENGTH);
            System.arraycopy(encrypted, 0, payload, IV_LENGTH, encrypted.length);
            return Base64.getEncoder().withoutPadding().encodeToString(payload);
        } catch (Exception exception) {
            throw new IllegalStateException("Failed to encrypt sensitive data", exception);
        }
    }

    public String decrypt(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }

        try {
            byte[] payload = Base64.getDecoder().decode(restoreBase64Padding(value));
            if (payload.length <= IV_LENGTH) {
                return null;
            }

            byte[] iv = Arrays.copyOfRange(payload, 0, IV_LENGTH);
            byte[] encrypted = Arrays.copyOfRange(payload, IV_LENGTH, payload.length);

            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            cipher.init(Cipher.DECRYPT_MODE, keySpec, new GCMParameterSpec(GCM_TAG_LENGTH, iv));
            return new String(cipher.doFinal(encrypted), StandardCharsets.UTF_8);
        } catch (Exception exception) {
            throw new IllegalStateException("Failed to decrypt sensitive data", exception);
        }
    }

    public String encryptCardNumber(String cardNumber) {
        if (!StringUtils.hasText(cardNumber)) {
            return null;
        }
        String digits = cardNumber.replaceAll("\\s+", "");
        if (digits.length() < 4) {
            return encrypt(digits);
        }
        return encrypt(digits) + digits.substring(digits.length() - 4);
    }

    public String decryptCardNumberOrOriginal(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        try {
            if (value.length() > 4) {
                return decrypt(value.substring(0, value.length() - 4));
            }
            return decrypt(value);
        } catch (IllegalStateException ignored) {
            return value;
        }
    }

    public String decryptOrOriginal(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        try {
            return decrypt(value);
        } catch (IllegalStateException ignored) {
            return value;
        }
    }

    private String restoreBase64Padding(String value) {
        int remainder = value.length() % 4;
        if (remainder == 0) {
            return value;
        }
        return value + "=".repeat(4 - remainder);
    }
}
