import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { BookingTrendResponse, OperationalSummaryResponse } from '../../../core/models/admin.models';
import { AdminApiService } from '../../../core/services/admin-api.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-admin-reports-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h2 class="text-2xl font-bold text-slate-900">Reports</h2>
        <button class="satori-secondary" (click)="exportExcel()" [disabled]="exporting()">
          {{ exporting() ? 'Exporting...' : 'Export Excel' }}
        </button>
      </div>

      <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article class="satori-card" *ngFor="let card of statCards()"><p class="text-xs uppercase text-slate-500">{{ card.label }}</p><p class="mt-2 text-2xl font-bold">{{ card.value }}</p></article>
      </section>

      <section class="satori-card space-y-4">
        <div class="flex flex-wrap items-end gap-3">
          <label class="admin-field">Report Date<input type="date" [(ngModel)]="reportDate" /></label>
          <button class="satori-primary" (click)="loadSummary()">Load Daily Summary</button>
        </div>

        <div class="grid gap-3 md:grid-cols-3" *ngIf="summary() as s">
          <article class="rounded-xl bg-slate-50 p-3"><p class="text-xs text-slate-500">Today's Bookings</p><p class="text-xl font-bold">{{ s.totalBookings }}</p></article>
          <article class="rounded-xl bg-slate-50 p-3"><p class="text-xs text-slate-500">Most Popular Facility</p><p class="text-xl font-bold">Lunch</p></article>
          <article class="rounded-xl bg-slate-50 p-3"><p class="text-xs text-slate-500">Cancellation Rate</p><p class="text-xl font-bold">{{ s.cancellationRate }}%</p></article>
        </div>
      </section>

      <section class="grid gap-4 xl:grid-cols-[2fr,1fr]">
        <article class="satori-card space-y-4">
          <h3 class="text-lg font-semibold">Booking Volume Chart</h3>
          <div class="h-60 rounded-xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-3" *ngIf="trendChartItems().length > 0; else noChartData">
            <div class="flex h-full items-end gap-2">
              <div *ngFor="let point of trendChartItems()" class="flex-1 min-w-0">
                <div class="group relative h-44 rounded-t-md bg-slate-200/70">
                  <div class="absolute inset-x-0 bottom-0 rounded-t-md bg-[#0f6cbd] transition-all" [style.height.%]="point.percent"></div>
                  <div class="absolute -top-7 left-1/2 hidden -translate-x-1/2 rounded-md bg-slate-900 px-2 py-1 text-xs text-white group-hover:block">
                    {{ point.total }} bookings
                  </div>
                </div>
                <p class="mt-2 truncate text-center text-xs text-slate-600">{{ point.label }}</p>
              </div>
            </div>
          </div>
        </article>

        <article class="satori-card space-y-3" *ngIf="summary() as s">
          <h3 class="text-lg font-semibold">Daily Status Mix</h3>
          <div class="space-y-3 text-sm">
            <div>
              <div class="mb-1 flex items-center justify-between"><span>Confirmed</span><span class="font-semibold">{{ s.confirmedBookings }}</span></div>
              <div class="h-2 rounded bg-slate-200"><div class="h-2 rounded bg-emerald-500" [style.width.%]="summaryPercent(s.confirmedBookings, s.totalBookings)"></div></div>
            </div>
            <div>
              <div class="mb-1 flex items-center justify-between"><span>Cancelled</span><span class="font-semibold">{{ s.cancelledBookings }}</span></div>
              <div class="h-2 rounded bg-slate-200"><div class="h-2 rounded bg-rose-500" [style.width.%]="summaryPercent(s.cancelledBookings, s.totalBookings)"></div></div>
            </div>
            <div>
              <div class="mb-1 flex items-center justify-between"><span>Pending</span><span class="font-semibold">{{ pendingBookings(s) }}</span></div>
              <div class="h-2 rounded bg-slate-200"><div class="h-2 rounded bg-amber-500" [style.width.%]="summaryPercent(pendingBookings(s), s.totalBookings)"></div></div>
            </div>
          </div>
        </article>
      </section>

      <ng-template #noChartData>
        <div class="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-300 text-sm text-slate-500">
          No trend data available for this date range.
        </div>
      </ng-template>

      <section class="satori-card space-y-4">
        <h3 class="text-lg font-semibold">Daily and Weekly Usage</h3>
        <div class="flex flex-wrap items-end gap-3">
          <label class="admin-field">From<input type="date" [(ngModel)]="fromDate" /></label>
          <label class="admin-field">To<input type="date" [(ngModel)]="toDate" /></label>
          <button class="satori-primary" (click)="loadTrend()">Generate Usage Trend</button>
        </div>

        <div class="grid gap-2" *ngIf="trend() as t">
          <article class="rounded-lg bg-slate-50 p-3" *ngFor="let point of t.points">
            <div class="flex items-center justify-between text-sm">
              <span>{{ point.bookingDate }}</span>
              <span class="font-semibold">{{ point.totalBookings }} bookings</span>
            </div>
            <div class="mt-2 h-2 rounded bg-slate-200">
              <div class="h-2 rounded bg-[#0f6cbd]" [style.width.%]="point.totalBookings"></div>
            </div>
          </article>
        </div>
      </section>
    </div>
  `,
  styles: [`.admin-field{display:grid;gap:.35rem;font-size:.8rem;font-weight:600;color:#334155}.admin-field input{border:1px solid #cbd5e1;border-radius:.65rem;padding:.55rem .7rem}`]
})
export class AdminReportsPageComponent implements OnInit {
  reportDate = '';
  fromDate = '';
  toDate = '';

  readonly summary = signal<OperationalSummaryResponse | null>(null);
  readonly trend = signal<BookingTrendResponse | null>(null);
  readonly loadingSummary = signal(false);
  readonly loadingTrend = signal(false);
  readonly exporting = signal(false);

