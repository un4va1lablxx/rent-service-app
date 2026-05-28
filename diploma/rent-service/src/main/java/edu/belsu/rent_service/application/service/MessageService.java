package edu.belsu.rent_service.application.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import edu.belsu.rent_service.domain.Ad;
import edu.belsu.rent_service.domain.Booking;
import edu.belsu.rent_service.domain.Contract;
import edu.belsu.rent_service.domain.Message;
import edu.belsu.rent_service.domain.Payment;
import edu.belsu.rent_service.domain.User;
import edu.belsu.rent_service.domain.ViewingRequest;
import edu.belsu.rent_service.application.dto.message.ContractDraftRequest;
import edu.belsu.rent_service.application.dto.message.ContractDeclineRequest;
import edu.belsu.rent_service.application.dto.message.ContractResponse;
import edu.belsu.rent_service.application.dto.message.ContractSignRequest;
import edu.belsu.rent_service.application.dto.message.DialogSummaryResponse;
import edu.belsu.rent_service.application.dto.message.MessageRequest;
import edu.belsu.rent_service.application.dto.message.MessageResponse;
import edu.belsu.rent_service.application.dto.message.PaymentChargeRequest;
import edu.belsu.rent_service.application.dto.message.PaymentResponse;
import edu.belsu.rent_service.application.dto.message.ViewingProposalDecisionRequest;
import edu.belsu.rent_service.application.dto.message.ViewingProposalRequest;
import edu.belsu.rent_service.application.dto.message.ViewingResultRequest;
import edu.belsu.rent_service.application.exception.ApiException;
import edu.belsu.rent_service.adapters.out.persistence.repository.AdRepository;
import edu.belsu.rent_service.adapters.out.persistence.repository.BookingRepository;
import edu.belsu.rent_service.adapters.out.persistence.repository.ContractRepository;
import edu.belsu.rent_service.adapters.out.persistence.repository.MessageRepository;
import edu.belsu.rent_service.adapters.out.persistence.repository.PaymentRepository;
import edu.belsu.rent_service.adapters.out.persistence.repository.UserRepository;
import edu.belsu.rent_service.adapters.out.persistence.repository.ViewingRequestRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.core.io.ClassPathResource;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.apache.poi.xwpf.usermodel.BreakType;
import org.apache.poi.xwpf.usermodel.ParagraphAlignment;
import org.apache.poi.xwpf.usermodel.UnderlinePatterns;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.apache.poi.xwpf.usermodel.XWPFRun;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.CTBody;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.CTPageMar;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.CTPageSz;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.CTSectPr;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.Collection;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

@Service
public class MessageService {

    private static final ZoneId MOSCOW_ZONE = ZoneId.of("Europe/Moscow");
    private static final Locale RU_LOCALE = Locale.forLanguageTag("ru-RU");
    private static final DateTimeFormatter VIEWING_FORMATTER = DateTimeFormatter.ofPattern("dd.MM.yyyy 'в' HH:mm", RU_LOCALE);
    private static final DateTimeFormatter CONTRACT_DATE_FORMATTER = DateTimeFormatter.ofPattern("d MMMM uuuu", RU_LOCALE);
    private static final DateTimeFormatter SIGNATURE_DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm 'МСК'", RU_LOCALE);
    private static final DateTimeFormatter DISPLAY_DATE_FORMATTER = DateTimeFormatter.ofPattern("dd.MM.yyyy", RU_LOCALE);
    private final MessageRepository messageRepository;
    private final AdRepository adRepository;
    private final UserRepository userRepository;
    private final BookingRepository bookingRepository;
    private final ViewingRequestRepository viewingRequestRepository;
    private final ContractRepository contractRepository;
    private final PaymentRepository paymentRepository;
    private final AuthenticatedUserService authenticatedUserService;
    private final FileUploadService fileUploadService;
    private final MessageRealtimeService messageRealtimeService;
    private final SensitiveDataService sensitiveDataService;
    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

    public MessageService(MessageRepository messageRepository,
                          AdRepository adRepository,
                          UserRepository userRepository,
                          BookingRepository bookingRepository,
                          ViewingRequestRepository viewingRequestRepository,
                          ContractRepository contractRepository,
                          PaymentRepository paymentRepository,
                          AuthenticatedUserService authenticatedUserService,
                          FileUploadService fileUploadService,
                          MessageRealtimeService messageRealtimeService,
                          SensitiveDataService sensitiveDataService) {
        this.messageRepository = messageRepository;
        this.adRepository = adRepository;
        this.userRepository = userRepository;
        this.bookingRepository = bookingRepository;
        this.viewingRequestRepository = viewingRequestRepository;
        this.contractRepository = contractRepository;
        this.paymentRepository = paymentRepository;
        this.authenticatedUserService = authenticatedUserService;
        this.fileUploadService = fileUploadService;
        this.messageRealtimeService = messageRealtimeService;
        this.sensitiveDataService = sensitiveDataService;
    }

    @Transactional
    public MessageResponse sendMessage(MessageRequest request, Authentication authentication) {
        User currentUser = authenticatedUserService.getCurrentUser(authentication);
        Ad ad = loadAd(request.adId());
        User recipient = loadRecipient(request.toUserId());
        validateDialogAccess(ad, currentUser, recipient);
        validateMessageRequest(request);

        String text = request.text().trim();
        Message message = buildMessage(ad, currentUser, recipient, text, "text", null);
        message.setContainsContactDetails(containsContactDetails(text));
        Message savedMessage = messageRepository.save(message);
        notifyDialogParticipants(ad, currentUser, recipient);
        return mapToResponse(savedMessage);
    }

    @Transactional
    public MessageResponse proposeViewing(ViewingProposalRequest request, Authentication authentication) {
        User currentUser = authenticatedUserService.getCurrentUser(authentication);
        Ad ad = loadAd(request.adId());
        User otherUser = loadRecipient(request.otherUserId());
        validateDialogAccess(ad, currentUser, otherUser);

        if (request.proposedDateTime() == null || !request.proposedDateTime().isAfter(nowMoscow())) {
            throw new ApiException("Viewing date and time must be in the future");
        }

        String initiatorRole = ad.getUser().getId().equals(currentUser.getId()) ? "landlord" : "tenant";
        String payload = toJson(Map.of(
                "type", "viewing_proposal",
                "status", "pending",
                "proposedDateTime", request.proposedDateTime().toString(),
                "initiatorRole", initiatorRole,
                "initiatorName", currentUser.getFullName(),
                "displayText", (initiatorRole.equals("landlord") ? "Арендодатель" : "Арендатор")
                        + " предложил вам встретиться " + request.proposedDateTime().format(VIEWING_FORMATTER)
        ));

        Message message = buildMessage(ad, currentUser, otherUser, payload, "viewing_proposal", null);
        Message savedMessage = messageRepository.save(message);
        notifyDialogParticipants(ad, currentUser, otherUser);
        return mapToResponse(savedMessage);
    }

    @Transactional
    public MessageResponse decideViewingProposal(Long messageId,
                                                 ViewingProposalDecisionRequest request,
                                                 Authentication authentication) {
        User currentUser = authenticatedUserService.getCurrentUser(authentication);
        Message proposal = messageRepository.findById(messageId)
                .orElseThrow(() -> new ApiException("Message not found"));

        if (!"viewing_proposal".equals(proposal.getMessageType())) {
            throw new ApiException("Message is not a viewing proposal");
        }
        if (!proposal.getToUser().getId().equals(currentUser.getId())) {
            throw new ApiException("Only the receiving side can decide on the proposal");
        }

        Map<String, Object> payload = parseJson(proposal.getEncryptedText());
        String status = String.valueOf(payload.get("status"));
        if (!"pending".equals(status)) {
            throw new ApiException("This proposal is already processed");
        }

        if (!request.accepted()) {
            payload.put("status", "rejected");
            payload.put("displayText", "Предложение о просмотре отклонено");
            proposal.setEncryptedText(encode(toJson(payload)));
            Message savedProposal = messageRepository.save(proposal);
            notifyDialogParticipants(proposal.getAd(), proposal.getFromUser(), proposal.getToUser());
            return mapToResponse(savedProposal);
        }

        Ad ad = proposal.getAd();
        User landlord = ad.getUser();
        User tenant = landlord.getId().equals(proposal.getFromUser().getId()) ? proposal.getToUser() : proposal.getFromUser();
        User proposedBy = proposal.getFromUser();
        LocalDateTime proposedDateTime = LocalDateTime.parse(String.valueOf(payload.get("proposedDateTime")));

        ViewingRequest viewingRequest = viewingRequestRepository.save(ViewingRequest.builder()
                .ad(ad)
                .tenant(tenant)
                .landlord(landlord)
                .proposedByUser(proposedBy)
                .proposedDateTime(proposedDateTime)
                .status("confirmed")
                .build());

        payload.put("status", "accepted");
        payload.put("displayText", "Предложение о просмотре принято");
        proposal.setRelatedId(viewingRequest.getId());
        proposal.setEncryptedText(encode(toJson(payload)));
        messageRepository.save(proposal);

        Message confirmed = buildMessage(
                ad,
                proposedBy,
                currentUser,
                toJson(Map.of(
                        "type", "viewing_confirmed",
                        "displayText", "Между вами назначена встреча " + proposedDateTime.format(VIEWING_FORMATTER)
                )),
                "viewing_confirmed",
                viewingRequest.getId()
        );
        Message savedConfirmed = messageRepository.save(confirmed);
        notifyDialogParticipants(ad, proposal.getFromUser(), proposal.getToUser());
        return mapToResponse(savedConfirmed);
    }

