import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { firstValueFrom } from 'rxjs';
import {
  NotificationChannel,
  NotificationDeliveryStatus,
  NotificationHistoryItem,
  NotificationTemplate,
  NotificationTemplateType,
  NotificationTrigger,
  TriggerEvent
} from '../../../core/models/admin.models';
import { AdminApiService } from '../../../core/services/admin-api.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-admin-notifications-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatButtonModule, MatIconModule, MatSelectModule],
  template: `
    <div class="space-y-6">
      <section class="rounded-2xl bg-white p-5 shadow-sm">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 class="text-2xl font-bold text-slate-900">Notification Management Center</h2>
            <p class="text-sm text-slate-600">Manage reusable templates, automation triggers, and sent notification history.</p>
          </div>
          <div class="flex flex-wrap gap-2">
            <button mat-stroked-button (click)="createTemplate()"><mat-icon>add</mat-icon>Create Template</button>
            <button mat-stroked-button (click)="testNotification()"><mat-icon>science</mat-icon>Test Notification</button>
            <button mat-flat-button color="primary" (click)="exportHistory()"><mat-icon>download</mat-icon>Export History</button>
          </div>
        </div>
      </section>

      <section class="rounded-2xl bg-white p-5 shadow-sm">
        <div class="mb-4 flex items-center justify-between">
          <h3 class="text-lg font-semibold text-slate-900">Notification Templates</h3>
          <span class="text-xs text-slate-500">Reusable template manager</span>
        </div>

        <div class="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
          <form [formGroup]="templateForm" class="grid gap-3 md:grid-cols-2">
            <label class="admin-field">Template Name<input class="admin-input" formControlName="templateName" /></label>
            <label class="admin-field">Notification Type
              <select class="admin-input" formControlName="notificationType">
                <option *ngFor="let type of notificationTypes" [value]="type.value">{{ type.label }}</option>
              </select>
            </label>
            <label class="admin-field md:col-span-2">Channel
              <mat-select formControlName="channels" multiple>
                <mat-option *ngFor="let channel of channels" [value]="channel">{{ channel }}</mat-option>
              </mat-select>
            </label>
            <label class="admin-field md:col-span-2">Subject<input class="admin-input" formControlName="subject" /></label>
            <label class="admin-field md:col-span-2">Message Template
              <textarea class="admin-input" rows="5" formControlName="messageTemplate"></textarea>
            </label>
            <div class="md:col-span-2 flex flex-wrap gap-2">
              <button type="button" class="placeholder-chip" *ngFor="let p of placeholders" (click)="appendPlaceholder(p)">{{ p }}</button>
            </div>
            <div class="md:col-span-2 flex flex-wrap gap-2 pt-1">
              <button mat-flat-button color="primary" type="button" (click)="saveTemplate()">Save Template</button>
              <button mat-stroked-button type="button" (click)="previewTemplate()">Preview</button>
              <button mat-stroked-button type="button" (click)="duplicateTemplate()">Duplicate</button>
              <button mat-stroked-button type="button" (click)="deleteTemplate()">Delete</button>
            </div>
            <p *ngIf="templatePreview()" class="md:col-span-2 rounded-lg bg-slate-100 p-3 text-sm text-slate-700">{{ templatePreview() }}</p>
          </form>

          <div class="rounded-xl border border-slate-200">
            <div class="border-b border-slate-200 px-3 py-2 text-sm font-semibold text-slate-800">Saved Templates</div>
            <div class="max-h-[420px] overflow-auto">
              <button
                type="button"
                *ngFor="let tpl of templates()"
                class="template-item"
                [class.template-item-active]="selectedTemplateId() === tpl.templateId"
                (click)="selectTemplate(tpl)"
              >
                <p class="font-semibold text-slate-900">{{ tpl.templateName }}</p>
                <p class="text-xs text-slate-500">{{ labelForType(tpl.notificationType) }} · {{ tpl.channels.join(', ') }}</p>
              </button>
            </div>
          </div>
        </div>
      </section>

      <section class="rounded-2xl bg-white p-5 shadow-sm">
        <div class="mb-4 flex items-center justify-between">
          <h3 class="text-lg font-semibold text-slate-900">Notification Triggers</h3>
          <button mat-flat-button color="primary" (click)="addTrigger()"><mat-icon>add</mat-icon>Add Trigger</button>
        </div>

        <div class="mb-4 grid gap-3 rounded-xl bg-slate-50 p-3 md:grid-cols-4">
          <label class="admin-field">Trigger Event
            <select class="admin-input" [formControl]="triggerForm.controls.triggerEvent">
              <option *ngFor="let event of triggerEvents" [value]="event">{{ event }}</option>
            </select>
          </label>
          <label class="admin-field">Template
            <select class="admin-input" [formControl]="triggerForm.controls.templateId">
              <option *ngFor="let tpl of templates()" [value]="tpl.templateId">{{ tpl.templateName }}</option>
            </select>
          </label>
          <label class="admin-field">Offset (Minutes)<input type="number" class="admin-input" [formControl]="triggerForm.controls.offsetMinutes" /></label>
          <label class="admin-field">Enabled
            <select class="admin-input" [formControl]="triggerForm.controls.enabled">
              <option [ngValue]="true">Enabled</option>
              <option [ngValue]="false">Disabled</option>
            </select>
          </label>
        </div>

        <div class="overflow-auto">
          <table class="w-full min-w-[760px] text-sm">
            <thead>
              <tr class="text-left text-slate-500">
                <th class="pb-2">Trigger Event</th>
                <th class="pb-2">Template</th>
                <th class="pb-2">Offset</th>
                <th class="pb-2">Enabled</th>
                <th class="pb-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let trigger of triggers()" class="border-t border-slate-100">
                <td class="py-2">{{ trigger.triggerEvent }}</td>
                <td class="py-2">{{ trigger.templateName }}</td>
                <td class="py-2">{{ trigger.offsetMinutes }} min</td>
                <td class="py-2"><span class="status-chip" [class.status-chip-on]="trigger.enabled">{{ trigger.enabled ? 'Enabled' : 'Disabled' }}</span></td>
                <td class="py-2 text-right">
                  <button mat-button (click)="editTrigger(trigger)">Edit</button>
                  <button mat-button (click)="removeTrigger(trigger)">Delete</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="rounded-2xl bg-white p-5 shadow-sm">
        <h3 class="text-lg font-semibold text-slate-900">Notification History</h3>
        <div class="mt-3 grid gap-3 rounded-xl bg-slate-50 p-3 md:grid-cols-5">
          <label class="admin-field md:col-span-2">Search<input class="admin-input" [formControl]="historyFilterForm.controls.query" placeholder="Employee, facility, template..." /></label>
          <label class="admin-field">Facility<input class="admin-input" [formControl]="historyFilterForm.controls.facility" /></label>
          <label class="admin-field">Status
            <select class="admin-input" [formControl]="historyFilterForm.controls.status">
              <option value="">All</option>
              <option *ngFor="let s of statuses" [value]="s">{{ s }}</option>
            </select>
          </label>
          <label class="admin-field">Channel
            <select class="admin-input" [formControl]="historyFilterForm.controls.channel">
              <option value="">All</option>
              <option *ngFor="let c of channels" [value]="c">{{ c }}</option>
            </select>
          </label>
        </div>
        <div class="mt-3 flex flex-wrap gap-2">
          <button mat-stroked-button (click)="loadHistory(1)">Search</button>
          <button mat-stroked-button (click)="clearHistoryFilters()">Reset</button>
          <button mat-stroked-button (click)="exportHistory()">Export CSV</button>
        </div>

        <div class="mt-4 overflow-auto">
          <table class="w-full min-w-[980px] text-sm">
            <thead>
              <tr class="text-left text-slate-500">
                <th class="pb-2">Employee</th>
                <th class="pb-2">Facility</th>
                <th class="pb-2">Template</th>
                <th class="pb-2">Channel</th>
                <th class="pb-2">Sent Time</th>
                <th class="pb-2">Opened</th>
                <th class="pb-2">Read</th>
                <th class="pb-2">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let item of historyItems()" class="border-t border-slate-100">
                <td class="py-2">{{ item.employeeName || item.employeeId }}</td>
                <td class="py-2">{{ item.facilityName }}</td>
                <td class="py-2">{{ item.templateName }}</td>
                <td class="py-2">{{ item.channel }}</td>
                <td class="py-2">{{ item.sentTime | date: 'short' }}</td>
                <td class="py-2">{{ item.opened ? 'Yes' : 'No' }}</td>
                <td class="py-2">{{ item.read ? 'Yes' : 'No' }}</td>
                <td class="py-2"><span class="status-chip" [ngClass]="statusClass(item.status)">{{ item.status }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="mt-4 flex items-center justify-between text-sm text-slate-600">
          <p>Showing {{ historyItems().length }} of {{ historyTotal() }} notifications</p>
          <div class="flex items-center gap-2">
            <button mat-stroked-button [disabled]="historyPage() <= 1" (click)="loadHistory(historyPage() - 1)">Prev</button>
            <span>Page {{ historyPage() }}</span>
            <button mat-stroked-button [disabled]="historyPage() >= totalPages()" (click)="loadHistory(historyPage() + 1)">Next</button>
          </div>
        </div>
      </section>
    </div>
  `,
  styles: [
    `
      .admin-input {
        width: 100%;
        border: 1px solid #cbd5e1;
        border-radius: 0.65rem;
        padding: 0.55rem 0.7rem;
        background: #ffffff;
      }

      .admin-field {
        display: grid;
        gap: 0.35rem;
        font-size: 0.8rem;
        font-weight: 600;
        color: #334155;
      }

      .placeholder-chip {
        border: 1px solid #cbd5e1;
        border-radius: 999px;
        padding: 0.2rem 0.55rem;
        font-size: 0.72rem;
        font-weight: 600;
        color: #334155;
        background: #f8fafc;
      }

      .template-item {
        display: block;
        width: 100%;
        text-align: left;
        border-bottom: 1px solid #e2e8f0;
        padding: 0.75rem;
      }

      .template-item:hover {
        background: #f8fafc;
      }

      .template-item-active {
        background: #eef6ff;
      }

      .status-chip {
        border-radius: 999px;
        padding: 0.15rem 0.55rem;
        font-size: 0.72rem;
        font-weight: 700;
        background: #e2e8f0;
        color: #334155;
      }

      .status-chip-on {
        background: #dcfce7;
        color: #166534;
      }

      .status-pending {
        background: #fef9c3;
        color: #854d0e;
      }

      .status-processing {
        background: #dbeafe;
        color: #1e3a8a;
      }

      .status-sent {
        background: #dcfce7;
        color: #166534;
      }

      .status-failed {
        background: #fee2e2;
        color: #991b1b;
      }
    `
  ]
})
export class AdminNotificationsPageComponent implements OnInit {
  readonly channels: NotificationChannel[] = ['IN_APP', 'EMAIL', 'SMS', 'PUSH'];
  readonly statuses: NotificationDeliveryStatus[] = ['PENDING', 'PROCESSING', 'SENT', 'FAILED'];
  readonly triggerEvents: TriggerEvent[] = [
    'BOOKING_CREATED',
    'BOOKING_CANCELLED',
    'BOOKING_DEADLINE',
    'FACILITY_PUBLISHED',
    'APPROVAL',
    'REJECTION',
    'EMPLOYEE_REGISTERED'
  ];
  readonly placeholders = ['{{employeeName}}', '{{facilityName}}', '{{bookingDate}}', '{{deadlineTime}}', '{{office}}'];
  readonly notificationTypes: Array<{ label: string; value: NotificationTemplateType }> = [
    { label: 'Booking Confirmation', value: 'BOOKING_CONFIRMATION' },
    { label: 'Booking Reminder', value: 'BOOKING_REMINDER' },
    { label: 'Facility Published', value: 'FACILITY_PUBLISHED' },
    { label: 'Booking Cancelled', value: 'BOOKING_CANCELLED' },
    { label: 'Approval', value: 'APPROVAL' },
    { label: 'Rejection', value: 'REJECTION' },
    { label: 'System Announcement', value: 'SYSTEM_ANNOUNCEMENT' }
  ];

