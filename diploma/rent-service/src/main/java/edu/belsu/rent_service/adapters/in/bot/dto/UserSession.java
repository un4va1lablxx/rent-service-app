package edu.belsu.rent_service.adapters.in.bot.dto;

import edu.belsu.rent_service.application.dto.ad.AdSummaryResponse;
import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
public class UserSession {
    private Long chatId;
    private UserState state;
    private String phoneNumber;
    private String pendingPassword;
    private String webAuthRequestId;
    private boolean existingUser;
    private Long userId;
    private String token;
    private String role = "user";
    private AdData adData;
    private int adStep = 0;
    private List<AdSummaryResponse> searchResults;
    private int currentSearchIndex;
    private List<Integer> cleanupMessageIds = new ArrayList<>();
    private Integer searchBuilderMessageId;
    private Integer searchResultMessageId;
    private List<Integer> searchResultMessageIds = new ArrayList<>();
    private Integer searchInputPromptMessageId;
    private String awaitingSearchField;
    private String searchRentalType;
    private String searchCity;
    private Integer searchRooms;
    private Integer searchMinPrice;
    private Integer searchMaxPrice;
    private String searchDates;

    public UserSession(Long chatId) {
        this.chatId = chatId;
        this.state = UserState.AWAITING_PHONE;
        this.adData = new AdData();
    }

    public void nextStep() { adStep++; }
    public void resetAdData() {
        adData = new AdData();
        adStep = 0;
    }
    public void setRole(String role) { this.role = role == null ? "user" : role; }
    public boolean canPublishAds() {
        return "landlord".equalsIgnoreCase(role) || "admin".equalsIgnoreCase(role);
    }
    public void resetSearchFilters() {
        this.searchResults = null;
        this.currentSearchIndex = 0;
        this.searchBuilderMessageId = null;
        this.searchResultMessageId = null;
        this.searchResultMessageIds.clear();
        this.searchInputPromptMessageId = null;
        this.awaitingSearchField = null;
        this.searchRentalType = null;
        this.searchCity = null;
        this.searchRooms = null;
        this.searchMinPrice = null;
        this.searchMaxPrice = null;
        this.searchDates = null;
    }

    public void rememberCleanupMessage(Integer messageId) {
        if (messageId != null && !cleanupMessageIds.contains(messageId)) {
            cleanupMessageIds.add(messageId);
        }
    }

    public List<Integer> drainCleanupMessageIds() {
        List<Integer> ids = new ArrayList<>(cleanupMessageIds);
        cleanupMessageIds.clear();
        return ids;
    }

    public void rememberSearchResultMessages(List<Integer> messageIds) {
        this.searchResultMessageIds.clear();
        if (messageIds != null) {
            this.searchResultMessageIds.addAll(messageIds.stream().filter(java.util.Objects::nonNull).toList());
        }
        this.searchResultMessageId = this.searchResultMessageIds.isEmpty() ? null : this.searchResultMessageIds.get(0);
    }

}
