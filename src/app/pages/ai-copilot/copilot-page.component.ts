import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { AiCopilotComponent } from './ai-copilot.component';
import { ApiConnectionCopilotComponent } from '../api-connection-copilot/api-connection-copilot.component';

@Component({
  standalone: true,
  imports: [CommonModule, AiCopilotComponent, ApiConnectionCopilotComponent],
  template: `
    <ng-container *ngIf="params$ | async as params">
      <app-api-connection-copilot
        *ngIf="params['connection_id'] || params['pool_id']; else jobCopilot"
        [connectionId]="params['connection_id'] || params['pool_id']">
      </app-api-connection-copilot>
      <ng-template #jobCopilot><app-ai-copilot></app-ai-copilot></ng-template>
    </ng-container>
  `
})
export class CopilotPageComponent {
  readonly params$ = inject(ActivatedRoute).queryParams;
}
