import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-builder-rules-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <form [formGroup]="form" class="space-y-4 py-4">
      <section class="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <h4 class="text-sm font-semibold text-slate-900">Timing Rules</h4>
        <p class="text-xs text-slate-500">Define when bookings can be created and when reminders trigger.</p>
        <div class="mt-3 grid gap-4 md:grid-cols-3">
          <label class="admin-field">Booking Start Time<input type="time" formControlName="bookingStartTime" /></label>
          <label class="admin-field">Booking End Time<input type="time" formControlName="bookingEndTime" /></label>
          <label class="admin-field">Booking Deadline<input type="time" formControlName="bookingDeadline" /></label>
          <label class="admin-field">Reminder Time<input type="time" formControlName="reminderTime" /></label>
          <label class="admin-field">Cancellation Deadline<input type="time" formControlName="cancellationDeadline" /></label>
          <label class="admin-field">Booking Window<input type="text" formControlName="bookingWindow" placeholder="e.g. 7 days" /></label>
        </div>
      </section>

      <section class="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <h4 class="text-sm font-semibold text-slate-900">Capacity and Validation</h4>
        <p class="text-xs text-slate-500">Control booking limits and verification requirements.</p>
        <div class="mt-3 grid gap-4 md:grid-cols-3">
          <label class="admin-field">Maximum Capacity<input type="number" min="1" formControlName="maximumCapacity" /></label>
          <label class="admin-inline"><input type="checkbox" formControlName="allowCancellation" /> Allow Cancellation</label>
          <label class="admin-inline"><input type="checkbox" formControlName="qrRequired" /> QR Required</label>
          <label class="admin-inline"><input type="checkbox" formControlName="approvalRequired" /> Approval Required</label>
          <label class="admin-inline"><input type="checkbox" formControlName="regularCommuteEnabled" /> Regular Commute</label>
          <label class="admin-inline"><input type="checkbox" formControlName="autoCloseFacility" /> Auto Close Facility</label>
          <label class="admin-inline"><input type="checkbox" formControlName="weekendEnabled" /> Weekend Enabled</label>
          <label class="admin-inline"><input type="checkbox" formControlName="holidayEnabled" /> Holiday Enabled</label>
        </div>
      </section>
    </form>
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
      .admin-field textarea,
      .admin-field select {
        border: 1px solid #cbd5e1;
        border-radius: 0.65rem;
        padding: 0.55rem 0.7rem;
        background: #ffffff;
        font-size: 0.9rem;
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
export class BuilderRulesFormComponent {
  @Input({ required: true }) form!: FormGroup;
}
