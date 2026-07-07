import { CommonModule } from '@angular/common';
import { Component, computed } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { FacilityBuilderStateService } from '../state/facility-builder-state.service';
import { ConfirmDialogComponent } from '../components/confirm-dialog.component';
import { FacilityAdminApiService } from '../../../core/services/facility-admin-api.service';
import { PublishLocationsDialogComponent } from '../components/publish-locations-dialog.component';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-admin-facilities-page',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatSnackBarModule],
  template: `
    <div class="space-y-6">
      <section class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="text-2xl font-bold text-slate-900">Facilities</h2>
          <p class="text-sm text-slate-600">Manage all dynamic employee facilities from a single place.</p>
        </div>
        <div class="flex gap-2">
          <button class="satori-secondary" (click)="goImport()">Import JSON</button>
          <button class="satori-primary" (click)="createFacility()">Create Facility</button>
        </div>
      </section>

      <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <article *ngFor="let facility of facilities()" class="satori-card">
          <div class="flex items-start justify-between">
            <div>
              <p class="text-xs uppercase tracking-[0.12em] text-slate-500">{{ facility.category }}</p>
              <h3 class="mt-1 text-xl font-semibold text-slate-900">{{ facility.facilityName }}</h3>
              <p class="mt-1 text-xs text-slate-500">Created {{ facility.createdAt | date: 'mediumDate' }}</p>
            </div>
            <div class="rounded-full px-2 py-1 text-xs font-semibold" [ngClass]="facility.published ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'">
              {{ facility.published ? 'Published' : 'Draft' }}
            </div>
          </div>

          <p class="mt-3 text-sm text-slate-600 line-clamp-2">{{ facility.description || 'No description added yet.' }}</p>

          <div class="mt-4 grid grid-cols-2 gap-2 text-sm">
            <button class="satori-secondary" (click)="editFacility(facility.id)">Edit</button>
            <button class="satori-secondary" (click)="previewFacility(facility.id)">Preview</button>
            <button class="satori-secondary" (click)="publishFacility(facility.id)">Publish</button>
            <button class="satori-secondary" (click)="duplicateFacility(facility.id)">Duplicate</button>
            <button class="satori-danger col-span-2" (click)="deleteFacility(facility.id)">Delete</button>
          </div>
        </article>
      </section>
    </div>
  `
})
export class AdminFacilitiesPageComponent {
  readonly facilities = computed(() => this.state.filteredFacilities());

  constructor(
    private readonly state: FacilityBuilderStateService,
    private readonly router: Router,
    private readonly dialog: MatDialog,
    private readonly snackBar: MatSnackBar,
    private readonly facilityAdminApi: FacilityAdminApiService
  ) {
    this.refreshFromBackend();
  }

  createFacility(): void {
    this.state.createDraft();
    this.router.navigateByUrl('/admin/form-builder');
  }

  goImport(): void {
    this.router.navigateByUrl('/admin/form-builder');
  }

  editFacility(id: number): void {
    this.state.setActiveFacility(id);
    this.router.navigateByUrl('/admin/form-builder');
  }

  previewFacility(id: number): void {
    this.state.setActiveFacility(id);
    this.router.navigateByUrl('/admin/form-builder');
  }

  async publishFacility(id: number): Promise<void> {
    const publishConfig = await firstValueFrom(
      this.dialog
        .open(PublishLocationsDialogComponent, {
          width: '420px',
          maxWidth: '95vw'
        })
        .afterClosed()
    );

    if (!publishConfig?.targetLocations?.length) {
      return;
    }

    this.facilityAdminApi.publishFacility(id, { targetLocations: publishConfig.targetLocations }).subscribe({
      next: () => {
        this.state.publishFacility(id);
        this.snackBar.open('Facility published', 'OK', { duration: 2000 });
      },
      error: (err) => {
        this.snackBar.open(err?.error?.message ?? 'Publish failed', 'Close', { duration: 3000 });
      }
    });
  }

  duplicateFacility(id: number): void {
    this.state.duplicateFacility(id);
  }

  deleteFacility(id: number): void {
    this.dialog
      .open(ConfirmDialogComponent, {
        data: {
          title: 'Delete Facility',
          message: 'Are you sure you want to delete this facility? This action cannot be undone.',
          confirmText: 'Delete'
        }
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed) {
          this.facilityAdminApi.deleteFacility(id).subscribe({
            next: () => {
              this.state.deleteFacility(id);
              this.snackBar.open('Facility deleted', 'OK', { duration: 2000 });
            },
            error: (err) => {
              this.snackBar.open(err?.error?.message ?? 'Delete failed', 'Close', { duration: 3000 });
            }
          });
        }
      });
  }

  private async refreshFromBackend(): Promise<void> {
    try {
      await this.state.loadFromBackend();
    } catch (error: any) {
      this.snackBar.open(error?.error?.message ?? 'Failed to load facilities from backend', 'Close', { duration: 3500 });
    }
  }
}
