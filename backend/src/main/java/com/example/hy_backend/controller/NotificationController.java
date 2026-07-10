package com.example.hy_backend.controller;

import com.example.hy_backend.dto.NotificationDtos;
import com.example.hy_backend.service.NotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/notifications")
@Tag(name = "Notifications", description = "Notification APIs for employee and admin flows")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @PostMapping
        @Operation(
            summary = "Create notification",
            responses = {
                @ApiResponse(responseCode = "200", description = "Notification created"),
                @ApiResponse(responseCode = "400", description = "Invalid notification payload")
            }
        )
    public ResponseEntity<NotificationDtos.NotificationResponse> createNotification(
            @Valid @RequestBody NotificationDtos.CreateNotificationRequest request
    ) {
        return ResponseEntity.ok(notificationService.createNotification(request));
    }

    @PostMapping("/scheduled")
    @Operation(summary = "Schedule a notification for later delivery")
    public ResponseEntity<NotificationDtos.NotificationResponse> scheduleNotification(
            @Valid @RequestBody NotificationDtos.CreateScheduledNotificationRequest request
    ) {
        return ResponseEntity.ok(notificationService.scheduleNotification(request));
    }

    @GetMapping("/employee/{employeeId}")
    @Operation(summary = "Get notifications for an employee")
    public ResponseEntity<NotificationDtos.NotificationListResponse> getEmployeeNotifications(
            @PathVariable String employeeId,
            @RequestParam(required = false) String statusCode
    ) {
        return ResponseEntity.ok(notificationService.getEmployeeNotifications(employeeId, statusCode));
    }

    @PostMapping("/process")
    @Operation(summary = "Process pending and retrying notifications")
    public ResponseEntity<NotificationDtos.ProcessNotificationsResponse> processNotifications(
            @RequestParam(required = false) Integer batchSize
    ) {
        return ResponseEntity.ok(notificationService.processPendingNotifications(batchSize));
    }

    @GetMapping("/templates")
    @Operation(summary = "Get notification templates")
    public ResponseEntity<java.util.List<NotificationDtos.TemplateResponse>> getTemplates() {
        return ResponseEntity.ok(notificationService.getTemplates());
    }

    @PostMapping("/templates")
    @Operation(summary = "Create or update notification template")
    public ResponseEntity<NotificationDtos.TemplateResponse> saveTemplate(
            @Valid @RequestBody NotificationDtos.TemplateUpsertRequest request
    ) {
        return ResponseEntity.ok(notificationService.saveTemplate(request));
    }

    @DeleteMapping("/templates/{templateId}")
    @Operation(summary = "Delete notification template")
    public ResponseEntity<Void> deleteTemplate(@PathVariable Long templateId) {
        notificationService.deleteTemplate(templateId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/triggers")
    @Operation(summary = "Get notification triggers")
    public ResponseEntity<java.util.List<NotificationDtos.TriggerResponse>> getTriggers() {
        return ResponseEntity.ok(notificationService.getTriggers());
    }

    @PostMapping("/triggers")
    @Operation(summary = "Create or update notification trigger")
    public ResponseEntity<NotificationDtos.TriggerResponse> saveTrigger(
            @Valid @RequestBody NotificationDtos.TriggerUpsertRequest request
    ) {
        return ResponseEntity.ok(notificationService.saveTrigger(request));
    }

    @DeleteMapping("/triggers/{triggerId}")
    @Operation(summary = "Delete notification trigger")
    public ResponseEntity<Void> deleteTrigger(@PathVariable Long triggerId) {
        notificationService.deleteTrigger(triggerId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/queue")
    @Operation(summary = "Get notification queue")
    public ResponseEntity<java.util.List<NotificationDtos.QueueItemResponse>> getQueue(
            @RequestParam(required = false) String facility,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String channel,
            @RequestParam(required = false) String date
    ) {
        return ResponseEntity.ok(notificationService.getQueue(facility, status, channel, date));
    }

    @GetMapping("/history")
    @Operation(summary = "Get notification history")
    public ResponseEntity<NotificationDtos.HistoryResponse> getHistory(
            @RequestParam(required = false) String query,
            @RequestParam(required = false) String facility,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String channel,
            @RequestParam(required = false) String date,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer pageSize
    ) {
        return ResponseEntity.ok(notificationService.getHistory(query, facility, status, channel, date, page, pageSize));
    }

    @PostMapping("/test")
    @Operation(summary = "Test notification template rendering")
    public ResponseEntity<NotificationDtos.TestNotificationResponse> testNotification(
            @Valid @RequestBody NotificationDtos.TestNotificationRequest request
    ) {
        return ResponseEntity.ok(notificationService.testNotification(request));
    }

    @PostMapping("/broadcast")
    @Operation(summary = "Send or preview a filtered notification broadcast")
    public ResponseEntity<NotificationDtos.BroadcastNotificationResponse> broadcastNotification(
            @Valid @RequestBody NotificationDtos.BroadcastNotificationRequest request
    ) {
        return ResponseEntity.ok(notificationService.broadcastNotification(request));
    }

    @GetMapping("/ops/summary")
    @Operation(summary = "Get notification operational summary by date")
    public ResponseEntity<NotificationDtos.NotificationOpsSummaryResponse> getOperationalSummary(
            @RequestParam(required = false) String reportDate
    ) {
        return ResponseEntity.ok(notificationService.getOperationalSummary(reportDate));
    }

    @PatchMapping("/{notificationId}/status")
        @Operation(
            summary = "Update notification status",
            responses = {
                @ApiResponse(responseCode = "200", description = "Notification status updated"),
                @ApiResponse(responseCode = "404", description = "Notification not found")
            }
        )
    public ResponseEntity<NotificationDtos.NotificationResponse> markStatus(
            @PathVariable Long notificationId,
            @Valid @RequestBody NotificationStatusRequest request
    ) {
        return ResponseEntity.ok(notificationService.markNotificationStatus(
                new NotificationDtos.MarkNotificationRequest(notificationId, request.statusCode())
        ));
    }

    @PostMapping("/{notificationId}/read")
    @Operation(summary = "Mark notification as read")
    public ResponseEntity<NotificationDtos.NotificationResponse> markRead(@PathVariable Long notificationId) {
        return ResponseEntity.ok(notificationService.markNotificationStatus(
                new NotificationDtos.MarkNotificationRequest(notificationId, "READ")
        ));
    }

    public record NotificationStatusRequest(@NotBlank String statusCode) {
    }
}
