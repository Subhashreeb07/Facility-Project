import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthApiService } from '../../core/services/auth-api.service';
import { SessionService } from '../../core/services/session.service';

@Component({
  selector: 'app-admin-portal-shell',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    MatSidenavModule,
    MatToolbarModule,
    MatIconModule,
    MatInputModule,
    MatButtonModule,
    MatMenuModule,
    MatBadgeModule
  ],
  template: `
    <mat-sidenav-container class="h-[calc(100vh-2rem)] rounded-2xl border border-slate-200 bg-white shadow-sm">
      <mat-sidenav #drawer mode="side" opened class="!w-[260px] !bg-[#0f172a] !text-slate-100">
        <div class="flex h-full flex-col px-4 py-5">
          <div class="mb-6 flex items-center gap-2">
            <div class="h-10 w-10 rounded-xl bg-[#1e293b] flex items-center justify-center">
              <mat-icon>grid_view</mat-icon>
            </div>
            <div>
              <p class="text-xs uppercase tracking-[0.12em] text-slate-400">Admin</p>
              <p class="text-sm font-semibold">HyHub Control Plane</p>
            </div>
          </div>

          <nav class="space-y-1 text-sm">
            <a *ngFor="let item of navItems"
               [routerLink]="item.link"
               routerLinkActive="bg-white/15 text-white"
               class="flex items-center gap-3 rounded-xl px-3 py-2 text-slate-300 transition hover:bg-white/10">
              <mat-icon class="!text-[20px]">{{ item.icon }}</mat-icon>
              <span>{{ item.label }}</span>
            </a>
          </nav>

          <div class="mt-auto rounded-xl bg-white/10 p-3 text-xs text-slate-300">
            <p class="font-semibold text-white">Specification Driven Platform</p>
            <p class="mt-1">Low-code/no-code dynamic facility builder with JSON-first delivery.</p>
          </div>
        </div>
      </mat-sidenav>

      <mat-sidenav-content class="bg-[#f4f6fb]">
        <mat-toolbar class="!sticky !top-0 !z-30 !h-[68px] !bg-white !px-4 !shadow-sm md:!px-6">
          <button mat-icon-button class="md:!hidden" (click)="drawer.toggle()"><mat-icon>menu</mat-icon></button>

          <div class="hidden md:flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 w-[340px]">
            <mat-icon class="!text-[20px] text-slate-500">search</mat-icon>
            <input class="w-full bg-transparent text-sm outline-none" placeholder="Search facilities, fields, rules..." />
          </div>

          <span class="flex-1"></span>

          <button mat-icon-button [matBadge]="5" matBadgeColor="warn" matBadgeSize="small"><mat-icon>notifications</mat-icon></button>

          <button mat-button [matMenuTriggerFor]="profileMenu" class="!ml-1 !rounded-xl !bg-slate-100 !px-3">
            <mat-icon>account_circle</mat-icon>
            <span class="ml-1 hidden md:inline">{{ sessionService.state()?.user?.name || 'Admin' }}</span>
          </button>

          <mat-menu #profileMenu="matMenu">
            <button mat-menu-item (click)="goEmployeeView()"><mat-icon>dashboard</mat-icon><span>Employee View</span></button>
            <button mat-menu-item (click)="logout()"><mat-icon>logout</mat-icon><span>Logout</span></button>
          </mat-menu>
        </mat-toolbar>

        <main class="p-4 md:p-6">
          <router-outlet></router-outlet>
        </main>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `
})
export class AdminPortalShellComponent {
  readonly navItems = [
    { label: 'Dashboard', icon: 'dashboard', link: '/admin/dashboard' },
    { label: 'Facilities', icon: 'apartment', link: '/admin/facilities' },
    { label: 'Form Builder', icon: 'construction', link: '/admin/form-builder' },
    { label: 'Rules', icon: 'rule', link: '/admin/rules' },
    { label: 'Reports', icon: 'bar_chart', link: '/admin/reports' },
    { label: 'Notifications', icon: 'notifications_active', link: '/admin/notifications' },
    { label: 'Settings', icon: 'settings', link: '/admin/settings' }
  ];

  constructor(
    public readonly sessionService: SessionService,
    private readonly authApi: AuthApiService,
    private readonly router: Router
  ) {}

  goEmployeeView(): void {
    this.router.navigateByUrl('/employee/dashboard');
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
}