  readonly templates = signal<NotificationTemplate[]>([]);
  readonly triggers = signal<NotificationTrigger[]>([]);
  readonly historyItems = signal<NotificationHistoryItem[]>([]);
  readonly historyTotal = signal(0);
  readonly historyPage = signal(1);
  readonly historyPageSize = signal(10);
  readonly selectedTemplateId = signal<number | null>(null);
  readonly templatePreview = signal('');

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.historyTotal() / this.historyPageSize())));

  readonly templateForm = this.fb.group({
    templateId: [null as number | null],
    templateName: ['', Validators.required],
    notificationType: ['BOOKING_CONFIRMATION' as NotificationTemplateType, Validators.required],
    channels: [['IN_APP'] as NotificationChannel[], Validators.required],
    subject: ['', Validators.required],
    messageTemplate: ['', Validators.required]
  });

  readonly triggerForm = this.fb.group({
    triggerId: [null as number | null],
    triggerEvent: ['BOOKING_CREATED' as TriggerEvent, Validators.required],
    templateId: [0, Validators.required],
    offsetMinutes: [0, Validators.required],
    enabled: [true, Validators.required]
  });

  readonly historyFilterForm = this.fb.group({
    query: [''],
    facility: [''],
    status: [''],
    channel: [''],
    date: ['']
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly adminApi: AdminApiService,
    private readonly toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.bootstrap();
  }

  async bootstrap(): Promise<void> {
    await Promise.all([this.loadTemplates(), this.loadTriggers(), this.loadHistory(1)]);
  }

  createTemplate(): void {
    this.selectedTemplateId.set(null);
    this.templatePreview.set('');
    this.templateForm.reset({
      templateId: null,
      templateName: '',
      notificationType: 'BOOKING_CONFIRMATION',
      channels: ['IN_APP'],
      subject: '',
      messageTemplate: ''
    });
  }

  appendPlaceholder(placeholder: string): void {
    const current = this.templateForm.value.messageTemplate ?? '';
    this.templateForm.patchValue({ messageTemplate: `${current} ${placeholder}`.trim() });
  }

  previewTemplate(): void {
    const message = this.templateForm.value.messageTemplate ?? '';
    const rendered = message
      .replaceAll('{{employeeName}}', 'Alex Johnson')
      .replaceAll('{{facilityName}}', 'Lunch Booking')
      .replaceAll('{{bookingDate}}', '2026-07-08')
      .replaceAll('{{deadlineTime}}', '11:00')
      .replaceAll('{{office}}', 'Hyderabad');
    this.templatePreview.set(rendered || 'No template content to preview');
  }

  async saveTemplate(): Promise<void> {
    if (this.templateForm.invalid) {
      this.toastService.show('Fill all required template fields', 'error');
      return;
    }

    const raw = this.templateForm.getRawValue();
    try {
      const saved = await firstValueFrom(
        this.adminApi.saveNotificationTemplate({
          templateId: raw.templateId ?? undefined,
          templateName: raw.templateName ?? '',
          notificationType: raw.notificationType ?? 'BOOKING_CONFIRMATION',
          channels: raw.channels ?? ['IN_APP'],
          subject: raw.subject ?? '',
          messageTemplate: raw.messageTemplate ?? ''
        })
      );

      this.upsertTemplate(saved);
      this.selectedTemplateId.set(saved.templateId);
      this.templateForm.patchValue({ templateId: saved.templateId });
      this.toastService.show('Template saved', 'success');
    } catch (error: any) {
      this.toastService.show(error?.error?.message ?? 'Failed to save template', 'error');
    }
  }

  duplicateTemplate(): void {
    const raw = this.templateForm.getRawValue();
    this.templateForm.patchValue({
      templateId: null,
      templateName: `${raw.templateName ?? 'Template'} Copy`
    });
    this.selectedTemplateId.set(null);
  }

  async deleteTemplate(): Promise<void> {
    const templateId = this.templateForm.value.templateId;
    if (!templateId) {
      return;
    }
    try {
      await firstValueFrom(this.adminApi.deleteNotificationTemplate(templateId));
      this.templates.update((items) => items.filter((item) => item.templateId !== templateId));
      this.createTemplate();
      this.toastService.show('Template deleted', 'success');
    } catch (error: any) {
      this.toastService.show(error?.error?.message ?? 'Failed to delete template', 'error');
    }
  }

  selectTemplate(template: NotificationTemplate): void {
    this.selectedTemplateId.set(template.templateId);
    this.templatePreview.set('');
    this.templateForm.patchValue({
      templateId: template.templateId,
      templateName: template.templateName,
      notificationType: template.notificationType,
      channels: template.channels,
      subject: template.subject,
      messageTemplate: template.messageTemplate
    });
  }

  async addTrigger(): Promise<void> {
    if (this.triggerForm.invalid) {
      this.toastService.show('Fill trigger configuration before saving', 'error');
      return;
    }

    const raw = this.triggerForm.getRawValue();
    try {
      const saved = await firstValueFrom(
        this.adminApi.saveNotificationTrigger({
          triggerId: raw.triggerId ?? undefined,
          triggerEvent: raw.triggerEvent ?? 'BOOKING_CREATED',
          templateId: Number(raw.templateId ?? 0),
          offsetMinutes: Number(raw.offsetMinutes ?? 0),
          enabled: raw.enabled !== false
        })
      );

      this.triggers.update((items) => {
        const idx = items.findIndex((item) => item.triggerId === saved.triggerId);
        if (idx === -1) {
          return [saved, ...items];
        }
        const copy = [...items];
        copy[idx] = saved;
        return copy;
      });
      this.toastService.show('Trigger saved', 'success');
    } catch (error: any) {
      this.toastService.show(error?.error?.message ?? 'Failed to save trigger', 'error');
    }
  }

  editTrigger(trigger: NotificationTrigger): void {
    this.triggerForm.patchValue({
      triggerId: trigger.triggerId,
      triggerEvent: trigger.triggerEvent,
      templateId: trigger.templateId,
      offsetMinutes: trigger.offsetMinutes,
      enabled: trigger.enabled
    });
  }

  async removeTrigger(trigger: NotificationTrigger): Promise<void> {
    try {
      await firstValueFrom(this.adminApi.deleteNotificationTrigger(trigger.triggerId));
      this.triggers.update((items) => items.filter((item) => item.triggerId !== trigger.triggerId));
      this.toastService.show('Trigger deleted', 'success');
    } catch (error: any) {
      this.toastService.show(error?.error?.message ?? 'Failed to delete trigger', 'error');
    }
  }

  async testNotification(): Promise<void> {
    const templateId = this.templateForm.value.templateId;
    if (!templateId) {
      this.toastService.show('Select or save a template first', 'error');
      return;
    }

    try {
      const response = await firstValueFrom(
        this.adminApi.testNotification({
          templateId,
          employeeId: 'EMP001',
          channels: this.templateForm.value.channels ?? ['IN_APP'],
          placeholders: {
            employeeName: 'Alex Johnson',
            facilityName: 'Lunch Booking',
            bookingDate: '2026-07-08',
            deadlineTime: '11:00',
            office: 'Hyderabad'
          }
        })
      );
      this.toastService.show(response.message || 'Test notification submitted', response.success ? 'success' : 'info');
    } catch (error: any) {
      this.toastService.show(error?.error?.message ?? 'Failed to test notification', 'error');
    }
  }

  async loadHistory(page: number): Promise<void> {
    const nextPage = Math.max(1, page);
    this.historyPage.set(nextPage);
    const filters = this.historyFilterForm.value;
    try {
      const response = await firstValueFrom(
        this.adminApi.getNotificationHistory({
          query: filters.query || null,
          facility: filters.facility || null,
          status: filters.status || null,
          channel: (filters.channel as NotificationChannel) || null,
          date: filters.date || null,
          page: nextPage,
          pageSize: this.historyPageSize()
        })
      );
      this.historyItems.set(response.items ?? []);
      this.historyTotal.set(response.total ?? 0);
    } catch (error: any) {
      this.toastService.show(error?.error?.message ?? 'Failed to load notification history', 'error');
      this.historyItems.set([]);
      this.historyTotal.set(0);
    }
  }

  clearHistoryFilters(): void {
    this.historyFilterForm.reset({ query: '', facility: '', status: '', channel: '', date: '' });
    this.loadHistory(1);
  }

  exportHistory(): void {
    const rows = this.historyItems();
    const header = ['Employee', 'Facility', 'Template', 'Channel', 'Sent Time', 'Opened', 'Read', 'Status'];
    const data = rows.map((row) => [
      row.employeeName || row.employeeId,
      row.facilityName,
      row.templateName,
      row.channel,
      row.sentTime,
      row.opened ? 'Yes' : 'No',
      row.read ? 'Yes' : 'No',
      row.status
    ]);

    const csv = [header, ...data]
      .map((line) => line.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `notification-history-page-${this.historyPage()}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  labelForType(type: NotificationTemplateType): string {
    return this.notificationTypes.find((item) => item.value === type)?.label ?? type;
  }

  statusClass(status: NotificationDeliveryStatus): string {
    switch (status) {
      case 'PENDING':
        return 'status-pending';
      case 'PROCESSING':
        return 'status-processing';
      case 'SENT':
        return 'status-sent';
      case 'FAILED':
        return 'status-failed';
      default:
        return '';
    }
  }

  private async loadTemplates(): Promise<void> {
    try {
      const data = await firstValueFrom(this.adminApi.getNotificationTemplates());
      this.templates.set(data ?? []);
      if (data.length > 0) {
        this.selectTemplate(data[0]);
      }
    } catch (error: any) {
      this.toastService.show(error?.error?.message ?? 'Failed to load templates', 'error');
      this.templates.set([]);
    }
  }

  private async loadTriggers(): Promise<void> {
    try {
      const data = await firstValueFrom(this.adminApi.getNotificationTriggers());
      this.triggers.set(data ?? []);
    } catch (error: any) {
      this.toastService.show(error?.error?.message ?? 'Failed to load triggers', 'error');
      this.triggers.set([]);
    }
  }

  private upsertTemplate(saved: NotificationTemplate): void {
    this.templates.update((items) => {
      const idx = items.findIndex((item) => item.templateId === saved.templateId);
      if (idx === -1) {
        return [saved, ...items];
      }
      const copy = [...items];
      copy[idx] = saved;
      return copy;
    });
  }
}
