package edu.belsu.rent_service.adapters.in.bot.dto;

import edu.belsu.rent_service.application.dto.ad.AdRequest;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

public class AdData {
    private String rentalType;
    private String title;
    private String city;
    private String address;
    private Integer pricePerMonth;
    private Integer pricePerDay;
    private Integer rooms;
    private Integer maxGuests;
    private Double area;
    private String description;
    private List<String> photoUrls = new ArrayList<>();

    // Getters and Setters
    public String getRentalType() { return rentalType; }
    public void setRentalType(String rentalType) { this.rentalType = rentalType; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public Integer getPricePerMonth() { return pricePerMonth; }
    public void setPricePerMonth(Integer pricePerMonth) { this.pricePerMonth = pricePerMonth; }

    public Integer getPricePerDay() { return pricePerDay; }
    public void setPricePerDay(Integer pricePerDay) { this.pricePerDay = pricePerDay; }

    public Integer getRooms() { return rooms; }
    public void setRooms(Integer rooms) { this.rooms = rooms; }

    public Integer getMaxGuests() { return maxGuests; }
    public void setMaxGuests(Integer maxGuests) { this.maxGuests = maxGuests; }

    public Double getArea() { return area; }
    public void setArea(Double area) { this.area = area; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public List<String> getPhotoUrls() { return photoUrls; }
    public void addPhotoUrl(String url) { photoUrls.add(url); }

    public AdRequest buildRequest() {
        return new AdRequest(
                title, description, address, city, null, "",
                "apartment", rentalType, null, null,
                rooms, pricePerMonth, pricePerDay, maxGuests,
                area != null ? BigDecimal.valueOf(area) : null, null, null, photoUrls
        );
    }
}