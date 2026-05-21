package edu.belsu.rent_service.controller;

import edu.belsu.rent_service.dto.booking.BookingCreateRequest;
import edu.belsu.rent_service.dto.booking.BookingResponse;
import edu.belsu.rent_service.dto.booking.BookingStatusRequest;
import edu.belsu.rent_service.service.BookingService;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/bookings")
public class BookingController {

    private final BookingService bookingService;

    public BookingController(BookingService bookingService) {
        this.bookingService = bookingService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public BookingResponse createBooking(@RequestBody BookingCreateRequest request, Authentication authentication) {
        return bookingService.createBooking(request, authentication);
    }

    @GetMapping
    public Page<BookingResponse> getMyBookings(Authentication authentication,
                                               @RequestParam(defaultValue = "all") String scope,
                                               @RequestParam(defaultValue = "0") int page,
                                               @RequestParam(defaultValue = "50") int size) {
        return bookingService.getMyBookings(authentication, scope, page, size);
    }

    @PatchMapping("/{bookingId}")
    public BookingResponse updateBookingStatus(@PathVariable Long bookingId,
                                               @RequestBody BookingStatusRequest request,
                                               Authentication authentication) {
        return bookingService.updateStatus(bookingId, request, authentication);
    }
}
