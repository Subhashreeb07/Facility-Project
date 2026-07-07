package com.example.hy_backend.serviceimpl;

import com.example.hy_backend.dto.NotificationDtos;
import com.example.hy_backend.exception.BadRequestException;
import com.example.hy_backend.exception.ResourceNotFoundException;
import com.example.hy_backend.model.Booking;
import com.example.hy_backend.model.Employee;
import com.example.hy_backend.model.Notification;
import com.example.hy_backend.model.NotificationTemplate;
import com.example.hy_backend.model.NotificationTrigger;
import com.example.hy_backend.repository.BookingRepository;
import com.example.hy_backend.repository.EmployeeRepository;
import com.example.hy_backend.repository.NotificationRepository;
import com.example.hy_backend.repository.NotificationTemplateRepository;
import com.example.hy_backend.repository.NotificationTriggerRepository;
import com.example.hy_backend.service.NotificationService;
import jakarta.transaction.Transactional;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class NotificationServiceImpl implements NotificationService {

    private static final Set<String> ALLOWED_CHANNELS = Set.of("IN_APP", "EMAIL", "SMS", "PUSH");
    private static final Set<String> ALLOWED_STATUSES = Set.of(
            "SCHEDULED",
            "PENDING",
            "RETRYING",
            "SENT",
            "FAILED",
            "ESCALATED",
            "READ",
            "CANCELLED"
    );

    private final NotificationRepository notificationRepository;
    private final BookingRepository bookingRepository;
    private final EmployeeRepository employeeRepository;
    private final NotificationTemplateRepository notificationTemplateRepository;
    private final NotificationTriggerRepository notificationTriggerRepository;

    public NotificationServiceImpl(
            NotificationRepository notificationRepository,
            BookingRepository bookingRepository,
            EmployeeRepository employeeRepository,
            NotificationTemplateRepository notificationTemplateRepository,
            NotificationTriggerRepository notificationTriggerRepository
    ) {
        this.notificationRepository = notificationRepository;
        this.bookingRepository = bookingRepository;
        this.employeeRepository = employeeRepository;
        this.notificationTemplateRepository = notificationTemplateRepository;
        this.notificationTriggerRepository = notificationTriggerRepository;
    }

    @Override
    public NotificationDtos.NotificationResponse createNotification(NotificationDtos.CreateNotificationRequest request) {
        return createInternal(
                request.employeeId(),
                request.bookingId(),
                request.notificationType(),
                request.channelCode(),
                request.messageBody(),
                LocalDateTime.now(),
                3
        );
    }

    @Override
    public NotificationDtos.NotificationResponse scheduleNotification(NotificationDtos.CreateScheduledNotificationRequest request) {
        LocalDateTime scheduledAt = parseDateTime(request.scheduledAt(), "scheduledAt");
        int maxRetries = request.maxRetries() == null ? 3 : request.maxRetries();
        if (maxRetries < 0 || maxRetries > 10) {
            throw new BadRequestException("maxRetries must be between 0 and 10");
        }

        return createInternal(
                request.employeeId(),
                request.bookingId(),
                request.notificationType(),
                request.channelCode(),
                request.messageBody(),
                scheduledAt,
                maxRetries
        );
    }

    @Override
    public NotificationDtos.NotificationListResponse getEmployeeNotifications(String employeeId, String statusCode) {
        String normalizedEmployeeId = normalizeEmployeeId(employeeId);

        List<Notification> notifications;
        if (statusCode == null || statusCode.isBlank()) {
            notifications = notificationRepository.findByEmployeeIdOrderByCreatedAtDesc(normalizedEmployeeId);
        } else {
            String normalizedStatus = normalizeStatus(statusCode);
            notifications = notificationRepository.findByEmployeeIdAndStatusCodeOrderByCreatedAtDesc(
                    normalizedEmployeeId,
                    normalizedStatus
            );
        }

        return new NotificationDtos.NotificationListResponse(notifications.stream().map(this::toResponse).toList());
    }

    @Override
    public NotificationDtos.NotificationResponse markNotificationStatus(NotificationDtos.MarkNotificationRequest request) {
        Notification notification = notificationRepository.findById(request.notificationId())
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found with id: " + request.notificationId()));

        String targetStatus = normalizeStatus(request.statusCode());
        validateStatusTransition(notification.getStatusCode(), targetStatus);

        notification.setStatusCode(targetStatus);
        if ("SENT".equals(targetStatus)) {
            notification.setSentAt(LocalDateTime.now());
            notification.setProcessedAt(LocalDateTime.now());
            notification.setLastError(null);
        }
        if ("ESCALATED".equals(targetStatus)) {
            notification.setEscalated(true);
            notification.setEscalatedAt(LocalDateTime.now());
        }

        Notification saved = notificationRepository.save(notification);
        return toResponse(saved);
    }

    @Override
    public NotificationDtos.ProcessNotificationsResponse processPendingNotifications(Integer batchSize) {
        int safeBatchSize = batchSize == null ? 100 : batchSize;
        if (safeBatchSize <= 0 || safeBatchSize > 500) {
            throw new BadRequestException("batchSize must be between 1 and 500");
        }

        List<Notification> dueNotifications = notificationRepository.findByStatusCodeInAndScheduledAtLessThanEqualOrderByScheduledAtAsc(
                List.of("SCHEDULED", "PENDING", "RETRYING"),
                LocalDateTime.now(),
                PageRequest.of(0, safeBatchSize)
        );

        int attempted = 0;
        int sent = 0;
        int retried = 0;
        int escalated = 0;
        int failed = 0;

        for (Notification notification : dueNotifications) {
            attempted++;
            boolean delivered = attemptDelivery(notification);

            if (delivered) {
                sent++;
                continue;
            }

            if (Boolean.TRUE.equals(notification.getEscalated())) {
                escalated++;
                continue;
            }

            if ("RETRYING".equals(notification.getStatusCode())) {
                retried++;
            } else {
                failed++;
            }
        }

        return new NotificationDtos.ProcessNotificationsResponse(attempted, sent, retried, escalated, failed);
    }

    @Override
    public NotificationDtos.NotificationOpsSummaryResponse getOperationalSummary(String reportDate) {
        LocalDate date = (reportDate == null || reportDate.isBlank()) ? LocalDate.now() : parseDate(reportDate, "reportDate");
        LocalDateTime start = date.atStartOfDay();
        LocalDateTime end = date.plusDays(1).atStartOfDay().minusNanos(1);

        long pending = notificationRepository.countByStatusCodeAndCreatedAtBetween("PENDING", start, end)
                + notificationRepository.countByStatusCodeAndCreatedAtBetween("SCHEDULED", start, end);
        long retrying = notificationRepository.countByStatusCodeAndCreatedAtBetween("RETRYING", start, end);
        long sent = notificationRepository.countByStatusCodeAndCreatedAtBetween("SENT", start, end);
        long failed = notificationRepository.countByStatusCodeAndCreatedAtBetween("FAILED", start, end);
        long escalated = notificationRepository.countByStatusCodeAndCreatedAtBetween("ESCALATED", start, end);
        long total = pending + retrying + sent + failed + escalated;

        return new NotificationDtos.NotificationOpsSummaryResponse(
                date.toString(),
                total,
                pending,
                retrying,
                sent,
                failed,
                escalated
        );
    }

    @Override
    public List<NotificationDtos.TemplateResponse> getTemplates() {
        return notificationTemplateRepository.findAll().stream()
                .sorted(Comparator.comparing(NotificationTemplate::getUpdatedAt).reversed())
                .map(this::toTemplateResponse)
                .toList();
    }

    @Override
    @Transactional
    public NotificationDtos.TemplateResponse saveTemplate(NotificationDtos.TemplateUpsertRequest request) {
        NotificationTemplate template;

        if (request.templateId() != null) {
            template = notificationTemplateRepository.findById(request.templateId())
                    .orElseThrow(() -> new ResourceNotFoundException("Template not found with id: " + request.templateId()));
            if (notificationTemplateRepository.existsByTemplateNameIgnoreCaseAndTemplateIdNot(
                    request.templateName().trim(),
                    request.templateId()
            )) {
                throw new BadRequestException("Template name already exists: " + request.templateName());
            }
        } else {
            if (notificationTemplateRepository.existsByTemplateNameIgnoreCase(request.templateName().trim())) {
                throw new BadRequestException("Template name already exists: " + request.templateName());
            }
            template = new NotificationTemplate();
            template.setCreatedAt(LocalDateTime.now());
        }

        template.setTemplateName(request.templateName().trim());
        template.setNotificationType(request.notificationType().trim().toUpperCase(Locale.ROOT));
        template.setChannels(normalizeChannels(request.channels()));
        template.setSubject(request.subject().trim());
        template.setMessageTemplate(request.messageTemplate().trim());
        template.setUpdatedAt(LocalDateTime.now());

        NotificationTemplate saved = notificationTemplateRepository.save(template);
        return toTemplateResponse(saved);
    }

    @Override
    @Transactional
    public void deleteTemplate(Long templateId) {
        NotificationTemplate template = notificationTemplateRepository.findById(templateId)
                .orElseThrow(() -> new ResourceNotFoundException("Template not found with id: " + templateId));

        if (notificationTriggerRepository.existsByTemplateTemplateId(templateId)) {
            throw new BadRequestException("Cannot delete template because it is used by one or more triggers");
        }

        notificationTemplateRepository.delete(template);
    }

    @Override
    @Transactional
    public List<NotificationDtos.TriggerResponse> getTriggers() {
        return notificationTriggerRepository.findAll().stream()
                .sorted(Comparator.comparing(NotificationTrigger::getUpdatedAt).reversed())
                .map(this::toTriggerResponse)
                .toList();
    }

    @Override
    @Transactional
    public NotificationDtos.TriggerResponse saveTrigger(NotificationDtos.TriggerUpsertRequest request) {
        NotificationTrigger trigger;

        if (request.triggerId() != null) {
            trigger = notificationTriggerRepository.findById(request.triggerId())
                    .orElseThrow(() -> new ResourceNotFoundException("Trigger not found with id: " + request.triggerId()));
        } else {
            trigger = new NotificationTrigger();
            trigger.setCreatedAt(LocalDateTime.now());
        }

        NotificationTemplate template = notificationTemplateRepository.findById(request.templateId())
                .orElseThrow(() -> new ResourceNotFoundException("Template not found with id: " + request.templateId()));

        trigger.setTriggerEvent(request.triggerEvent().trim().toUpperCase(Locale.ROOT));
        trigger.setTemplate(template);
        trigger.setOffsetMinutes(request.offsetMinutes());
        trigger.setEnabled(request.enabled());
        trigger.setUpdatedAt(LocalDateTime.now());

        NotificationTrigger saved = notificationTriggerRepository.save(trigger);
        return toTriggerResponse(saved);
    }

    @Override
    @Transactional
    public void deleteTrigger(Long triggerId) {
        NotificationTrigger trigger = notificationTriggerRepository.findById(triggerId)
                .orElseThrow(() -> new ResourceNotFoundException("Trigger not found with id: " + triggerId));
        notificationTriggerRepository.delete(trigger);
    }

    @Override
    @Transactional
    public List<NotificationDtos.QueueItemResponse> getQueue(String facility, String status, String channel, String date) {
        LocalDate filterDate = (date == null || date.isBlank()) ? null : parseDate(date, "date");
        String normalizedChannel = channel == null ? null : normalizeOptional(channel);
        String normalizedStatus = status == null ? null : normalizeOptional(status);
        String normalizedFacility = facility == null ? null : facility.trim().toLowerCase(Locale.ROOT);

        return notificationRepository.findAll().stream()
                .filter(item -> Set.of("SCHEDULED", "PENDING", "RETRYING").contains(item.getStatusCode()))
                .filter(item -> filterDate == null || sameDate(item.getScheduledAt(), filterDate))
                .filter(item -> normalizedChannel == null || item.getChannelCode().equalsIgnoreCase(normalizedChannel))
                .filter(item -> {
                    if (normalizedFacility == null) {
                        return true;
                    }
                    String facilityName = extractFacilityName(item);
                    return facilityName.toLowerCase(Locale.ROOT).contains(normalizedFacility);
                })
                .map(this::toQueueResponse)
                .filter(item -> normalizedStatus == null || item.status().equalsIgnoreCase(normalizedStatus))
                .sorted(Comparator.comparing(NotificationDtos.QueueItemResponse::scheduledTime))
                .toList();
    }

    @Override
    @Transactional
    public NotificationDtos.HistoryResponse getHistory(
            String query,
            String facility,
            String status,
            String channel,
            String date,
            Integer page,
            Integer pageSize
    ) {
        int safePage = page == null || page < 1 ? 1 : page;
        int safePageSize = pageSize == null || pageSize < 1 ? 10 : Math.min(pageSize, 100);

        LocalDate filterDate = (date == null || date.isBlank()) ? null : parseDate(date, "date");
        String normalizedChannel = channel == null ? null : normalizeOptional(channel);
        String normalizedStatus = status == null ? null : normalizeOptional(status);
        String normalizedFacility = facility == null ? null : facility.trim().toLowerCase(Locale.ROOT);
        String normalizedQuery = query == null ? null : query.trim().toLowerCase(Locale.ROOT);

        List<NotificationDtos.HistoryItemResponse> all = notificationRepository.findAll().stream()
                .filter(item -> Set.of("SENT", "READ", "FAILED", "ESCALATED", "CANCELLED").contains(item.getStatusCode()))
                .filter(item -> filterDate == null || sameDate(item.getSentAt() == null ? item.getCreatedAt() : item.getSentAt(), filterDate))
                .filter(item -> normalizedChannel == null || item.getChannelCode().equalsIgnoreCase(normalizedChannel))
                .map(this::toHistoryResponse)
                .filter(item -> normalizedStatus == null || item.status().equalsIgnoreCase(normalizedStatus))
                .filter(item -> {
                    if (normalizedFacility == null) {
                        return true;
                    }
                    return item.facilityName().toLowerCase(Locale.ROOT).contains(normalizedFacility);
                })
                .filter(item -> {
                    if (normalizedQuery == null || normalizedQuery.isBlank()) {
                        return true;
                    }
                    return String.join(" ",
                                    item.employeeId(),
                                    item.employeeName() == null ? "" : item.employeeName(),
                                    item.facilityName(),
                                    item.templateName())
                            .toLowerCase(Locale.ROOT)
                            .contains(normalizedQuery);
                })
                .sorted(Comparator.comparing(NotificationDtos.HistoryItemResponse::sentTime, Comparator.nullsLast(Comparator.naturalOrder())).reversed())
                .toList();

        int fromIndex = Math.min((safePage - 1) * safePageSize, all.size());
        int toIndex = Math.min(fromIndex + safePageSize, all.size());
        List<NotificationDtos.HistoryItemResponse> paged = new ArrayList<>(all.subList(fromIndex, toIndex));

        return new NotificationDtos.HistoryResponse(paged, all.size(), safePage, safePageSize);
    }

    @Override
    @Transactional
    public NotificationDtos.TestNotificationResponse testNotification(NotificationDtos.TestNotificationRequest request) {
        NotificationTemplate template = notificationTemplateRepository.findById(request.templateId())
                .orElseThrow(() -> new ResourceNotFoundException("Template not found with id: " + request.templateId()));

        String subject = applyPlaceholders(template.getSubject(), request.placeholders());
        String body = applyPlaceholders(template.getMessageTemplate(), request.placeholders());

        return new NotificationDtos.TestNotificationResponse(
                true,
                "Template rendered successfully",
                new NotificationDtos.TestNotificationResponse.Preview(
                        subject,
                        body,
                        request.channels()
                )
        );
    }

            @Override
            @Transactional
            public NotificationDtos.BroadcastNotificationResponse broadcastNotification(NotificationDtos.BroadcastNotificationRequest request) {
            boolean dryRun = Boolean.TRUE.equals(request.dryRun());
            boolean activeOnly = !Boolean.FALSE.equals(request.activeOnly());

            String normalizedType = request.notificationType().trim().toUpperCase(Locale.ROOT);
            List<String> normalizedChannels = request.channels().stream()
                .map(this::normalizeChannel)
                .distinct()
                .toList();

            Set<String> requestedEmployeeIds = request.employeeIds() == null
                ? Set.of()
                : request.employeeIds().stream()
                .filter(Objects::nonNull)
                .map(this::normalizeEmployeeId)
                .collect(Collectors.toSet());

            String filterLocation = normalizeFilterValue(request.location());
            String filterWorkMode = normalizeFilterValue(request.workMode());
            String filterPreference = normalizeFilterValue(request.preference());

            List<Employee> matchedEmployees = employeeRepository.findAll().stream()
                .filter(emp -> !activeOnly || Boolean.TRUE.equals(emp.getActive()))
                .filter(emp -> requestedEmployeeIds.isEmpty() || requestedEmployeeIds.contains(emp.getEmployeeId()))
                .filter(emp -> filterLocation == null || filterLocation.equalsIgnoreCase(emp.getOfficeLocation()))
                .filter(emp -> filterWorkMode == null || filterWorkMode.equalsIgnoreCase(emp.getWorkMode()))
                .filter(emp -> {
                    if (filterPreference == null) {
                    return true;
                    }
                    String employeePreference = emp.getPreferenceTag() == null ? "" : emp.getPreferenceTag();
                    return filterPreference.equalsIgnoreCase(employeePreference);
                })
                .toList();

            int createdCount = 0;
            if (!dryRun) {
                for (Employee employee : matchedEmployees) {
                for (String channel : normalizedChannels) {
                    String renderedBody = request.messageBody()
                        .replace("{{employeeName}}", employee.getFullName())
                        .replace("{{office}}", employee.getOfficeLocation() == null ? "" : employee.getOfficeLocation());

                    String finalBody = "Subject: " + request.subject().trim() + "\n" + renderedBody.trim();
                    createInternal(
                        employee.getEmployeeId(),
                        null,
                        normalizedType,
                        channel,
                        finalBody,
                        LocalDateTime.now(),
                        3
                    );
                    createdCount++;
                }
                }
            }

            List<String> sampleEmployeeIds = matchedEmployees.stream()
                .limit(10)
                .map(Employee::getEmployeeId)
                .toList();

            String message = dryRun
                ? "Audience preview generated"
                : "Broadcast notifications queued successfully";

            return new NotificationDtos.BroadcastNotificationResponse(
                matchedEmployees.size(),
                createdCount,
                sampleEmployeeIds,
                message
            );
            }

    private NotificationDtos.NotificationResponse createInternal(
            String employeeId,
            Long bookingId,
            String notificationType,
            String channelCode,
            String messageBody,
            LocalDateTime scheduledAt,
            int maxRetries
    ) {
        Notification notification = new Notification();
        notification.setEmployeeId(normalizeEmployeeId(employeeId));

        if (bookingId != null) {
            Booking booking = bookingRepository.findById(bookingId)
                    .orElseThrow(() -> new ResourceNotFoundException("Booking not found with id: " + bookingId));
            notification.setBooking(booking);
        }

        notification.setNotificationType(notificationType.trim());
        notification.setChannelCode(normalizeChannel(channelCode));
        notification.setMessageBody(messageBody.trim());
        notification.setScheduledAt(scheduledAt);
        boolean scheduledForLater = scheduledAt.isAfter(LocalDateTime.now());
        notification.setStatusCode(scheduledForLater ? "SCHEDULED" : "PENDING");
        notification.setRetryCount(0);
        notification.setMaxRetries(maxRetries);
        notification.setEscalated(false);
        notification.setCreatedAt(LocalDateTime.now());

        Notification saved = notificationRepository.save(notification);
        if (!scheduledForLater) {
            attemptDelivery(saved);
            return toResponse(notificationRepository.findById(saved.getNotificationId()).orElse(saved));
        }

        return toResponse(saved);
    }

    private boolean attemptDelivery(Notification notification) {
        String channel = normalizeChannel(notification.getChannelCode());
        LocalDateTime now = LocalDateTime.now();

        if (!ALLOWED_CHANNELS.contains(channel)) {
            markFailure(notification, "Unsupported channel: " + channel, now);
            return false;
        }

        notification.setStatusCode("SENT");
        notification.setSentAt(now);
        notification.setProcessedAt(now);
        notification.setLastError(null);
        notificationRepository.save(notification);
        return true;
    }

    private void markFailure(Notification notification, String errorMessage, LocalDateTime now) {
        int retries = notification.getRetryCount() == null ? 0 : notification.getRetryCount();
        int maxRetries = notification.getMaxRetries() == null ? 3 : notification.getMaxRetries();

        retries++;
        notification.setRetryCount(retries);
        notification.setLastError(errorMessage);
        notification.setProcessedAt(now);

        if (retries >= maxRetries) {
            notification.setStatusCode("ESCALATED");
            notification.setEscalated(true);
            notification.setEscalatedAt(now);
        } else {
            notification.setStatusCode("RETRYING");
            notification.setScheduledAt(now.plusMinutes(5));
        }

        notificationRepository.save(notification);
    }

    private void validateStatusTransition(String currentStatus, String targetStatus) {
        if (!ALLOWED_STATUSES.contains(currentStatus) || !ALLOWED_STATUSES.contains(targetStatus)) {
            throw new BadRequestException("Unsupported notification status transition");
        }

        if ("SENT".equals(currentStatus) && !("READ".equals(targetStatus) || "CANCELLED".equals(targetStatus))) {
            throw new BadRequestException("SENT notifications can only move to READ or CANCELLED");
        }

        if ("ESCALATED".equals(currentStatus) && !"CANCELLED".equals(targetStatus)) {
            throw new BadRequestException("ESCALATED notifications can only move to CANCELLED");
        }

        if ("READ".equals(currentStatus) || "CANCELLED".equals(currentStatus)) {
            throw new BadRequestException("Final notification status cannot be changed");
        }
    }

    private String normalizeEmployeeId(String employeeId) {
        if (employeeId == null || employeeId.isBlank()) {
            throw new BadRequestException("employeeId is required");
        }
        return employeeId.trim().toUpperCase(Locale.ROOT);
    }

    private String normalizeChannel(String channelCode) {
        if (channelCode == null || channelCode.isBlank()) {
            throw new BadRequestException("channelCode is required");
        }
        return channelCode.trim().toUpperCase(Locale.ROOT);
    }

    private String normalizeStatus(String statusCode) {
        if (statusCode == null || statusCode.isBlank()) {
            throw new BadRequestException("statusCode is required");
        }
        String normalized = statusCode.trim().toUpperCase(Locale.ROOT);
        if (!ALLOWED_STATUSES.contains(normalized)) {
            throw new BadRequestException("Unsupported statusCode: " + statusCode);
        }
        return normalized;
    }

    private LocalDate parseDate(String value, String fieldName) {
        try {
            return LocalDate.parse(value.trim());
        } catch (DateTimeParseException ex) {
            throw new BadRequestException("Invalid " + fieldName + ". Use yyyy-MM-dd format");
        }
    }

    private LocalDateTime parseDateTime(String value, String fieldName) {
        try {
            return LocalDateTime.parse(value.trim());
        } catch (DateTimeParseException ex) {
            throw new BadRequestException("Invalid " + fieldName + ". Use ISO local date-time format");
        }
    }

    private NotificationDtos.NotificationResponse toResponse(Notification notification) {
        return new NotificationDtos.NotificationResponse(
                notification.getNotificationId(),
                notification.getEmployeeId(),
                notification.getBooking() == null ? null : notification.getBooking().getBookingId(),
                notification.getNotificationType(),
                notification.getChannelCode(),
                notification.getMessageBody(),
                notification.getScheduledAt() == null ? null : notification.getScheduledAt().toString(),
                notification.getSentAt() == null ? null : notification.getSentAt().toString(),
                notification.getProcessedAt() == null ? null : notification.getProcessedAt().toString(),
                notification.getStatusCode(),
                notification.getRetryCount(),
                notification.getMaxRetries(),
                notification.getLastError(),
                notification.getEscalated(),
                notification.getEscalatedAt() == null ? null : notification.getEscalatedAt().toString(),
                notification.getCreatedAt() == null ? null : notification.getCreatedAt().toString()
        );
    }

    private NotificationDtos.TemplateResponse toTemplateResponse(NotificationTemplate template) {
        return new NotificationDtos.TemplateResponse(
                template.getTemplateId(),
                template.getTemplateName(),
                template.getNotificationType(),
                splitChannels(template.getChannels()),
                template.getSubject(),
                template.getMessageTemplate(),
                template.getUpdatedAt() == null ? null : template.getUpdatedAt().toString()
        );
    }

    private NotificationDtos.TriggerResponse toTriggerResponse(NotificationTrigger trigger) {
        return new NotificationDtos.TriggerResponse(
                trigger.getTriggerId(),
                trigger.getTriggerEvent(),
                trigger.getTemplate().getTemplateId(),
                trigger.getTemplate().getTemplateName(),
                trigger.getOffsetMinutes(),
                trigger.getEnabled(),
                trigger.getUpdatedAt() == null ? null : trigger.getUpdatedAt().toString()
        );
    }

    private NotificationDtos.QueueItemResponse toQueueResponse(Notification notification) {
        String employeeName = notification.getEmployee() == null ? null : notification.getEmployee().getFullName();
        return new NotificationDtos.QueueItemResponse(
                notification.getNotificationId(),
                notification.getEmployeeId(),
                employeeName,
                extractFacilityName(notification),
                notification.getChannelCode(),
                notification.getScheduledAt() == null ? null : notification.getScheduledAt().toString(),
                mapStatusForCenter(notification.getStatusCode()),
                notification.getRetryCount()
        );
    }

    private NotificationDtos.HistoryItemResponse toHistoryResponse(Notification notification) {
        String sentTime = notification.getSentAt() == null
                ? (notification.getProcessedAt() == null ? null : notification.getProcessedAt().toString())
                : notification.getSentAt().toString();

        String notificationType = notification.getNotificationType() == null ? "SYSTEM" : notification.getNotificationType();
        return new NotificationDtos.HistoryItemResponse(
                notification.getNotificationId(),
                notification.getEmployeeId(),
                notification.getEmployee() == null ? null : notification.getEmployee().getFullName(),
                extractFacilityName(notification),
                notificationType,
                notification.getChannelCode(),
                sentTime,
                notification.getSentAt() != null,
                "READ".equalsIgnoreCase(notification.getStatusCode()),
                mapStatusForCenter(notification.getStatusCode())
        );
    }

    private String extractFacilityName(Notification notification) {
        if (notification.getBooking() == null || notification.getBooking().getFacility() == null) {
            return "N/A";
        }
        return notification.getBooking().getFacility().getFacilityName();
    }

    private boolean sameDate(LocalDateTime timestamp, LocalDate date) {
        if (timestamp == null) {
            return false;
        }
        return timestamp.toLocalDate().equals(date);
    }

    private String mapStatusForCenter(String statusCode) {
        String normalized = normalizeOptional(statusCode);
        if (Set.of("SCHEDULED", "PENDING").contains(normalized)) {
            return "PENDING";
        }
        if ("RETRYING".equals(normalized)) {
            return "PROCESSING";
        }
        if (Set.of("SENT", "READ").contains(normalized)) {
            return "SENT";
        }
        return "FAILED";
    }

    private String normalizeChannels(List<String> channels) {
        if (channels == null || channels.isEmpty()) {
            throw new BadRequestException("At least one channel is required");
        }

        List<String> normalized = channels.stream()
                .filter(Objects::nonNull)
                .map(this::normalizeChannel)
                .distinct()
                .toList();

        if (normalized.isEmpty()) {
            throw new BadRequestException("At least one channel is required");
        }

        return String.join(",", normalized);
    }

    private List<String> splitChannels(String raw) {
        if (raw == null || raw.isBlank()) {
            return List.of();
        }
        return java.util.Arrays.stream(raw.split(","))
                .map(String::trim)
                .filter(value -> !value.isBlank())
                .collect(Collectors.toList());
    }

    private String applyPlaceholders(String template, Map<String, String> placeholders) {
        String resolved = template;
        if (placeholders == null || placeholders.isEmpty()) {
            return resolved;
        }
        for (Map.Entry<String, String> entry : placeholders.entrySet()) {
            String key = entry.getKey();
            if (key == null || key.isBlank()) {
                continue;
            }
            String token = "{{" + key + "}}";
            resolved = resolved.replace(token, entry.getValue() == null ? "" : entry.getValue());
        }
        return resolved;
    }

    private String normalizeOptional(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }
        return value.trim().toUpperCase(Locale.ROOT);
    }

    private String normalizeFilterValue(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String normalized = value.trim().toUpperCase(Locale.ROOT);
        if ("ALL".equals(normalized)) {
            return null;
        }
        return normalized;
    }
}
