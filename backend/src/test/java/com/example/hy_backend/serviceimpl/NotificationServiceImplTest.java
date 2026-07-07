package com.example.hy_backend.serviceimpl;

import com.example.hy_backend.dto.NotificationDtos;
import com.example.hy_backend.model.Notification;
import com.example.hy_backend.repository.BookingRepository;
import com.example.hy_backend.repository.EmployeeRepository;
import com.example.hy_backend.repository.NotificationRepository;
import com.example.hy_backend.repository.NotificationTemplateRepository;
import com.example.hy_backend.repository.NotificationTriggerRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NotificationServiceImplTest {

    @Mock
    private NotificationRepository notificationRepository;

    @Mock
    private BookingRepository bookingRepository;

    @Mock
    private EmployeeRepository employeeRepository;

    @Mock
    private NotificationTemplateRepository notificationTemplateRepository;

    @Mock
    private NotificationTriggerRepository notificationTriggerRepository;

    private NotificationServiceImpl notificationService;

    @BeforeEach
    void setUp() {
        notificationService = new NotificationServiceImpl(
                notificationRepository,
                bookingRepository,
                employeeRepository,
                notificationTemplateRepository,
                notificationTriggerRepository
        );
    }

    @Test
    void scheduleNotification_shouldPersistScheduledStateAndRetries() {
        NotificationDtos.CreateScheduledNotificationRequest request = new NotificationDtos.CreateScheduledNotificationRequest(
                "emp001",
                null,
                "BOOKING_REMINDER",
                "email",
                "Reminder body",
                "2026-07-10T09:00:00",
                4
        );

        when(notificationRepository.save(any(Notification.class))).thenAnswer(invocation -> {
            Notification notification = invocation.getArgument(0);
            notification.setNotificationId(100L);
            return notification;
        });

        NotificationDtos.NotificationResponse response = notificationService.scheduleNotification(request);

        assertEquals(100L, response.notificationId());
        assertEquals("SCHEDULED", response.statusCode());
        assertEquals(4, response.maxRetries());
        assertEquals(0, response.retryCount());
        assertNotNull(response.scheduledAt());
    }

    @Test
    void processPendingNotifications_shouldEscalateOnUnsupportedChannelWhenRetriesExhausted() {
        Notification notification = new Notification();
        notification.setNotificationId(200L);
        notification.setEmployeeId("EMP001");
        notification.setNotificationType("BOOKING_REMINDER");
        notification.setChannelCode("FAX");
        notification.setMessageBody("message");
        notification.setStatusCode("PENDING");
        notification.setScheduledAt(LocalDateTime.now().minusMinutes(1));
        notification.setRetryCount(0);
        notification.setMaxRetries(1);
        notification.setEscalated(false);
        notification.setCreatedAt(LocalDateTime.now().minusMinutes(2));

        when(notificationRepository.findByStatusCodeInAndScheduledAtLessThanEqualOrderByScheduledAtAsc(
                eq(List.of("SCHEDULED", "PENDING", "RETRYING")),
                any(LocalDateTime.class),
                any(Pageable.class)
        )).thenReturn(List.of(notification));

        when(notificationRepository.save(any(Notification.class))).thenAnswer(invocation -> invocation.getArgument(0));

        NotificationDtos.ProcessNotificationsResponse result = notificationService.processPendingNotifications(50);

        assertEquals(1, result.attempted());
        assertEquals(0, result.sent());
        assertEquals(0, result.retried());
        assertEquals(1, result.escalated());
        assertEquals(0, result.failed());

        ArgumentCaptor<Notification> captor = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository).save(captor.capture());
        Notification saved = captor.getValue();
        assertEquals("ESCALATED", saved.getStatusCode());
        assertTrue(Boolean.TRUE.equals(saved.getEscalated()));
    }
}
