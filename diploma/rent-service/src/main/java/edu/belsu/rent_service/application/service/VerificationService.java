package edu.belsu.rent_service.application.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import edu.belsu.rent_service.adapters.out.persistence.repository.BookingRepository;
import edu.belsu.rent_service.adapters.out.persistence.repository.UserRepository;
import edu.belsu.rent_service.adapters.out.persistence.repository.VerificationRequestRepository;
import edu.belsu.rent_service.application.dto.verification.VerificationDecisionRequest;
import edu.belsu.rent_service.application.dto.verification.VerificationRequestPayload;
import edu.belsu.rent_service.application.dto.verification.VerificationRequestResponse;
import edu.belsu.rent_service.application.exception.ApiException;
import edu.belsu.rent_service.domain.User;
import edu.belsu.rent_service.domain.VerificationRequest;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

@Service
public class VerificationService {

    private static final Pattern CADASTRAL_PATTERN = Pattern.compile("^[0-9]{2}:[0-9]{2}:[0-9]{7}:[0-9]+$");

    private final VerificationRequestRepository verificationRequestRepository;
    private final BookingRepository bookingRepository;
    private final UserRepository userRepository;
    private final AuthenticatedUserService authenticatedUserService;
    private final SensitiveDataService sensitiveDataService;
    private final AdminNotificationService adminNotificationService;
    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

    public VerificationService(VerificationRequestRepository verificationRequestRepository,
                               BookingRepository bookingRepository,
                               UserRepository userRepository,
                               AuthenticatedUserService authenticatedUserService,
                               SensitiveDataService sensitiveDataService,
                               AdminNotificationService adminNotificationService) {
        this.verificationRequestRepository = verificationRequestRepository;
        this.bookingRepository = bookingRepository;
        this.userRepository = userRepository;
        this.authenticatedUserService = authenticatedUserService;
        this.sensitiveDataService = sensitiveDataService;
        this.adminNotificationService = adminNotificationService;
    }

    @Transactional
    public VerificationRequestResponse createRequest(VerificationRequestPayload payload, Authentication authentication) {
        User user = authenticatedUserService.getCurrentUser(authentication);
        if (payload == null || !StringUtils.hasText(payload.verificationType())) {
            throw new ApiException("Укажите тип верификации");
        }

        String type = normalizeVerificationType(payload.verificationType());
        verificationRequestRepository.findByUserIdAndVerificationTypeAndStatus(user.getId(), type, "pending")
                .ifPresent(existing -> {
                    throw new ApiException("По этому типу уже есть активная заявка на проверку");
                });

        Map<String, Object> requestData = new LinkedHashMap<>();
        Map<String, Object> responseData = new LinkedHashMap<>();
        requestData.put("note", normalizeOptional(payload.note()));
        requestData.put("gosuslugiId", normalizeOptional(payload.gosuslugiId()));

        if ("owner_verified".equals(type)) {
            validateOwnerVerification(user, payload, requestData, responseData);
        } else {
            validateTrustedPartnerVerification(user, payload, requestData, responseData);
        }

        VerificationRequest request = VerificationRequest.builder()
                .user(user)
                .verificationType(type)
                .status("pending")
                .phoneNumber(user.getPhoneNumber())
                .gosuslugiId(normalizeOptional(payload.gosuslugiId()))
                .requestData(toJson(requestData))
                .responseData(toJson(responseData))
                .build();

        return map(verificationRequestRepository.save(request));
    }

    @Transactional(readOnly = true)
    public List<VerificationRequestResponse> getMyRequests(Authentication authentication) {
        User user = authenticatedUserService.getCurrentUser(authentication);
        return verificationRequestRepository.findByUserIdOrderByCreatedAtDesc(user.getId()).stream()
                .map(this::map)
                .toList();
    }

    @Transactional
    public VerificationRequestResponse removeMyDocument(Long requestId, String fieldKey, Authentication authentication) {
        User user = authenticatedUserService.getCurrentUser(authentication);
        VerificationRequest request = verificationRequestRepository.findById(requestId)
                .orElseThrow(() -> new ApiException("Verification request not found"));

        if (!request.getUser().getId().equals(user.getId())) {
            throw new ApiException("Нельзя изменять чужую заявку");
        }
        if (!"owner_verified".equalsIgnoreCase(request.getVerificationType())) {
            throw new ApiException("Документы можно удалять только из заявки собственника");
        }
        if ("approved".equalsIgnoreCase(request.getStatus())) {
            throw new ApiException("Нельзя изменять уже одобренную заявку");
        }

        String normalizedField = normalizeOwnerDocumentField(fieldKey);
        Map<String, Object> requestData = parseJson(request.getRequestData());
        requestData.remove(normalizedField);
        request.setRequestData(toJson(requestData));

        return map(verificationRequestRepository.save(request));
    }

