import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { OrgService, Organization } from '../../services/org.service';
import { AlertService } from '../../services/alert.service';
import { SelectedJobService } from '../../services/selected-job.service';

@Component({
  selector: 'app-org-switcher',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="relative inline-block text-left w-[220px]">
      <!-- Active Org Trigger Button -->
      <button
        (click)="isOpen = !isOpen"
        type="button"
        class="w-full h-8 flex items-center justify-between gap-2 px-2 bg-muted/50 hover:bg-muted text-foreground rounded-md border border-border shadow-sm transition-all text-left">
        
        <div class="flex items-center gap-2 min-w-0">
          <div class="w-5 h-5 rounded flex items-center justify-center bg-primary text-primary-foreground font-bold text-[10px] shrink-0 shadow-sm">
            {{ currentOrg?.name ? currentOrg!.name.charAt(0).toUpperCase() : 'O' }}
          </div>
          <div class="min-w-0 flex-1 flex items-center gap-1.5">
            <h4 class="text-[11px] font-semibold text-foreground truncate leading-none mt-0.5">
              {{ currentOrg?.name || 'Loading...' }}
            </h4>
            <span class="text-[9px] font-medium text-primary bg-primary/10 px-1 rounded inline-block">
              {{ currentOrg?.role || 'Member' }}
            </span>
          </div>
        </div>

        <svg class="w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform duration-200" [class.rotate-180]="isOpen" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
        </svg>
      </button>

      <!-- Dropdown Menu -->
      <div
        *ngIf="isOpen"
        (click)="$event.stopPropagation()"
        class="absolute left-0 right-0 mt-1 z-50 bg-card border border-border rounded-md shadow-md overflow-hidden animate-in fade-in zoom-in duration-150">
        
        <div class="px-3 py-1.5 border-b border-border bg-muted/30">
          <span class="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Switch Workspace</span>
        </div>

        <div class="max-h-56 overflow-y-auto py-1">
          <button
            *ngFor="let org of myOrganizations"
            (click)="selectOrg(org)"
            class="w-full flex items-center justify-between px-3 py-2 hover:bg-muted transition-colors text-left"
            [ngClass]="{'bg-primary/5': org.id === currentOrg?.id}">
            
            <div class="flex items-center gap-2 min-w-0">
              <div class="w-5 h-5 rounded bg-muted border border-border flex items-center justify-center text-[10px] font-bold text-foreground">
                {{ org.name.charAt(0).toUpperCase() }}
              </div>
              <div class="min-w-0 flex items-center gap-1.5 mt-0.5">
                <p class="text-[11px] font-medium text-foreground truncate">{{ org.name }}</p>
                <p class="text-[9px] text-muted-foreground">{{ org.role || 'Member' }}</p>
              </div>
            </div>

            <svg *ngIf="org.id === currentOrg?.id" class="w-3 h-3 text-primary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
            </svg>
          </button>
        </div>

        <!-- Create New Org Trigger -->
        <div class="p-1.5 border-t border-border bg-muted/20">
          <button
            (click)="openCreateModal()"
            class="w-full flex items-center justify-center gap-1.5 h-7 bg-primary/10 hover:bg-primary/20 text-primary rounded text-[11px] font-semibold transition-all border border-primary/20">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
            <span>Create New</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Create Org Modal -->
    <div *ngIf="showCreateModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-xs">
      <div class="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-200">
        
        <div class="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h3 class="text-lg font-bold text-slate-900">Create Organization</h3>
            <p class="text-xs text-slate-500 mt-0.5">Set up a workspace for your team</p>
          </div>
          <button (click)="showCreateModal = false" class="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <div class="py-4 space-y-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Organization Name *</label>
            <input
              type="text"
              [(ngModel)]="newOrgName"
              placeholder="e.g. Acme Health Corp"
              class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-900"
            />
          </div>
        </div>

        <div class="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
          <button
            (click)="showCreateModal = false"
            class="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold text-xs transition-colors">
            Cancel
          </button>
          <button
            (click)="submitCreateOrg()"
            [disabled]="isSaving"
            class="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-xs shadow-md transition-all flex items-center gap-1.5">
            <svg *ngIf="isSaving" class="w-3.5 h-3.5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
            Create Workspace
          </button>
        </div>

      </div>
    </div>
  `
})
export class OrgSwitcherComponent implements OnInit, OnDestroy {
  isOpen = false;
  showCreateModal = false;
  newOrgName = '';
  isSaving = false;

  myOrganizations: Organization[] = [];
  currentOrg: Organization | null = null;

  private subs: Subscription[] = [];

  constructor(
    private orgService: OrgService,
    private alertService: AlertService,
    private selectedJobService: SelectedJobService
  ) {}

  ngOnInit(): void {
    this.subs.push(
      this.orgService.myOrganizations$.subscribe(orgs => {
        this.myOrganizations = orgs;
      }),
      this.orgService.currentOrg$.subscribe(org => {
        this.currentOrg = org;
      })
    );

    this.orgService.loadMyOrganizations().subscribe({
      error: (err) => console.error('Failed to load orgs:', err)
    });
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  selectOrg(org: Organization): void {
    const orgChanged = org.id !== this.currentOrg?.id;
    if (orgChanged) {
      this.selectedJobService.setSelectedJobId(null);
    }
    this.orgService.setCurrentOrg(org);
    this.isOpen = false;
    this.alertService.showSuccess(`Switched workspace to "${org.name}"`);
    window.location.reload();
  }

  openCreateModal(): void {
    this.isOpen = false;
    this.newOrgName = '';
    this.showCreateModal = true;
  }

  submitCreateOrg(): void {
    if (!this.newOrgName.trim()) {
      this.alertService.showDanger('Please provide an organization name.');
      return;
    }

    this.isSaving = true;
    this.orgService.createOrganization(this.newOrgName.trim()).subscribe({
      next: (res) => {
        this.isSaving = false;
        this.showCreateModal = false;
        this.selectedJobService.setSelectedJobId(null);
        this.alertService.showSuccess(`Organization "${this.newOrgName}" created!`);
        window.location.reload();
      },
      error: (err) => {
        this.isSaving = false;
        this.alertService.showDanger(err?.error?.detail || 'Failed to create organization.');
      }
    });
  }
}
