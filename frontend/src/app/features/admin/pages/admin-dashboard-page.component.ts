import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FacilityBuilderStateService } from '../state/facility-builder-state.service';

interface PublishedActivity {
  id: string;
  facilityLabel: string;
  publishedOn: string;
}

@Component({
  selector: 'app-admin-dashboard-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="space-y-6">
      <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <article class="satori-card" *ngFor="let card of summaryCards()">
          <p class="text-xs uppercase tracking-[0.12em] text-slate-500">{{ card.label }}</p>
          <p class="mt-2 text-2xl font-bold text-slate-900">{{ card.value }}</p>
        </article>
      </section>

      <section class="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <article class="satori-card">
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold text-slate-900">Recent Activities</h2>
            <a routerLink="/admin/facilities" class="text-sm font-semibold text-[#0f6cbd]">View all</a>
          </div>

          <div class="mt-4 overflow-hidden rounded-xl border border-slate-200">
            <table class="min-w-full text-sm text-slate-700">
              <thead class="bg-slate-50 text-left text-xs uppercase tracking-[0.08em] text-slate-500">
                <tr>
                  <th class="px-4 py-3">Facility Published</th>
                  <th class="px-4 py-3">Published On</th>
                  <th class="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let row of publishedActivities()" class="border-t border-slate-100">
                  <td class="px-4 py-3 font-semibold text-slate-900">{{ row.facilityLabel }}</td>
                  <td class="px-4 py-3">{{ row.publishedOn | date: 'mediumDate' }}</td>
                  <td class="px-4 py-3 text-right">
                    <button class="satori-secondary" (click)="viewActivity(row)">View</button>
                  </td>
                </tr>
                <tr *ngIf="publishedActivities().length === 0" class="border-t border-slate-100">
                  <td class="px-4 py-3 text-slate-500" colspan="3">No published Lunch or Transport facilities yet.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div *ngIf="selectedActivity() as activity" class="mt-4 rounded-xl border border-[#c7ddff] bg-[#f0f6ff] p-4">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p class="text-xs uppercase tracking-[0.12em] text-[#0f6cbd]">Activity Details</p>
                <p class="mt-1 text-sm font-semibold text-slate-900">{{ activity.facilityLabel }}</p>
              </div>
              <div class="flex items-center gap-2">
                <button class="satori-primary" (click)="exportActivity(activity)">Export Excel</button>
                <button class="satori-secondary" (click)="closeActivityView()">Close</button>
              </div>
            </div>
          </div>
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
export class AdminDashboardPageComponent {
  private readonly teamLocations = ['Hyderabad', 'Kolkata'];

  readonly summaryCards = computed(() => {
    const facilities = this.state.facilities();
    const published = facilities.filter((f) => f.published).length;
    const draft = facilities.length - published;

    return [
      { label: 'Total Facilities', value: facilities.length },
      { label: 'Published Facilities', value: published },
      { label: 'Draft Facilities', value: draft },
      { label: "Today's Bookings", value: 164 },
      { label: "Today's Employees", value: 92 },
      { label: 'Pending Notifications', value: 11 }
    ];
  });

  readonly recentlyPublished = computed(() =>
    this.state
      .facilities()
      .filter((f) => f.published)
      .slice(0, 4)
  );

  readonly selectedActivity = signal<PublishedActivity | null>(null);

  readonly publishedActivities = computed<PublishedActivity[]>(() => {
    const targetFacilities = this.state
      .facilities()
      .filter((facility) => facility.published)
      .filter((facility) => {
        const name = facility.facilityName.trim().toLowerCase();
        return name === 'lunch' || name === 'transport';
      });

    return targetFacilities.flatMap((facility) =>
      this.teamLocations.map((location) => ({
        id: `${facility.id}-${location.toLowerCase()}`,
        facilityLabel: `${facility.facilityName} - ${location}`,
        publishedOn: facility.updatedAt
      }))
    );
  });

  constructor(
    private readonly state: FacilityBuilderStateService,
    private readonly router: Router
  ) {}

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

  viewActivity(activity: PublishedActivity): void {
    this.selectedActivity.set(activity);
  }

  closeActivityView(): void {
    this.selectedActivity.set(null);
  }

  exportActivity(activity: PublishedActivity): void {
    const csv = [
      'Facility Published,Published On',
      `"${activity.facilityLabel}","${new Date(activity.publishedOn).toLocaleDateString('en-IN')}"`
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${activity.facilityLabel.replace(/\s+/g, '_').toLowerCase()}_published_report.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }
}
