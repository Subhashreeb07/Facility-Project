import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AdminApiService } from '../../../core/services/admin-api.service';
import { ToastService } from '../../../core/services/toast.service';
import { FacilityBuilderStateService } from '../state/facility-builder-state.service';

@Component({
  selector: 'app-admin-dashboard-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="space-y-6">
      <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-8">
        <article class="satori-card" *ngFor="let card of summaryCards()">
          <p class="text-xs uppercase tracking-[0.12em] text-slate-500">{{ card.label }}</p>
          <p class="mt-2 text-2xl font-bold text-slate-900">{{ card.value }}</p>
        </article>
      </section>

      <section class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <p>
            Last synced:
            <strong class="text-slate-800">{{ lastUpdated() ? (lastUpdated() | date: 'medium') : 'Not synced yet' }}</strong>
          </p>
          <div class="flex gap-2">
            <button class="satori-secondary" [disabled]="loading()" (click)="refreshDashboard()">
              {{ loading() ? 'Refreshing...' : 'Refresh Dashboard' }}
            </button>
            <button class="satori-primary" [disabled]="processingNotifications()" (click)="processPendingNotifications()">
              {{ processingNotifications() ? 'Processing...' : 'Process Pending Notifications' }}
            </button>
          </div>
        </div>
      </section>

      <section class="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <article class="satori-card">
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold text-slate-900">Published Facilities</h2>
            <a routerLink="/admin/facilities" class="text-sm font-semibold text-[#0f6cbd]">View all</a>
          </div>
          <ul class="mt-4 space-y-3" *ngIf="recentlyPublished().length > 0; else noPublished">
            <li *ngFor="let facility of recentlyPublished()" class="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
              <p class="font-semibold text-slate-900">{{ facility.facilityName }}</p>
              <p>Updated {{ facility.updatedAt | date: 'medium' }}</p>
            </li>
          </ul>
          <ng-template #noPublished>
            <p class="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
              No published facilities available yet.
            </p>
          </ng-template>
        </article>

        <article class="satori-card">
          <h2 class="text-lg font-semibold text-slate-900">Quick Actions</h2>
          <div class="mt-4 grid gap-3">
            <button class="satori-primary" (click)="createFacility()">Create Facility</button>
            <button class="satori-secondary" (click)="goBuilder()">Import JSON</button>
            <button class="satori-secondary" (click)="goReports()">View Reports</button>
          </div>

          <div class="mt-6 rounded-xl bg-[#f0f6ff] p-4">
            <p class="text-xs uppercase tracking-[0.12em] text-[#0f6cbd]">Recently Published</p>
            <ul class="mt-3 space-y-2 text-sm text-slate-700">
              <li *ngFor="let facility of recentlyPublished()">{{ facility.facilityName }} · {{ facility.updatedAt | date: 'mediumDate' }}</li>
            </ul>
          </div>
        </article>
      </section>
    </div>
  `
})
export class AdminDashboardPageComponent implements OnInit {
  readonly loading = signal(false);
  readonly processingNotifications = signal(false);
  readonly todayTotalBookings = signal(0);
  readonly todayConfirmedBookings = signal(0);
  readonly todayCancelledBookings = signal(0);
  readonly pendingNotifications = signal(0);
  readonly cancellationRate = signal(0);
  readonly lastUpdated = signal<Date | null>(null);

  private readonly emptyCardValue = '--';

  readonly summaryCards = computed(() => {
    const facilities = this.state.facilities();
    const published = facilities.filter((f) => f.published).length;
    const draft = facilities.length - published;

    return [
      { label: 'Total Facilities', value: facilities.length },
      { label: 'Published Facilities', value: published },
      { label: 'Draft Facilities', value: draft },
      {
        label: "Today's Bookings",
        value: this.loading() ? this.emptyCardValue : this.todayTotalBookings()
      },
      {
        label: 'Confirmed Today',
        value: this.loading() ? this.emptyCardValue : this.todayConfirmedBookings()
      },
      {
        label: 'Cancelled Today',
        value: this.loading() ? this.emptyCardValue : this.todayCancelledBookings()
      },
      {
        label: 'Cancellation Rate',
        value: this.loading() ? this.emptyCardValue : `${this.cancellationRate()}%`
      },
      {
        label: 'Pending Notifications',
        value: this.loading() ? this.emptyCardValue : this.pendingNotifications()
      }
    ];
  });

  readonly recentlyPublished = computed(() =>
    this.state
      .facilities()
      .filter((f) => f.published)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 4)
  );

  constructor(
    private readonly state: FacilityBuilderStateService,
    private readonly adminApi: AdminApiService,
    private readonly toastService: ToastService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.loadDashboard();
  }

  refreshDashboard(): void {
    this.loadDashboard();
  }

  async processPendingNotifications(): Promise<void> {
    this.processingNotifications.set(true);
    try {
      const result = await firstValueFrom(this.adminApi.processNotifications());
      this.toastService.show(
        `Processed notifications: sent ${result.sent}, retried ${result.retried}, failed ${result.failed}`,
        'success'
      );
      await this.loadDashboard();
    } catch (error: any) {
      this.toastService.show(error?.error?.message ?? 'Failed to process pending notifications', 'error');
    } finally {
      this.processingNotifications.set(false);
    }
  }

  private async loadDashboard(): Promise<void> {
    if (this.loading()) {
      return;
    }

    this.loading.set(true);
    try {
      await this.state.loadFromBackend();
      const [summary, notificationSummary] = await Promise.all([
        firstValueFrom(this.adminApi.getOperationalSummary()),
        firstValueFrom(this.adminApi.getNotificationOpsSummary())
      ]);

      this.todayTotalBookings.set(summary.totalBookings ?? 0);
      this.todayConfirmedBookings.set(summary.confirmedBookings ?? 0);
      this.todayCancelledBookings.set(summary.cancelledBookings ?? 0);
      this.cancellationRate.set(summary.cancellationRate ?? 0);
      this.pendingNotifications.set(notificationSummary.pending ?? 0);
      this.lastUpdated.set(new Date());
    } catch (error: any) {
      this.toastService.show(error?.error?.message ?? 'Failed to load admin dashboard data', 'error');
    } finally {
      this.loading.set(false);
    }
  }

  createFacility(): void {
    this.state.createDraft();
    this.router.navigateByUrl('/admin/form-builder');
  }

  goBuilder(): void {
    this.router.navigateByUrl('/admin/form-builder');
  }

  goReports(): void {
    this.router.navigateByUrl('/admin/reports');
  }
}
