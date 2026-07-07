package com.example.hy_backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.List;
import java.util.Map;

public final class NotificationDtos {

    private NotificationDtos() {
    }

    public record CreateNotificationRequest(
            @NotBlank String employeeId,
            Long bookingId,
            @NotBlank String notificationType,
            @NotBlank String channelCode,
            @NotBlank String messageBody
    ) {
    }

    public record CreateScheduledNotificationRequest(
            @NotBlank String employeeId,
            Long bookingId,
            @NotBlank String notificationType,
            @NotBlank String channelCode,
            @NotBlank String messageBody,
            @NotBlank String scheduledAt,
            Integer maxRetries
    ) {
    }

    public record NotificationResponse(
            Long notificationId,
            String employeeId,
            Long bookingId,
            String notificationType,
            String channelCode,
            String messageBody,
            String scheduledAt,
            String sentAt,
            String processedAt,
            String statusCode,
            Integer retryCount,
            Integer maxRetries,
            String lastError,
            Boolean escalated,
            String escalatedAt,
            String createdAt
    ) {
    }

    public record MarkNotificationRequest(@NotNull Long notificationId, @NotBlank String statusCode) {
    }

    public record NotificationListResponse(List<NotificationResponse> items) {
    }

    public record ProcessNotificationsResponse(
            int attempted,
            int sent,
            int retried,
            int escalated,
            int failed
    ) {
    }

    public record NotificationOpsSummaryResponse(
            String reportDate,
            long total,
            long pending,
            long retrying,
            long sent,
            long failed,
            long escalated
    ) {
    }

    public record TemplateResponse(
            Long templateId,
            String templateName,
            String notificationType,
            List<String> channels,
            String subject,
            String messageTemplate,
            String updatedAt
    ) {
    }

    public record TemplateUpsertRequest(
            Long templateId,
            @NotBlank String templateName,
            @NotBlank String notificationType,
            @NotNull List<@NotBlank String> channels,
            @NotBlank String subject,
            @NotBlank String messageTemplate
    ) {
    }

    public record TriggerResponse(
            Long triggerId,
            String triggerEvent,
            Long templateId,
            String templateName,
            Integer offsetMinutes,
            Boolean enabled,
            String updatedAt
    ) {
    }

    public record TriggerUpsertRequest(
            Long triggerId,
            @NotBlank String triggerEvent,
            @NotNull Long templateId,
            @NotNull Integer offsetMinutes,
            @NotNull Boolean enabled
    ) {
    }

    public record QueueItemResponse(
            Long notificationId,
            String employeeId,
            String employeeName,
            String facilityName,
            String channel,
            String scheduledTime,
            String status,
            Integer retryCount
    ) {
    }

    public record HistoryItemResponse(
            Long notificationId,
            String employeeId,
            String employeeName,
            String facilityName,
            String templateName,
            String channel,
            String sentTime,
            Boolean opened,
            Boolean read,
            String status
    ) {
    }

    public record HistoryResponse(
            List<HistoryItemResponse> items,
            long total,
            int page,
            int pageSize
    ) {
    }

    public record TestNotificationRequest(
            @NotNull Long templateId,
            @NotBlank String employeeId,
            @NotNull List<@NotBlank String> channels,
            Map<String, String> placeholders
    ) {
    }

    public record TestNotificationResponse(
            Boolean success,
            String message,
            Preview preview
    ) {
        public record Preview(String subject, String body, List<String> channels) {
        }
    }

    public record BroadcastNotificationRequest(
            @NotBlank String notificationType,
            @NotNull List<@NotBlank String> channels,
            @NotBlank String subject,
            @NotBlank String messageBody,
            List<String> employeeIds,
            String location,
            String workMode,
            String preference,
            Boolean activeOnly,
            Boolean dryRun
    ) {
    }

    public record BroadcastNotificationResponse(
            int matchedEmployees,
            int notificationsCreated,
            List<String> sampleEmployeeIds,
            String message
    ) {
    }
}
