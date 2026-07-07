import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatExpansionModule } from '@angular/material/expansion';

@Component({
  selector: 'app-builder-publish-panel',
  standalone: true,
  imports: [CommonModule, MatExpansionModule],
  template: `
    <section class="space-y-4 py-2">
      <div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <h4 class="text-sm font-semibold text-slate-900">Publish Checklist</h4>
        <p class="mt-1 text-xs text-slate-600">Save draft after changes, verify preview, then publish to selected office locations.</p>
      </div>

      <section class="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <button class="satori-secondary" (click)="saveDraft.emit()">Save Draft</button>
        <button class="satori-primary" (click)="publish.emit()">Publish Facility</button>
        <button class="satori-secondary" (click)="generateJson.emit()">Regenerate JSON</button>
        <button class="satori-secondary" (click)="downloadJson.emit()">Download JSON</button>
        <button class="satori-secondary" (click)="importJson.emit()">Import JSON</button>
      </section>
    </section>

    <mat-expansion-panel>
      <mat-expansion-panel-header>
        <mat-panel-title>Generated Specification JSON</mat-panel-title>
      </mat-expansion-panel-header>
      <pre class="max-h-80 overflow-auto rounded-xl bg-slate-900 p-3 text-xs text-slate-100">{{ generatedJson }}</pre>
    </mat-expansion-panel>
  `
})
export class BuilderPublishPanelComponent {
  @Input() generatedJson = '';

  @Output() saveDraft = new EventEmitter<void>();
  @Output() publish = new EventEmitter<void>();
  @Output() generateJson = new EventEmitter<void>();
  @Output() downloadJson = new EventEmitter<void>();
  @Output() importJson = new EventEmitter<void>();
}