    @Transactional
    public MessageResponse submitViewingResult(Long viewingRequestId,
                                               ViewingResultRequest request,
                                               Authentication authentication) {
        User currentUser = authenticatedUserService.getCurrentUser(authentication);
        ViewingRequest viewingRequest = viewingRequestRepository.findByIdForUpdate(viewingRequestId)
                .orElseThrow(() -> new ApiException("Viewing request not found"));
        Message existingPrompt = messageRepository
                .findFirstByMessageTypeAndRelatedIdOrderByCreatedAtAsc("viewing_result_prompt", viewingRequest.getId())
                .orElse(null);

        boolean isTenant = viewingRequest.getTenant().getId().equals(currentUser.getId());
        boolean isLandlord = viewingRequest.getLandlord().getId().equals(currentUser.getId());
        if (!isTenant && !isLandlord) {
            throw new ApiException("Access denied");
        }
        if ("completed".equalsIgnoreCase(viewingRequest.getStatus()) && viewingRequest.getBooking() != null) {
            return mapToResponse(findOrCreateBookingReadyMessage(viewingRequest.getBooking()));
        }
        if (!"confirmed".equalsIgnoreCase(viewingRequest.getStatus()) && !"result_pending".equalsIgnoreCase(viewingRequest.getStatus())) {
            throw new ApiException("Viewing result can no longer be changed");
        }

        viewingRequest.setStatus("result_pending");
        if (isTenant) {
            viewingRequest.setTenantReady(request.confirmed());
        } else {
            viewingRequest.setLandlordReady(request.confirmed());
        }
        if (existingPrompt != null) {
            Map<String, Object> promptPayload = parseJson(existingPrompt.getEncryptedText());
            promptPayload.put("landlordResponded", isLandlord || Boolean.TRUE.equals(promptPayload.get("landlordResponded")));
            promptPayload.put("tenantResponded", isTenant || Boolean.TRUE.equals(promptPayload.get("tenantResponded")));
            existingPrompt.setEncryptedText(encode(toJson(promptPayload)));
            messageRepository.save(existingPrompt);
        }

        if ((!isTenant && !request.confirmed()) || (!isLandlord && !request.confirmed())) {
            viewingRequest.setStatus("cancelled");
            viewingRequestRepository.save(viewingRequest);
            if (existingPrompt != null) {
                Map<String, Object> promptPayload = parseJson(existingPrompt.getEncryptedText());
                promptPayload.put("landlordResponded", true);
                promptPayload.put("tenantResponded", true);
                existingPrompt.setEncryptedText(encode(toJson(promptPayload)));
                messageRepository.save(existingPrompt);
            }
            Message cancelled = buildMessage(
                    viewingRequest.getAd(),
                    currentUser,
                    isTenant ? viewingRequest.getLandlord() : viewingRequest.getTenant(),
                    toJson(Map.of(
                            "type", "viewing_cancelled",
                            "displayText", "Одна из сторон отказалась продолжать оформление после просмотра"
                    )),
                    "viewing_cancelled",
                    viewingRequest.getId()
            );
            Message savedCancelled = messageRepository.save(cancelled);
            notifyDialogParticipants(viewingRequest.getAd(), viewingRequest.getLandlord(), viewingRequest.getTenant());
            return mapToResponse(savedCancelled);
        }

        if (viewingRequest.isTenantReady() && viewingRequest.isLandlordReady()) {
            Booking booking = viewingRequest.getBooking();
            if (booking != null) {
                ViewingRequest bookingOwner = viewingRequestRepository.findFirstByBookingId(booking.getId()).orElse(null);
                boolean bookingBelongsToAnotherViewing = bookingOwner != null
                        && !bookingOwner.getId().equals(viewingRequest.getId());
                boolean bookingDoesNotMatchParticipants = !booking.getAd().getId().equals(viewingRequest.getAd().getId())
                        || !booking.getTenant().getId().equals(viewingRequest.getTenant().getId())
                        || !booking.getLandlord().getId().equals(viewingRequest.getLandlord().getId());
                if (bookingBelongsToAnotherViewing || bookingDoesNotMatchParticipants) {
                    booking = null;
                    viewingRequest.setBooking(null);
                }
            }
            if (booking == null) {
                booking = bookingRepository.save(Booking.builder()
                        .ad(viewingRequest.getAd())
                        .tenant(viewingRequest.getTenant())
                        .landlord(viewingRequest.getLandlord())
                        .status("confirmed")
                        .startDate(todayMoscow())
                        .endDate(todayMoscow().plusMonths(1))
                        .agreedPrice(resolveAdPrice(viewingRequest.getAd()))
                        .contactRevealed(true)
                        .build());
                viewingRequest.setBooking(booking);
            }

            viewingRequest.setStatus("completed");
            viewingRequestRepository.save(viewingRequest);
            Message savedReady = findOrCreateBookingReadyMessage(booking);
            notifyDialogParticipants(viewingRequest.getAd(), viewingRequest.getLandlord(), viewingRequest.getTenant());
            return mapToResponse(savedReady);
        }

        viewingRequestRepository.save(viewingRequest);
        Message prompt = existingPrompt != null ? existingPrompt : findOrCreateResultPrompt(viewingRequest);
        notifyDialogParticipants(viewingRequest.getAd(), viewingRequest.getLandlord(), viewingRequest.getTenant());
        return mapToResponse(prompt);
    }

    @Transactional
    public ContractResponse createContractDraft(ContractDraftRequest request, Authentication authentication) {
        User currentUser = authenticatedUserService.getCurrentUser(authentication);
        Booking booking = bookingRepository.findById(request.bookingId())
                .orElseThrow(() -> new ApiException("Booking not found"));

        if (!booking.getLandlord().getId().equals(currentUser.getId())) {
            throw new ApiException("Only the landlord can create a contract");
        }
        if (!"confirmed".equalsIgnoreCase(booking.getStatus())) {
            throw new ApiException("Contract can be created only for a confirmed booking");
        }
        if (!request.signImmediately()) {
            throw new ApiException("Подтвердите подписание договора перед отправкой арендатору");
        }

        Contract contract = contractRepository.findByBookingId(booking.getId())
                .orElse(Contract.builder().booking(booking).build());
        Map<String, Object> contractData = buildLandlordContractData(contract, booking, request);
        LocalDateTime signedAt = nowMoscow();
        String signatureHash = generateSignatureHash(booking.getLandlord(), contractData, signedAt);
        contractData.put("landlordSignedAt", SIGNATURE_DATE_TIME_FORMATTER.format(signedAt));
        contractData.put("landlordSignatureHash", signatureHash);
        contractData.put("landlordSignatureLabel", buildSignatureLabel(booking.getLandlord(), signedAt, signatureHash));
        contractData.put("tenantSignatureLabel", "Будет добавлена арендатором при подписании");

        byte[] docx = generateContractDocx(booking, contractData);
        String fileName = "contract_" + booking.getId() + "_" + UUID.randomUUID() + ".docx";
        String documentUrl = fileUploadService.saveFile(docx, fileName);
        contract.setPdfUrl(documentUrl);
        contract.setContractData(toJson(contractData));
        contract.setStatus("sent");
        contract.setLandlordSignedAt(signedAt);
        contract.setTenantSignedAt(null);
        contract.setLandlordSignatureHash(signatureHash);
        contract.setTenantSignatureHash(null);
        Contract savedContract = contractRepository.save(contract);

        if (request.signImmediately()) {
            findOrCreateContractSentMessage(savedContract, booking, documentUrl);
        }

        notifyDialogParticipants(booking.getAd(), booking.getLandlord(), booking.getTenant());
        return mapContract(savedContract);
    }

    @Transactional(readOnly = true)
    public ContractResponse getContract(Long contractId, Authentication authentication) {
        User currentUser = authenticatedUserService.getCurrentUser(authentication);
        Contract contract = contractRepository.findById(contractId)
                .orElseThrow(() -> new ApiException("Contract not found"));
        validateContractParticipant(contract, currentUser);
        return mapContract(contract);
    }

    @Transactional
    public ContractResponse signContract(Long contractId,
                                         ContractSignRequest request,
                                         Authentication authentication) {
        User currentUser = authenticatedUserService.getCurrentUser(authentication);
        Contract contract = contractRepository.findById(contractId)
                .orElseThrow(() -> new ApiException("Contract not found"));

        if (!contract.getBooking().getTenant().getId().equals(currentUser.getId())) {
            throw new ApiException("Only the tenant can sign this contract");
        }
        if ("active".equalsIgnoreCase(contract.getStatus()) && contract.getTenantSignedAt() != null) {
            return mapContract(contract);
        }
        if ("declined".equalsIgnoreCase(contract.getStatus())) {
            throw new ApiException("Договор уже отклонен и не может быть подписан");
        }
        if (request == null || !request.signConfirmed()) {
            throw new ApiException("Подтвердите подписание договора");
        }

        Map<String, Object> contractData = readContractData(contract);
        applyTenantContractData(contractData, contract.getBooking(), request);
        LocalDateTime signedAt = nowMoscow();
        String signatureHash = generateSignatureHash(contract.getBooking().getTenant(), contractData, signedAt);
        contractData.put("tenantSignedAt", SIGNATURE_DATE_TIME_FORMATTER.format(signedAt));
        contractData.put("tenantSignatureHash", signatureHash);
        contractData.put("tenantSignatureLabel", buildSignatureLabel(contract.getBooking().getTenant(), signedAt, signatureHash));

        byte[] docx = generateContractDocx(contract.getBooking(), contractData);
        String fileName = "contract_" + contract.getBooking().getId() + "_" + UUID.randomUUID() + ".docx";
        String documentUrl = fileUploadService.saveFile(docx, fileName);

        contract.setPdfUrl(documentUrl);
        contract.setContractData(toJson(contractData));
        contract.setTenantSignedAt(signedAt);
        contract.setTenantSignatureHash(signatureHash);
        contract.setStatus("active");
        Booking booking = contract.getBooking();
        booking.setStatus("payment_pending");
        booking.setCompletedAt(null);
        bookingRepository.save(booking);
        Contract savedContract = contractRepository.save(contract);
        Payment payment = createOrRefreshPayment(savedContract, contractData);

        findOrCreateContractActiveMessage(savedContract, buildMessage(
                contract.getBooking().getAd(),
                contract.getBooking().getTenant(),
                contract.getBooking().getLandlord(),
                toJson(Map.of(
                        "type", "contract_active",
                        "displayText", "Договор подписан обеими сторонами и вступил в силу",
                        "documentUrl", documentUrl
                )),
                "contract_active",
                savedContract.getId()
        ));
        findOrCreatePaymentRequestedMessage(payment, savedContract, contractData);
        notifyDialogParticipants(contract.getBooking().getAd(), contract.getBooking().getLandlord(), contract.getBooking().getTenant());
        return mapContract(savedContract);
    }

