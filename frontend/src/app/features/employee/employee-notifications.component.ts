import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subject, forkJoin, interval, of } from 'rxjs';
import { catchError, map, takeUntil } from 'rxjs/operators';
import { EmployeeNotificationItem } from '../../core/models/employee-flow.models';
import { EmployeeApiService } from '../../core/services/employee-api.service';
import { SessionService } from '../../core/services/session.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-employee-notifications',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="mx-auto w-full max-w-[1100px] space-y-5">
      <header class="portal-panel px-6 py-5">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.16em] text-[#0f6cbd]">Employee Communication Center</p>
            <h2 class="mt-1 text-3xl font-bold text-slate-900">Notifications</h2>
            <p class="mt-1 text-sm text-slate-600">Review and manage your recent updates from facilities and bookings.</p>
          </div>
          <div class="flex items-center gap-2">
            <button class="satori-secondary" (click)="loadNotifications()">Refresh</button>
            <button class="satori-primary" (click)="markAllAsRead()">Mark all unread as read</button>
          </div>
        </div>
      </header>

      <section class="portal-panel p-5">
        <div class="mb-4 grid gap-4 sm:grid-cols-3">
          <article class="rounded-2xl border border-slate-200 bg-white p-4">
            <p class="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Total</p>
            <p class="mt-2 text-3xl font-semibold text-slate-900">{{ notifications().length }}</p>
          </article>
          <article class="rounded-2xl border border-slate-200 bg-white p-4">
            <p class="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Unread</p>
            <p class="mt-2 text-3xl font-semibold text-slate-900">{{ unreadCount() }}</p>
          </article>
          <article class="rounded-2xl border border-slate-200 bg-white p-4">
            <p class="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Last Sync</p>
            <p class="mt-2 text-3xl font-semibold text-slate-900">{{ lastSyncedAt() ? (lastSyncedAt() | date: 'shortTime') : '--' }}</p>
          </article>
        </div>

        <div *ngIf="notifications().length > 0; else emptyState" class="grid gap-3">
          <article
            *ngFor="let item of notifications()"
            class="rounded-2xl border p-4"
            [ngClass]="isUnread(item) ? 'border-[#d8e6f7] bg-[#f7fbff]' : 'border-slate-200 bg-white'"
          >
            <div class="flex flex-wrap items-center justify-between gap-2">
              <p class="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                {{ item.notificationType }} · {{ item.channelCode }}
              </p>
              <span
                class="rounded-full px-2 py-1 text-[10px] font-bold"
                [ngClass]="isUnread(item) ? 'bg-[#dff6ef] text-[#117a65]' : 'bg-slate-200 text-slate-700'"
              >
                {{ (item.statusCode || 'UNKNOWN').toUpperCase() }}
              </span>
            </div>

            <p class="mt-2 text-sm text-slate-800">{{ extractMessage(item.messageBody) }}</p>

            <div class="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
              <span>{{ readableDate(item.sentAt || item.createdAt) }}</span>
              <button
                *ngIf="isUnread(item)"
                class="font-semibold text-[#0f6cbd] hover:text-[#0b4f8a] disabled:cursor-not-allowed disabled:opacity-60"
                [disabled]="isMarking(item.notificationId)"
                (click)="markAsRead(item)"
              >
                {{ isMarking(item.notificationId) ? 'Updating...' : 'Mark read' }}
              </button>
            </div>
          </article>
        </div>

        <ng-template #emptyState>
          <div class="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
            No notifications available.
          </div>
        </ng-template>
      </section>

      <div>
        <a routerLink="/employee/dashboard" class="satori-secondary inline-flex">Back to dashboard</a>
      </div>
    </section>
  `
})
export class EmployeeNotificationsComponent implements OnInit, OnDestroy {
  readonly notifications = signal<EmployeeNotificationItem[]>([]);
  readonly unreadCount = signal(0);
  readonly lastSyncedAt = signal<Date | null>(null);
  readonly markingMap = signal<Record<number, boolean>>({});
  private readonly destroy$ = new Subject<void>();
  private readonly unreadEligibleStatuses = new Set(['PENDING', 'SCHEDULED', 'RETRYING', 'SENT', 'FAILED', 'ESCALATED']);

  constructor(
    private readonly employeeApi: EmployeeApiService,
    private readonly sessionService: SessionService,
    private readonly toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.loadNotifications();

    interval(10000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.loadNotifications(true));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadNotifications(silent = false): void {
    const employeeId = this.sessionService.getEmployeeId();
    if (!employeeId) {
      this.notifications.set([]);
      this.unreadCount.set(0);
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
        this.unreadCount.set(sorted.filter((item) => this.isUnread(item)).length);
        this.lastSyncedAt.set(new Date());
      },
      error: () => {
        if (!silent) {
          this.toastService.show('Unable to load notifications', 'error');
        }
      }
    });
  }

  markAsRead(item: EmployeeNotificationItem): void {
    if (!this.isUnread(item)) {
      return;
    }

    this.setMarking(item.notificationId, true);
    this.employeeApi.markNotificationRead(item.notificationId).subscribe({
      next: () => {
        this.notifications.update((items) =>
          items.map((entry) =>
            entry.notificationId === item.notificationId
              ? { ...entry, statusCode: 'READ' }
              : entry
          )
        );
        this.unreadCount.set(this.notifications().filter((entry) => this.isUnread(entry)).length);
        this.setMarking(item.notificationId, false);
      },
      error: (err) => {
        this.setMarking(item.notificationId, false);
        const message = err?.error?.message ?? 'Failed to update notification status';
        this.toastService.show(message, 'error');
      }
    });
  }

  markAllAsRead(): void {
    const unread = this.notifications().filter((item) => this.isUnread(item));
    if (unread.length === 0) {
      this.toastService.show('No unread notifications', 'info');
      return;
    }

    const updates = unread.map((item) => {
      this.setMarking(item.notificationId, true);
      return this.employeeApi.markNotificationRead(item.notificationId).pipe(
        map(() => ({ ok: true, id: item.notificationId })),
        catchError((err) => of({ ok: false, id: item.notificationId, message: err?.error?.message ?? 'Failed to update notification status' }))
      );
    });

    forkJoin(updates).subscribe((results) => {
      const successIds = results.filter((result) => result.ok).map((result) => result.id);
      const failed = results.filter((result) => !result.ok);

      successIds.forEach((id) => this.setMarking(id, false));
      failed.forEach((result) => {
        this.setMarking(result.id, false);
        const message = 'message' in result ? result.message : 'Failed to update notification status';
        this.toastService.show(message, 'error');
      });

      if (successIds.length > 0) {
        this.notifications.update((items) =>
          items.map((entry) =>
            successIds.includes(entry.notificationId)
              ? { ...entry, statusCode: 'READ' }
              : entry
          )
        );
        this.unreadCount.set(this.notifications().filter((entry) => this.isUnread(entry)).length);
        this.toastService.show('All unread notifications marked as read', 'success');
      }
    });
  }

  isUnread(item: EmployeeNotificationItem): boolean {
    const status = (item.statusCode ?? '').toUpperCase();
    return this.unreadEligibleStatuses.has(status);
  }

  isMarking(notificationId: number): boolean {
    return this.markingMap()[notificationId] === true;
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

  private setMarking(notificationId: number, pending: boolean): void {
    this.markingMap.update((state) => {
      const next = { ...state };
      if (pending) {
        next[notificationId] = true;
      } else {
        delete next[notificationId];
      }
      return next;
    });
  }
}