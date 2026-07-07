package com.example.hy_backend.serviceimpl;

import com.example.hy_backend.dto.BookingDtos;
import com.example.hy_backend.dto.NotificationDtos;
import com.example.hy_backend.exception.BadRequestException;
import com.example.hy_backend.exception.ResourceNotFoundException;
import com.example.hy_backend.model.*;
import com.example.hy_backend.repository.BookingRepository;
import com.example.hy_backend.repository.FacilityRepository;
import com.example.hy_backend.repository.FieldDefinitionRepository;
import com.example.hy_backend.repository.FacilityRuleRepository;
import com.example.hy_backend.service.AuditService;
import com.example.hy_backend.service.BookingService;
import com.example.hy_backend.service.NotificationService;
import com.example.hy_backend.service.RuleEngineService;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class BookingServiceImpl implements BookingService {

    private final BookingRepository bookingRepository;
    private final FacilityRepository facilityRepository;
    private final FieldDefinitionRepository fieldDefinitionRepository;
    private final FacilityRuleRepository facilityRuleRepository;
    private final NotificationService notificationService;
    private final AuditService auditService;
    private final RuleEngineService ruleEngineService;

    public BookingServiceImpl(
            BookingRepository bookingRepository,
            FacilityRepository facilityRepository,
            FieldDefinitionRepository fieldDefinitionRepository,
            FacilityRuleRepository facilityRuleRepository,
            NotificationService notificationService,
            AuditService auditService,
            RuleEngineService ruleEngineService
    ) {
        this.bookingRepository = bookingRepository;
        this.facilityRepository = facilityRepository;
        this.fieldDefinitionRepository = fieldDefinitionRepository;
        this.facilityRuleRepository = facilityRuleRepository;
        this.notificationService = notificationService;
        this.auditService = auditService;
        this.ruleEngineService = ruleEngineService;
    }

    @Override
    @Transactional
    public BookingDtos.SubmitBookingResponse submitBooking(BookingDtos.SubmitBookingRequest request) {
        String normalizedEmployeeId = request.employeeId().trim().toUpperCase(Locale.ROOT);
        String normalizedClientRequestId = normalizeClientRequestId(request.clientRequestId());

        if (normalizedClientRequestId != null) {
            Optional<Booking> existing = bookingRepository.findByEmployeeIdAndClientRequestId(normalizedEmployeeId, normalizedClientRequestId);
            if (existing.isPresent()) {
                Booking replay = existing.get();
                return new BookingDtos.SubmitBookingResponse(
                        replay.getBookingId(),
                        replay.getStatus().name(),
                        replay.getBookingDate().toString(),
                        replay.getCreatedAt().toString(),
                        true,
                        "Idempotent replay. Returning existing booking"
                );
            }
        }

        Facility facility = facilityRepository.findById(request.facilityId())
                .orElseThrow(() -> new ResourceNotFoundException("Facility not found with id: " + request.facilityId()));

        if (!Boolean.TRUE.equals(facility.getStatus()) || !Boolean.TRUE.equals(facility.getPublished())) {
            throw new BadRequestException("Facility is not available for booking");
        }

        FacilityRule rule = facilityRuleRepository.findByFacilityFacilityId(facility.getFacilityId()).orElse(null);
        LocalDate bookingDate = resolveBookingDate(request.bookingDate());
        ruleEngineService.validateBookingCreation(facility, rule, normalizedEmployeeId, bookingDate);

        List<FieldDefinition> fields = fieldDefinitionRepository.findByFacilityFacilityIdOrderByDisplayOrderAsc(facility.getFacilityId());
        Map<Long, FieldDefinition> fieldMap = fields.stream().collect(
                HashMap::new,
                (map, field) -> map.put(field.getFieldId(), field),
                HashMap::putAll
        );

        Map<Long, String> responseMap = new HashMap<>();
        for (BookingDtos.BookingFieldInput input : request.responses()) {
            responseMap.put(input.fieldId(), input.value());
        }

        validateBookingResponses(fields, fieldMap, responseMap);

        Booking booking = new Booking();
        booking.setFacility(facility);
        booking.setEmployeeId(normalizedEmployeeId);
        booking.setClientRequestId(normalizedClientRequestId);
        booking.setStatus(BookingStatus.CONFIRMED);
        booking.setBookingDate(bookingDate);

        List<BookingResponse> bookingResponses = new ArrayList<>();
        for (Map.Entry<Long, String> entry : responseMap.entrySet()) {
            FieldDefinition field = fieldMap.get(entry.getKey());
            BookingResponse response = new BookingResponse();
            response.setBooking(booking);
            response.setField(field);
            response.setValue(entry.getValue());
            bookingResponses.add(response);
        }
        booking.setResponses(bookingResponses);

        Booking saved = bookingRepository.save(booking);
        String qrCode = ruleEngineService.generateQrCodeIfRequired(rule, saved);
        if (qrCode != null) {
            saved.setQrCode(qrCode);
            saved = bookingRepository.save(saved);
        }

        notificationService.createNotification(new NotificationDtos.CreateNotificationRequest(
            saved.getEmployeeId(),
            saved.getBookingId(),
            "BOOKING_CONFIRMED",
            "IN_APP",
            "Booking confirmed for " + facility.getFacilityName() + " on " + saved.getBookingDate()
        ));

        auditService.logAction(
            saved.getEmployeeId(),
            "EMPLOYEE",
            "BOOKING_CREATED",
            "Booking",
            String.valueOf(saved.getBookingId()),
            null,
            "{\"status\":\"CONFIRMED\"}",
            null
        );

        return new BookingDtos.SubmitBookingResponse(
                saved.getBookingId(),
                saved.getStatus().name(),
                saved.getBookingDate().toString(),
                saved.getCreatedAt().toString(),
                false,
                "Booking submitted successfully"
        );
    }

    @Override
    public List<BookingDtos.BookingHistoryItem> getBookingHistory(String employeeId) {
        return bookingRepository.findByEmployeeIdOrderByCreatedAtDesc(employeeId.trim().toUpperCase(Locale.ROOT)).stream()
                .map(booking -> new BookingDtos.BookingHistoryItem(
                        booking.getBookingId(),
                        booking.getFacility().getFacilityName(),
                    booking.getStatus().name(),
                    booking.getBookingDate().toString()
                ))
                .toList();
    }

    @Override
    public BookingDtos.BookingDetail getBookingDetail(Long bookingId) {
        Booking booking = getBookingOrThrow(bookingId);
        List<BookingDtos.BookingAnswer> answers = booking.getResponses().stream()
                .map(response -> new BookingDtos.BookingAnswer(
                        response.getField().getFieldId(),
                        response.getField().getLabel(),
                        response.getValue()
                ))
                .toList();

        return new BookingDtos.BookingDetail(
                booking.getBookingId(),
                booking.getFacility().getFacilityId(),
                booking.getFacility().getFacilityName(),
                booking.getEmployeeId(),
                booking.getStatus().name(),
                booking.getBookingDate().toString(),
                booking.getCreatedAt().toString(),
                booking.getQrCode(),
                answers
        );
    }

    @Override
    public void cancelBooking(Long bookingId) {
        Booking booking = getBookingOrThrow(bookingId);
        if (booking.getStatus() == BookingStatus.CANCELLED) {
            return;
        }

        FacilityRule rule = facilityRuleRepository.findByFacilityFacilityId(booking.getFacility().getFacilityId()).orElse(null);
        ruleEngineService.validateBookingCancellation(booking, rule);

        booking.setStatus(BookingStatus.CANCELLED);
        booking.setCancelledAt(LocalDateTime.now());
        Booking saved = bookingRepository.save(booking);

        notificationService.createNotification(new NotificationDtos.CreateNotificationRequest(
            saved.getEmployeeId(),
            saved.getBookingId(),
            "BOOKING_CANCELLED",
            "IN_APP",
            "Booking cancelled for " + saved.getFacility().getFacilityName() + " on " + saved.getBookingDate()
        ));

        auditService.logAction(
            saved.getEmployeeId(),
            "EMPLOYEE",
            "BOOKING_CANCELLED",
            "Booking",
            String.valueOf(saved.getBookingId()),
            "{\"status\":\"CONFIRMED\"}",
            "{\"status\":\"CANCELLED\"}",
            null
        );
    }

    @Override
    public List<BookingDtos.AdminBookingSearchItem> searchBookings(Long facilityId, String employeeId, String status, String bookingDate) {
        Specification<Booking> specification = (root, query, cb) -> cb.conjunction();

        if (facilityId != null) {
            specification = specification.and((root, query, cb) -> cb.equal(root.get("facility").get("facilityId"), facilityId));
        }

        if (employeeId != null && !employeeId.isBlank()) {
            specification = specification.and((root, query, cb) ->
                    cb.equal(cb.upper(root.get("employeeId")), employeeId.trim().toUpperCase(Locale.ROOT))
            );
        }

        if (status != null && !status.isBlank()) {
            BookingStatus parsedStatus = parseStatus(status);
            specification = specification.and((root, query, cb) -> cb.equal(root.get("status"), parsedStatus));
        }

        if (bookingDate != null && !bookingDate.isBlank()) {
            LocalDate parsedDate = parseBookingDate(bookingDate);
            specification = specification.and((root, query, cb) -> cb.equal(root.get("bookingDate"), parsedDate));
        }

        return bookingRepository.findAll(specification).stream()
                .sorted(Comparator.comparing(Booking::getCreatedAt).reversed())
                .map(this::toAdminSearchItem)
                .toList();
    }

    @Override
    public BookingDtos.BookingSummaryResponse getBookingSummary(Long facilityId, String bookingDate) {
        if (facilityId == null) {
            throw new BadRequestException("facilityId is required for booking summary");
        }

        LocalDate parsedDate = bookingDate == null || bookingDate.isBlank() ? LocalDate.now() : parseBookingDate(bookingDate);
        long total = bookingRepository.countByFacilityFacilityIdAndBookingDate(facilityId, parsedDate);
        long confirmed = bookingRepository.countByFacilityFacilityIdAndBookingDateAndStatus(facilityId, parsedDate, BookingStatus.CONFIRMED);
        long cancelled = bookingRepository.countByFacilityFacilityIdAndBookingDateAndStatus(facilityId, parsedDate, BookingStatus.CANCELLED);

        return new BookingDtos.BookingSummaryResponse(
                facilityId,
                parsedDate.toString(),
                total,
                confirmed,
                cancelled
        );
    }

    @Override
    public BookingDtos.VerifyQrResponse verifyQrCode(String qrCode) {
        if (qrCode == null || qrCode.isBlank()) {
            return invalidQr("QR code is required");
        }

        Optional<Booking> bookingOptional = bookingRepository.findByQrCode(qrCode.trim());
        if (bookingOptional.isEmpty()) {
            return invalidQr("QR code not found");
        }

        Booking booking = bookingOptional.get();
        if (!ruleEngineService.isQrCodeValid(qrCode.trim(), booking)) {
            return invalidQr("QR code signature mismatch");
        }

        if (booking.getStatus() == BookingStatus.CANCELLED) {
            return invalidQr("Booking is cancelled");
        }

        if (booking.getBookingDate().isBefore(LocalDate.now())) {
            return invalidQr("Booking date has expired");
        }

        return new BookingDtos.VerifyQrResponse(
                true,
                "QR code is valid",
                booking.getBookingId(),
                booking.getFacility().getFacilityId(),
                booking.getFacility().getFacilityName(),
                booking.getEmployeeId(),
                booking.getBookingDate().toString(),
                booking.getStatus().name()
        );
    }

    private Booking getBookingOrThrow(Long bookingId) {
        return bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found with id: " + bookingId));
    }

    private LocalDate resolveBookingDate(String bookingDateRaw) {
        if (bookingDateRaw == null || bookingDateRaw.isBlank()) {
            return LocalDate.now();
        }

        LocalDate bookingDate;
        try {
            bookingDate = LocalDate.parse(bookingDateRaw);
        } catch (Exception ex) {
            throw new BadRequestException("Invalid bookingDate. Use ISO format yyyy-MM-dd");
        }

        if (bookingDate.isBefore(LocalDate.now())) {
            throw new BadRequestException("Cannot create booking for a past date");
        }
        return bookingDate;
    }

    private void validateBookingResponses(
            List<FieldDefinition> fields,
            Map<Long, FieldDefinition> fieldMap,
            Map<Long, String> responseMap
    ) {
        for (Long fieldId : responseMap.keySet()) {
            if (!fieldMap.containsKey(fieldId)) {
                throw new BadRequestException("Field id does not belong to this facility: " + fieldId);
            }
        }

        for (FieldDefinition field : fields) {
            String value = responseMap.get(field.getFieldId());
            if (Boolean.TRUE.equals(field.getRequired()) && (value == null || value.isBlank())) {
                throw new BadRequestException("Required field is missing: " + field.getLabel());
            }

            if (value != null && !value.isBlank() &&
                    (field.getFieldType() == FieldType.DROPDOWN || field.getFieldType() == FieldType.RADIO_BUTTON)) {
                boolean exists = field.getOptions().stream()
                        .anyMatch(option -> option.getOptionValue().equalsIgnoreCase(value));
                if (!exists) {
                    throw new BadRequestException("Invalid option for field: " + field.getLabel());
                }
            }
        }
    }

    private String normalizeClientRequestId(String clientRequestId) {
        if (clientRequestId == null || clientRequestId.isBlank()) {
            return null;
        }
        String normalized = clientRequestId.trim();
        if (normalized.length() > 120) {
            throw new BadRequestException("clientRequestId must be 120 characters or fewer");
        }
        return normalized;
    }

    private LocalDate parseBookingDate(String bookingDate) {
        try {
            return LocalDate.parse(bookingDate.trim());
        } catch (Exception ex) {
            throw new BadRequestException("Invalid bookingDate. Use ISO format yyyy-MM-dd");
        }
    }

    private BookingStatus parseStatus(String status) {
        try {
            return BookingStatus.valueOf(status.trim().toUpperCase(Locale.ROOT));
        } catch (Exception ex) {
            throw new BadRequestException("Invalid status. Allowed values: CONFIRMED, CANCELLED");
        }
    }

    private BookingDtos.AdminBookingSearchItem toAdminSearchItem(Booking booking) {
        return new BookingDtos.AdminBookingSearchItem(
                booking.getBookingId(),
                booking.getFacility().getFacilityId(),
                booking.getFacility().getFacilityName(),
                booking.getEmployeeId(),
                booking.getStatus().name(),
                booking.getBookingDate().toString(),
                booking.getCreatedAt() == null ? null : booking.getCreatedAt().toString(),
                booking.getCancelledAt() == null ? null : booking.getCancelledAt().toString(),
                booking.getQrCode()
        );
    }

    private BookingDtos.VerifyQrResponse invalidQr(String message) {
        return new BookingDtos.VerifyQrResponse(
                false,
                message,
                null,
                null,
                null,
                null,
                null,
                null
        );
    }
}
