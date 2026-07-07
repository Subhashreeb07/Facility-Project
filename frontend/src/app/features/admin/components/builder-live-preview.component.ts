import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FacilityField } from '../../../core/models/specification.models';

@Component({
  selector: 'app-builder-live-preview',
  standalone: true,
  imports: [CommonModule],
  template: `
    <aside class="rounded-2xl border border-slate-200 bg-[#f7f8fb] p-4">
      <h4 class="text-sm font-semibold uppercase tracking-[0.1em] text-slate-500">Live Mobile Preview</h4>
      <div class="mt-3 rounded-[1.7rem] border-[10px] border-slate-900 bg-white p-3">
        <h5 class="text-sm font-semibold text-slate-900">{{ facilityName || 'Facility' }}</h5>
        <div class="mt-3 space-y-3">
          <ng-container *ngFor="let field of fields">
            <div class="text-xs">
              <label class="mb-1 block font-semibold text-slate-700">{{ field.label }}<span *ngIf="field.required" class="text-rose-600">*</span></label>
              <ng-container [ngSwitch]="field.fieldType">
                <select *ngSwitchCase="'DROPDOWN'" class="admin-preview-input"><option *ngFor="let option of field.options || []">{{ option }}</option></select>
                <div *ngSwitchCase="'CHECKBOX'" class="space-y-1 rounded-lg border border-slate-200 bg-white p-2 text-[11px]">
                  <label class="block" *ngFor="let option of field.options || []"><input type="checkbox" disabled /> {{ option }}</label>
                </div>
                <div *ngSwitchCase="'RADIO_BUTTON'" class="space-y-1 rounded-lg border border-slate-200 bg-white p-2 text-[11px]">
                  <label class="block" *ngFor="let option of field.options || []"><input type="radio" name="preview-radio" disabled /> {{ option }}</label>
                </div>
                <textarea *ngSwitchCase="'TEXTAREA'" class="admin-preview-input" rows="2" [placeholder]="field.placeholder || ''"></textarea>
                <input *ngSwitchCase="'DATE_PICKER'" class="admin-preview-input" type="date" />
                <input *ngSwitchCase="'TIME_PICKER'" class="admin-preview-input" type="time" />
                <input *ngSwitchCase="'NUMBER'" class="admin-preview-input" type="number" [placeholder]="field.placeholder || ''" />
                <input *ngSwitchCase="'EMAIL'" class="admin-preview-input" type="email" [placeholder]="field.placeholder || ''" />
                <input *ngSwitchCase="'PHONE'" class="admin-preview-input" type="tel" [placeholder]="field.placeholder || ''" />
                <div *ngSwitchCase="'FILE_UPLOAD'" class="rounded-lg border border-dashed border-slate-300 bg-white p-2 text-[11px] text-slate-500">Upload area</div>
                <div *ngSwitchCase="'QR_SCANNER'" class="rounded-lg border border-dashed border-slate-300 bg-white p-2 text-[11px] text-slate-500">QR scanner placeholder</div>
                <div *ngSwitchCase="'SIGNATURE'" class="rounded-lg border border-dashed border-slate-300 bg-white p-2 text-[11px] text-slate-500">Signature pad placeholder</div>
                <input *ngSwitchDefault class="admin-preview-input" [placeholder]="field.placeholder || ''" />
              </ng-container>
            </div>
          </ng-container>
        </div>
      </div>
    </aside>
  `,
  styles: [
    `
      .admin-preview-input {
        width: 100%;
        border: 1px solid #d1d5db;
        border-radius: 0.55rem;
        padding: 0.35rem 0.5rem;
        font-size: 0.78rem;
        background: #fff;
      }
    `
  ]
})
export class BuilderLivePreviewComponent {
  @Input() facilityName = '';
  @Input({ required: true }) fields: FacilityField[] = [];
}
