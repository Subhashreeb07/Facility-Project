import { Routes } from '@angular/router';
import { adminGuard } from './core/admin.guard';
import { authGuard } from './core/auth.guard';
import { employeeGuard } from './core/employee.guard';
import { AdminPortalShellComponent } from './features/admin/admin-portal-shell.component';
import { AdminDashboardPageComponent } from './features/admin/pages/admin-dashboard-page.component';
import { AdminFacilitiesPageComponent } from './features/admin/pages/admin-facilities-page.component';
import { AdminFormBuilderPageComponent } from './features/admin/pages/admin-form-builder-page.component';
import { AdminNotificationsPageComponent } from './features/admin/pages/admin-notifications-page.component';
import { AdminReportsPageComponent } from './features/admin/pages/admin-reports-page.component';
import { AdminRulesPageComponent } from './features/admin/pages/admin-rules-page.component';
import { BookingDetailComponent } from './features/employee/booking-detail.component';
import { BookingHistoryComponent } from './features/employee/booking-history.component';
import { DashboardComponent } from './features/employee/dashboard.component';
import { EmployeeNotificationsComponent } from './features/employee/employee-notifications.component';
import { EmployeePortalShellComponent } from './features/employee/employee-portal-shell.component';
import { FacilityBookingComponent } from './features/employee/facility-booking.component';
import { LandingRedirectComponent } from './features/employee/landing-redirect.component';
import { LoginComponent } from './features/employee/login.component';
import { ProfileComponent } from './features/employee/profile.component';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    component: LandingRedirectComponent
  },
  {
    path: 'login',
    component: LoginComponent
  },
  {
    path: 'admin',
    canActivate: [authGuard, adminGuard],
    component: AdminPortalShellComponent,
    children: [
      {
        path: 'dashboard',
        component: AdminDashboardPageComponent
      },
      {
        path: 'facilities',
        component: AdminFacilitiesPageComponent
      },
      {
        path: 'form-builder',
        component: AdminFormBuilderPageComponent
      },
      {
        path: 'rules',
        component: AdminRulesPageComponent
      },
      {
        path: 'reports',
        component: AdminReportsPageComponent
      },
      {
        path: 'notifications',
        component: AdminNotificationsPageComponent
      },
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard'
      }
    ]
  },
  {
    path: 'employee',
    canActivate: [authGuard, employeeGuard],
    component: EmployeePortalShellComponent,
    children: [
      {
        path: 'dashboard',
        component: DashboardComponent
      },
      {
        path: 'notifications',
        component: EmployeeNotificationsComponent
      },
      {
        path: 'facility/:facilityId/book',
        component: FacilityBookingComponent
      },
      {
        path: 'history',
        component: BookingHistoryComponent
      },
      {
        path: 'profile',
        component: ProfileComponent
      },
      {
        path: 'bookings/:bookingId',
        component: BookingDetailComponent
      },
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard'
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'login'
  }
];
