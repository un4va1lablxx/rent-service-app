package edu.belsu.rent_service.service;

import edu.belsu.rent_service.domain.Ad;
import edu.belsu.rent_service.domain.Booking;
import edu.belsu.rent_service.domain.User;
import edu.belsu.rent_service.dto.booking.BookingCreateRequest;
import edu.belsu.rent_service.dto.booking.BookingResponse;
import edu.belsu.rent_service.dto.booking.BookingStatusRequest;
import edu.belsu.rent_service.exception.ApiException;
import edu.belsu.rent_service.repository.AdRepository;
import edu.belsu.rent_service.repository.BookingRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.core.Authentication;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
public class BookingService {

    private final BookingRepository bookingRepository;
    private final AdRepository adRepository;
    private final AuthenticatedUserService authenticatedUserService;

    public BookingService(BookingRepository bookingRepository,
                          AdRepository adRepository,
                          AuthenticatedUserService authenticatedUserService) {
        this.bookingRepository = bookingRepository;
        this.adRepository = adRepository;
        this.authenticatedUserService = authenticatedUserService;
    }

    @Transactional
    public BookingResponse createBooking(BookingCreateRequest request, Authentication authentication) {
        User tenant = authenticatedUserService.getCurrentUser(authentication);
        if (request == null || request.adId() == null) {
            throw new ApiException("adId is required");
        }

        Ad ad = adRepository.findById(request.adId())
                .orElseThrow(() -> new ApiException("Ad not found"));
        if (ad.getUser().getId().equals(tenant.getId())) {
            throw new ApiException("You cannot create a booking for your own ad");
        }
        if (!ad.isActive() || !"approved".equalsIgnoreCase(ad.getModerationStatus())) {
            throw new ApiException("Ad is unavailable");
        }
        if (bookingRepository.existsByAdIdAndTenantIdAndStatus(ad.getId(), tenant.getId(), "requested")) {
            throw new ApiException("You already have an active booking request for this ad");
        }

        Booking booking = Booking.builder()
                .ad(ad)
                .tenant(tenant)
                .landlord(ad.getUser())
                .status("requested")
                .startDate(request.startDate())
                .endDate(request.endDate())
                .agreedPrice(request.agreedPrice())
                .contactRevealed(false)
                .build();

        return map(bookingRepository.save(booking));
    }

    @Transactional(readOnly = true)
    public Page<BookingResponse> getMyBookings(Authentication authentication, String scope, int page, int size) {
        User currentUser = authenticatedUserService.getCurrentUser(authentication);
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        String normalized = scope == null ? "all" : scope.trim().toLowerCase();

        if ("tenant".equals(normalized)) {
            return bookingRepository.findByTenantIdOrderByCreatedAtDesc(currentUser.getId(), pageable).map(this::map);
        }
        if ("landlord".equals(normalized)) {
            return bookingRepository.findByLandlordIdOrderByCreatedAtDesc(currentUser.getId(), pageable).map(this::map);
        }

        List<BookingResponse> combined = new ArrayList<>();
        combined.addAll(bookingRepository.findByTenantIdOrderByCreatedAtDesc(currentUser.getId(), pageable).map(this::map).getContent());
        combined.addAll(bookingRepository.findByLandlordIdOrderByCreatedAtDesc(currentUser.getId(), pageable).map(this::map).getContent());
        combined.sort((left, right) -> right.createdAt().compareTo(left.createdAt()));
        return new PageImpl<>(combined, pageable, combined.size());
    }

    @Transactional
    public BookingResponse updateStatus(Long bookingId, BookingStatusRequest request, Authentication authentication) {
        User currentUser = authenticatedUserService.getCurrentUser(authentication);
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ApiException("Booking not found"));

        String status = normalizeStatus(request == null ? null : request.status());
        boolean isTenant = booking.getTenant().getId().equals(currentUser.getId());
        boolean isLandlord = booking.getLandlord().getId().equals(currentUser.getId());

        if (!isTenant && !isLandlord) {
            throw new ApiException("Access denied");
        }

        switch (status) {
            case "confirmed" -> {
                if (!isLandlord) {
                    throw new ApiException("Only the landlord can confirm a booking");
                }
                booking.setStatus("confirmed");
                booking.setContactRevealed(true);
            }
            case "cancelled" -> booking.setStatus("cancelled");
            case "completed" -> {
                if (!"confirmed".equalsIgnoreCase(booking.getStatus())) {
                    throw new ApiException("Only confirmed bookings can be completed");
                }
                booking.setStatus("completed");
                booking.setContactRevealed(true);
                booking.setCompletedAt(LocalDateTime.now());
            }
            default -> throw new ApiException("Unsupported booking status");
        }

        return map(bookingRepository.save(booking));
    }

    private BookingResponse map(Booking booking) {
        return BookingResponse.builder()
                .id(booking.getId())
                .adId(booking.getAd().getId())
                .adTitle(booking.getAd().getTitle())
                .tenantId(booking.getTenant().getId())
                .tenantName(booking.getTenant().getFullName())
                .landlordId(booking.getLandlord().getId())
                .landlordName(booking.getLandlord().getFullName())
                .status(booking.getStatus())
                .startDate(booking.getStartDate())
                .endDate(booking.getEndDate())
                .agreedPrice(booking.getAgreedPrice())
                .contactRevealed(booking.isContactRevealed())
                .completedAt(booking.getCompletedAt())
                .createdAt(booking.getCreatedAt())
                .updatedAt(booking.getUpdatedAt())
                .build();
    }

    private String normalizeStatus(String status) {
        if (status == null || status.isBlank()) {
            throw new ApiException("Booking status is required");
        }
        return status.trim().toLowerCase();
    }
}
