import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { SpecificationField } from '../../core/models/employee-flow.models';

type RenderKind = 'input' | 'textarea' | 'dropdown' | 'radio' | 'checkbox' | 'file' | 'signature' | 'unsupported';

@Component({
  selector: 'app-dynamic-field-renderer',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="grid gap-2" [formGroup]="form" [ngClass]="{ 'md:col-span-2': isWideField() }">
      <label class="text-sm font-medium text-slate-700">
        {{ field.label }} <span *ngIf="field.required" class="text-rose-600">*</span>
      </label>

      <input
        *ngIf="renderKind() === 'input'"
        [type]="inputType()"
        [formControlName]="controlName"
        [placeholder]="field.placeholder ?? ''"
        class="rounded-xl border border-slate-300 px-3 py-2"
      />

      <textarea
        *ngIf="renderKind() === 'textarea'"
        [formControlName]="controlName"
        [placeholder]="field.placeholder ?? ''"
        class="min-h-28 rounded-xl border border-slate-300 px-3 py-2"
      ></textarea>

      <select
        *ngIf="renderKind() === 'dropdown'"
        [formControlName]="controlName"
        class="rounded-xl border border-slate-300 px-3 py-2"
      >
        <option value="">Select</option>
        <option *ngFor="let option of field.options || []" [value]="option">{{ option }}</option>
      </select>

      <div *ngIf="renderKind() === 'radio'" class="flex flex-wrap gap-3 text-sm">
        <label *ngFor="let option of field.options || []" class="inline-flex items-center gap-2">
          <input type="radio" [formControlName]="controlName" [value]="option" />
          <span>{{ option }}</span>
        </label>
      </div>

      <div *ngIf="renderKind() === 'checkbox'" class="flex flex-wrap gap-3 text-sm">
        <label *ngFor="let option of field.options || []" class="inline-flex items-center gap-2">
          <input type="checkbox" [checked]="isChecked(option)" (change)="onCheckboxChange(option, $event)" />
          <span>{{ option }}</span>
        </label>
      </div>

      <div *ngIf="renderKind() === 'file'" class="grid gap-2">
        <input type="file" (change)="onFileSelected($event)" class="rounded-xl border border-slate-300 px-3 py-2" />
        <p *ngIf="form.get(controlName)?.value" class="text-xs text-slate-500">Selected: {{ form.get(controlName)?.value }}</p>
      </div>

      <input
        *ngIf="fieldType() === 'QR_SCANNER'"
        type="text"
        [formControlName]="controlName"
        [placeholder]="field.placeholder || 'Scan QR value'"
        class="rounded-xl border border-slate-300 px-3 py-2"
      />

      <div *ngIf="renderKind() === 'signature'" class="grid gap-2">
        <textarea
          [formControlName]="controlName"
          [placeholder]="field.placeholder || 'Provide signature text or encoded signature data'"
          class="min-h-24 rounded-xl border border-slate-300 px-3 py-2"
        ></textarea>
      </div>

      <p *ngIf="renderKind() === 'unsupported'" class="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
        Unsupported field type {{ field.type }}. Add a new renderer mapping in DynamicFieldRendererComponent.
      </p>

      <p *ngIf="field.validationJson" class="text-xs text-slate-500">Validation: {{ field.validationJson }}</p>
    </div>
  `
})
export class DynamicFieldRendererComponent {
  @Input({ required: true }) field!: SpecificationField;
  @Input({ required: true }) form!: FormGroup;
  @Input({ required: true }) controlName!: string;

  private readonly inputTypeRegistry: Record<string, string> = {
    TEXTBOX: 'text',
    EMAIL: 'email',
    NUMBER: 'number',
    PHONE: 'tel',
    DATE_PICKER: 'date',
    TIME_PICKER: 'time',
    QR_SCANNER: 'text'
  };

  private readonly renderRegistry: Record<string, RenderKind> = {
    TEXTBOX: 'input',
    TEXTAREA: 'textarea',
    DROPDOWN: 'dropdown',
    RADIO_BUTTON: 'radio',
    CHECKBOX: 'checkbox',
    DATE_PICKER: 'input',
    TIME_PICKER: 'input',
    NUMBER: 'input',
    EMAIL: 'input',
    PHONE: 'input',
    FILE_UPLOAD: 'file',
    QR_SCANNER: 'input',
    SIGNATURE: 'signature'
  };

  fieldType(): string {
    return (this.field?.type ?? '').toUpperCase();
  }

  renderKind(): RenderKind {
    return this.renderRegistry[this.fieldType()] ?? 'unsupported';
  }

  inputType(): string {
    return this.inputTypeRegistry[this.fieldType()] ?? 'text';
  }

  isWideField(): boolean {
    const kind = this.renderKind();
    return kind === 'textarea' || kind === 'signature';
  }

  isChecked(option: string): boolean {
    const current = (this.form.get(this.controlName)?.value as string[] | null) ?? [];
    return current.includes(option);
  }

  onCheckboxChange(option: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const current = ((this.form.get(this.controlName)?.value as string[]) ?? []).slice();
    const next = checked ? [...current, option] : current.filter((entry) => entry !== option);
    this.form.get(this.controlName)?.setValue(next);
    this.form.get(this.controlName)?.markAsDirty();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    this.form.get(this.controlName)?.setValue(file ? file.name : '');
    this.form.get(this.controlName)?.markAsDirty();
  }
}
