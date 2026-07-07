import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, interval } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DashboardFacility } from '../../core/models/employee-flow.models';
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
            <button class="rounded-lg bg-[#f4f1ee] px-3 py-2 font-semibold text-[#374151]" (click)="goHistory()">Bookings</button>
            <button class="rounded-lg bg-[#f4f1ee] px-3 py-2 font-semibold text-[#374151]" (click)="goInvitations()">Invitations</button>
            <button class="rounded-lg bg-[#f4f1ee] px-3 py-2 font-semibold text-[#374151]" (click)="goProfile()">Profile</button>
            <button class="rounded-lg bg-[#9a562d] px-3 py-2 font-semibold text-white" (click)="logout()">Logout</button>
          </div>
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
    </section>

    <ng-template #loadingState>
      <section class="mx-auto w-full max-w-[1220px] rounded-2xl bg-white px-6 py-8 text-[#4b5563] shadow-sm">Loading published facilities...</section>
    </ng-template>
  `
})
export class DashboardComponent implements OnInit, OnDestroy {
  readonly facilities = signal<DashboardFacility[] | null>(null);
  private readonly destroy$ = new Subject<void>();
  private isLoading = false;

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

    interval(5000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.loadFacilities(true));

    window.addEventListener('focus', this.handleWindowFocus);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    window.removeEventListener('focus', this.handleWindowFocus);
  }

  private readonly handleWindowFocus = (): void => {
    this.loadFacilities(true);
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
