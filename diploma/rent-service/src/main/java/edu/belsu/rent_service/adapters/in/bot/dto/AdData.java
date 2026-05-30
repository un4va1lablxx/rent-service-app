package edu.belsu.rent_service.adapters.in.bot.dto;

import edu.belsu.rent_service.application.dto.ad.AdRequest;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

public class AdData {
    private String rentalType;
    private String title;
    private String city;
    private String district;
    private String region;
    private String address;
    private String propertyType = "apartment";
    private Integer pricePerMonth;
    private Integer pricePerDay;
    private Integer rooms;
    private Integer maxGuests;
    private Double area;
    private Integer floor;
    private Integer totalFloors;
    private String description;
    private List<String> photoUrls = new ArrayList<>();

    // Getters and Setters
    public String getRentalType() { return rentalType; }
    public void setRentalType(String rentalType) { this.rentalType = rentalType; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }

    public String getDistrict() { return district; }
    public void setDistrict(String district) { this.district = district; }

    public String getRegion() { return region; }
    public void setRegion(String region) { this.region = region; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public String getPropertyType() { return propertyType; }
    public void setPropertyType(String propertyType) { this.propertyType = propertyType; }

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

    public Integer getFloor() { return floor; }
    public void setFloor(Integer floor) { this.floor = floor; }

    public Integer getTotalFloors() { return totalFloors; }
    public void setTotalFloors(Integer totalFloors) { this.totalFloors = totalFloors; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public List<String> getPhotoUrls() { return photoUrls; }
    public void addPhotoUrl(String url) { photoUrls.add(url); }

    public AdRequest buildRequest() {
        return new AdRequest(
                title, description, address, city, district, region,
                propertyType, rentalType, null, null,
                rooms, pricePerMonth, pricePerDay, maxGuests,
                area != null ? BigDecimal.valueOf(area) : null, floor, totalFloors, photoUrls
        );
    }
}