    @Transactional(readOnly = true)
    public List<VerificationRequestResponse> getRequestsByStatus(String status) {
        String normalized = normalizeStatus(status == null ? "pending" : status);
        return verificationRequestRepository.findByStatusOrderByCreatedAtDesc(normalized).stream()
                .map(this::map)
                .toList();
    }

    @Transactional
    public VerificationRequestResponse decide(Long requestId, VerificationDecisionRequest request, Authentication authentication) {
        VerificationRequest verificationRequest = verificationRequestRepository.findById(requestId)
                .orElseThrow(() -> new ApiException("Verification request not found"));
        String status = normalizeStatus(request == null ? null : request.status());
        if (!"pending".equalsIgnoreCase(verificationRequest.getStatus())) {
            throw new ApiException("Заявка уже обработана");
        }

        verificationRequest.setStatus(status);
        verificationRequest.setFailureReason("rejected".equals(status) ? normalizeOptional(request.failureReason()) : null);
        verificationRequest.setCompletedAt(LocalDateTime.now());

        Map<String, Object> responseData = parseJson(verificationRequest.getResponseData());
        responseData.put("moderatedAt", verificationRequest.getCompletedAt().toString());
        responseData.put("decision", status);
        responseData.put("failureReason", verificationRequest.getFailureReason());
        verificationRequest.setResponseData(toJson(responseData));

        User user = verificationRequest.getUser();
        if ("approved".equals(status)) {
            if ("owner_verified".equals(verificationRequest.getVerificationType())) {
                user.setVerified(true);
                user.setSmsVerified(true);
                user.setVerificationStatus("owner_verified");
                promoteToLandlordIfNeeded(user);
            } else if ("trusted_partner".equals(verificationRequest.getVerificationType())) {
                user.setVerificationStatus("trusted_partner");
                promoteToLandlordIfNeeded(user);
            }
            adminNotificationService.notifyUser(
                    user.getId(),
                    "Вы получили сообщение от администратора",
                    "Ваша заявка на верификацию «" + ("owner_verified".equals(verificationRequest.getVerificationType()) ? "Подтвержденный собственник" : "Надежный партнер") + "» одобрена."
            );
        } else if ("rejected".equals(status)) {
            adminNotificationService.notifyUser(
                    user.getId(),
                    "Вы получили сообщение от администратора",
                    "Ваша заявка на верификацию отклонена. Причина: " + (verificationRequest.getFailureReason() == null ? "не указана" : verificationRequest.getFailureReason())
            );
        }

        userRepository.save(user);
        return map(verificationRequestRepository.save(verificationRequest));
    }

    private void validateOwnerVerification(User user,
                                           VerificationRequestPayload payload,
                                           Map<String, Object> requestData,
                                           Map<String, Object> responseData) {
        if (!user.isSmsVerified()) {
            throw new ApiException("Сначала подтвердите номер телефона");
        }
        String cadastralNumber = requireText(payload.cadastralNumber(), "Укажите кадастровый номер");
        if (!CADASTRAL_PATTERN.matcher(cadastralNumber).matches()) {
            throw new ApiException("Кадастровый номер должен быть в формате 00:00:0000000:000");
        }
        requestData.put("cadastralNumber", cadastralNumber);
        requestData.put("passportDocumentUrl", requireText(payload.passportDocumentUrl(), "Загрузите паспорт"));
        requestData.put("snilsDocumentUrl", requireText(payload.snilsDocumentUrl(), "Загрузите СНИЛС"));
        requestData.put("egrnDocumentUrl", requireText(payload.egrnDocumentUrl(), "Загрузите выписку ЕГРН или подтверждение права собственности"));
        responseData.put("rosreestrStatus", "object_found");
        responseData.put("rosreestrMessage", "Объект найден. Ожидается проверка модератором.");
    }

