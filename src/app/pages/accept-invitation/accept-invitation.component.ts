import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { OrgService } from '../../services/org.service';
import { AlertService } from '../../services/alert.service';

@Component({
  selector: 'app-accept-invitation',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-white font-sans">
      <div class="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-8 shadow-2xl text-center space-y-6">
        
        <div class="w-16 h-16 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center mx-auto">
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/></svg>
        </div>

        <div>
          <h2 class="text-2xl font-extrabold text-white">Join Organization</h2>
          <p class="text-xs text-slate-400 mt-1">Accepting invitation to collaborate on HireUp Recruitment Platform.</p>
        </div>

        <div *ngIf="isProcessing" class="py-6 flex flex-col items-center gap-3 text-indigo-400">
          <svg class="w-8 h-8 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
          <span class="text-xs font-semibold">Validating invitation token...</span>
        </div>

        <div *ngIf="requiresLogin" class="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-300 text-xs space-y-4">
          <p>You need to create an account or log in to join this organization.</p>
          <div class="flex flex-col sm:flex-row justify-center gap-3">
            <a [routerLink]="['/auth/register']" [queryParams]="{ returnUrl: '/accept-invitation?token=' + token }" class="inline-block px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-900 rounded-xl font-bold transition-all">Create Account</a>
            <a [routerLink]="['/auth/login']" [queryParams]="{ returnUrl: '/accept-invitation?token=' + token }" class="inline-block px-4 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-xl font-bold transition-all border border-amber-500/30">Log In</a>
          </div>
        </div>

        <div *ngIf="errorMessage" class="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-300 text-xs space-y-3">
          <p>{{ errorMessage }}</p>
          <a routerLink="/dashboard" class="inline-block px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all">Go to Dashboard</a>
        </div>

        <div *ngIf="successMessage" class="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-300 text-xs space-y-3">
          <p>{{ successMessage }}</p>
          <button (click)="goToDashboard()" class="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg transition-all">Enter Organization Workspace</button>
        </div>

      </div>
    </div>
  `
})
export class AcceptInvitationComponent implements OnInit {
  token = '';
  isProcessing = true;
  requiresLogin = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private orgService: OrgService,
    private alertService: AlertService
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.token = params['token'] || '';
      if (!this.token) {
        this.isProcessing = false;
        this.errorMessage = 'No invitation token provided in URL.';
        return;
      }

      // Check if user is logged in
      const authToken = localStorage.getItem('token');
      if (!authToken) {
        this.isProcessing = false;
        this.requiresLogin = true;
        return;
      }

      this.processAccept();
    });
  }

  processAccept(): void {
    this.requiresLogin = false;
    this.isProcessing = true;
    this.orgService.acceptInvitation(this.token).subscribe({
      next: (res) => {
        this.isProcessing = false;
        this.successMessage = res?.message || 'Successfully joined organization!';
        this.alertService.showSuccess(this.successMessage);
      },
      error: (err) => {
        this.isProcessing = false;
        this.errorMessage = err?.error?.detail || 'Invitation link is invalid or has expired.';
      }
    });
  }

  goToDashboard(): void {
    this.orgService.loadMyOrganizations().subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: () => this.router.navigate(['/dashboard'])
    });
  }
}
