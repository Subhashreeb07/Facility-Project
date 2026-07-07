import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';

export interface PublishLocationsDialogResult {
  targetLocations: string[];
}

@Component({
  selector: 'app-publish-locations-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>Select Office Locations</h2>
    <mat-dialog-content class="space-y-3">
      <p class="text-sm text-slate-600">
        Employees from selected locations will see this published facility.
      </p>

      <label class="flex items-center gap-2 text-sm font-medium text-slate-800">
        <input type="checkbox" [formControl]="form.controls.hyderabad" /> Hyderabad
      </label>
      <label class="flex items-center gap-2 text-sm font-medium text-slate-800">
        <input type="checkbox" [formControl]="form.controls.kolkata" /> Kolkata
      </label>

      <p *ngIf="showError" class="text-xs text-rose-600">Select at least one location.</p>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="dialogRef.close()">Cancel</button>
      <button mat-flat-button color="primary" type="button" (click)="submit()">Publish</button>
    </mat-dialog-actions>
  `
})
export class PublishLocationsDialogComponent {
  showError = false;

  readonly form = this.fb.group({
    hyderabad: [true],
    kolkata: [true]
  });

  constructor(
    private readonly fb: FormBuilder,
    readonly dialogRef: MatDialogRef<PublishLocationsDialogComponent, PublishLocationsDialogResult>
  ) {}

  submit(): void {
    const locations: string[] = [];

    if (this.form.value.hyderabad) {
      locations.push('HYDERABAD');
    }
    if (this.form.value.kolkata) {
      locations.push('KOLKATA');
    }

    if (locations.length === 0) {
      this.showError = true;
      return;
    }

    this.dialogRef.close({ targetLocations: locations });
  }
}
