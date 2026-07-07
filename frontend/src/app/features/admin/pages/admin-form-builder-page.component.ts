import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatStepperModule } from '@angular/material/stepper';
import { BuilderFieldListComponent } from '../components/builder-field-list.component';
import { BuilderLivePreviewComponent } from '../components/builder-live-preview.component';
import { BuilderPublishPanelComponent } from '../components/builder-publish-panel.component';
import { BuilderPreviewStepComponent } from '../components/builder-preview-step.component';
import { BuilderRulesFormComponent } from '../components/builder-rules-form.component';
import { FieldConfigDialogComponent } from '../components/field-config-dialog.component';
import { PublishLocationsDialogComponent } from '../components/publish-locations-dialog.component';
import { SpecificationImportDialogComponent } from '../components/specification-import-dialog.component';
import { FacilityBuilderRecord, FacilityBuilderStateService } from '../state/facility-builder-state.service';
import { FacilityField, FacilitySpecification } from '../../../core/models/specification.models';
import { FacilityAdminApiService } from '../../../core/services/facility-admin-api.service';
import { SpecificationApiService } from '../../../core/services/specification-api.service';

@Component({
  selector: 'app-admin-form-builder-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatStepperModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatSnackBarModule,
    BuilderFieldListComponent,
    BuilderLivePreviewComponent,
    BuilderRulesFormComponent,
    BuilderPublishPanelComponent,
    BuilderPreviewStepComponent
  ],
  template: `
    <div class="space-y-6">
      <section class="rounded-2xl bg-white p-4 shadow-sm">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 class="text-2xl font-bold text-slate-900">Create Facility Wizard</h2>
            <p class="text-sm text-slate-600">Design dynamic facility forms, rules, and publish-ready specifications.</p>
          </div>
          <div class="flex gap-2">
            <button class="satori-secondary" (click)="createNewDraft()">New Draft</button>
            <button class="satori-secondary" (click)="openImportPrompt()">Import JSON</button>
          </div>
        </div>

        <div class="mt-4 grid gap-3 md:grid-cols-[1.4fr_repeat(3,minmax(0,1fr))]">
          <label class="admin-field">
            Working Facility
            <select [value]="activeFacilityId() ?? ''" (change)="switchFacility($any($event.target).value)">
              <option *ngFor="let facility of facilityLibrary()" [value]="facility.id">{{ facility.facilityName }}</option>
            </select>
          </label>

          <article class="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <p class="text-[11px] uppercase tracking-[0.08em] text-slate-500">Fields</p>
            <p class="text-xl font-bold text-slate-900">{{ formFieldCount() }}</p>
          </article>

          <article class="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <p class="text-[11px] uppercase tracking-[0.08em] text-slate-500">Required</p>
            <p class="text-xl font-bold text-slate-900">{{ requiredFieldCount() }}</p>
          </article>

          <article class="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <p class="text-[11px] uppercase tracking-[0.08em] text-slate-500">Option Sets</p>
            <p class="text-xl font-bold text-slate-900">{{ optionSetCount() }}</p>
          </article>
        </div>
      </section>

      <mat-stepper [linear]="false" class="rounded-2xl bg-white p-4 shadow-sm">
        <mat-step [stepControl]="basicForm" label="Basic Information">
          <form [formGroup]="basicForm" class="grid gap-4 py-4 md:grid-cols-2">
            <label class="admin-field">Facility Name<input type="text" formControlName="facilityName" /></label>
            <label class="admin-field">Category
              <select formControlName="category">
                <option *ngFor="let category of categoryOptions" [value]="category">{{ category }}</option>
              </select>
            </label>
            <label class="admin-field" *ngIf="basicForm.value.category === 'Other'">Custom Category<input type="text" formControlName="customCategory" placeholder="Enter category" /></label>
            <label class="admin-field md:col-span-2">Description<textarea rows="3" formControlName="description"></textarea></label>
            <label class="admin-field">Icon
              <select formControlName="icon">
                <option *ngFor="let icon of iconChoices" [value]="icon">{{ icon }}</option>
              </select>
            </label>
            <label class="admin-field">Color Theme<input type="color" formControlName="colorTheme" /></label>
            <label class="admin-inline"><input type="checkbox" formControlName="status" /> Enable Facility</label>
          </form>
          <div class="flex justify-end"><button mat-flat-button color="primary" matStepperNext>Next</button></div>
        </mat-step>

        <mat-step label="Dynamic Form Builder">
          <div class="grid gap-5 py-4 xl:grid-cols-[1fr_360px]">
            <app-builder-field-list
              [fields]="orderedFields()"
              (add)="addField()"
              (addWithType)="addFieldWithType($event)"
              (edit)="editField($event)"
              (duplicate)="duplicateField($event)"
              (remove)="deleteField($event)"
              (move)="moveField($event.index, $event.direction)"
            />

            <app-builder-live-preview
              [facilityName]="basicForm.value.facilityName || ''"
              [fields]="orderedFields()"
            />
          </div>
          <div class="flex justify-between">
            <button mat-button matStepperPrevious>Back</button>
            <button mat-flat-button color="primary" matStepperNext>Next</button>
          </div>
        </mat-step>

        <mat-step [stepControl]="rulesForm" label="Business Rules">
          <app-builder-rules-form [form]="rulesForm" />
          <div class="flex justify-between">
            <button mat-button matStepperPrevious>Back</button>
            <button mat-flat-button color="primary" matStepperNext>Next</button>
          </div>
        </mat-step>

        <mat-step label="Preview">
          <app-builder-preview-step [fields]="orderedFields()" [generatedJson]="generatedJson()" />
          <div class="flex justify-between">
            <button mat-button matStepperPrevious>Back</button>
            <button mat-flat-button color="primary" matStepperNext>Next</button>
          </div>
        </mat-step>

        <mat-step label="Publish">
          <app-builder-publish-panel
            [generatedJson]="generatedJson()"
            (saveDraft)="saveDraft()"
            (publish)="publish()"
            (generateJson)="refreshJson()"
            (downloadJson)="downloadJson()"
            (importJson)="openImportPrompt()"
          />

          <div class="mt-4 flex justify-start">
            <button mat-button matStepperPrevious>Back</button>
          </div>
        </mat-step>
      </mat-stepper>
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
export class AdminFormBuilderPageComponent {
  readonly iconChoices = ['restaurant', 'directions_bus', 'local_parking', 'badge', 'event', 'meeting_room', 'inventory_2'];
  readonly categoryOptions = ['Food', 'Mobility', 'Parking', 'Workspace', 'Events', 'Visitors', 'Security', 'IT Services', 'Other'];

  readonly facilityLibrary = computed(() => this.state.facilities());
  readonly activeFacilityId = computed(() => this.state.activeFacilityId());
  readonly formFieldCount = computed(() => this.orderedFields().length);
  readonly requiredFieldCount = computed(() => this.orderedFields().filter((field) => field.required).length);
  readonly optionSetCount = computed(() => this.orderedFields().filter((field) => (field.options ?? []).length > 0).length);

  readonly basicForm = this.fb.group({
    facilityName: ['', Validators.required],
    description: [''],
    category: ['Food', Validators.required],
    customCategory: [''],
    icon: ['inventory_2'],
    colorTheme: ['#0f6cbd'],
    status: [true]
  });

  readonly rulesForm = this.fb.group({
    bookingStartTime: [''],
    bookingEndTime: [''],
    bookingDeadline: [''],
    reminderTime: [''],
    maximumCapacity: [null as number | null],
    allowCancellation: [true],
    cancellationDeadline: [''],
    qrRequired: [false],
    approvalRequired: [false],
    regularCommuteEnabled: [false],
    autoCloseFacility: [false],
    bookingWindow: [''],
    weekendEnabled: [false],
    holidayEnabled: [false]
  });

  readonly draftFields = signal<FacilityField[]>([]);
  readonly generatedJson = signal('');

  readonly orderedFields = computed(() =>
    this.draftFields()
      .slice()
      .sort((a, b) => a.displayOrder - b.displayOrder)
  );

  constructor(
    private readonly fb: FormBuilder,
    private readonly dialog: MatDialog,
    private readonly state: FacilityBuilderStateService,
    private readonly snackBar: MatSnackBar,
    private readonly facilityAdminApi: FacilityAdminApiService,
    private readonly specificationApi: SpecificationApiService
  ) {
    this.bootstrap();
  }

  private async bootstrap(): Promise<void> {
    try {
      await this.state.loadFromBackend();
    } catch {
      // Keep local builder usable even if backend load fails.
    }
    this.loadInitialFacility();
  }

  createNewDraft(): void {
    const draft = this.state.createDraft();
    this.patchFromRecord(draft);
    this.refreshJson();
    this.toast('New draft facility created');
  }

  addField(): void {
    this.dialog
      .open(FieldConfigDialogComponent, {
        width: '640px',
        data: { displayOrder: this.draftFields().length + 1 }
      })
      .afterClosed()
      .subscribe((field?: FacilityField) => {
        if (!field) {
          return;
        }
        this.draftFields.update((items) => [...items, field]);
        this.normalizeFieldOrder();
        this.refreshJson();
      });
  }

  addFieldWithType(fieldType: FacilityField['fieldType']): void {
    this.dialog
      .open(FieldConfigDialogComponent, {
        width: '640px',
        data: {
          field: {
            label: this.defaultLabelForFieldType(fieldType),
            fieldType,
            required: false,
            displayOrder: this.draftFields().length + 1,
            options: []
          },
          displayOrder: this.draftFields().length + 1
        }
      })
      .afterClosed()
      .subscribe((field?: FacilityField) => {
        if (!field) {
          return;
        }
        this.draftFields.update((items) => [...items, field]);
        this.normalizeFieldOrder();
        this.refreshJson();
      });
  }

  editField(field: FacilityField): void {
    this.dialog
      .open(FieldConfigDialogComponent, {
        width: '640px',
        data: { field, displayOrder: field.displayOrder }
      })
      .afterClosed()
      .subscribe((next?: FacilityField) => {
        if (!next) {
          return;
        }
        this.draftFields.update((items) => items.map((entry) => (entry === field ? { ...next } : entry)));
        this.normalizeFieldOrder();
        this.refreshJson();
      });
  }

  duplicateField(field: FacilityField): void {
    this.draftFields.update((items) => [...items, { ...field, label: `${field.label} Copy` }]);
    this.normalizeFieldOrder();
    this.refreshJson();
  }

  deleteField(field: FacilityField): void {
    this.draftFields.update((items) => items.filter((entry) => entry !== field));
    this.normalizeFieldOrder();
    this.refreshJson();
  }

  moveField(index: number, direction: number): void {
    const items = this.orderedFields();
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= items.length) {
      return;
    }

    const copy = [...items];
    const [moved] = copy.splice(index, 1);
    copy.splice(nextIndex, 0, moved);
    this.draftFields.set(copy);
    this.normalizeFieldOrder();
    this.refreshJson();
  }

  async saveDraft(): Promise<void> {
    try {
      const persisted = await this.persistBuilder(false);
      this.state.upsertFacility(persisted);
      this.refreshJson();
      this.toast('Draft saved');
    } catch (error: any) {
      this.toast(error?.error?.message ?? 'Draft save failed', 'Close', 3200);
    }
  }

  async publish(): Promise<void> {
    try {
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

      const persisted = await this.persistBuilder(true, publishConfig.targetLocations);
      this.state.upsertFacility(persisted);
      this.state.publishFacility(persisted.id);
      this.refreshJson();
      this.toast('Facility published successfully');
    } catch (error: any) {
      this.toast(error?.error?.message ?? 'Publish failed', 'Close', 3200);
    }
  }

  refreshJson(): void {
    const json = JSON.stringify(this.currentSpecification(), null, 2);
    this.generatedJson.set(json);
  }

  downloadJson(): void {
    this.refreshJson();
    const blob = new Blob([this.generatedJson()], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${(this.basicForm.value.facilityName || 'facility').replace(/\s+/g, '-').toLowerCase()}-specification.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    this.toast('Specification JSON downloaded');
  }

  async openImportPrompt(): Promise<void> {
    const json = await firstValueFrom(
      this.dialog
        .open(SpecificationImportDialogComponent, {
          width: '760px',
          maxWidth: '95vw'
        })
        .afterClosed()
    );

    if (!json) {
      return;
    }

    try {
      const parsed = JSON.parse(json) as FacilitySpecification;
      this.validateImportedSpecification(parsed);
      const uploaded = await firstValueFrom(this.specificationApi.uploadSpecification(parsed));
      await this.state.loadFromBackend();
      const record = this.state.facilities().find((item) => item.id === uploaded.facilityId) ?? this.state.fromSpecification(parsed);
      this.state.setActiveFacility(record.id);
      this.patchFromRecord(record);
      this.refreshJson();
      this.toast('Specification imported successfully');
    } catch (error: any) {
      this.toast(error?.error?.message ?? error?.message ?? 'Invalid specification JSON', 'Close', 5000);
    }
  }

  switchFacility(facilityIdRaw: string): void {
    const facilityId = Number(facilityIdRaw);
    if (!Number.isFinite(facilityId)) {
      return;
    }

    const selected = this.state.facilities().find((facility) => facility.id === facilityId);
    if (!selected) {
      return;
    }

    this.state.setActiveFacility(selected.id);
    this.patchFromRecord(selected);
    this.refreshJson();
  }

  private validateImportedSpecification(spec: FacilitySpecification): void {
    if (!spec.facilityName?.trim()) {
      throw new Error('facilityName is required');
    }
    if (!Array.isArray(spec.fields)) {
      throw new Error('fields must be an array');
    }

    spec.fields.forEach((field, index) => {
      if (!field.label?.trim()) {
        throw new Error(`Field ${index + 1} label is required`);
      }
      if (!field.fieldType) {
        throw new Error(`Field ${index + 1} fieldType is required`);
      }
    });
  }

  private loadInitialFacility(): void {
    const active = this.state.activeFacility() ?? this.state.facilities()[0] ?? this.state.createDraft();
    this.state.setActiveFacility(active.id);
    this.patchFromRecord(active);
    this.refreshJson();
  }

  private patchFromRecord(record: FacilityBuilderRecord): void {
    const mappedCategory = this.categoryOptions.includes(record.category) ? record.category : 'Other';

    this.basicForm.patchValue({
      facilityName: record.facilityName,
      description: record.description,
      category: mappedCategory,
      customCategory: mappedCategory === 'Other' ? record.category : '',
      icon: record.icon,
      colorTheme: record.colorTheme,
      status: record.status
    });

    this.rulesForm.patchValue({
      bookingStartTime: record.rules.bookingStartTime ?? '',
      bookingEndTime: record.rules.bookingEndTime ?? '',
      bookingDeadline: record.rules.bookingDeadline ?? '',
      reminderTime: record.rules.reminderTime ?? '',
      maximumCapacity: record.rules.maximumCapacity ?? null,
      allowCancellation: record.rules.allowCancellation ?? true,
      cancellationDeadline: record.rules.cancellationDeadline ?? '',
      qrRequired: record.rules.qrRequired ?? false,
      approvalRequired: record.rules.approvalRequired ?? false,
      regularCommuteEnabled: record.rules.regularCommuteEnabled ?? false,
      autoCloseFacility: record.rules.autoCloseFacility ?? false,
      bookingWindow: record.rules.bookingWindow ?? '',
      weekendEnabled: record.rules.weekendEnabled ?? false,
      holidayEnabled: record.rules.holidayEnabled ?? false
    });

    this.draftFields.set(record.fields.map((field) => ({ ...field })));
    this.normalizeFieldOrder();
  }

  private currentRecord(published: boolean): FacilityBuilderRecord {
    const existing = this.state.activeFacility();

    return {
      id: existing?.id ?? this.state.createDraft().id,
      facilityName: this.basicForm.value.facilityName?.trim() || 'Untitled Facility',
      description: this.basicForm.value.description?.trim() || '',
      category: this.resolveCategoryValue(),
      icon: this.basicForm.value.icon || 'inventory_2',
      colorTheme: this.basicForm.value.colorTheme || '#0f6cbd',
      status: Boolean(this.basicForm.value.status),
      published,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      fields: this.orderedFields().map((field) => ({ ...field })),
      rules: {
        bookingStartTime: this.rulesForm.value.bookingStartTime || null,
        bookingEndTime: this.rulesForm.value.bookingEndTime || null,
        bookingDeadline: this.rulesForm.value.bookingDeadline || null,
        reminderTime: this.rulesForm.value.reminderTime || null,
        maximumCapacity: this.rulesForm.value.maximumCapacity ?? null,
        allowCancellation: Boolean(this.rulesForm.value.allowCancellation),
        cancellationDeadline: this.rulesForm.value.cancellationDeadline || null,
        qrRequired: Boolean(this.rulesForm.value.qrRequired),
        approvalRequired: Boolean(this.rulesForm.value.approvalRequired),
        regularCommuteEnabled: Boolean(this.rulesForm.value.regularCommuteEnabled),
        autoCloseFacility: Boolean(this.rulesForm.value.autoCloseFacility),
        bookingWindow: this.rulesForm.value.bookingWindow || null,
        weekendEnabled: Boolean(this.rulesForm.value.weekendEnabled),
        holidayEnabled: Boolean(this.rulesForm.value.holidayEnabled)
      }
    };
  }

  private currentSpecification(): FacilitySpecification {
    const record = this.currentRecord(this.state.activeFacility()?.published ?? false);
    return this.state.toSpecification(record);
  }

  private normalizeFieldOrder(): void {
    this.draftFields.update((items) =>
      items
        .slice()
        .sort((a, b) => a.displayOrder - b.displayOrder)
        .map((field, index) => ({ ...field, displayOrder: index + 1 }))
    );
  }

  private toast(message: string, action = 'OK', duration = 2400): void {
    this.snackBar.open(message, action, { duration });
  }

  private async persistBuilder(publishAfterSave: boolean, publishLocations: string[] = []): Promise<FacilityBuilderRecord> {
    const base = this.currentRecord(false);
    const existing = this.state.activeFacility();

    let facilityId = existing?.id ?? 0;
    if (!existing || existing.facilityName === 'Untitled Facility') {
      const created = await firstValueFrom(
        this.facilityAdminApi.createFacility({
          facilityName: base.facilityName,
          description: base.description,
          category: base.category,
          icon: base.icon,
          status: base.status
        })
      );
      facilityId = created.facilityId;
    } else {
      await firstValueFrom(
        this.facilityAdminApi.updateFacility(existing.id, {
          facilityName: base.facilityName,
          description: base.description,
          category: base.category,
          icon: base.icon,
          status: base.status
        })
      );
      facilityId = existing.id;
    }

    const draftFields = this.orderedFields();
    if (!existing || existing.facilityName === 'Untitled Facility') {
      for (const field of draftFields) {
        const createdField = await firstValueFrom(this.facilityAdminApi.addField(facilityId, this.toFieldPayload(field)));
        if (this.fieldUsesOptions(field.fieldType) && (field.options ?? []).length > 0) {
          await firstValueFrom(this.facilityAdminApi.addFieldOptions(createdField.fieldId, field.options ?? []));
        }
      }
    } else {
      const generated = await firstValueFrom(this.specificationApi.getGeneratedSpecification(facilityId));
      const existingFields = generated.fields ?? [];
      const draftById = new Map<number, FacilityField>();
      for (const field of draftFields) {
        if (field.fieldId) {
          draftById.set(field.fieldId, field);
        }
      }

      for (const current of existingFields) {
        if (current.fieldId && !draftById.has(current.fieldId)) {
          await firstValueFrom(this.facilityAdminApi.deleteField(current.fieldId));
        }
      }

      for (const field of draftFields) {
        if (field.fieldId) {
          const previous = existingFields.find((item) => item.fieldId === field.fieldId);
          if (!previous || this.isFieldChanged(previous, field)) {
            await firstValueFrom(this.facilityAdminApi.updateField(field.fieldId, this.toFieldPayload(field)));
            if (this.fieldUsesOptions(field.fieldType)) {
              await firstValueFrom(this.facilityAdminApi.addFieldOptions(field.fieldId, field.options ?? []));
            }
          }
          continue;
        }

        const createdField = await firstValueFrom(this.facilityAdminApi.addField(facilityId, this.toFieldPayload(field)));
        if (this.fieldUsesOptions(field.fieldType)) {
          await firstValueFrom(this.facilityAdminApi.addFieldOptions(createdField.fieldId, field.options ?? []));
        }
      }
    }

    await firstValueFrom(
      this.facilityAdminApi.saveRules(facilityId, {
        bookingDeadline: this.rulesForm.value.bookingDeadline || null,
        bookingStartTime: this.rulesForm.value.bookingStartTime || null,
        reminderTime: this.rulesForm.value.reminderTime || null,
        qrRequired: Boolean(this.rulesForm.value.qrRequired),
        allowCancellation: Boolean(this.rulesForm.value.allowCancellation),
        maximumCapacity: this.rulesForm.value.maximumCapacity ?? null,
        regularCommuteEnabled: Boolean(this.rulesForm.value.regularCommuteEnabled)
      })
    );

    if (publishAfterSave) {
      await firstValueFrom(this.facilityAdminApi.publishFacility(facilityId, { targetLocations: publishLocations }));
    }

    await this.state.loadFromBackend();
    const refreshed = this.state.facilities().find((item) => item.id === facilityId);
    if (refreshed) {
      this.state.setActiveFacility(refreshed.id);
      this.patchFromRecord(refreshed);
      return refreshed;
    }

    return {
      ...base,
      id: facilityId,
      published: publishAfterSave
    };
  }

  private toFieldPayload(field: FacilityField): {
    label: string;
    fieldType: string;
    placeholder?: string;
    required: boolean;
    displayOrder: number;
    validationJson?: string;
    defaultValue?: string;
  } {
    return {
      label: field.label,
      fieldType: field.fieldType,
      placeholder: field.placeholder,
      required: field.required,
      displayOrder: field.displayOrder,
      validationJson: field.validationJson,
      defaultValue: field.defaultValue
    };
  }

  private isFieldChanged(previous: FacilityField, next: FacilityField): boolean {
    if (previous.label !== next.label) {
      return true;
    }
    if (previous.fieldType !== next.fieldType) {
      return true;
    }
    if ((previous.placeholder ?? '') !== (next.placeholder ?? '')) {
      return true;
    }
    if (Boolean(previous.required) !== Boolean(next.required)) {
      return true;
    }
    if ((previous.displayOrder ?? 0) !== (next.displayOrder ?? 0)) {
      return true;
    }
    if ((previous.validationJson ?? '') !== (next.validationJson ?? '')) {
      return true;
    }
    if ((previous.defaultValue ?? '') !== (next.defaultValue ?? '')) {
      return true;
    }

    const oldOptions = (previous.options ?? []).map((item) => item.trim());
    const newOptions = (next.options ?? []).map((item) => item.trim());
    if (oldOptions.length !== newOptions.length) {
      return true;
    }
    for (let i = 0; i < oldOptions.length; i += 1) {
      if (oldOptions[i] !== newOptions[i]) {
        return true;
      }
    }
    return false;
  }

  private fieldUsesOptions(type: string): boolean {
    return type === 'DROPDOWN' || type === 'CHECKBOX' || type === 'RADIO_BUTTON';
  }

  private resolveCategoryValue(): string {
    const selected = (this.basicForm.value.category ?? '').trim();
    if (selected === 'Other') {
      const custom = (this.basicForm.value.customCategory ?? '').trim();
      return custom || 'General';
    }
    return selected || 'General';
  }

  private defaultLabelForFieldType(type: FacilityField['fieldType']): string {
    const map: Record<string, string> = {
      TEXTBOX: 'Text Input',
      TEXTAREA: 'Long Answer',
      DROPDOWN: 'Select Option',
      CHECKBOX: 'Checkbox Group',
      RADIO_BUTTON: 'Single Choice',
      DATE_PICKER: 'Select Date',
      TIME_PICKER: 'Select Time',
      EMAIL: 'Email Address',
      PHONE: 'Phone Number',
      NUMBER: 'Numeric Value',
      FILE_UPLOAD: 'Upload File',
      QR_SCANNER: 'QR Code',
      SIGNATURE: 'Signature'
    };
    return map[type] ?? 'Field';
  }
}