    private void validateTrustedPartnerVerification(User user,
                                                    VerificationRequestPayload payload,
                                                    Map<String, Object> requestData,
                                                    Map<String, Object> responseData) {
        if (!"owner_verified".equalsIgnoreCase(user.getVerificationStatus())
                && !"trusted_partner".equalsIgnoreCase(user.getVerificationStatus())) {
            throw new ApiException("Статус 'Надежный партнер' доступен только после подтверждения собственника");
        }
        long completedDeals = bookingRepository.countByLandlordIdAndStatus(user.getId(), "completed");
        if (completedDeals < 3) {
            throw new ApiException("Для этого статуса нужно минимум 3 успешно завершенные аренды");
        }
        if (!Boolean.TRUE.equals(payload.consentFsspCheck())) {
            throw new ApiException("Нужно согласие на проверку по открытым базам");
        }
        requestData.put("preferredVideoSlot", requireText(payload.preferredVideoSlot(), "Выберите удобный слот для видеособеседования"));
        requestData.put("consentFsspCheck", true);
        requestData.put("completedDeals", completedDeals);
        responseData.put("fsspCheck", "clear");
        responseData.put("videoInterviewStatus", "scheduled");
    }

    private VerificationRequestResponse map(VerificationRequest request) {
        Map<String, Object> requestData = parseJson(request.getRequestData());
        return VerificationRequestResponse.builder()
                .id(request.getId())
                .userId(request.getUser().getId())
                .userName(request.getUser().getFullName())
                .phoneNumber(request.getPhoneNumber())
                .passportCitizenship(sensitiveDataService.decrypt(request.getUser().getPassportCitizenshipEncrypted()))
                .passportNumber(sensitiveDataService.decrypt(request.getUser().getPassportNumberEncrypted()))
                .passportIssuedBy(sensitiveDataService.decrypt(request.getUser().getPassportIssuedByEncrypted()))
                .passportIssuedAt(sensitiveDataService.decrypt(request.getUser().getPassportIssuedAtEncrypted()))
                .passportRegistrationAddress(sensitiveDataService.decrypt(request.getUser().getPassportRegistrationAddressEncrypted()))
                .userVerificationStatus(request.getUser().getVerificationStatus())
                .verificationType(request.getVerificationType())
                .status(request.getStatus())
                .cadastralNumber(asText(requestData.get("cadastralNumber")))
                .gosuslugiId(request.getGosuslugiId())
                .failureReason(request.getFailureReason())
                .requestData(request.getRequestData())
                .responseData(request.getResponseData())
                .createdAt(request.getCreatedAt())
                .completedAt(request.getCompletedAt())
                .build();
    }

    private String normalizeVerificationType(String type) {
        String normalized = type.trim().toLowerCase();
        if (!normalized.equals("owner_verified") && !normalized.equals("trusted_partner")) {
            throw new ApiException("Неизвестный тип верификации: " + type);
        }
        return normalized;
    }

    private String normalizeOwnerDocumentField(String fieldKey) {
        String normalized = fieldKey == null ? "" : fieldKey.trim();
        if (!normalized.equals("passportDocumentUrl")
                && !normalized.equals("snilsDocumentUrl")
                && !normalized.equals("egrnDocumentUrl")) {
            throw new ApiException("Неизвестный тип документа: " + fieldKey);
        }
        return normalized;
    }

    private void promoteToLandlordIfNeeded(User user) {
        if (!"admin".equalsIgnoreCase(user.getRole())) {
            user.setRole("landlord");
        }
    }

    private String normalizeStatus(String status) {
        if (!StringUtils.hasText(status)) {
            throw new ApiException("Укажите решение по заявке");
        }
        String normalized = status.trim().toLowerCase();
        if (!normalized.equals("pending") && !normalized.equals("approved") && !normalized.equals("rejected")) {
            throw new ApiException("Неизвестный статус: " + status);
        }
        return normalized;
    }

    private String requireText(String value, String message) {
        if (!StringUtils.hasText(value)) {
            throw new ApiException(message);
        }
        return value.trim();
    }

    private String normalizeOptional(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }

    private String asText(Object value) {
        return value == null ? null : String.valueOf(value);
    }

    private String toJson(Map<String, Object> data) {
        try {
            return objectMapper.writeValueAsString(data);
        } catch (JsonProcessingException e) {
            throw new ApiException("Не удалось сериализовать данные верификации");
        }
    }

    private Map<String, Object> parseJson(String data) {
        if (!StringUtils.hasText(data)) {
            return new LinkedHashMap<>();
        }
        try {
            return objectMapper.readValue(data, new TypeReference<>() {});
        } catch (JsonProcessingException e) {
            throw new ApiException("Не удалось прочитать данные верификации");
        }
    }
}
