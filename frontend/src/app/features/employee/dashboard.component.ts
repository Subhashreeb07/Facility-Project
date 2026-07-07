import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, interval } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DashboardFacility, EmployeeNotificationItem } from '../../core/models/employee-flow.models';
import { AuthApiService } from '../../core/services/auth-api.service';
import { EmployeeApiService } from '../../core/services/employee-api.service';
import { SessionService } from '../../core/services/session.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-employee-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="mx-auto w-full max-w-[1220px] px-4 py-5 md:px-6 md:py-8" *ngIf="facilities(); else loadingState">
      <header class="rounded-2xl bg-white p-5 shadow-sm md:p-6">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.12em] text-[#9a562d]">Specification-Driven Platform</p>
            <h2 class="mt-1 text-2xl font-bold text-[#111827] md:text-3xl">Available Facilities</h2>
            <p class="mt-1 text-sm text-slate-600">Every card is loaded from published backend facility specifications.</p>
          </div>
          <div class="flex items-center gap-2 text-sm">
            <button class="relative rounded-lg bg-[#f4f1ee] px-3 py-2 font-semibold text-[#374151]" (click)="toggleNotifications()">
              Notifications
              <span *ngIf="unreadNotifications() > 0" class="ml-1 rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-bold text-white">{{ unreadNotifications() }}</span>
            </button>
            <button class="rounded-lg bg-[#f4f1ee] px-3 py-2 font-semibold text-[#374151]" (click)="goHistory()">Bookings</button>
            <button class="rounded-lg bg-[#f4f1ee] px-3 py-2 font-semibold text-[#374151]" (click)="goInvitations()">Invitations</button>
            <button class="rounded-lg bg-[#f4f1ee] px-3 py-2 font-semibold text-[#374151]" (click)="goProfile()">Profile</button>
            <button class="rounded-lg bg-[#9a562d] px-3 py-2 font-semibold text-white" (click)="logout()">Logout</button>
          </div>
        </div>

        <div class="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3" *ngIf="showNotificationPopup()">
          <div class="mb-2 flex items-center justify-between">
            <p class="text-sm font-semibold text-slate-900">Recent Notifications</p>
            <button class="text-xs font-semibold text-brand-700 hover:text-brand-900" (click)="closeNotifications()">Close</button>
          </div>
          <div class="grid gap-2" *ngIf="notifications().length > 0; else noPopupNotifications">
            <article *ngFor="let item of popupNotifications()" class="rounded-lg border border-slate-200 bg-white px-3 py-2">
              <p class="text-xs font-semibold text-slate-500">{{ item.notificationType }} · {{ item.channelCode }}</p>
              <p class="mt-1 text-sm text-slate-800">{{ extractMessage(item.messageBody) }}</p>
              <div class="mt-2 flex items-center justify-between text-xs text-slate-500">
                <span>{{ readableDate(item.sentAt || item.createdAt) }}</span>
                <button *ngIf="item.statusCode !== 'READ'" class="font-semibold text-brand-700 hover:text-brand-900" (click)="markAsRead(item)">Mark Read</button>
              </div>
            </article>
          </div>
          <ng-template #noPopupNotifications>
            <p class="text-sm text-slate-500">No notifications yet.</p>
          </ng-template>
        </div>
      </header>

      <div class="mt-5 rounded-2xl bg-white p-5 shadow-sm md:p-6">
        <div *ngIf="facilities()!.length > 0; else emptyState" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <article
            *ngFor="let facility of facilities()"
            class="cursor-pointer rounded-xl border border-slate-200 bg-[#faf8f6] p-4 transition hover:border-[#d8c1b1] hover:bg-[#f4efea]"
            (click)="openFacility(facility)"
          >
            <div class="flex items-center justify-between">
              <span class="rounded-lg bg-white px-2 py-1 text-lg shadow-sm">{{ iconEmoji(facility.icon) }}</span>
              <span class="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-semibold text-emerald-700">PUBLISHED</span>
            </div>
            <p class="mt-4 text-xs uppercase tracking-[0.1em] text-[#6b7280]">Facility</p>
            <p class="text-lg font-semibold text-[#111827]">{{ facility.facilityName }}</p>
            <p class="mt-2 text-xs text-[#6b7280]">Specification-loaded dynamic form</p>
          </article>
        </div>

        <ng-template #emptyState>
          <div class="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
            No published facilities available. Ask an administrator to publish at least one facility configuration.
          </div>
        </ng-template>
      </div>

      <div class="mt-5 rounded-2xl bg-white p-5 shadow-sm md:p-6">
        <div class="mb-3 flex items-center justify-between">
          <h3 class="text-xl font-bold text-slate-900">Notification Section</h3>
          <button class="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50" (click)="loadNotifications(true)">Refresh</button>
        </div>

        <div class="grid gap-2" *ngIf="notifications().length > 0; else emptyNotifications">
          <article
            *ngFor="let item of notifications()"
            class="rounded-xl border p-3"
            [ngClass]="item.statusCode === 'READ' ? 'border-slate-200 bg-slate-50' : 'border-amber-200 bg-amber-50/50'"
          >
            <div class="flex flex-wrap items-center justify-between gap-2">
              <p class="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                {{ item.notificationType }} · {{ item.channelCode }}
              </p>
              <span class="rounded-full px-2 py-1 text-[10px] font-bold" [ngClass]="item.statusCode === 'READ' ? 'bg-slate-200 text-slate-700' : 'bg-emerald-100 text-emerald-700'">
                {{ item.statusCode === 'READ' ? 'READ' : 'NEW' }}
              </span>
            </div>
            <p class="mt-1 text-sm text-slate-800">{{ extractMessage(item.messageBody) }}</p>
            <div class="mt-2 flex items-center justify-between text-xs text-slate-500">
              <span>{{ readableDate(item.sentAt || item.createdAt) }}</span>
              <button *ngIf="item.statusCode !== 'READ'" class="font-semibold text-brand-700 hover:text-brand-900" (click)="markAsRead(item)">Mark Read</button>
            </div>
          </article>
        </div>

        <ng-template #emptyNotifications>
          <div class="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
            No notifications available yet.
          </div>
        </ng-template>
      </div>
    </section>

    <ng-template #loadingState>
      <section class="mx-auto w-full max-w-[1220px] rounded-2xl bg-white px-6 py-8 text-[#4b5563] shadow-sm">Loading published facilities...</section>
    </ng-template>
  `
})
export class DashboardComponent implements OnInit, OnDestroy {
  readonly facilities = signal<DashboardFacility[] | null>(null);
  readonly notifications = signal<EmployeeNotificationItem[]>([]);
  readonly unreadNotifications = signal(0);
  readonly showNotificationPopup = signal(false);
  readonly popupNotifications = signal<EmployeeNotificationItem[]>([]);
  private readonly destroy$ = new Subject<void>();
  private isLoading = false;
  private shownPopupNotificationIds = new Set<number>();

  constructor(
    private readonly authApi: AuthApiService,
    private readonly employeeApi: EmployeeApiService,
    private readonly sessionService: SessionService,
    private readonly toastService: ToastService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    if (!this.sessionService.getEmployeeId()) {
      this.router.navigateByUrl('/login');
      return;
    }

    this.loadFacilities();
    this.loadNotifications();

    interval(5000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.loadFacilities(true);
        this.loadNotifications(true);
      });

    window.addEventListener('focus', this.handleWindowFocus);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    window.removeEventListener('focus', this.handleWindowFocus);
  }

  private readonly handleWindowFocus = (): void => {
    this.loadFacilities(true);
    this.loadNotifications(true);
  };

  private loadFacilities(silent = false): void {
    if (this.isLoading) {
      return;
    }

    const employeeId = this.sessionService.getEmployeeId();
    if (!employeeId) {
      this.facilities.set([]);
      return;
    }

    this.isLoading = true;
    this.employeeApi.getDashboardFacilities(employeeId).subscribe({
      next: (facilities) => {
        this.facilities.set(facilities);
        this.isLoading = false;
      },
      error: (err) => {
        const status = err?.status ? ` (${err.status})` : '';
        if (!silent) {
          this.toastService.show(`Unable to load dashboard facilities${status}`, 'error');
        }
        this.facilities.set([]);
        this.isLoading = false;
      }
    });
  }

  openFacility(facility: DashboardFacility): void {
    this.router.navigate(['/employee/facility', facility.facilityId, 'book']);
  }

  toggleNotifications(): void {
    this.showNotificationPopup.update((state) => !state);
    this.popupNotifications.set(this.notifications().slice(0, 5));
  }

  closeNotifications(): void {
    this.showNotificationPopup.set(false);
  }

  extractMessage(raw: string): string {
    if (!raw) {
      return '';
    }
    return raw.replace(/^Subject:\s*.*\n/i, '').trim();
  }

  readableDate(value?: string | null): string {
    if (!value) {
      return 'Just now';
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
  }

  markAsRead(item: EmployeeNotificationItem): void {
    if (item.statusCode === 'READ') {
      return;
    }

    this.employeeApi.markNotificationRead(item.notificationId).subscribe({
      next: () => {
        this.notifications.update((items) =>
          items.map((entry) =>
            entry.notificationId === item.notificationId
              ? { ...entry, statusCode: 'READ' }
              : entry
          )
        );
        this.popupNotifications.set(this.notifications().slice(0, 5));
        this.unreadNotifications.set(this.notifications().filter((entry) => entry.statusCode !== 'READ').length);
      },
      error: () => this.toastService.show('Failed to update notification status', 'error')
    });
  }

  loadNotifications(silent = false): void {
    const employeeId = this.sessionService.getEmployeeId();
    if (!employeeId) {
      this.notifications.set([]);
      this.unreadNotifications.set(0);
      return;
    }

    this.employeeApi.getEmployeeNotifications(employeeId).subscribe({
      next: (response) => {
        const sorted = (response.items ?? []).sort((a, b) => {
          const left = new Date(b.sentAt || b.createdAt || '').getTime();
          const right = new Date(a.sentAt || a.createdAt || '').getTime();
          return left - right;
        });

        this.notifications.set(sorted);
        this.popupNotifications.set(sorted.slice(0, 5));

        const unread = sorted.filter((item) => item.statusCode !== 'READ').length;
        this.unreadNotifications.set(unread);

        const latestUnread = sorted.find((item) => item.statusCode !== 'READ');
        if (latestUnread && !this.shownPopupNotificationIds.has(latestUnread.notificationId)) {
          this.shownPopupNotificationIds.add(latestUnread.notificationId);
          this.showNotificationPopup.set(true);
          if (!silent) {
            this.toastService.show('New notification received', 'info');
          }
        }
      },
      error: () => {
        if (!silent) {
          this.toastService.show('Unable to load notifications', 'error');
        }
      }
    });
  }

  iconEmoji(icon: string): string {
    const value = icon.toLowerCase();
    if (value.includes('utensils')) {
      return '🍴';
    }
    if (value.includes('bus')) {
      return '🚌';
    }
    if (value.includes('parking') || value.includes('car')) {
      return '🚗';
    }
    if (value.includes('calendar')) {
      return '📅';
    }
    if (value.includes('badge') || value.includes('visitor')) {
      return '🪪';
    }
    return '🏢';
  }

  goHistory(): void {
    this.router.navigateByUrl('/employee/history');
  }

  goProfile(): void {
    this.router.navigateByUrl('/employee/profile');
  }

  goInvitations(): void {
    this.router.navigateByUrl('/employee/invitations');
  }

  logout(): void {
    const token = this.sessionService.getToken();
    if (!token) {
      this.sessionService.clear();
      this.router.navigateByUrl('/login');
      return;
    }

    this.authApi.logout(token).subscribe({
      next: () => {
        this.sessionService.clear();
        this.toastService.show('Logged out successfully', 'success');
        this.router.navigateByUrl('/login');
      },
      error: () => {
        this.sessionService.clear();
        this.router.navigateByUrl('/login');
      }
    });
  }
}
