package com.example.hy_backend.service;

import com.example.hy_backend.dto.NotificationDtos;

import java.util.List;

public interface NotificationService {
    NotificationDtos.NotificationResponse createNotification(NotificationDtos.CreateNotificationRequest request);

    NotificationDtos.NotificationResponse scheduleNotification(NotificationDtos.CreateScheduledNotificationRequest request);

    NotificationDtos.NotificationListResponse getEmployeeNotifications(String employeeId, String statusCode);

    NotificationDtos.NotificationResponse markNotificationStatus(NotificationDtos.MarkNotificationRequest request);

    NotificationDtos.ProcessNotificationsResponse processPendingNotifications(Integer batchSize);

    NotificationDtos.NotificationOpsSummaryResponse getOperationalSummary(String reportDate);

    List<NotificationDtos.TemplateResponse> getTemplates();

    NotificationDtos.TemplateResponse saveTemplate(NotificationDtos.TemplateUpsertRequest request);

    void deleteTemplate(Long templateId);

    List<NotificationDtos.TriggerResponse> getTriggers();

    NotificationDtos.TriggerResponse saveTrigger(NotificationDtos.TriggerUpsertRequest request);

    void deleteTrigger(Long triggerId);

    List<NotificationDtos.QueueItemResponse> getQueue(String facility, String status, String channel, String date);

    NotificationDtos.HistoryResponse getHistory(String query, String facility, String status, String channel, String date, Integer page, Integer pageSize);

    NotificationDtos.TestNotificationResponse testNotification(NotificationDtos.TestNotificationRequest request);

    NotificationDtos.BroadcastNotificationResponse broadcastNotification(NotificationDtos.BroadcastNotificationRequest request);
}
