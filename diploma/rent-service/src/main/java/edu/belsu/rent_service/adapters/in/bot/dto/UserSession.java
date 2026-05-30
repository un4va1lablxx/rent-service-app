package edu.belsu.rent_service.adapters.in.bot.dto;

import edu.belsu.rent_service.application.dto.ad.AdSummaryResponse;
import lombok.Getter;
import lombok.Setter;

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
    }

}
