export interface AdminBookingSearchItem {
  bookingId: number;
  facilityId: number;
  facilityName: string;
  employeeId: string;
  status: string;
  bookingDate: string;
  createdAt: string;
  cancelledAt: string | null;
  qrCode: string | null;
}

export interface BookingSummaryResponse {
  facilityId: number;
  bookingDate: string;
  totalBookings: number;
  confirmedBookings: number;
  cancelledBookings: number;
}

export interface OperationalSummaryResponse {
  bookingDate: string;
  totalBookings: number;
  confirmedBookings: number;
  cancelledBookings: number;
  cancellationRate: number;
  totalFacilities: number;
  publishedFacilities: number;
}

export interface FacilityUtilizationResponse {
  facilityId: number;
  facilityName: string;
  bookingDate: string;
  maximumCapacity: number | null;
  confirmedBookings: number;
  cancelledBookings: number;
  utilizationPercent: number;
}

export interface TrendPoint {
  bookingDate: string;
  confirmedBookings: number;
  cancelledBookings: number;
  totalBookings: number;
}

export interface BookingTrendResponse {
  fromDate: string;
  toDate: string;
  facilityId: number | null;
  points: TrendPoint[];
}

export interface ProcessNotificationsResponse {
  attempted: number;
  sent: number;
  retried: number;
  escalated: number;
  failed: number;
}

export interface NotificationOpsSummaryResponse {
  reportDate: string;
  total: number;
  pending: number;
  retrying: number;
  sent: number;
  failed: number;
  escalated: number;
}

export type NotificationTemplateType =
  | 'BOOKING_CONFIRMATION'
  | 'BOOKING_REMINDER'
  | 'FACILITY_PUBLISHED'
  | 'BOOKING_CANCELLED'
  | 'APPROVAL'
  | 'REJECTION'
  | 'SYSTEM_ANNOUNCEMENT';

export type NotificationChannel = 'IN_APP' | 'EMAIL' | 'SMS' | 'PUSH';

export interface NotificationTemplate {
  templateId: number;
  templateName: string;
  notificationType: NotificationTemplateType;
  channels: NotificationChannel[];
  subject: string;
  messageTemplate: string;
  updatedAt?: string;
}

export interface NotificationTemplateUpsertRequest {
  templateId?: number;
  templateName: string;
  notificationType: NotificationTemplateType;
  channels: NotificationChannel[];
  subject: string;
  messageTemplate: string;
}

export type TriggerEvent =
  | 'BOOKING_CREATED'
  | 'BOOKING_CANCELLED'
  | 'BOOKING_DEADLINE'
  | 'FACILITY_PUBLISHED'
  | 'APPROVAL'
  | 'REJECTION'
  | 'EMPLOYEE_REGISTERED';

export interface NotificationTrigger {
  triggerId: number;
  triggerEvent: TriggerEvent;
  templateId: number;
  templateName: string;
  offsetMinutes: number;
  enabled: boolean;
  updatedAt?: string;
}

export interface NotificationTriggerUpsertRequest {
  triggerId?: number;
  triggerEvent: TriggerEvent;
  templateId: number;
  offsetMinutes: number;
  enabled: boolean;
}

export type NotificationDeliveryStatus = 'PENDING' | 'PROCESSING' | 'SENT' | 'FAILED';

export interface NotificationQueueItem {
  notificationId: number;
  employeeId: string;
  employeeName?: string;
  facilityName: string;
  channel: NotificationChannel;
  scheduledTime: string;
  status: NotificationDeliveryStatus;
  retryCount: number;
  templateName?: string;
}

export interface NotificationHistoryItem {
  notificationId: number;
  employeeId: string;
  employeeName?: string;
  facilityName: string;
  templateName: string;
  channel: NotificationChannel;
  sentTime: string;
  opened: boolean;
  read: boolean;
  status: NotificationDeliveryStatus;
}

export interface NotificationHistoryResponse {
  items: NotificationHistoryItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface TestNotificationRequest {
  templateId: number;
  employeeId: string;
  channels: NotificationChannel[];
  placeholders?: Record<string, string>;
}

export interface TestNotificationResponse {
  success: boolean;
  message: string;
  preview?: {
    subject?: string;
    body?: string;
    channels?: NotificationChannel[];
  };
}

export interface BroadcastNotificationRequest {
  notificationType: string;
  channels: NotificationChannel[];
  subject: string;
  messageBody: string;
  employeeIds?: string[];
  location?: string | null;
  workMode?: string | null;
  preference?: string | null;
  activeOnly?: boolean;
  dryRun?: boolean;
}

export interface BroadcastNotificationResponse {
  matchedEmployees: number;
  notificationsCreated: number;
  sampleEmployeeIds: string[];
  message: string;
}