    @Transactional(readOnly = true)
    public PaymentResponse getPayment(Long paymentId, Authentication authentication) {
        User currentUser = authenticatedUserService.getCurrentUser(authentication);
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new ApiException("Payment not found"));
        validatePaymentParticipant(payment, currentUser);
        Contract contract = contractRepository.findByBookingId(payment.getBooking().getId()).orElse(null);
        Map<String, Object> contractData = contract == null ? new LinkedHashMap<>() : readContractData(contract);
        return mapPayment(payment, contract, contractData, null);
    }

    @Transactional
    public PaymentResponse pay(Long paymentId, PaymentChargeRequest request, Authentication authentication) {
        User currentUser = authenticatedUserService.getCurrentUser(authentication);
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new ApiException("Payment not found"));
        validatePaymentParticipant(payment, currentUser);

        Booking booking = payment.getBooking();
        if (!booking.getTenant().getId().equals(currentUser.getId())) {
            throw new ApiException("Only the tenant can complete the payment");
        }
        if ("paid".equalsIgnoreCase(payment.getStatus()) && payment.getPaidAt() != null) {
            Contract contract = contractRepository.findByBookingId(booking.getId()).orElse(null);
            Map<String, Object> contractData = contract == null ? new LinkedHashMap<>() : readContractData(contract);
            return mapPayment(payment, contract, contractData, null);
        }

        validatePaymentRequest(request);
        User landlord = booking.getLandlord();
        if (!StringUtils.hasText(landlord.getPayoutAccountNumber()) || !StringUtils.hasText(landlord.getPayoutBankName())) {
            throw new ApiException("Арендодатель еще не указал счет для зачисления в своем профиле");
        }

        Contract contract = contractRepository.findByBookingId(booking.getId())
                .orElseThrow(() -> new ApiException("Contract not found"));
        Map<String, Object> contractData = readContractData(contract);
        LocalDateTime paidAt = nowMoscow();
        String maskedCard = maskCardNumber(request.cardNumber());
        String receiptUrl = saveReceipt(payment, contract, contractData, maskedCard, paidAt);
        contractData.put("receiptUrl", receiptUrl);
        contract.setContractData(toJson(contractData));
        contractRepository.save(contract);

        payment.setStatus("paid");
        payment.setPaidAt(paidAt);
        payment.setProvider("bank_card:" + maskedCard);
        Payment savedPayment = paymentRepository.save(payment);

        booking.setStatus("completed");
        booking.setCompletedAt(paidAt);
        Ad ad = booking.getAd();
        if (ad != null && ad.isActive()) {
            ad.setActive(false);
            ad.setDeactivatedAt(paidAt);
            adRepository.save(ad);
        }
        bookingRepository.save(booking);

        findOrCreatePaymentSuccessMessage(savedPayment, contract, contractData, receiptUrl, maskedCard);
        notifyDialogParticipants(booking.getAd(), booking.getLandlord(), booking.getTenant());
        return mapPayment(savedPayment, contract, contractData, receiptUrl);
    }

    @Transactional
    public MessageResponse declineContract(ContractDeclineRequest request, Authentication authentication) {
        User currentUser = authenticatedUserService.getCurrentUser(authentication);
        if (request == null || (request.bookingId() == null && request.contractId() == null)) {
            throw new ApiException("bookingId or contractId is required");
        }

        Contract contract = request.contractId() != null
                ? contractRepository.findById(request.contractId()).orElse(null)
                : null;
        Booking booking = contract != null
                ? contract.getBooking()
                : bookingRepository.findById(request.bookingId()).orElseThrow(() -> new ApiException("Booking not found"));

        boolean landlordDeclined = booking.getLandlord().getId().equals(currentUser.getId());
        boolean tenantDeclined = booking.getTenant().getId().equals(currentUser.getId());
        if (!landlordDeclined && !tenantDeclined) {
            throw new ApiException("Only contract participants can decline the workflow");
        }

        if (contract != null && !"active".equalsIgnoreCase(contract.getStatus())) {
            contract.setStatus("declined");
            contractRepository.save(contract);
        }

        String roleTitle = landlordDeclined ? "Арендодатель" : "Арендатор";
        Message savedMessage = messageRepository.save(buildMessage(
                booking.getAd(),
                currentUser,
                landlordDeclined ? booking.getTenant() : booking.getLandlord(),
                toJson(Map.of(
                        "type", "contract_declined",
                        "displayText", roleTitle + " отказался продолжать оформление"
                )),
                "contract_declined",
                contract != null ? contract.getId() : booking.getId()
        ));
        notifyDialogParticipants(booking.getAd(), booking.getLandlord(), booking.getTenant());
        return mapToResponse(savedMessage);
    }

    @Transactional
    public Page<MessageResponse> getDialog(Long adId,
                                           Long otherUserId,
                                           Authentication authentication,
                                           int page,
                                           int size) {
        User currentUser = authenticatedUserService.getCurrentUser(authentication);
        Ad ad = loadAd(adId);

        if (!isDialogParticipant(ad, currentUser.getId(), otherUserId)) {
            throw new ApiException("Access denied to this dialog");
        }

        ensureViewingPrompts(ad, currentUser.getId(), otherUserId);

        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.ASC, "createdAt"));
        Page<MessageResponse> dialog = messageRepository.findDialog(adId, currentUser.getId(), otherUserId, pageable)
                .map(this::mapToResponse);
        messageRepository.markAsRead(currentUser.getId(), adId, otherUserId);
        return dialog;
    }

    @Transactional(readOnly = true)
    public Page<DialogSummaryResponse> getMyDialogs(Authentication authentication, int page, int size) {
        User currentUser = authenticatedUserService.getCurrentUser(authentication);
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<Message> messages = messageRepository.findByFromUserIdOrToUserIdOrderByCreatedAtDesc(currentUser.getId(), currentUser.getId(), pageable);

        Map<String, DialogSummaryResponse> dialogs = new LinkedHashMap<>();
        for (Message message : messages) {
            Long otherUserId = message.getFromUser().getId().equals(currentUser.getId())
                    ? message.getToUser().getId()
                    : message.getFromUser().getId();
            String key = message.getAd().getId() + ":" + otherUserId;
            DialogSummaryResponse existing = dialogs.get(key);
            long unreadIncrement = message.getToUser().getId().equals(currentUser.getId()) && !message.isRead() ? 1 : 0;
            String preview = buildDialogPreview(message);

            if (existing == null) {
                dialogs.put(key, DialogSummaryResponse.builder()
                        .adId(message.getAd().getId())
                        .adTitle(message.getAd().getTitle())
                        .otherUserId(otherUserId)
                        .otherUserName(message.getFromUser().getId().equals(currentUser.getId())
                                ? message.getToUser().getFullName()
                                : message.getFromUser().getFullName())
                        .otherUserAvatarUrl(message.getFromUser().getId().equals(currentUser.getId())
                                ? message.getToUser().getAvatarUrl()
                                : message.getFromUser().getAvatarUrl())
                        .lastMessageText(preview)
                        .lastMessageRead(message.isRead())
                        .unreadCount(unreadIncrement)
                        .lastMessageAt(message.getCreatedAt())
                        .build());
            } else if (unreadIncrement > 0) {
                dialogs.put(key, DialogSummaryResponse.builder()
                        .adId(existing.adId())
                        .adTitle(existing.adTitle())
                        .otherUserId(existing.otherUserId())
                        .otherUserName(existing.otherUserName())
                        .otherUserAvatarUrl(existing.otherUserAvatarUrl())
                        .lastMessageText(existing.lastMessageText())
                        .lastMessageRead(existing.lastMessageRead())
                        .unreadCount(existing.unreadCount() + unreadIncrement)
                        .lastMessageAt(existing.lastMessageAt())
                        .build());
            }
        }

        return new PageImpl<>(dialogs.values().stream().toList(), pageable, dialogs.size());
    }

    @Transactional(readOnly = true)
    public long getUnreadCount(Authentication authentication) {
        User currentUser = authenticatedUserService.getCurrentUser(authentication);
        return messageRepository.countByToUserIdAndReadFalse(currentUser.getId());
    }

    private Message findOrCreateResultPrompt(ViewingRequest viewingRequest) {
        List<Message> existingPrompts = messageRepository
                .findByMessageTypeAndRelatedIdOrderByCreatedAtAsc("viewing_result_prompt", viewingRequest.getId());
        if (!existingPrompts.isEmpty()) {
            Message canonicalPrompt = existingPrompts.get(0);
            if (existingPrompts.size() > 1) {
                messageRepository.deleteAll(existingPrompts.subList(1, existingPrompts.size()));
            }
            return canonicalPrompt;
        }
        Message prompt = buildMessage(
                viewingRequest.getAd(),
                viewingRequest.getLandlord(),
                viewingRequest.getTenant(),
                toJson(Map.of(
                        "type", "viewing_result_prompt",
                        "displayText", "Встреча прошла успешно?",
                        "landlordPrompt", "Вы готовы предоставить услугу арендатору?",
                        "tenantPrompt", "Вас устроил данный вариант?",
                        "landlordResponded", false,
                        "tenantResponded", false
                )),
                "viewing_result_prompt",
                viewingRequest.getId()
        );
        viewingRequest.setResultPromptSent(true);
        viewingRequestRepository.save(viewingRequest);
        return messageRepository.save(prompt);
    }

    private void ensureViewingPrompts(Ad ad, Long currentUserId, Long otherUserId) {
        User tenant = ad.getUser().getId().equals(currentUserId)
                ? userRepository.findById(otherUserId).orElse(null)
                : userRepository.findById(currentUserId).orElse(null);
        if (tenant == null) {
            return;
        }

        List<ViewingRequest> viewings = viewingRequestRepository
                .findByStatusAndResultPromptSentFalseAndProposedDateTimeLessThanEqual("confirmed", nowMoscow());
        for (ViewingRequest viewing : viewings) {
            boolean sameDialog = viewing.getAd().getId().equals(ad.getId())
                    && viewing.getTenant().getId().equals(tenant.getId())
                    && viewing.getLandlord().getId().equals(ad.getUser().getId());
            if (sameDialog) {
                findOrCreateResultPrompt(viewing);
            }
        }
    }

    private String buildDialogPreview(Message message) {
        if ("text".equals(message.getMessageType())) {
            return decode(message.getEncryptedText());
        }
        try {
            return String.valueOf(parseJson(message.getEncryptedText()).getOrDefault("displayText", "Системное сообщение"));
        } catch (Exception ex) {
            return "Системное сообщение";
        }
    }

    private Ad loadAd(Long adId) {
        return adRepository.findById(adId)
                .orElseThrow(() -> new ApiException("Ad not found"));
    }

    private User loadRecipient(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ApiException("Recipient not found"));
    }

    private void validateDialogAccess(Ad ad, User currentUser, User recipient) {
        boolean currentUserIsOwner = ad.getUser().getId().equals(currentUser.getId());
        boolean recipientIsOwner = ad.getUser().getId().equals(recipient.getId());

        if (!currentUserIsOwner && !recipientIsOwner) {
            throw new ApiException("One side of the dialog must be the ad owner");
        }
        if (recipient.getId().equals(currentUser.getId())) {
            throw new ApiException("You cannot send messages to yourself");
        }
        if (!currentUserIsOwner && (!ad.isActive() || !"approved".equalsIgnoreCase(ad.getModerationStatus()))) {
            throw new ApiException("Ad is unavailable for messaging");
        }
    }

    private boolean isDialogParticipant(Ad ad, Long currentUserId, Long otherUserId) {
        return ad.getUser().getId().equals(currentUserId) || ad.getUser().getId().equals(otherUserId);
    }

    private void notifyDialogParticipants(Ad ad, User firstUser, User secondUser) {
        messageRealtimeService.notifyDialogChanged(
                firstUser != null ? firstUser.getId() : null,
                secondUser != null ? secondUser.getId() : null,
                ad != null ? ad.getId() : null
        );
    }

    private void validateMessageRequest(MessageRequest request) {
        if (request == null || request.adId() == null || request.toUserId() == null) {
            throw new ApiException("adId and toUserId are required");
        }
        if (request.text() == null || request.text().isBlank()) {
            throw new ApiException("Message text is required");
        }
    }

    private Message buildMessage(Ad ad, User from, User to, String rawText, String type, Long relatedId) {
        return Message.builder()
                .ad(ad)
                .fromUser(from)
                .toUser(to)
                .encryptedText(encode(rawText))
                .messageType(type)
                .relatedId(relatedId)
                .containsContactDetails(false)
                .deliveredAt(nowMoscow())
                .build();
    }

    private MessageResponse mapToResponse(Message message) {
        return MessageResponse.builder()
                .id(message.getId())
                .adId(message.getAd().getId())
                .fromUserId(message.getFromUser().getId())
                .fromUserName(message.getFromUser().getFullName())
                .toUserId(message.getToUser().getId())
                .toUserName(message.getToUser().getFullName())
                .text(decode(message.getEncryptedText()))
                .relatedId(message.getRelatedId())
                .messageType(message.getMessageType())
                .containsContactDetails(message.isContainsContactDetails())
                .read(message.isRead())
                .deliveredAt(message.getDeliveredAt())
                .readAt(message.getReadAt())
                .createdAt(message.getCreatedAt())
                .build();
    }

    private ContractResponse mapContract(Contract contract) {
        return ContractResponse.builder()
                .id(contract.getId())
                .bookingId(contract.getBooking().getId())
                .documentUrl(contract.getPdfUrl())
                .status(contract.getStatus())
                .tenantSignedAt(contract.getTenantSignedAt())
                .landlordSignedAt(contract.getLandlordSignedAt())
                .createdAt(contract.getCreatedAt())
                .snapshot(readContractData(contract))
                .build();
    }

    private BigDecimal resolveAdPrice(Ad ad) {
        Integer price = "short_term".equalsIgnoreCase(ad.getRentalType()) ? ad.getPricePerDay() : ad.getPricePerMonth();
        return price == null ? BigDecimal.ZERO : BigDecimal.valueOf(price);
    }

    private byte[] generateContractDocx(Booking booking, ContractDraftRequest request) {
        String documentXml = """
                <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
                <w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"
                 xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
                 xmlns:o="urn:schemas-microsoft-com:office:office"
                 xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
                 xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"
                 xmlns:v="urn:schemas-microsoft-com:vml"
                 xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing"
                 xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
                 xmlns:w10="urn:schemas-microsoft-com:office:word"
                 xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
                 xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml"
                 xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup"
                 xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk"
                 xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml"
                 xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"
                 mc:Ignorable="w14 wp14">
                  <w:body>
                    %s
                    <w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr>
                  </w:body>
                </w:document>
                """.formatted(String.join("",
                paragraph("Р”РћР“РћР’РћР  РђР ЕНДЫ"),
                paragraph("Объект: " + escapeXml(booking.getAd().getTitle())),
                paragraph("Адрес: " + escapeXml(booking.getAd().getAddress())),
                paragraph("Арендодатель: " + escapeXml(booking.getLandlord().getFullName())),
                paragraph("Арендатор: " + escapeXml(booking.getTenant().getFullName())),
                paragraph("Дата начала: " + request.startDate()),
                paragraph("Дата окончания: " + request.endDate()),
                paragraph("Стоимость аренды: " + formatContractMoney(resolveAdPrice(booking.getAd()))),
                paragraph("Депозит: " + request.deposit()),
                paragraph("Условия аренды: " + escapeXml(request.rules() == null ? "" : request.rules())),
                paragraph("Подпись арендодателя: __________________"),
                paragraph("Подпись арендатора: __________________")
        ));

        String contentTypes = """
                <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
                <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
                  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
                  <Default Extension="xml" ContentType="application/xml"/>
                  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
                </Types>
                """;
        String rels = """
                <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
                <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
                  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
                </Relationships>
                """;

        try (ByteArrayOutputStream output = new ByteArrayOutputStream();
             ZipOutputStream zip = new ZipOutputStream(output)) {
            addZip(zip, "[Content_Types].xml", contentTypes);
            addZip(zip, "_rels/.rels", rels);
            addZip(zip, "word/document.xml", documentXml);
            zip.finish();
            return output.toByteArray();
        } catch (Exception e) {
            throw new ApiException("Failed to generate contract document");
        }
    }

    private byte[] generateContractDocx(Booking booking, Map<String, Object> data) {
        try (XWPFDocument document = createContractDocument()) {
            boolean shortTerm = "short_term".equalsIgnoreCase(asText(data.get("rentalType")));
            if (shortTerm) {
                buildShortTermContractDocument(document, data);
            } else {
                buildLongTermContractDocument(document, data);
            }

            try (ByteArrayOutputStream output = new ByteArrayOutputStream()) {
                document.write(output);
                return output.toByteArray();
            }
        } catch (IOException e) {
            throw new ApiException("Failed to generate contract document");
        }
    }

    private XWPFDocument createContractDocument() throws IOException {
        XWPFDocument document;
        ClassPathResource template = new ClassPathResource("templates/short-term-contract-template.docx");
        if (template.exists()) {
            try (InputStream inputStream = template.getInputStream()) {
                document = new XWPFDocument(inputStream);
            }
            while (document.getBodyElements().size() > 0) {
                document.removeBodyElement(0);
            }
        } else {
            document = new XWPFDocument();
        }

        CTBody body = document.getDocument().getBody();
        CTSectPr sectPr = body.isSetSectPr() ? body.getSectPr() : body.addNewSectPr();
        CTPageSz pageSz = sectPr.isSetPgSz() ? sectPr.getPgSz() : sectPr.addNewPgSz();
        pageSz.setW(java.math.BigInteger.valueOf(11906));
        pageSz.setH(java.math.BigInteger.valueOf(16838));
        CTPageMar mar = sectPr.isSetPgMar() ? sectPr.getPgMar() : sectPr.addNewPgMar();
        mar.setTop(java.math.BigInteger.valueOf(1134));
        mar.setRight(java.math.BigInteger.valueOf(1134));
        mar.setBottom(java.math.BigInteger.valueOf(1134));
        mar.setLeft(java.math.BigInteger.valueOf(1134));
        return document;
    }

    private void buildShortTermContractDocument(XWPFDocument document, Map<String, Object> data) {
        addTitle(document, "ДОГОВОР");
        addSubtitle(document, "краткосрочной аренды жилого помещения");
        addParagraph(document, "г. " + asText(data.get("city")) + "    " + asText(data.get("signingDateText")), ParagraphAlignment.CENTER, true, 12, false);

        addPartyBlock(
                document,
                "Арендодатель",
                asText(data.get("landlordFullName")),
                asText(data.get("landlordCitizenship")),
                asText(data.get("landlordPassportNumber")),
                asText(data.get("landlordPassportIssuedBy")),
                asText(data.get("landlordPassportIssuedAt")),
                asText(data.get("landlordRegistrationAddress"))
        );
        addPartyBlock(
                document,
                "Арендатор",
                asText(data.get("tenantFullName")),
                asText(data.get("tenantCitizenship")),
                asText(data.get("tenantPassportNumber")),
                asText(data.get("tenantPassportIssuedBy")),
                asText(data.get("tenantPassportIssuedAt")),
                asText(data.get("tenantRegistrationAddress"))
        );

        addParagraph(document,
                "Стороны заключили настоящий договор о нижеследующем.",
                ParagraphAlignment.BOTH, true, 12, false);

        addSectionHeading(document, "1. Предмет договора");
        addParagraph(document, "1.1. Арендодатель предоставляет Арендатору жилое помещение по адресу: "
                + asText(data.get("address")) + ".", ParagraphAlignment.BOTH, false, 12, false);
        addParagraph(document, "1.2. Площадь помещения: " + asText(data.get("areaText"))
                + ". Максимальное количество проживающих: " + asText(data.get("maxGuestsText")) + ".", ParagraphAlignment.BOTH, false, 12, false);
        addParagraph(document, "1.3. Срок аренды: с " + asText(data.get("startDateText"))
                + " по " + asText(data.get("endDateText")) + " (" + asText(data.get("durationText")) + ").", ParagraphAlignment.BOTH, false, 12, false);
        addParagraph(document, "1.4. Время заезда: " + asText(data.get("checkInTime"))
                + " по московскому времени. Время выселения: " + asText(data.get("checkOutTime")) + ".", ParagraphAlignment.BOTH, false, 12, false);

        addSectionHeading(document, "2. Стоимость и порядок расчетов");
        addParagraph(document, "2.1. Стоимость аренды составляет " + asText(data.get("priceText")) + ".", ParagraphAlignment.BOTH, false, 12, false);
        addParagraph(document, "2.2. Залог составляет " + asText(data.get("depositText")) + ".", ParagraphAlignment.BOTH, false, 12, false);
        addParagraph(document, "2.3. Коммунальные услуги и эксплуатационные расходы включены в стоимость аренды.", ParagraphAlignment.BOTH, false, 12, false);

        addSectionHeading(document, "3. Права и обязанности сторон");
        addParagraph(document, "3.1. Арендодатель обязуется передать помещение в пригодном для проживания состоянии и обеспечить беспрепятственное пользование им в течение оплаченного срока аренды.", ParagraphAlignment.BOTH, false, 12, false);
        addParagraph(document, "3.2. Арендатор обязуется использовать помещение только для проживания, соблюдать правила проживания и сохранить имущество в надлежащем состоянии.", ParagraphAlignment.BOTH, false, 12, false);
        addParagraph(document, "3.3. Дополнительные условия: " + asText(data.get("rulesText")) + ".", ParagraphAlignment.BOTH, false, 12, false);

        addSectionHeading(document, "4. Ответственность сторон");
        addParagraph(document, "4.1. Стороны несут ответственность за неисполнение обязательств по настоящему договору в соответствии с законодательством Российской Федерации.", ParagraphAlignment.BOTH, false, 12, false);
        addParagraph(document, "4.2. При причинении ущерба имуществу Арендодатель вправе удержать обоснованную сумму из залога с предоставлением подтверждающих документов.", ParagraphAlignment.BOTH, false, 12, false);

        addSectionHeading(document, "5. Электронное подписание");
        addParagraph(document, "5.1. Настоящий договор оформлен в электронной форме в системе Rent и подписан сторонами электронным подтверждением.", ParagraphAlignment.BOTH, false, 12, false);
        addParagraph(document, "5.2. Подпись Арендодателя: " + asText(data.get("landlordSignatureLabel")) + ".", ParagraphAlignment.BOTH, false, 12, false);
        addParagraph(document, "5.3. Подпись Арендатора: " + asText(data.get("tenantSignatureLabel")) + ".", ParagraphAlignment.BOTH, false, 12, false);

        addSectionHeading(document, "6. Реквизиты и подписи сторон");
        addParagraph(document, "Арендодатель: " + asText(data.get("landlordFullName")) + ".", ParagraphAlignment.BOTH, false, 12, false);
        addParagraph(document, "Адрес регистрации: " + asText(data.get("landlordRegistrationAddress")) + ".", ParagraphAlignment.BOTH, false, 12, false);
        addParagraph(document, "Арендатор: " + asText(data.get("tenantFullName")) + ".", ParagraphAlignment.BOTH, false, 12, false);
        addParagraph(document, "Адрес регистрации: " + asText(data.get("tenantRegistrationAddress")) + ".", ParagraphAlignment.BOTH, false, 12, false);
    }

    private void buildLongTermContractDocument(XWPFDocument document, Map<String, Object> data) {
        addTitle(document, "ДОГОВОР НАЙМА ЖИЛОГО ПОМЕЩЕНИЯ");
        addParagraph(document, "г. " + asText(data.get("city")) + "    " + asText(data.get("signingDateText")), ParagraphAlignment.CENTER, true, 12, false);

        addPartyBlock(
                document,
                "Наймодатель",
                asText(data.get("landlordFullName")),
                asText(data.get("landlordCitizenship")),
                asText(data.get("landlordPassportNumber")),
                asText(data.get("landlordPassportIssuedBy")),
                asText(data.get("landlordPassportIssuedAt")),
                asText(data.get("landlordRegistrationAddress"))
        );
        addPartyBlock(
                document,
                "Наниматель",
                asText(data.get("tenantFullName")),
                asText(data.get("tenantCitizenship")),
                asText(data.get("tenantPassportNumber")),
                asText(data.get("tenantPassportIssuedBy")),
                asText(data.get("tenantPassportIssuedAt")),
                asText(data.get("tenantRegistrationAddress"))
        );

        addSectionHeading(document, "1. Предмет договора");
        addParagraph(document, "1.1. Наймодатель предоставляет Нанимателю жилое помещение по адресу: "
                + asText(data.get("address")) + ", площадью " + asText(data.get("areaText")) + ".", ParagraphAlignment.BOTH, false, 12, false);
        addParagraph(document, "1.2. Срок найма: с " + asText(data.get("startDateText"))
                + " по " + asText(data.get("endDateText")) + " (" + asText(data.get("durationText")) + ").", ParagraphAlignment.BOTH, false, 12, false);

        addSectionHeading(document, "2. Стоимость и расчеты");
        addParagraph(document, "2.1. Размер платы за наем составляет " + asText(data.get("priceText")) + ".", ParagraphAlignment.BOTH, false, 12, false);
        addParagraph(document, "2.2. Обеспечительный платеж: " + asText(data.get("depositText")) + ".", ParagraphAlignment.BOTH, false, 12, false);
        addParagraph(document, "2.3. Коммунальные услуги: "
                + (Boolean.parseBoolean(asText(data.get("utilitiesIncluded"))) ? "включены в стоимость найма." : "оплачиваются отдельно по показаниям счетчиков и квитанциям."),
                ParagraphAlignment.BOTH, false, 12, false);

        addSectionHeading(document, "3. Права и обязанности сторон");
        addParagraph(document, "3.1. Наймодатель обязан передать помещение в пригодном для проживания состоянии и не чинить препятствий в пользовании им.", ParagraphAlignment.BOTH, false, 12, false);
        addParagraph(document, "3.2. Наниматель обязан своевременно вносить плату, бережно относиться к имуществу и соблюдать правила проживания.", ParagraphAlignment.BOTH, false, 12, false);
        addParagraph(document, "3.3. Дополнительные условия: " + asText(data.get("rulesText")) + ".", ParagraphAlignment.BOTH, false, 12, false);

        addSectionHeading(document, "4. Электронное подписание");
        addParagraph(document, "4.1. Настоящий договор сформирован и подписан сторонами в электронной форме через платформу Rent.", ParagraphAlignment.BOTH, false, 12, false);
        addParagraph(document, "4.2. Подпись Наймодателя: " + asText(data.get("landlordSignatureLabel")) + ".", ParagraphAlignment.BOTH, false, 12, false);
        addParagraph(document, "4.3. Подпись Нанимателя: " + asText(data.get("tenantSignatureLabel")) + ".", ParagraphAlignment.BOTH, false, 12, false);

        addSectionHeading(document, "5. Реквизиты сторон");
        addParagraph(document, "Наймодатель: " + asText(data.get("landlordFullName")) + ", адрес регистрации: " + asText(data.get("landlordRegistrationAddress")) + ".", ParagraphAlignment.BOTH, false, 12, false);
        addParagraph(document, "Наниматель: " + asText(data.get("tenantFullName")) + ", адрес регистрации: " + asText(data.get("tenantRegistrationAddress")) + ".", ParagraphAlignment.BOTH, false, 12, false);
    }

    private void addTitle(XWPFDocument document, String text) {
        addParagraph(document, text, ParagraphAlignment.CENTER, true, 14, false);
    }

    private void addSubtitle(XWPFDocument document, String text) {
        addParagraph(document, text, ParagraphAlignment.CENTER, true, 13, false);
    }

    private void addSectionHeading(XWPFDocument document, String text) {
        addParagraph(document, text, ParagraphAlignment.LEFT, true, 13, false);
    }

    private void addPartyBlock(XWPFDocument document,
                               String roleTitle,
                               String fullName,
                               String citizenship,
                               String passportNumber,
                               String passportIssuedBy,
                               String passportIssuedAt,
                               String registrationAddress) {
        addParagraph(document,
                roleTitle + ": " + fullName + ", гражданство: " + citizenship + ", паспорт: " + passportNumber + ".",
                ParagraphAlignment.BOTH, false, 12, false);
        addParagraph(document,
                "Паспорт выдан: " + passportIssuedBy + ", дата выдачи: " + passportIssuedAt + ".",
                ParagraphAlignment.BOTH, false, 12, false);
        addParagraph(document,
                "Адрес регистрации: " + registrationAddress + ".",
                ParagraphAlignment.BOTH, false, 12, false);
    }

    private void addParagraph(XWPFDocument document,
                              String text,
                              ParagraphAlignment alignment,
                              boolean bold,
                              int fontSize,
                              boolean underline) {
        XWPFParagraph paragraph = document.createParagraph();
        paragraph.setAlignment(alignment);
        paragraph.setSpacingAfter(120);
        paragraph.setSpacingBetween(1.15);
        XWPFRun run = paragraph.createRun();
        run.setFontFamily("Times New Roman");
        run.setFontSize(fontSize);
        run.setBold(bold);
        if (underline) {
            run.setUnderline(UnderlinePatterns.SINGLE);
        }
        run.setText(text);
    }

    private List<String> buildShortTermContractParagraphs(Booking booking, Map<String, Object> data) {
        return List.of(
                titleParagraph("Р”РћР“РћР’РћР  ПОСУТОЧНОЙ РђР ЕНДЫ РљР’РђР РўРР Ы"),
                centeredMetaParagraph("г. " + asText(data.get("city")) + "    " + asText(data.get("signingDateText"))),
                paragraph("Арендодатель " + asText(data.get("landlordFullName")) + ", " + buildPassportSummary("landlord", data) + ", с одной стороны, и Арендатор " + asText(data.get("tenantFullName")) + ", " + buildPassportSummary("tenant", data) + ", с другой стороны, заключили настоящий договор о нижеследующем."),
                sectionParagraph("1. Предмет договора"),
                paragraph("1.1. Арендодатель передает Арендатору во временное пользование жилое помещение по адресу: " + asText(data.get("address")) + "."),
                paragraph("1.2. Характеристики объекта: площадь " + asText(data.get("areaText")) + ", количество проживающих - " + asText(data.get("maxGuestsText")) + "."),
                paragraph("1.3. Срок аренды: с " + asText(data.get("startDateText")) + " по " + asText(data.get("endDateText")) + ". Общая продолжительность - " + asText(data.get("durationText")) + "."),
                sectionParagraph("2. Стоимость и расчеты"),
                paragraph("2.1. Стоимость аренды составляет " + asText(data.get("priceText")) + "."),
                paragraph("2.2. Обеспечительный платеж (залог): " + asText(data.get("depositText")) + "."),
                paragraph("2.3. Коммунальные услуги и базовые эксплуатационные расходы включены в стоимость аренды."),
                sectionParagraph("3. Порядок заселения"),
                paragraph("3.1. Время заезда - " + asText(data.get("checkInTime")) + " по московскому времени."),
                paragraph("3.2. Время выселения - " + asText(data.get("checkOutTime")) + " по московскому времени."),
                paragraph("3.3. Дополнительные условия проживания: " + asText(data.get("rulesText")) + "."),
                sectionParagraph("4. Права и обязанности сторон"),
                paragraph("4.1. Арендодатель обязуется передать объект в пригодном для проживания состоянии и обеспечить возможность пользования им в течение всего оплаченного срока."),
                paragraph("4.2. Арендатор обязуется использовать объект исключительно для проживания, соблюдать правила пользования имуществом и своевременно освободить помещение."),
                sectionParagraph("5. Электронное подписание"),
                paragraph("5.1. Стороны подтверждают заключение договора электронным способом в информационной системе Rent."),
                paragraph("5.2. Подпись Арендодателя: " + asText(data.get("landlordSignatureLabel")) + "."),
                paragraph("5.3. Подпись Арендатора: " + asText(data.get("tenantSignatureLabel")) + "."),
                sectionParagraph("6. Р еквизиты и подписи сторон"),
                paragraph("Арендодатель: " + asText(data.get("landlordFullName")) + ". Адрес регистрации: " + asText(data.get("landlordRegistrationAddress")) + "."),
                paragraph("Арендатор: " + asText(data.get("tenantFullName")) + ". Адрес регистрации: " + asText(data.get("tenantRegistrationAddress")) + ".")
        );
    }

    private List<String> buildLongTermContractParagraphs(Booking booking, Map<String, Object> data) {
        String utilitiesText = Boolean.parseBoolean(asText(data.get("utilitiesIncluded")))
                ? "Коммунальные услуги включены в стоимость."
                : "Коммунальные услуги оплачиваются отдельно по показаниям и счетам.";
        return List.of(
                titleParagraph("ДОГОВОР НАЙМА ЖИЛОГО ПОМЕЩЕНИЯ"),
                centeredMetaParagraph("г. " + asText(data.get("city")) + "    " + asText(data.get("signingDateText"))),
                paragraph("Арендодатель " + asText(data.get("landlordFullName")) + ", " + buildPassportSummary("landlord", data) + ", и Арендатор " + asText(data.get("tenantFullName")) + ", " + buildPassportSummary("tenant", data) + ", заключили настоящий договор найма жилого помещения."),
                sectionParagraph("1. Предмет договора"),
                paragraph("1.1. Арендодатель предоставляет Арендатору жилое помещение по адресу: " + asText(data.get("address")) + ", площадью " + asText(data.get("areaText")) + "."),
                paragraph("1.2. Срок найма устанавливается с " + asText(data.get("startDateText")) + " по " + asText(data.get("endDateText")) + ", продолжительность - " + asText(data.get("durationText")) + "."),
                sectionParagraph("2. Платежи и расчеты"),
                paragraph("2.1. Стоимость аренды составляет " + asText(data.get("priceText")) + "."),
                paragraph("2.2. Залог / обеспечительный платеж: " + asText(data.get("depositText")) + "."),
                paragraph("2.3. " + utilitiesText),
                sectionParagraph("3. Обязанности сторон"),
                paragraph("3.1. Арендодатель обязан передать объект в состоянии, пригодном для проживания, и не чинить препятствий в пользовании помещением."),
                paragraph("3.2. Арендатор обязан вносить плату своевременно, бережно относиться к имуществу и соблюдать правила проживания."),
                paragraph("3.3. Дополнительные условия: " + asText(data.get("rulesText")) + "."),
                sectionParagraph("4. Электронное подписание"),
                paragraph("4.1. Настоящий договор подписывается сторонами посредством электронного подтверждения в системе Rent."),
                paragraph("4.2. Подпись Арендодателя: " + asText(data.get("landlordSignatureLabel")) + "."),
                paragraph("4.3. Подпись Арендатора: " + asText(data.get("tenantSignatureLabel")) + "."),
                sectionParagraph("5. Р еквизиты сторон"),
                paragraph("Арендодатель: " + asText(data.get("landlordFullName")) + ", адрес регистрации: " + asText(data.get("landlordRegistrationAddress")) + "."),
                paragraph("Арендатор: " + asText(data.get("tenantFullName")) + ", адрес регистрации: " + asText(data.get("tenantRegistrationAddress")) + ".")
        );
    }

    private Message findOrCreateBookingReadyMessage(Booking booking) {
        return messageRepository.findFirstByMessageTypeAndRelatedIdOrderByCreatedAtAsc("booking_ready", booking.getId())
                .orElseGet(() -> messageRepository.save(buildMessage(
                        booking.getAd(),
                        booking.getLandlord(),
                        booking.getTenant(),
                        toJson(Map.of(
                                "type", "booking_ready",
                                "displayText", "Обе стороны подтвердили просмотр"
                        )),
                        "booking_ready",
                        booking.getId()
                )));
    }

    private Message findOrCreateContractActiveMessage(Contract contract, Message draftMessage) {
        return messageRepository.findFirstByMessageTypeAndRelatedIdOrderByCreatedAtAsc("contract_active", contract.getId())
                .orElseGet(() -> messageRepository.save(draftMessage));
    }

    private Message findOrCreateContractSentMessage(Contract contract, Booking booking, String documentUrl) {
        return messageRepository.findFirstByMessageTypeAndRelatedIdOrderByCreatedAtAsc("contract_sent", contract.getId())
                .orElseGet(() -> messageRepository.save(buildMessage(
                        booking.getAd(),
                        booking.getLandlord(),
                        booking.getTenant(),
                        toJson(Map.of(
                                "type", "contract_sent",
                                "displayText", "Арендодатель отправил вам проект договора аренды",
                                "documentUrl", documentUrl
                        )),
                        "contract_sent",
                        contract.getId()
                )));
    }

    private Payment createOrRefreshPayment(Contract contract, Map<String, Object> contractData) {
        Booking booking = contract.getBooking();
        Payment payment = paymentRepository.findByBookingId(booking.getId())
                .orElse(Payment.builder().booking(booking).build());
        payment.setAmount(resolvePaymentTotal(contractData, booking.getAd()));
        payment.setStatus("pending");
        payment.setProvider("bank_card");
        payment.setPaidAt(null);
        return paymentRepository.save(payment);
    }

    private Message findOrCreatePaymentRequestedMessage(Payment payment, Contract contract, Map<String, Object> contractData) {
        return messageRepository.findFirstByMessageTypeAndRelatedIdOrderByCreatedAtAsc("payment_requested", payment.getId())
                .orElseGet(() -> messageRepository.save(buildMessage(
                        payment.getBooking().getAd(),
                        payment.getBooking().getLandlord(),
                        payment.getBooking().getTenant(),
                        toJson(Map.of(
                                "type", "payment_requested",
                                "displayText", "Договор подписан обеими сторонами. Перейдите к оплате аренды и залога.",
                                "landlordDisplayText", "Договор подписан обеими сторонами. Ожидаем оплату от арендатора.",
                                "rentLabel", buildPriceText(payment.getBooking().getAd()),
                                "depositLabel", defaultText(contractData.get("depositText"), "0 руб."),
                                "totalLabel", formatContractMoney(payment.getAmount()),
                                "landlordName", defaultText(payment.getBooking().getLandlord().getFullName(), "Арендодатель"),
                                "payoutBankName", defaultText(payment.getBooking().getLandlord().getPayoutBankName(), "Банк не указан"),
                                "payoutAccountNumberMasked", maskPayoutAccount(payment.getBooking().getLandlord().getPayoutAccountNumber())
                        )),
                        "payment_requested",
                        payment.getId()
                )));
    }

    private Message findOrCreatePaymentSuccessMessage(Payment payment,
                                                      Contract contract,
                                                      Map<String, Object> contractData,
                                                      String receiptUrl,
                                                      String maskedCard) {
        return messageRepository.findFirstByMessageTypeAndRelatedIdOrderByCreatedAtAsc("payment_success", payment.getId())
                .orElseGet(() -> messageRepository.save(buildMessage(
                        payment.getBooking().getAd(),
                        payment.getBooking().getTenant(),
                        payment.getBooking().getLandlord(),
                        toJson(Map.of(
                                "type", "payment_success",
                                "displayText", "Оплата прошла успешно",
                                "rentLabel", buildPriceText(payment.getBooking().getAd()),
                                "depositLabel", defaultText(contractData.get("depositText"), "0 руб."),
                                "totalLabel", formatContractMoney(payment.getAmount()),
                                "receiptUrl", receiptUrl,
                                "paidWithCard", maskedCard
                        )),
                        "payment_success",
                        payment.getId()
                )));
    }

    private Map<String, Object> buildLandlordContractData(Contract existingContract,
                                                          Booking booking,
                                                          ContractDraftRequest request) {
        Map<String, Object> current = readContractData(existingContract);
        Ad ad = booking.getAd();
        LocalDate startDate = requireDate(request.startDate(), "Укажите дату начала аренды");
        LocalDate endDate = requireDate(request.endDate(), "Укажите дату окончания аренды");
        if (endDate.isBefore(startDate)) {
            throw new ApiException("Дата окончания аренды не может быть раньше даты начала");
        }

        boolean shortTerm = "short_term".equalsIgnoreCase(defaultText(ad.getRentalType(), "long_term"));
        String checkInTime = shortTerm ? requireText(request.checkInTime(), "Укажите время заезда") : "";
        String checkOutTime = shortTerm ? requireText(request.checkOutTime(), "Укажите время выселения") : "";

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("rentalType", defaultText(ad.getRentalType(), "long_term"));
        data.put("city", defaultText(ad.getCity(), "Москва"));
        data.put("signingDateText", CONTRACT_DATE_FORMATTER.format(todayMoscow()));
        data.put("address", requireText(ad.getAddress(), "В объявлении не указан адрес объекта"));
        data.put("areaText", ad.getArea() != null ? ad.getArea().setScale(2, RoundingMode.HALF_UP).stripTrailingZeros().toPlainString() + " кв. м" : "Площадь не указана");
        data.put("maxGuestsText", shortTerm ? defaultText(ad.getMaxGuests(), "Не указано") : "");
        data.put("priceText", buildPriceText(ad));
        data.put("depositText", requireText(request.deposit(), "Укажите залог"));
        data.put("rulesText", defaultText(request.rules(), shortTerm ? "Стороны соблюдают порядок пользования жилым помещением и правила проживания." : "Порядок проживания и расчетов определяется настоящим договором."));
        data.put("startDateText", DISPLAY_DATE_FORMATTER.format(startDate));
        data.put("endDateText", DISPLAY_DATE_FORMATTER.format(endDate));
        data.put("durationText", calculateDurationText(startDate, endDate, shortTerm));
        data.put("checkInTime", checkInTime);
        data.put("checkOutTime", checkOutTime);
        data.put("utilitiesIncluded", String.valueOf(Boolean.TRUE.equals(request.utilitiesIncluded())));
        data.put("landlordFullName", defaultText(booking.getLandlord().getFullName(), "Арендодатель"));
        data.put("tenantFullName", defaultText(booking.getTenant().getFullName(), "Арендатор"));
        Map<String, String> landlordPassport = loadRequiredPassportData(booking.getLandlord(), "арендодателя");
        data.put("landlordCitizenship", landlordPassport.get("citizenship"));
        data.put("landlordPassportNumber", landlordPassport.get("passportNumber"));
        data.put("landlordPassportIssuedBy", landlordPassport.get("passportIssuedBy"));
        data.put("landlordPassportIssuedAt", DISPLAY_DATE_FORMATTER.format(requireDate(LocalDate.parse(landlordPassport.get("passportIssuedAt")), "Укажите дату выдачи паспорта арендодателя")));
        data.put("landlordRegistrationAddress", landlordPassport.get("registrationAddress"));
        data.put("tenantCitizenship", defaultText(current.get("tenantCitizenship"), "Будет заполнено арендатором"));
        data.put("tenantPassportNumber", defaultText(current.get("tenantPassportNumber"), "Будет заполнено арендатором"));
        data.put("tenantPassportIssuedBy", defaultText(current.get("tenantPassportIssuedBy"), "Будет заполнено арендатором"));
        data.put("tenantPassportIssuedAt", defaultText(current.get("tenantPassportIssuedAt"), "Будет заполнено арендатором"));
        data.put("tenantRegistrationAddress", defaultText(current.get("tenantRegistrationAddress"), "Будет заполнено арендатором"));
        data.put("documentStatus", "sent");
        return data;
    }

    private void applyTenantContractData(Map<String, Object> data, Booking booking, ContractSignRequest request) {
        data.put("tenantFullName", defaultText(booking.getTenant().getFullName(), "Арендатор"));
        Map<String, String> tenantPassport = loadRequiredPassportData(booking.getTenant(), "арендатора");
        data.put("tenantCitizenship", tenantPassport.get("citizenship"));
        data.put("tenantPassportNumber", tenantPassport.get("passportNumber"));
        data.put("tenantPassportIssuedBy", tenantPassport.get("passportIssuedBy"));
        data.put("tenantPassportIssuedAt", DISPLAY_DATE_FORMATTER.format(requireDate(LocalDate.parse(tenantPassport.get("passportIssuedAt")), "Укажите дату выдачи паспорта арендатора")));
        data.put("tenantRegistrationAddress", tenantPassport.get("registrationAddress"));
        data.put("documentStatus", "active");
    }

    private Map<String, String> loadRequiredPassportData(User user, String roleLabel) {
        String citizenship = requireText(sensitiveDataService.decrypt(user.getPassportCitizenshipEncrypted()), "Сохраните паспортные данные " + roleLabel + " в профиле");
        String passportNumber = requireText(sensitiveDataService.decrypt(user.getPassportNumberEncrypted()), "Сохраните паспортные данные " + roleLabel + " в профиле");
        String passportIssuedBy = requireText(sensitiveDataService.decrypt(user.getPassportIssuedByEncrypted()), "Сохраните паспортные данные " + roleLabel + " в профиле");
        String passportIssuedAt = requireText(sensitiveDataService.decrypt(user.getPassportIssuedAtEncrypted()), "Сохраните паспортные данные " + roleLabel + " в профиле");
        String registrationAddress = requireText(sensitiveDataService.decrypt(user.getPassportRegistrationAddressEncrypted()), "Сохраните паспортные данные " + roleLabel + " в профиле");

        Map<String, String> data = new LinkedHashMap<>();
        data.put("citizenship", citizenship);
        data.put("passportNumber", passportNumber);
        data.put("passportIssuedBy", passportIssuedBy);
        data.put("passportIssuedAt", passportIssuedAt);
        data.put("registrationAddress", registrationAddress);
        return data;
    }

    private Map<String, Object> readContractData(Contract contract) {
        if (contract == null || !StringUtils.hasText(contract.getContractData())) {
            return new LinkedHashMap<>();
        }
        try {
            return objectMapper.readValue(contract.getContractData(), new TypeReference<>() {});
        } catch (JsonProcessingException e) {
            throw new ApiException("Failed to parse contract data");
        }
    }

    private void validateContractParticipant(Contract contract, User currentUser) {
        boolean isLandlord = contract.getBooking().getLandlord().getId().equals(currentUser.getId());
        boolean isTenant = contract.getBooking().getTenant().getId().equals(currentUser.getId());
        if (!isLandlord && !isTenant) {
            throw new ApiException("Only contract participants can access this contract");
        }
    }

    private LocalDateTime nowMoscow() {
        return LocalDateTime.now(MOSCOW_ZONE);
    }

    private LocalDate todayMoscow() {
        return LocalDate.now(MOSCOW_ZONE);
    }

    private String buildPassportSummary(String prefix, Map<String, Object> data) {
        return "гражданство: " + asText(data.get(prefix + "Citizenship"))
                + ", паспорт: " + asText(data.get(prefix + "PassportNumber"))
                + ", выдан: " + asText(data.get(prefix + "PassportIssuedBy"))
                + " от " + asText(data.get(prefix + "PassportIssuedAt"))
                + ", адрес регистрации: " + asText(data.get(prefix + "RegistrationAddress"));
    }

    private String buildSignatureLabel(User user, LocalDateTime signedAt, String signatureHash) {
        return defaultText(user.getFullName(), "Пользователь")
                + ", " + SIGNATURE_DATE_TIME_FORMATTER.format(signedAt)
                + ", код подписи " + shortenHash(signatureHash);
    }

    private String generateSignatureHash(User user, Map<String, Object> data, LocalDateTime signedAt) {
        try {
            String source = user.getId() + "|" + defaultText(user.getPhoneNumber(), "") + "|" + signedAt + "|" + toJson(data);
            byte[] hash = MessageDigest.getInstance("SHA-256").digest(source.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash).toUpperCase(RU_LOCALE);
        } catch (Exception e) {
            throw new ApiException("Failed to generate electronic signature");
        }
    }

    private String shortenHash(String hash) {
        if (!StringUtils.hasText(hash) || hash.length() < 16) {
            return defaultText(hash, "N/A");
        }
        return hash.substring(0, 8) + "-" + hash.substring(hash.length() - 8);
    }

    private String buildPriceText(Ad ad) {
        BigDecimal amount = resolveAdPrice(ad);
        return formatContractMoney(amount) + ("short_term".equalsIgnoreCase(ad.getRentalType()) ? " за сутки" : " в месяц");
    }

    private BigDecimal resolvePaymentTotal(Map<String, Object> contractData, Ad ad) {
        return resolveAdPrice(ad).add(parseMoneyAmount(contractData.get("depositText")));
    }

    private BigDecimal parseMoneyAmount(Object value) {
        String source = defaultText(value, "").replace(',', '.');
        StringBuilder digits = new StringBuilder();
        boolean decimalAdded = false;
        for (char ch : source.toCharArray()) {
            if (Character.isDigit(ch)) {
                digits.append(ch);
            } else if (ch == '.' && !decimalAdded) {
                digits.append('.');
                decimalAdded = true;
            }
        }
        if (digits.isEmpty() || ".".contentEquals(digits)) {
            return BigDecimal.ZERO;
        }
        return new BigDecimal(digits.toString()).setScale(2, RoundingMode.HALF_UP);
    }

    private String formatContractMoney(BigDecimal amount) {
        BigDecimal safeAmount = amount == null ? BigDecimal.ZERO : amount;
        return safeAmount.setScale(0, RoundingMode.HALF_UP).toPlainString().replaceAll("(\\d)(?=(\\d{3})+$)", "$1 ") + " руб.";
    }

    private void validatePaymentParticipant(Payment payment, User currentUser) {
        boolean isLandlord = payment.getBooking().getLandlord().getId().equals(currentUser.getId());
        boolean isTenant = payment.getBooking().getTenant().getId().equals(currentUser.getId());
        if (!isLandlord && !isTenant) {
            throw new ApiException("Only payment participants can access this payment");
        }
    }

    private void validatePaymentRequest(PaymentChargeRequest request) {
        if (request == null) {
            throw new ApiException("Укажите данные банковской карты");
        }
        requireText(request.cardholderName(), "Укажите имя держателя карты");
        String cardNumber = requireText(request.cardNumber(), "Укажите номер карты").replaceAll("\\s+", "");
        if (!cardNumber.matches("\\d{16}")) {
            throw new ApiException("Номер карты должен содержать 16 цифр");
        }
        if (!requireText(request.expiryMonth(), "Укажите месяц окончания действия карты").matches("0[1-9]|1[0-2]")) {
            throw new ApiException("Укажите корректный месяц действия карты");
        }
        if (!requireText(request.expiryYear(), "Укажите год окончания действия карты").matches("\\d{2}")) {
            throw new ApiException("Укажите корректный год действия карты");
        }
        if (!requireText(request.cvv(), "Укажите CVV/CVC").matches("\\d{3}")) {
            throw new ApiException("CVV/CVC должен содержать 3 цифры");
        }
    }

    private PaymentResponse mapPayment(Payment payment,
                                       Contract contract,
                                       Map<String, Object> contractData,
                                       String explicitReceiptUrl) {
        BigDecimal rentAmount = resolveAdPrice(payment.getBooking().getAd());
        BigDecimal depositAmount = parseMoneyAmount(contractData.get("depositText"));
        String receiptUrl = explicitReceiptUrl;
        if (!StringUtils.hasText(receiptUrl) && contractData != null) {
            receiptUrl = defaultText(contractData.get("receiptUrl"), null);
        }
        return PaymentResponse.builder()
                .id(payment.getId())
                .bookingId(payment.getBooking().getId())
                .contractId(contract != null ? contract.getId() : null)
                .status(payment.getStatus())
                .rentAmount(rentAmount)
                .depositAmount(depositAmount)
                .totalAmount(payment.getAmount())
                .rentLabel(buildPriceText(payment.getBooking().getAd()))
                .depositLabel(formatContractMoney(depositAmount))
                .totalLabel(formatContractMoney(payment.getAmount()))
                .landlordName(defaultText(payment.getBooking().getLandlord().getFullName(), "Арендодатель"))
                .payoutBankName(defaultText(payment.getBooking().getLandlord().getPayoutBankName(), ""))
                .payoutAccountNumberMasked(maskPayoutAccount(payment.getBooking().getLandlord().getPayoutAccountNumber()))
                .receiptUrl(receiptUrl)
                .paidAt(payment.getPaidAt())
                .build();
    }

    private String saveReceipt(Payment payment,
                               Contract contract,
                               Map<String, Object> contractData,
                               String maskedCard,
                               LocalDateTime paidAt) {
        String receipt = """
                <!doctype html>
                <html lang="ru">
                <head>
                  <meta charset="utf-8">
                  <title>Чек оплаты аренды</title>
                  <style>
                    body { font-family: Arial, sans-serif; background: #f4f6f8; color: #111; padding: 32px; }
                    .receipt { max-width: 520px; margin: 0 auto; background: #fff; border-radius: 20px; padding: 28px; box-shadow: 0 16px 40px rgba(15, 23, 42, 0.12); }
                    .line { display: flex; justify-content: space-between; gap: 16px; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
                    .line.total { font-weight: 700; font-size: 18px; border-bottom: none; padding-top: 16px; }
                    .muted { color: #6b7280; font-size: 13px; }
                    h1 { margin: 0 0 8px; font-size: 28px; }
                    h2 { margin: 0 0 24px; font-size: 15px; font-weight: 500; color: #4b5563; }
                  </style>
                </head>
                <body>
                  <div class="receipt">
                    <h1>Чек оплаты</h1>
                    <h2>Электронное подтверждение платежа по договору аренды</h2>
                    <div class="line"><span>Арендодатель</span><strong>%s</strong></div>
                    <div class="line"><span>Объект</span><strong>%s</strong></div>
                    <div class="line"><span>Аренда</span><strong>%s</strong></div>
                    <div class="line"><span>Залог</span><strong>%s</strong></div>
                    <div class="line total"><span>Итого к оплате</span><strong>%s</strong></div>
                    <div class="line"><span>Оплачено картой</span><strong>%s</strong></div>
                    <div class="line"><span>Счет зачисления</span><strong>%s · %s</strong></div>
                    <div class="line"><span>Дата оплаты</span><strong>%s</strong></div>
                    <p class="muted">Платеж связан с договором №%s и бронированием №%s.</p>
                  </div>
                </body>
                </html>
                """.formatted(
                escapeXml(defaultText(payment.getBooking().getLandlord().getFullName(), "Арендодатель")),
                escapeXml(defaultText(payment.getBooking().getAd().getAddress(), "Объект аренды")),
                escapeXml(buildPriceText(payment.getBooking().getAd())),
                escapeXml(defaultText(contractData.get("depositText"), "0 руб.")),
                escapeXml(formatContractMoney(payment.getAmount())),
                escapeXml(maskedCard),
                escapeXml(defaultText(payment.getBooking().getLandlord().getPayoutBankName(), "Банк")),
                escapeXml(maskPayoutAccount(payment.getBooking().getLandlord().getPayoutAccountNumber())),
                escapeXml(SIGNATURE_DATE_TIME_FORMATTER.format(paidAt)),
                escapeXml(String.valueOf(contract.getId())),
                escapeXml(String.valueOf(payment.getBooking().getId()))
        );
        return fileUploadService.saveFile(receipt.getBytes(StandardCharsets.UTF_8),
                "receipt_" + payment.getId() + "_" + UUID.randomUUID() + ".html");
    }

    private String maskCardNumber(String cardNumber) {
        String digits = requireText(cardNumber, "Укажите номер карты").replaceAll("\\s+", "");
        return "**** **** **** " + digits.substring(digits.length() - 4);
    }

    private String maskPayoutAccount(String accountNumber) {
        String clean = defaultText(accountNumber, "").replaceAll("\\s+", "");
        if (!StringUtils.hasText(clean)) {
            return "Счет не указан";
        }
        if (clean.length() <= 4) {
            return clean;
        }
        return "•••• " + clean.substring(clean.length() - 4);
    }

    private String calculateDurationText(LocalDate startDate, LocalDate endDate, boolean shortTerm) {
        if (shortTerm) {
            long days = Math.max(1, ChronoUnit.DAYS.between(startDate, endDate));
            return days + " " + pluralize(days, "сутки", "суток", "суток");
        }

        long months = ChronoUnit.MONTHS.between(startDate.withDayOfMonth(1), endDate.withDayOfMonth(1));
        if (months <= 0) {
            months = 1;
        }
        return months + " " + pluralize(months, "месяц", "месяца", "месяцев");
    }

    private String pluralize(long value, String one, String few, String many) {
        long mod100 = value % 100;
        long mod10 = value % 10;
        if (mod100 >= 11 && mod100 <= 19) {
            return many;
        }
        if (mod10 == 1) {
            return one;
        }
        if (mod10 >= 2 && mod10 <= 4) {
            return few;
        }
        return many;
    }

    private String asText(Object value) {
        return defaultText(value, "Не указано");
    }

    private String defaultText(Object value, String fallback) {
        if (value == null) {
            return fallback;
        }
        String text = String.valueOf(value).trim();
        return text.isEmpty() || "null".equalsIgnoreCase(text) || "undefined".equalsIgnoreCase(text) ? fallback : text;
    }

    private String requireText(Object value, String message) {
        String text = value == null ? "" : String.valueOf(value).trim();
        if (!StringUtils.hasText(text) || "null".equalsIgnoreCase(text) || "undefined".equalsIgnoreCase(text)) {
            throw new ApiException(message);
        }
        return text;
    }

    private LocalDate requireDate(LocalDate value, String message) {
        if (value == null) {
            throw new ApiException(message);
        }
        return value;
    }

    private String titleParagraph(String text) {
        return styledParagraph(text, "center", true, 32, 0, 220);
    }

    private String centeredMetaParagraph(String text) {
        return styledParagraph(text, "center", false, 24, 0, 180);
    }

    private String sectionParagraph(String text) {
        return styledParagraph(text, "left", true, 26, 180, 80);
    }

    private String styledParagraph(String text, String alignment, boolean bold, int size, int before, int after) {
        StringBuilder xml = new StringBuilder();
        xml.append("<w:p><w:pPr>");
        xml.append("<w:spacing w:before=\"").append(before).append("\" w:after=\"").append(after).append("\"/>");
        xml.append("<w:jc w:val=\"").append(alignment).append("\"/>");
        xml.append("</w:pPr><w:r><w:rPr><w:rFonts w:ascii=\"Times New Roman\" w:hAnsi=\"Times New Roman\"/><w:sz w:val=\"").append(size).append("\"/>");
        if (bold) {
            xml.append("<w:b/>");
        }
        xml.append("</w:rPr><w:t xml:space=\"preserve\">").append(escapeXml(text)).append("</w:t></w:r></w:p>");
        return xml.toString();
    }

    private void addZip(ZipOutputStream zip, String path, String content) throws Exception {
        zip.putNextEntry(new ZipEntry(path));
        zip.write(content.getBytes(StandardCharsets.UTF_8));
        zip.closeEntry();
    }

    private String paragraph(String text) {
        return "<w:p><w:r><w:t xml:space=\"preserve\">" + text + "</w:t></w:r></w:p>";
    }

    private String escapeXml(String value) {
        return value.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;");
    }

    private String encode(String value) {
        return Base64.getEncoder().encodeToString(value.getBytes(StandardCharsets.UTF_8));
    }

    private String decode(String value) {
        return new String(Base64.getDecoder().decode(value), StandardCharsets.UTF_8);
    }

    private String toJson(Map<String, Object> payload) {
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException e) {
            throw new ApiException("Failed to serialize system message");
        }
    }

    private Map<String, Object> parseJson(String encodedValue) {
        try {
            return objectMapper.readValue(decode(encodedValue), new TypeReference<>() {});
        } catch (JsonProcessingException e) {
            throw new ApiException("Failed to parse system message");
        }
    }

    private boolean containsContactDetails(String text) {
        String normalized = text.replaceAll("\\s+", "");
        return normalized.matches(".*(\\+?\\d{10,}|@\\w+|t\\.me/\\w+).*");
    }
}
