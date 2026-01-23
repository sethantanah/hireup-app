import { Component } from '@angular/core';
import { ApplicantManagementService, CandidateStatus } from '../../../services/applicant-management.service';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-tracking',
  templateUrl: './tracking.component.html',
  styleUrl: './tracking.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class TrackingComponent {
  email: string = '';
  candidateStatus$!: Observable<CandidateStatus[]>;
  errorMessage: string = '';
  loading: boolean = false;

  // Helper methods for the template
  getActiveApplications(results: any[]): number {
    return results.filter(app =>
      app.history?.some((stage: any) => stage.status === 'active')
    ).length;
  }

  getCompletedStages(results: any[]): number {
    return results.reduce((total, app) => {
      return total + (app.history?.filter((stage: any) => stage.status === 'completed').length || 0);
    }, 0);
  }

  getStatusClass(stage: string): string {
    const statusClasses: { [key: string]: string } = {
      'Under Review': 'bg-blue-100 text-blue-800',
      'Interview Scheduled': 'bg-purple-100 text-purple-800',
      'Technical Assessment': 'bg-amber-100 text-amber-800',
      'Final Review': 'bg-green-100 text-green-800',
      'Offer Sent': 'bg-emerald-100 text-emerald-800',
      'Rejected': 'bg-red-100 text-red-800'
    };
    return statusClasses[stage] || 'bg-gray-100 text-gray-800';
  }

  getStageStatusClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'active':
        return 'bg-indigo-100 text-indigo-800';
      case 'pending':
        return 'bg-gray-100 text-gray-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getProgressPercentage(history: any[]): number {
    if (!history || history.length === 0) return 0;
    const stageProgress = history.filter(stage => stage.status === 'shortlisted' || stage.status === 'unshortlisted').length;
    if(stageProgress == 1){
      return 30
    }
    const completed = stageProgress
    return Math.round((completed / history.length) * 100);
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'Recently';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  constructor(private applicantService: ApplicantManagementService) { }

  loadCandidateStatus(): void {
    this.errorMessage = '';
    if (!this.email) {
      this.errorMessage = 'Please enter an email address.';
      return;
    }

    this.loading = true;
    this.candidateStatus$ = this.applicantService.getApplicantStatus(this.email)
      .pipe(
        catchError((err) => {
          this.loading = false;
          if (err.status === 404) {
            this.errorMessage = 'No applications found for this email.';
          } else {
            this.errorMessage = 'An unexpected error occurred.';
          }
          return of([]);
        })
      );

    // stop loading after observable emits
    this.candidateStatus$.subscribe(() => this.loading = false);
  }
}
