import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthApiService } from '../../core/services/auth-api.service';
import { SessionService } from '../../core/services/session.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#f7f5f3] to-[#efe9e2] p-2">
      <div class="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl md:p-8">
        <!-- Header -->
        <div class="mb-8 text-center">
          <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#d39c78] to-[#9a562d]">
            <span class="text-2xl">🏢</span>
          </div>
          <h1 class="text-3xl font-bold text-[#1f2937]">Workplace Hub</h1>
          <p class="mt-2 text-sm text-[#6b7280]">Secure enterprise access for the global workforce</p>
        </div>

        <div class="mb-5 grid grid-cols-2 rounded-lg bg-[#f5eee8] p-1">
          <button
            type="button"
            class="rounded-md px-3 py-2 text-sm font-semibold transition"
            [ngClass]="mode() === 'SIGN_IN' ? 'bg-white text-[#7a4620] shadow-sm' : 'text-[#7c5a45]'"
            (click)="setMode('SIGN_IN')"
          >
            Sign In
          </button>
          <button
            type="button"
            class="rounded-md px-3 py-2 text-sm font-semibold transition"
            [ngClass]="mode() === 'SIGN_UP' ? 'bg-white text-[#7a4620] shadow-sm' : 'text-[#7c5a45]'"
            (click)="setMode('SIGN_UP')"
          >
            First-time Sign Up
          </button>
        </div>

        <form [formGroup]="mode() === 'SIGN_IN' ? loginForm : registerForm" (ngSubmit)="onSubmit()" class="space-y-5">
          <div *ngIf="mode() === 'SIGN_UP'">
            <label for="name" class="block text-xs font-semibold uppercase tracking-wider text-[#7c5a45]">Full Name</label>
            <input
              id="name"
              type="text"
              formControlName="name"
              [class.border-red-500]="isFieldInvalid('name')"
              class="mt-2 w-full rounded-lg border border-[#e5ddd5] bg-[#f9f7f5] px-4 py-3 text-sm text-[#1f2937] transition placeholder-[#9ca3af] focus:border-[#d39c78] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#d39c78] focus:ring-opacity-20"
              placeholder="Enter your full name"
              [disabled]="isLoading()"
            />
          </div>

          <div>
            <label for="employeeId" class="block text-xs font-semibold uppercase tracking-wider text-[#7c5a45]">Employee ID</label>
            <input
              id="employeeId"
              type="text"
              formControlName="employeeId"
              [class.border-red-500]="isFieldInvalid('employeeId')"
              class="mt-2 w-full rounded-lg border border-[#e5ddd5] bg-[#f9f7f5] px-4 py-3 text-sm text-[#1f2937] transition placeholder-[#9ca3af] focus:border-[#d39c78] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#d39c78] focus:ring-opacity-20"
              placeholder="Enter your employee ID"
              [disabled]="isLoading()"
            />
          </div>

          <div *ngIf="mode() === 'SIGN_UP'">
            <label for="email" class="block text-xs font-semibold uppercase tracking-wider text-[#7c5a45]">Email</label>
            <input
              id="email"
              type="email"
              formControlName="email"
              [class.border-red-500]="isFieldInvalid('email')"
              class="mt-2 w-full rounded-lg border border-[#e5ddd5] bg-[#f9f7f5] px-4 py-3 text-sm text-[#1f2937] transition placeholder-[#9ca3af] focus:border-[#d39c78] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#d39c78] focus:ring-opacity-20"
              placeholder="Enter your work email"
              [disabled]="isLoading()"
            />
          </div>

          <div *ngIf="mode() === 'SIGN_UP'" class="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label for="department" class="block text-xs font-semibold uppercase tracking-wider text-[#7c5a45]">Department</label>
              <input
                id="department"
                type="text"
                formControlName="department"
                class="mt-2 w-full rounded-lg border border-[#e5ddd5] bg-[#f9f7f5] px-4 py-3 text-sm text-[#1f2937] transition placeholder-[#9ca3af] focus:border-[#d39c78] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#d39c78] focus:ring-opacity-20"
                placeholder="Workplace Operations"
                [disabled]="isLoading()"
              />
            </div>
            <div>
              <label for="officeLocation" class="block text-xs font-semibold uppercase tracking-wider text-[#7c5a45]">Office</label>
              <select
                id="officeLocation"
                formControlName="officeLocation"
                class="mt-2 w-full rounded-lg border border-[#e5ddd5] bg-[#f9f7f5] px-4 py-3 text-sm text-[#1f2937] focus:border-[#d39c78] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#d39c78] focus:ring-opacity-20"
                [disabled]="isLoading()"
              >
                <option value="HYDERABAD">Hyderabad</option>
                <option value="KOLKATA">Kolkata</option>
              </select>
            </div>
          </div>

          <div>
            <label for="password" class="block text-xs font-semibold uppercase tracking-wider text-[#7c5a45]">Password</label>
            <input
              id="password"
              type="password"
              formControlName="password"
              [class.border-red-500]="isFieldInvalid('password')"
              class="mt-2 w-full rounded-lg border border-[#e5ddd5] bg-[#f9f7f5] px-4 py-3 text-sm text-[#1f2937] transition placeholder-[#9ca3af] focus:border-[#d39c78] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#d39c78] focus:ring-opacity-20"
              [placeholder]="mode() === 'SIGN_IN' ? 'Enter your password' : 'Create a password'"
              [disabled]="isLoading()"
            />
          </div>

          <!-- Error Message -->
          <div
            *ngIf="error()"
            class="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            role="alert"
          >
            <div class="font-medium">Login Failed</div>
            <div class="text-xs mt-1">{{ error() }}</div>
          </div>

          <!-- Submit Button -->
          <button
            type="submit"
            [disabled]="(mode() === 'SIGN_IN' ? loginForm.invalid : registerForm.invalid) || isLoading()"
            class="relative mt-6 w-full rounded-lg bg-gradient-to-r from-[#9a562d] to-[#7a4620] px-4 py-3 text-sm font-semibold text-white transition-all duration-200 hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed hover:enabled:from-[#824923] hover:enabled:to-[#6a3a1a] active:enabled:scale-95"
          >
            <span *ngIf="!isLoading()" class="flex items-center justify-center gap-2">
              <span>{{ mode() === 'SIGN_IN' ? 'Sign In' : 'Create Account' }}</span>
            </span>
            <span *ngIf="isLoading()" class="flex items-center justify-center gap-2">
              <svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="12" cy="12" r="10" stroke-width="2" stroke-opacity="0.2"></circle>
                <path d="M12 2a10 10 0 0110 10" stroke-width="2" stroke-linecap="round"></path>
              </svg>
              <span>{{ mode() === 'SIGN_IN' ? 'Signing in...' : 'Creating account...' }}</span>
            </span>
          </button>
        </form>

        <!-- Footer -->
        <p class="mt-6 text-center text-xs text-[#6b7280]">
          ⓘ For support, contact your system administrator
        </p>
      </div>
    </section>
  `
})
export class LoginComponent {
  readonly error = signal<string | null>(null);
  readonly isLoading = signal(false);
  readonly mode = signal<'SIGN_IN' | 'SIGN_UP'>('SIGN_IN');

  readonly loginForm = this.fb.group({
    employeeId: ['', [Validators.required, Validators.minLength(1)]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  readonly registerForm = this.fb.group({
    employeeId: ['', [Validators.required, Validators.minLength(1)]],
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    department: [''],
    officeLocation: ['HYDERABAD', [Validators.required]]
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly authApi: AuthApiService,
    private readonly sessionService: SessionService,
    private readonly toastService: ToastService,
    private readonly router: Router
  ) {}

  isFieldInvalid(fieldName: string): boolean {
    const field = this.mode() === 'SIGN_IN'
      ? this.loginForm.get(fieldName)
      : this.registerForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  onSubmit(): void {
    this.error.set(null);

    if (this.mode() === 'SIGN_IN') {
      this.submitSignIn();
      return;
    }

    this.submitSignUp();
  }

  setMode(mode: 'SIGN_IN' | 'SIGN_UP'): void {
    if (this.mode() === mode) {
      return;
    }

    this.mode.set(mode);
    this.error.set(null);
  }

  private submitSignIn(): void {
    if (this.loginForm.invalid) {
      this.toastService.show('Please fill in all required fields', 'error');
      Object.keys(this.loginForm.controls).forEach((key) => {
        this.loginForm.get(key)?.markAsTouched();
      });
      return;
    }

    const employeeId = (this.loginForm.value.employeeId ?? '').trim().toUpperCase();
    const password = (this.loginForm.value.password ?? '').trim();

    this.doLogin(employeeId, password);
  }

  private submitSignUp(): void {
    if (this.registerForm.invalid) {
      this.toastService.show('Please complete all required sign-up fields', 'error');
      Object.keys(this.registerForm.controls).forEach((key) => {
        this.registerForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.isLoading.set(true);

    const payload = {
      employeeId: (this.registerForm.value.employeeId ?? '').trim().toUpperCase(),
      name: (this.registerForm.value.name ?? '').trim(),
      email: (this.registerForm.value.email ?? '').trim().toLowerCase(),
      password: (this.registerForm.value.password ?? '').trim(),
      department: (this.registerForm.value.department ?? '').trim() || undefined,
      officeLocation: (this.registerForm.value.officeLocation ?? 'HYDERABAD').trim().toUpperCase()
    };

    this.authApi.register(payload).subscribe({
      next: (response) => {
        this.isLoading.set(false);
        this.sessionService.setFromLogin(response);
        this.toastService.show(`Welcome, ${response.name}! Your account is ready.`, 'success');
        this.registerForm.reset({ officeLocation: 'HYDERABAD' });
        this.router.navigateByUrl('/employee/dashboard');
      },
      error: (err) => {
        this.isLoading.set(false);
        const message = err?.error?.message ?? 'Unable to create account. Please try again.';
        this.error.set(message);
        this.toastService.show(message, 'error');
      }
    });
  }

  private doLogin(employeeId: string, password: string): void {
    this.isLoading.set(true);
    const payload = { employeeId, password };

    this.authApi.login(payload).subscribe({
      next: (response) => {
        this.isLoading.set(false);
        this.sessionService.setFromLogin(response);
        this.toastService.show(`Welcome, ${response.name}!`, 'success');
        this.loginForm.reset();

        const dashboard = (response.role ?? '').toUpperCase() === 'ADMIN'
          ? '/admin/dashboard'
          : '/employee/dashboard';
        this.router.navigateByUrl(dashboard);
      },
      error: (err) => {
        this.isLoading.set(false);
        const message = err?.error?.message ?? 'Invalid credentials. Please try again.';
        this.error.set(message);
        this.toastService.show(message, 'error');
      }
    });
  }
}