  readonly trendChartItems = computed(() => {
    const points = this.trend()?.points ?? [];
    const max = points.reduce((acc, current) => Math.max(acc, current.totalBookings), 0);
    return points.map((point) => ({
      label: point.bookingDate.slice(5),
      total: point.totalBookings,
      percent: max > 0 ? Math.max(8, Math.round((point.totalBookings / max) * 100)) : 0
    }));
  });

  readonly statCards = signal([
    { label: "Today's Bookings", value: '-' },
    { label: 'Most Popular Facility', value: '-' },
    { label: 'Pending Bookings', value: '-' },
    { label: 'Cancellation Rate', value: '-' }
  ]);

  constructor(
    private readonly adminApi: AdminApiService,
    private readonly toastService: ToastService
  ) {}

  ngOnInit(): void {
    const today = new Date();
    const from = new Date(today);
    from.setDate(from.getDate() - 6);

    this.reportDate = this.toInputDate(today);
    this.fromDate = this.toInputDate(from);
    this.toDate = this.toInputDate(today);

    void this.loadSummary();
    void this.loadTrend();
  }

  private toInputDate(value: Date): string {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  async loadSummary(): Promise<void> {
    if (this.loadingSummary()) {
      return;
    }

    this.loadingSummary.set(true);
    try {
      const data = await firstValueFrom(this.adminApi.getOperationalSummary(this.reportDate || null));
      this.summary.set(data);
      this.statCards.set([
        { label: "Today's Bookings", value: String(data.totalBookings) },
        { label: 'Most Popular Facility', value: 'Lunch' },
        { label: 'Pending Bookings', value: String(Math.max(0, data.totalBookings - data.confirmedBookings - data.cancelledBookings)) },
        { label: 'Cancellation Rate', value: `${data.cancellationRate}%` }
      ]);
    } catch (error: any) {
      this.toastService.show(error?.error?.message ?? 'Failed to load report summary', 'error');
    } finally {
      this.loadingSummary.set(false);
    }
  }

  async loadTrend(): Promise<void> {
    if (this.loadingTrend()) {
      return;
    }
    if (!this.fromDate || !this.toDate) {
      return;
    }

    this.loadingTrend.set(true);
    try {
      const data = await firstValueFrom(this.adminApi.getBookingTrend(this.fromDate, this.toDate));
      this.trend.set(data);
    } catch (error: any) {
      this.toastService.show(error?.error?.message ?? 'Failed to load booking trend', 'error');
    } finally {
      this.loadingTrend.set(false);
    }
  }

  async exportExcel(): Promise<void> {
    if (this.exporting()) {
      return;
    }

    this.exporting.set(true);
    try {
      const [summary, trend] = await Promise.all([
        firstValueFrom(this.adminApi.getOperationalSummary(this.reportDate || null)),
        firstValueFrom(this.adminApi.getBookingTrend(this.fromDate, this.toDate))
      ]);

      const html = this.buildExcelHtml(summary, trend);
      const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
      const fileName = `reports_${this.reportDate || this.toInputDate(new Date())}.xls`;
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.download = fileName;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      this.toastService.show('Excel report downloaded successfully', 'success');
    } catch (error: any) {
      this.toastService.show(error?.error?.message ?? 'Failed to export report', 'error');
    } finally {
      this.exporting.set(false);
    }
  }

  summaryPercent(value: number, total: number): number {
    if (!total || total <= 0) {
      return 0;
    }
    return Math.max(0, Math.min(100, Math.round((value / total) * 100)));
  }

  pendingBookings(summary: OperationalSummaryResponse): number {
    return Math.max(0, summary.totalBookings - summary.confirmedBookings - summary.cancelledBookings);
  }

  private buildExcelHtml(summary: OperationalSummaryResponse, trend: BookingTrendResponse): string {
    const escape = (value: unknown): string =>
      String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    const summaryRows = [
      ['Metric', 'Value'],
      ['Report Date', summary.bookingDate],
      ['Total Bookings', summary.totalBookings],
      ['Confirmed Bookings', summary.confirmedBookings],
      ['Cancelled Bookings', summary.cancelledBookings],
      ['Pending Bookings', this.pendingBookings(summary)],
      ['Cancellation Rate (%)', summary.cancellationRate],
      ['Total Facilities', summary.totalFacilities],
      ['Published Facilities', summary.publishedFacilities]
    ]
      .map((row) => `<tr><td>${escape(row[0])}</td><td>${escape(row[1])}</td></tr>`)
      .join('');

    const trendRows = [
      '<tr><th>Date</th><th>Total Bookings</th><th>Confirmed Bookings</th><th>Cancelled Bookings</th></tr>',
      ...trend.points.map(
        (point) =>
          `<tr><td>${escape(point.bookingDate)}</td><td>${escape(point.totalBookings)}</td><td>${escape(point.confirmedBookings)}</td><td>${escape(point.cancelledBookings)}</td></tr>`
      )
    ].join('');

    return `
      <html xmlns:o="urn:schemas-microsoft-com:office:office"
            xmlns:x="urn:schemas-microsoft-com:office:excel"
            xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta charset="utf-8" />
          <style>
            table { border-collapse: collapse; margin-bottom: 20px; }
            td, th { border: 1px solid #cbd5e1; padding: 6px 10px; }
            th { background: #f1f5f9; text-align: left; }
            h3 { margin: 12px 0 6px; }
          </style>
        </head>
        <body>
          <h3>Summary</h3>
          <table>${summaryRows}</table>
          <h3>Trend</h3>
          <table>${trendRows}</table>
        </body>
      </html>
    `;
  }
}
