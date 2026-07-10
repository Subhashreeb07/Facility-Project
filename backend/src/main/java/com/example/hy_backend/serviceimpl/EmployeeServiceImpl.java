package com.example.hy_backend.serviceimpl;

import com.example.hy_backend.dto.EmployeeDtos;
import com.example.hy_backend.model.Booking;
import com.example.hy_backend.model.BookingStatus;
import com.example.hy_backend.model.Employee;
import com.example.hy_backend.model.Facility;
import com.example.hy_backend.model.Notification;
import com.example.hy_backend.repository.BookingRepository;
import com.example.hy_backend.repository.EmployeeRepository;
import com.example.hy_backend.repository.FacilityRepository;
import com.example.hy_backend.repository.NotificationRepository;
import com.example.hy_backend.service.EmployeeService;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class EmployeeServiceImpl implements EmployeeService {

    private final FacilityRepository facilityRepository;
    private final BookingRepository bookingRepository;
    private final EmployeeRepository employeeRepository;
    private final NotificationRepository notificationRepository;

    public EmployeeServiceImpl(
            FacilityRepository facilityRepository,
            BookingRepository bookingRepository,
            EmployeeRepository employeeRepository,
            NotificationRepository notificationRepository
    ) {
        this.facilityRepository = facilityRepository;
        this.bookingRepository = bookingRepository;
        this.employeeRepository = employeeRepository;
        this.notificationRepository = notificationRepository;
    }

    @Override
    public List<EmployeeDtos.DashboardFacilityResponse> getDashboardFacilities(String employeeId) {
        String normalizedEmployeeId = normalizeEmployeeId(employeeId);
        String officeLocation = employeeRepository.findById(normalizedEmployeeId)
                .map(employee -> normalizeLocation(employee.getOfficeLocation()))
                .orElse(null);

        return facilityRepository.findByPublishedTrueAndStatusTrue().stream()
                .filter(facility -> facilityVisibleForOffice(facility, officeLocation))
                .map(f -> new EmployeeDtos.DashboardFacilityResponse(
                        f.getFacilityId(),
                        f.getFacilityName(),
                        f.getIcon()
                ))
                .toList();
    }

    @Override
    public EmployeeDtos.EmployeeHomeResponse getEmployeeHomeSummary(String employeeId) {
        String normalizedEmployeeId = normalizeEmployeeId(employeeId);
        List<Facility> facilities = facilityRepository.findByPublishedTrueAndStatusTrue();

        LocalDate today = LocalDate.now();
        List<Booking> todaysBookings = bookingRepository.findByEmployeeIdAndBookingDateOrderByCreatedAtDesc(normalizedEmployeeId, today);

        Map<Long, Booking> bookingByFacility = todaysBookings.stream()
                .collect(Collectors.toMap(
                        booking -> booking.getFacility().getFacilityId(),
                        booking -> booking,
                        (left, right) -> left
                ));

        List<EmployeeDtos.HomeServiceCard> services = facilities.stream()
                .map(facility -> {
                    Booking booking = bookingByFacility.get(facility.getFacilityId());
                    boolean booked = booking != null && booking.getStatus() == BookingStatus.CONFIRMED;

                    String status = booked ? "BOOKED" : "NOT BOOKED";
                    String badge = booked ? "CONFIRMED" : null;

                    String subtitle = facility.getDescription();
                    if (subtitle == null || subtitle.isBlank()) {
                        subtitle = "Quick service";
                    }

                    return new EmployeeDtos.HomeServiceCard(
                            facility.getFacilityId(),
                            facility.getFacilityName(),
                            subtitle,
                            iconForFacility(facility),
                            status,
                            badge
                    );
                })
                .toList();

        List<EmployeeDtos.DateChip> dates = java.util.stream.IntStream.range(0, 5)
                .mapToObj(offset -> {
                    LocalDate date = today.plusDays(offset);
                    return new EmployeeDtos.DateChip(
                            date.format(DateTimeFormatter.ofPattern("EEE", Locale.ENGLISH)).toUpperCase(Locale.ROOT),
                            date.getDayOfMonth(),
                            date.toString(),
                            offset == 0
                    );
                })
                .toList();

        Long targetFacilityId = facilities.isEmpty() ? null : facilities.getFirst().getFacilityId();

        return new EmployeeDtos.EmployeeHomeResponse(
                normalizedEmployeeId,
                employeeDisplayName(normalizedEmployeeId),
                today.format(DateTimeFormatter.ofPattern("EEEE, MMMM d", Locale.ENGLISH)).toUpperCase(Locale.ROOT),
                dates,
                new EmployeeDtos.QuickSetup(
                        "Book My Workday",
                        "Confirm your lunch, desk, and cab with one tap.",
                        targetFacilityId
                ),
                services,
                new EmployeeDtos.OfficeSummary("Hyderabad Office", 85)
        );
    }

    @Override
    public EmployeeDtos.EmployeeProfileResponse getEmployeeProfile(String employeeId) {
        String normalized = normalizeEmployeeId(employeeId);
        long totalBookings = bookingRepository.countByEmployeeId(normalized);
        long activeBookings = bookingRepository.countByEmployeeIdAndStatus(normalized, BookingStatus.CONFIRMED);

        Optional<Employee> employeeOpt = employeeRepository.findById(normalized);
        String name = employeeOpt.map(Employee::getFullName).orElse("Employee");
        String email = employeeOpt.map(Employee::getEmail).orElse(normalized.toLowerCase(Locale.ROOT) + "@hyhub.com");
        String department = employeeOpt.map(Employee::getDepartment).filter(value -> value != null && !value.isBlank()).orElse("--");
        String officeLocation = employeeOpt.map(Employee::getOfficeLocation).orElse("HYDERABAD");

        return new EmployeeDtos.EmployeeProfileResponse(
                normalized,
                name,
                email,
                department,
                toDisplayLocation(officeLocation),
                Math.toIntExact(totalBookings),
                Math.toIntExact(activeBookings)
        );
    }

    @Override
    public EmployeeDtos.InvitationsResponse getEmployeeInvitations(String employeeId) {
        String normalized = normalizeEmployeeId(employeeId);
        List<Notification> notifications = notificationRepository.findByEmployeeIdOrderByCreatedAtDesc(normalized);

        List<EmployeeDtos.InvitationItem> invitations = notifications.stream()
                .map(notification -> new EmployeeDtos.InvitationItem(
                        "INV-" + notification.getNotificationId(),
                        notification.getNotificationType(),
                        notification.getCreatedAt() == null ? "N/A" : notification.getCreatedAt().toString(),
                        notification.getStatusCode(),
                        notification.getChannelCode()
                ))
                .toList();

        int pending = (int) invitations.stream()
                .filter(item -> "PENDING".equalsIgnoreCase(item.status()))
                .count();

        return new EmployeeDtos.InvitationsResponse(normalized, pending, invitations);
    }

    private String normalizeEmployeeId(String employeeId) {
        return employeeId == null ? "" : employeeId.trim().toUpperCase(Locale.ROOT);
    }

    private String employeeDisplayName(String employeeId) {
        return employeeRepository.findById(employeeId)
                .map(Employee::getFullName)
                .orElse("Employee");
    }

    private String iconForFacility(Facility facility) {
        String name = facility.getFacilityName().toLowerCase(Locale.ROOT);
        if (name.contains("lunch")) {
            return "utensils";
        }
        if (name.contains("transport") || name.contains("cab")) {
            return "bus";
        }
        if (name.contains("event") || name.contains("team")) {
            return "calendar";
        }
        return "building";
    }

        private boolean facilityVisibleForOffice(Facility facility, String officeLocation) {
                List<String> targetedLocations = splitTargetLocations(facility.getTargetLocations());
                if (targetedLocations.isEmpty() || officeLocation == null) {
                        return true;
                }
                return targetedLocations.contains(officeLocation);
        }

        private List<String> splitTargetLocations(String raw) {
                if (raw == null || raw.isBlank()) {
                        return Collections.emptyList();
                }
                return Arrays.stream(raw.split(","))
                                .map(this::normalizeLocation)
                                .filter(value -> !value.isBlank())
                                .toList();
        }

        private String normalizeLocation(String location) {
                if (location == null) {
                        return "";
                }
                return location.trim().toUpperCase(Locale.ROOT);
        }

        private String toDisplayLocation(String location) {
                String normalized = normalizeLocation(location);
                if (normalized.isBlank()) {
                        return "Unknown";
                }
                return normalized.charAt(0) + normalized.substring(1).toLowerCase(Locale.ROOT);
        }
}
