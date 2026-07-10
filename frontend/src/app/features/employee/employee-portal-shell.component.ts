import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Subject, interval } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthApiService } from '../../core/services/auth-api.service';
import { EmployeeApiService } from '../../core/services/employee-api.service';
import { SessionService } from '../../core/services/session.service';

@Component({
  selector: 'app-employee-portal-shell',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    MatBadgeModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule
  ],
  template: `
    <div class="mx-auto max-w-[1400px] overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_20px_60px_rgba(17,35,63,0.08)]">
      <header class="border-b border-slate-200 bg-white px-5 py-4 md:px-8">
        <div class="flex flex-wrap items-center gap-4 md:gap-6">
          <div class="flex items-center gap-3">
            <img
              class="hyland-logo"
              src="https://hyland.atlassian.net/s/-s1g255/b/0/23f31f9f9a8155235832888b764f7e4e/_/jira-logo-scaled.png"
              alt="Hyland logo"
            />
            <div class="hidden md:block">
              <p class="text-xs font-semibold uppercase tracking-[0.14em] text-[#0f6cbd]">Employee Portal</p>
              <p class="text-sm font-semibold text-slate-900">Welcome back, {{ employeeDisplayName() }}</p>
            </div>
          </div>

          <label class="portal-search flex min-w-[240px] flex-1 items-center gap-2 px-4 py-2">
            <mat-icon class="!text-[20px] text-slate-500">search</mat-icon>
            <input class="w-full bg-transparent text-sm outline-none" placeholder="Search services, bookings, notifications" />
          </label>

          <div class="flex items-center gap-2 md:gap-3">
            <button class="rounded-lg bg-[#0f6cbd] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0b4f8a]" (click)="goDashboard()">Book service</button>
            <button
              mat-icon-button
              class="!text-slate-600"
              [matBadge]="unreadNotifications()"
              [matBadgeHidden]="unreadNotifications() === 0"
              matBadgeColor="warn"
              matBadgeSize="small"
              (click)="openNotifications()"
            ><mat-icon>notifications_none</mat-icon></button>
            <div class="hidden text-right lg:block">
              <p class="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Employee</p>
              <p class="text-sm font-semibold text-slate-900">{{ employeeDisplayName() }}</p>
            </div>
            <button mat-button class="!min-w-0 !rounded-full !border !border-slate-200 !bg-white !px-2" (click)="openNotifications()" aria-label="Open employee notifications">
              <div class="flex h-8 w-8 items-center justify-center rounded-full bg-[#0f6cbd] text-xs font-bold text-white">
                {{ initials() }}
              </div>
            </button>
            <button mat-icon-button [matMenuTriggerFor]="profileMenu" class="!text-slate-600" aria-label="Open profile menu">
              <mat-icon>more_vert</mat-icon>
            </button>
          </div>
        </div>

        <nav class="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
          <a *ngFor="let item of navItems"
             [routerLink]="item.link"
             routerLinkActive="border-[#0f6cbd] bg-[#edf5ff] text-[#0f6cbd]"
             class="rounded-full border border-transparent px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">
            {{ item.label }}
          </a>
        </nav>
      </header>

      <main class="bg-[#fafbfd] px-5 py-6 md:px-8 md:py-8">
        <router-outlet></router-outlet>
      </main>

      <mat-menu #profileMenu="matMenu">
        <button mat-menu-item (click)="goProfile()"><mat-icon>badge</mat-icon><span>Profile</span></button>
        <button mat-menu-item (click)="logout()"><mat-icon>logout</mat-icon><span>Logout</span></button>
      </mat-menu>
    </div>
  `
})
export class EmployeePortalShellComponent implements OnInit, OnDestroy {
  readonly navItems = [
    { label: 'Home', icon: 'dashboard', link: '/employee/dashboard' },
    { label: 'Notifications', icon: 'notifications', link: '/employee/notifications' },
    { label: 'My bookings', icon: 'event_note', link: '/employee/history' },
    { label: 'Profile', icon: 'badge', link: '/employee/profile' }
  ];
  readonly unreadNotifications = signal(0);
  private readonly destroy$ = new Subject<void>();

  constructor(
    public readonly sessionService: SessionService,
    private readonly employeeApi: EmployeeApiService,
    private readonly authApi: AuthApiService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.hydrateEmployeeIdentity();
    this.loadUnreadNotifications();

    interval(15000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.loadUnreadNotifications(true));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  initials(): string {
    const name = this.sessionService.state()?.user?.name?.trim() ?? 'Employee';
    const parts = name.split(/\s+/).filter(Boolean).slice(0, 2);
    return parts.map((part) => part[0]?.toUpperCase() ?? '').join('') || 'E';
  }

  employeeDisplayName(): string {
    const name = this.sessionService.state()?.user?.name?.trim();
    if (!name) {
      return 'Employee';
    }
    return name;
  }

  goDashboard(): void {
    this.router.navigateByUrl('/employee/dashboard');
  }

  openNotifications(): void {
    this.router.navigateByUrl('/employee/notifications');
  }

  goProfile(): void {
    this.router.navigateByUrl('/employee/profile');
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
        this.router.navigateByUrl('/login');
      },
      error: () => {
        this.sessionService.clear();
        this.router.navigateByUrl('/login');
      }
    });
  }

  private loadUnreadNotifications(silent = false): void {
    const employeeId = this.sessionService.getEmployeeId();
    if (!employeeId) {
      this.unreadNotifications.set(0);
      return;
    }

    this.employeeApi.getEmployeeNotifications(employeeId).subscribe({
      next: (response) => {
        const unread = (response.items ?? []).filter((item) => {
          const status = (item.statusCode ?? '').toUpperCase();
          return status !== 'READ' && status !== 'CANCELLED';
        }).length;
        this.unreadNotifications.set(unread);
      },
      error: () => {
        if (!silent) {
          this.unreadNotifications.set(0);
        }
      }
    });
  }

  private hydrateEmployeeIdentity(): void {
    const employeeId = this.sessionService.getEmployeeId();
    const current = this.sessionService.state()?.user;
    if (!employeeId || !current) {
      return;
    }

    this.employeeApi.getEmployeeProfile(employeeId).subscribe({
      next: (profile) => {
        this.sessionService.refreshUser({
          employeeId: current.employeeId,
          name: profile.employeeName || current.name,
          email: profile.email || current.email,
          role: current.role
        });
      },
      error: () => {
        // Keep existing session identity if profile fetch fails.
      }
    });
  }
}