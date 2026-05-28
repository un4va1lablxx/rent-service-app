package edu.belsu.rent_service.adapters.in.bot.dto;

import edu.belsu.rent_service.application.dto.ad.AdSummaryResponse;

import java.util.List;

public class UserSession {
    private Long chatId;
    private UserState state;
    private String phoneNumber;
    private String pendingPassword;
    private String webAuthRequestId;
    private boolean existingUser;
    private Long userId;
    private String token;
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

    public Long getChatId() { return chatId; }
    public void setChatId(Long chatId) { this.chatId = chatId; }

    public UserState getState() { return state; }
    public void setState(UserState state) { this.state = state; }

    public String getPhoneNumber() { return phoneNumber; }
    public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }

    public String getPendingPassword() { return pendingPassword; }
    public void setPendingPassword(String pendingPassword) { this.pendingPassword = pendingPassword; }

    public String getWebAuthRequestId() { return webAuthRequestId; }
    public void setWebAuthRequestId(String webAuthRequestId) { this.webAuthRequestId = webAuthRequestId; }

    public boolean isExistingUser() { return existingUser; }
    public void setExistingUser(boolean existingUser) { this.existingUser = existingUser; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }

    public AdData getAdData() { return adData; }
    public void setAdData(AdData adData) { this.adData = adData; }

    public int getAdStep() { return adStep; }
    public void setAdStep(int adStep) { this.adStep = adStep; }

    public List<AdSummaryResponse> getSearchResults() { return searchResults; }
    public void setSearchResults(List<AdSummaryResponse> results) { this.searchResults = results; }
    public int getCurrentSearchIndex() { return currentSearchIndex; }
    public void setCurrentSearchIndex(int index) { this.currentSearchIndex = index; }
    public void resetSearchFilters() {
        this.searchResults = null;
        this.currentSearchIndex = 0;
    }

}
