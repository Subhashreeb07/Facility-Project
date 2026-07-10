export interface LoginRequest {
  employeeId: string;
  password: string;
}

export interface RegisterRequest {
  employeeId: string;
  name: string;
  email: string;
  password: string;
  department?: string;
  officeLocation?: string;
}

export interface LoginResponse {
  token: string;
  employeeId: string;
  name: string;
  email: string;
  role: string;
}

export interface CurrentUserResponse {
  employeeId: string;
  name: string;
  email: string;
  role: string;
}

export interface DashboardFacility {
  facilityId: number;
  facilityName: string;
  icon?: string;
}

export interface DateChip {
  day: string;
  date: number;
  fullDate: string;
  selected: boolean;
}

export interface QuickSetup {
  title: string;
  description: string;
  targetFacilityId?: number | null;
}

export interface HomeServiceCard {
  facilityId: number;
  title: string;
  subtitle: string;
  icon: string;
  bookingStatus: string;
  badge?: string | null;
}

export interface OfficeSummary {
  officeName: string;
  availableDeskPercent: number;
}

export interface EmployeeHomeResponse {
  employeeId: string;
  employeeName: string;
  dayLabel: string;
  dates: DateChip[];
  quickSetup: QuickSetup;
  services: HomeServiceCard[];
  officeSummary: OfficeSummary;
}

export interface EmployeeProfileResponse {
  employeeId: string;
  employeeName: string;
  email: string;
  department: string;
  location: string;
  totalBookings: number;
  activeBookings: number;
}

export interface InvitationItem {
  invitationId: string;
  title: string;
  schedule: string;
  status: string;
  location: string;
}

export interface InvitationsResponse {
  employeeId: string;
  pendingCount: number;
  invitations: InvitationItem[];
}

export interface FacilitySpecificationResponse {
  facilityId: number;
  facilityName: string;
  fields: SpecificationField[];
  rules: SpecificationRule;
}

export interface EmployeeNotificationItem {
  notificationId: number;
  employeeId: string;
  bookingId?: number | null;
  notificationType: string;
  channelCode: string;
  messageBody: string;
  scheduledAt?: string | null;
  sentAt?: string | null;
  processedAt?: string | null;
  statusCode: string;
  createdAt?: string | null;
}

export interface EmployeeNotificationListResponse {
  items: EmployeeNotificationItem[];
}

export interface SpecificationField {
  fieldId: number;
  label: string;
  type: string;
  required: boolean;
  placeholder?: string | null;
  validationJson?: string | null;
  defaultValue?: string | null;
  options: string[];
}

export interface SpecificationRule {
  bookingDeadline?: string | null;
  reminderTime?: string | null;
  qrRequired?: boolean;
  allowCancellation?: boolean;
  regularCommuteEnabled?: boolean;
}

export interface SubmitBookingRequest {
  facilityId: number;
  employeeId: string;
  bookingDate?: string;
  responses: BookingFieldInput[];
}

export interface BookingFieldInput {
  fieldId: number;
  value: string;
}

export interface SubmitBookingResponse {
  bookingId: number;
  status: string;
  bookingDate?: string;
  createdAt?: string;
  idempotentReplay?: boolean;
  message?: string;
}

export interface BookingHistoryItem {
  bookingId: number;
  facility: string;
  status: string;
  bookingDate: string;
}

export interface BookingAnswer {
  fieldId: number;
  label: string;
  value: string;
}

export interface BookingDetail {
  bookingId: number;
  facilityId: number;
  facilityName: string;
  employeeId: string;
  status: string;
  bookingDate: string;
  createdAt: string;
  qrCode?: string | null;
  responses: BookingAnswer[];
}

export interface MessageResponse {
  message: string;
}
