import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import {
  FacilityAdminApiService,
  FacilityDetailResponse,
  FacilitySummaryResponse,
  RuleResponse
} from '../../../core/services/facility-admin-api.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-admin-rules-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="space-y-5">
      <h2 class="text-2xl font-bold text-slate-900">Facility Rules</h2>
      <p class="text-sm text-slate-600">
        Manage booking rules for published facilities. Select a facility, update rules, and save.
      </p>

      <section class="satori-card space-y-4">
        <label class="admin-field">
          Published Facility
          <select [value]="selectedFacility()?.facilityId ?? ''" (change)="onSelectFacility($any($event.target).value)">
            <option value="" disabled>Select a published facility</option>
            <option *ngFor="let facility of facilities()" [value]="facility.facilityId">
              {{ facility.facilityName }}
            </option>
          </select>
        </label>

        <div
          *ngIf="!loading() && facilities().length === 0"
          class="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600"
        >
          No published facilities available. Publish a facility from Facilities or Form Builder first.
        </div>
      </section>

      <form *ngIf="selectedFacility()" [formGroup]="form" class="satori-card grid gap-4 md:grid-cols-2">
        <label class="admin-field">Booking Start Time<input type="time" formControlName="bookingStartTime" /></label>
        <label class="admin-field">Booking Deadline<input type="time" formControlName="bookingDeadline" /></label>
        <label class="admin-field">Reminder Time<input type="time" formControlName="reminderTime" /></label>
        <label class="admin-field">Maximum Capacity<input type="number" min="1" formControlName="maximumCapacity" /></label>
        <label class="admin-inline"><input type="checkbox" formControlName="allowCancellation" /> Allow Cancellation</label>
        <label class="admin-inline"><input type="checkbox" formControlName="qrRequired" /> QR Required</label>
        <label class="admin-inline"><input type="checkbox" formControlName="regularCommuteEnabled" /> Regular Commute Enabled</label>
      </form>

      <div class="flex justify-end" *ngIf="selectedFacility()">
        <button class="satori-primary" (click)="save()">Save Facility Rules</button>
      </div>
    </div>
  `,
  styles: [
    `
      .admin-field {
        display: grid;
        gap: 0.35rem;
        font-size: 0.8rem;
        font-weight: 600;
        color: #334155;
      }

      .admin-field input,
      .admin-field select {
        border: 1px solid #cbd5e1;
        border-radius: 0.65rem;
        padding: 0.55rem 0.7rem;
        background: #ffffff;
      }

      .admin-inline {
        display: flex;
        align-items: center;
        gap: 0.45rem;
        font-size: 0.86rem;
        color: #334155;
      }
    `
  ]
})
export class AdminRulesPageComponent implements OnInit {
  readonly facilities = signal<FacilityDetailResponse[]>([]);
  readonly selectedFacility = signal<FacilityDetailResponse | null>(null);
  readonly loading = signal(false);

  readonly form = this.fb.group({
    bookingStartTime: [''],
    bookingDeadline: [''],
    reminderTime: [''],
    maximumCapacity: [null as number | null],
    allowCancellation: [true],
    qrRequired: [false],
    regularCommuteEnabled: [false]
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly facilityAdminApi: FacilityAdminApiService,
    private readonly toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.loadPublishedFacilities();
  }

  async onSelectFacility(facilityId: string): Promise<void> {
    const id = Number(facilityId);
    if (!Number.isFinite(id)) {
      return;
    }

    const facility = this.facilities().find((item) => item.facilityId === id) ?? null;
    this.selectedFacility.set(facility);
    await this.loadRules(id);
  }

  async save(): Promise<void> {
    const facility = this.selectedFacility();
    if (!facility) {
      this.toastService.show('Select a published facility first', 'error');
      return;
    }

    const raw = this.form.value;
    try {
      await firstValueFrom(
        this.facilityAdminApi.saveRules(facility.facilityId, {
          bookingStartTime: raw.bookingStartTime || null,
          bookingDeadline: raw.bookingDeadline || null,
          reminderTime: raw.reminderTime || null,
          maximumCapacity: raw.maximumCapacity ?? null,
          allowCancellation: Boolean(raw.allowCancellation),
          qrRequired: Boolean(raw.qrRequired),
          regularCommuteEnabled: Boolean(raw.regularCommuteEnabled)
        })
      );
      this.toastService.show('Rules saved successfully', 'success');
    } catch (error: any) {
      this.toastService.show(error?.error?.message ?? 'Failed to save rules', 'error');
    }
  }

  private async loadPublishedFacilities(): Promise<void> {
    this.loading.set(true);
    try {
      const summaries = await firstValueFrom(this.facilityAdminApi.getFacilities());
      const detailRequests = summaries.map((summary: FacilitySummaryResponse) =>
        firstValueFrom(this.facilityAdminApi.getFacility(summary.facilityId))
      );

      const details = await Promise.all(detailRequests);
      const published = details.filter((facility) => facility.published);
      this.facilities.set(published);

      if (published.length > 0) {
        this.selectedFacility.set(published[0]);
        await this.loadRules(published[0].facilityId);
      }
    } catch (error: any) {
      this.toastService.show(error?.error?.message ?? 'Failed to load published facilities', 'error');
    } finally {
      this.loading.set(false);
    }
  }

  private async loadRules(facilityId: number): Promise<void> {
    try {
      const rules: RuleResponse = await firstValueFrom(this.facilityAdminApi.getRules(facilityId));
      this.form.patchValue({
        bookingStartTime: rules.bookingStartTime ?? '',
        bookingDeadline: rules.bookingDeadline ?? '',
        reminderTime: rules.reminderTime ?? '',
        maximumCapacity: rules.maximumCapacity ?? null,
        allowCancellation: rules.allowCancellation ?? true,
        qrRequired: rules.qrRequired ?? false,
        regularCommuteEnabled: rules.regularCommuteEnabled ?? false
      });
    } catch (error: any) {
      this.toastService.show(error?.error?.message ?? 'Failed to load rules for selected facility', 'error');
    }
  }
}
