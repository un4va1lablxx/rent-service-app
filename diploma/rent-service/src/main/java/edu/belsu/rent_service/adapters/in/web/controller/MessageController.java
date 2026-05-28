package edu.belsu.rent_service.adapters.in.web.controller;

import edu.belsu.rent_service.application.dto.message.DialogSummaryResponse;
import edu.belsu.rent_service.application.dto.message.ContractDraftRequest;
import edu.belsu.rent_service.application.dto.message.ContractDeclineRequest;
import edu.belsu.rent_service.application.dto.message.ContractResponse;
import edu.belsu.rent_service.application.dto.message.ContractSignRequest;
import edu.belsu.rent_service.application.dto.message.MessageRequest;
import edu.belsu.rent_service.application.dto.message.MessageResponse;
import edu.belsu.rent_service.application.dto.message.PaymentChargeRequest;
import edu.belsu.rent_service.application.dto.message.PaymentResponse;
import edu.belsu.rent_service.application.dto.message.ViewingProposalDecisionRequest;
import edu.belsu.rent_service.application.dto.message.ViewingProposalRequest;
import edu.belsu.rent_service.application.dto.message.ViewingResultRequest;
import edu.belsu.rent_service.application.service.MessageService;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/messages")
public class MessageController {

    private final MessageService messageService;

    public MessageController(MessageService messageService) {
        this.messageService = messageService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public MessageResponse sendMessage(@RequestBody MessageRequest request, Authentication authentication) {
        return messageService.sendMessage(request, authentication);
    }

    @PostMapping("/viewings/propose")
    @ResponseStatus(HttpStatus.CREATED)
    public MessageResponse proposeViewing(@RequestBody ViewingProposalRequest request, Authentication authentication) {
        return messageService.proposeViewing(request, authentication);
    }

    @PatchMapping("/viewings/proposals/{messageId}")
    public MessageResponse decideViewing(@PathVariable Long messageId,
                                         @RequestBody ViewingProposalDecisionRequest request,
                                         Authentication authentication) {
        return messageService.decideViewingProposal(messageId, request, authentication);
    }

    @PatchMapping("/viewings/{viewingRequestId}/result")
    public MessageResponse submitViewingResult(@PathVariable Long viewingRequestId,
                                               @RequestBody ViewingResultRequest request,
                                               Authentication authentication) {
        return messageService.submitViewingResult(viewingRequestId, request, authentication);
    }

    @PostMapping("/contracts")
    @ResponseStatus(HttpStatus.CREATED)
    public ContractResponse createContract(@RequestBody ContractDraftRequest request, Authentication authentication) {
        return messageService.createContractDraft(request, authentication);
    }

    @GetMapping("/contracts/{contractId}")
    public ContractResponse getContract(@PathVariable Long contractId, Authentication authentication) {
        return messageService.getContract(contractId, authentication);
    }

    @PatchMapping("/contracts/{contractId}/sign")
    public ContractResponse signContract(@PathVariable Long contractId,
                                         @RequestBody ContractSignRequest request,
                                         Authentication authentication) {
        return messageService.signContract(contractId, request, authentication);
    }

    @GetMapping("/payments/{paymentId}")
    public PaymentResponse getPayment(@PathVariable Long paymentId, Authentication authentication) {
        return messageService.getPayment(paymentId, authentication);
    }

    @PatchMapping("/payments/{paymentId}/pay")
    public PaymentResponse pay(@PathVariable Long paymentId,
                               @RequestBody PaymentChargeRequest request,
                               Authentication authentication) {
        return messageService.pay(paymentId, request, authentication);
    }

    @PostMapping("/contracts/decline")
    @ResponseStatus(HttpStatus.CREATED)
    public MessageResponse declineContract(@RequestBody ContractDeclineRequest request, Authentication authentication) {
        return messageService.declineContract(request, authentication);
    }

    @GetMapping("/dialogs")
    public Page<DialogSummaryResponse> getMyDialogs(Authentication authentication,
                                                    @RequestParam(defaultValue = "0") int page,
                                                    @RequestParam(defaultValue = "20") int size) {
        return messageService.getMyDialogs(authentication, page, size);
    }

    @GetMapping("/dialogs/{adId}/{otherUserId}")
    public Page<MessageResponse> getDialog(@PathVariable Long adId,
                                           @PathVariable Long otherUserId,
                                           Authentication authentication,
                                           @RequestParam(defaultValue = "0") int page,
                                           @RequestParam(defaultValue = "50") int size) {
        return messageService.getDialog(adId, otherUserId, authentication, page, size);
    }

    @GetMapping("/unread-count")
    public Map<String, Long> getUnreadCount(Authentication authentication) {
        return Map.of("unreadCount", messageService.getUnreadCount(authentication));
    }
}
