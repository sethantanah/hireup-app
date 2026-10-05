import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TalentManagementService } from '../../../services/talent-management.service';
import { JobpostingsApiService } from '../../../services/jobpostings-api.service';
import { DataService } from '../../../services/data.service';
import { AlertService } from '../../../services/alert.service';
import { AuthService } from '../../../services/auth.service';
import { CustomDropdownComponent } from '../../../components/custom-dropdown/custom-dropdown.component';
import { SelectedJobService } from '../../../services/selected-job.service';
import { CandidateDetailsComponent } from '../../dashboard/components/candidate-details/candidate-details.component';
import { ScorecardManagerComponent } from '../scorecard-manager/scorecard-manager.component';
import { ScheduleInterviewModalComponent } from '../../../components/schedule-interview-modal/schedule-interview-modal.component';

export interface ScheduledInterview {
  id: string;
  jobpost_id: string;
  job_title: string;
  candidate_id: string;
  candidate_email: string;
  candidate_name: string;
  interview_type: string;
  interview_date: string;
  interview_time: string;
  duration_minutes: number;
  meeting_link?: string;
  location?: string;
  interviewers?: any[];
  notes?: string;
  scheduled_by?: string;
  status: 'scheduled' | 'completed' | 'rescheduled' | 'cancelled' | string;
  created_at?: string;
  updated_at?: string;
}

@Component({
  selector: 'app-scheduled-interviews',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    CustomDropdownComponent,
    CandidateDetailsComponent,
    ScorecardManagerComponent,
    ScheduleInterviewModalComponent
  ],
  templateUrl: './scheduled-interviews.component.html',
  styleUrl: './scheduled-interviews.component.scss'
})
export class ScheduledInterviewsComponent implements OnInit {
  interviews: ScheduledInterview[] = [];
  filteredInterviews: ScheduledInterview[] = [];

  loading = false;
  errorMsg = '';
  successMsg = '';

  // Workspace shell state (aligned with HireUp dashboard)
  sidebarOpen = false;
  showToolsMenu = true;
  userData: any = null;
  jobPostings: any[] = [];
  selectedJobPost: any = null;

  // Filter state
  selectedJobId: string = 'all';
  selectedStatus: string = 'all';
  searchQuery: string = '';

  availableJobPosts: Array<{ id: string; label: string }> = [
    { id: 'all', label: 'All Jobs' }
  ];

  statusOptions = [
    { id: 'all', label: 'All Statuses' },
    { id: 'scheduled', label: 'Upcoming / Scheduled' },
    { id: 'expired', label: 'Slot Passed (Needs Action)' },
    { id: 'completed', label: 'Completed' },
    { id: 'rescheduled', label: 'Rescheduled' },
    { id: 'cancelled', label: 'Cancelled' }
  ];

  // Selection & Bulk actions
  selectedInterviewIds: Set<string> = new Set();
  isSelectAll = false;

  // Reschedule Modal state
  showRescheduleModal = false;
  targetInterviewsForReschedule: ScheduledInterview[] = [];
  newRescheduleDate = '';
  newRescheduleTime = '';
  newMeetingLink = '';
  rescheduleNotes = '';
  sendNotification = true;
  isSavingReschedule = false;

  // Batch Schedule Modal state
  showBatchScheduleModal = false;

  get selectedJobPostObj(): any {
    if (this.selectedJobId === 'all' || !this.selectedJobId) return null;
    const found = this.availableJobPosts.find(j => j.id === this.selectedJobId);
    return found ? { id: found.id, title: found.label } : null;
  }

  get availableJobPostsForModal(): any[] {
    return this.availableJobPosts
      .filter(j => j.id !== 'all')
      .map(j => ({ id: j.id, title: j.label }));
  }

  get headerJobOptions(): Array<{ id: string; label: string }> {
    const opts = [...this.availableJobPosts];
    if (this.selectedJobId && this.selectedJobId !== 'all' && !opts.find(o => o.id === this.selectedJobId)) {
      const jp = this.jobPostings.find((j: any) => j.id === this.selectedJobId);
      opts.push({ id: this.selectedJobId, label: jp?.title || this.selectedJobId });
    }
    return opts;
  }

  openCreateInterviewModal(): void {
    this.showBatchScheduleModal = true;
  }

  closeBatchScheduleModal(): void {
    this.showBatchScheduleModal = false;
  }

  onBatchScheduled(count: number): void {
    this.loadInterviews();
  }

  closeCreateModal(): void {
    this.showBatchScheduleModal = false;
  }

  constructor(
    private talentSvc: TalentManagementService,
    private jobpostingsApi: JobpostingsApiService,
    public dataService: DataService,
    private alertService: AlertService,
    private router: Router,
    private route: ActivatedRoute,
    private location: Location,
    private authService: AuthService,
    private selectedJobService: SelectedJobService
  ) {}

  ngOnInit(): void {
    try {
      const userStr = localStorage.getItem('USER');
      if (userStr) this.userData = JSON.parse(userStr);
    } catch {}
    // Centralized job context: query param takes precedence, else service
    this.route.queryParams.subscribe(params => {
      if (params['jobId'] && params['jobId'] !== this.selectedJobId) {
        // persist to centralized service
        this.selectedJobService.setSelectedJobId(params['jobId']);
      }
    });
    // Subscribe to centralized selected job
    this.selectedJobService.selectedJobId$.subscribe(id => {
      const mapped = id || 'all';
      if (mapped !== this.selectedJobId) {
        this.selectedJobId = mapped;
        const exists = this.availableJobPosts.find(j => j.id === mapped);
        if (!exists && mapped !== 'all' && this.jobPostings.length) {
          const jp = this.jobPostings.find((j:any) => j.id === mapped);
          if (jp) this.availableJobPosts = [...this.availableJobPosts, { id: jp.id, label: jp.title }];
        }
        this.syncSelectedJobPost();
        this.loadInterviews();
        this.applyFilters();
      }
    });
    // initialize from service if no query param
    const svcId = this.selectedJobService.selectedJobId;
    if (svcId && svcId !== this.selectedJobId) {
      this.selectedJobId = svcId;
      this.syncSelectedJobPost();
    }
    this.loadJobPosts();
    this.loadInterviews();
    this.loadSidebarJobPostings();
  }

  private syncSelectedJobPost(): void {
    if (this.selectedJobId && this.selectedJobId !== 'all') {
      const found = this.jobPostings.find((j:any) => j.id === this.selectedJobId);
      if (found) this.selectedJobPost = found;
    } else {
      this.selectedJobPost = null;
    }
  }

  goBack(): void {
    this.location.back();
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  logOut(): void {
    this.authService.logOut();
  }

  getInitials(name: string): string {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  selectJobFromSidebar(job: any): void {
    this.selectedJobPost = job;
    this.selectedJobId = job.id;
    this.selectedJobService.setSelectedJobId(job.id);
    this.applyFilters();
  }

  private loadSidebarJobPostings(): void {
    try {
      const userStr = localStorage.getItem('USER');
      if (!userStr) return;
      const user = JSON.parse(userStr);
      if (!user?.id) return;
      this.jobpostingsApi.getJobPostings(user.id).subscribe({
        next: (data: any) => {
          this.jobPostings = (data as any[]) || [];
          if (this.jobPostings.length > 0 && !this.selectedJobPost && (!this.selectedJobId || this.selectedJobId === 'all')) {
            // keep header showing All by default, don't auto-select first job for header consistency
          }
          this.syncSelectedJobPost();
        }
      });
    } catch {}
  }

  loadJobPosts(): void {
    try {
      const userStr = localStorage.getItem('USER');
      if (userStr) {
        const user = JSON.parse(userStr);
        if (user && user.id) {
          this.jobpostingsApi.getJobPostings(user.id).subscribe({
            next: (jobs: any[]) => {
              const list = (jobs || []).map(j => ({ id: j.id, label: j.title || 'Untitled Job' }));
              this.availableJobPosts = [{ id: 'all', label: 'All Jobs' }, ...list];
              this.syncSelectedJobPost();
            }
          });
        }
      }
    } catch (e) {}
  }

  loadInterviews(): void {
    this.loading = true;
    this.errorMsg = '';
    const jobIdParam = this.selectedJobId !== 'all' ? this.selectedJobId : undefined;

    this.talentSvc.getAllInterviews(jobIdParam).subscribe({
      next: (res: any) => {
        this.loading = false;
        this.interviews = res?.interviews || [];
        this.applyFilters();
      },
      error: (err: any) => {
        this.loading = false;
        this.errorMsg = 'Failed to load scheduled interviews.';
      }
    });
  }

  applyFilters(): void {
    let result = [...this.interviews];

    // Job Filter
    if (this.selectedJobId && this.selectedJobId !== 'all') {
      result = result.filter(i => i.jobpost_id === this.selectedJobId);
    }

    // Status Filter
    if (this.selectedStatus && this.selectedStatus !== 'all') {
      if (this.selectedStatus === 'expired') {
        result = result.filter(i => this.isSlotPassed(i));
      } else {
        result = result.filter(i => i.status === this.selectedStatus);
      }
    }

    // Search Query
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      result = result.filter(i =>
        (i.candidate_name && i.candidate_name.toLowerCase().includes(q)) ||
        (i.candidate_email && i.candidate_email.toLowerCase().includes(q)) ||
        (i.job_title && i.job_title.toLowerCase().includes(q)) ||
        (i.interview_type && i.interview_type.toLowerCase().includes(q))
      );
    }

    this.filteredInterviews = result;
    this.updateSelectAllState();
  }

  onJobChange(val: string): void {
    // persist centrally; subscription will update local and reload
    this.selectedJobService.setSelectedJobId(val);
    // immediate local update for snappy UI
    this.selectedJobId = val;
    this.syncSelectedJobPost();
    this.applyFilters();
    this.loadInterviews();
  }

  onStatusChange(val: string): void {
    this.selectedStatus = val;
    this.applyFilters();
  }

  // ─── Status Utilities ───────────────────────────────────────

  isSlotPassed(interview: ScheduledInterview): boolean {
    if (interview.status === 'completed' || interview.status === 'cancelled') {
      return false;
    }
    if (!interview.interview_date) return false;

    try {
      let timeStr = interview.interview_time || '00:00';
      if (timeStr.includes('-')) {
        timeStr = timeStr.split('-')[0].trim();
      }
      const dateTimeStr = `${interview.interview_date} ${timeStr}`;
      const scheduledDateTime = new Date(dateTimeStr);

      if (isNaN(scheduledDateTime.getTime())) {
        const d = new Date(interview.interview_date);
        return d.getTime() < new Date().getTime();
      }

      return scheduledDateTime.getTime() < new Date().getTime();
    } catch (e) {
      return false;
    }
  }

  getStatusBadgeClass(interview: ScheduledInterview): string {
    if (interview.status === 'completed') return 'bg-purple-100 text-purple-800 border-purple-200';
    if (interview.status === 'cancelled') return 'bg-gray-100 text-gray-800 border-gray-200';
    if (this.isSlotPassed(interview)) return 'bg-red-100 text-red-800 border-red-200 animate-pulse';
    if (interview.status === 'rescheduled') return 'bg-amber-100 text-amber-800 border-amber-200';
    return 'bg-emerald-100 text-emerald-800 border-emerald-200';
  }

  getStatusDisplayLabel(interview: ScheduledInterview): string {
    if (interview.status === 'completed') return 'Completed';
    if (interview.status === 'cancelled') return 'Cancelled';
    if (this.isSlotPassed(interview)) return 'Slot Passed (Needs Action)';
    if (interview.status === 'rescheduled') return 'Rescheduled';
    return 'Upcoming';
  }

  // ─── Stats ──────────────────────────────────────────────────

  get totalScheduledCount(): number {
    return this.interviews.length;
  }

  get expiredSlotsCount(): number {
    return this.interviews.filter(i => this.isSlotPassed(i)).length;
  }

  get completedCount(): number {
    return this.interviews.filter(i => i.status === 'completed').length;
  }

  get rescheduledCount(): number {
    return this.interviews.filter(i => i.status === 'rescheduled').length;
  }

  // ─── Selection ──────────────────────────────────────────────

  toggleSelectAll(): void {
    if (this.isSelectAll) {
      this.selectedInterviewIds.clear();
      this.isSelectAll = false;
    } else {
      this.filteredInterviews.forEach(i => this.selectedInterviewIds.add(i.id));
      this.isSelectAll = true;
    }
  }

  toggleSelectInterview(id: string): void {
    if (this.selectedInterviewIds.has(id)) {
      this.selectedInterviewIds.delete(id);
    } else {
      this.selectedInterviewIds.add(id);
    }
    this.updateSelectAllState();
  }

  updateSelectAllState(): void {
    this.isSelectAll =
      this.filteredInterviews.length > 0 &&
      this.filteredInterviews.every(i => this.selectedInterviewIds.has(i.id));
  }

  // ─── Actions ────────────────────────────────────────────────

  markAsCompleted(interview: ScheduledInterview): void {
    this.talentSvc.updateInterviewStatus(interview.id, 'completed').subscribe({
      next: () => {
        interview.status = 'completed';
        this.alertService.showSuccess(`Interview with ${interview.candidate_name} marked as Completed.`);
        this.applyFilters();
      },
      error: () => {
        this.alertService.showDanger('Failed to update interview status.');
      }
    });
  }

  openRescheduleModal(interviews: ScheduledInterview[]): void {
    if (!interviews || interviews.length === 0) return;
    this.targetInterviewsForReschedule = interviews;

    if (interviews.length === 1) {
      this.newRescheduleDate = interviews[0].interview_date || '';
      this.newRescheduleTime = interviews[0].interview_time || '';
      this.newMeetingLink = interviews[0].meeting_link || '';
    } else {
      this.newRescheduleDate = '';
      this.newRescheduleTime = '';
      this.newMeetingLink = '';
    }

    this.rescheduleNotes = '';
    this.sendNotification = true;
    this.showRescheduleModal = true;
  }

  rescheduleSelected(): void {
    const selected = this.filteredInterviews.filter(i => this.selectedInterviewIds.has(i.id));
    if (selected.length === 0) {
      this.alertService.showDanger('Please select at least one interview to reschedule.');
      return;
    }
    this.openRescheduleModal(selected);
  }

  rescheduleAllExpired(): void {
    const expired = this.interviews.filter(i => this.isSlotPassed(i));
    if (expired.length === 0) {
      this.alertService.showSuccess('No expired interview slots found.');
      return;
    }
    this.openRescheduleModal(expired);
  }

  get targetCandidateNamesSummary(): string {
    if (!this.targetInterviewsForReschedule || this.targetInterviewsForReschedule.length === 0) {
      return 'None';
    }
    return this.targetInterviewsForReschedule
      .map(i => i.candidate_name || i.candidate_email)
      .join(', ');
  }

  closeRescheduleModal(): void {
    this.showRescheduleModal = false;
    this.targetInterviewsForReschedule = [];
  }

  submitReschedule(): void {
    if (!this.newRescheduleDate || !this.newRescheduleTime) {
      this.alertService.showDanger('Please specify both new date and time for rescheduling.');
      return;
    }

    this.isSavingReschedule = true;
    const ids = this.targetInterviewsForReschedule.map(i => i.id);

    this.talentSvc.rescheduleInterviewsBulk({
      interview_ids: ids,
      new_date: this.newRescheduleDate,
      new_time: this.newRescheduleTime,
      meeting_link: this.newMeetingLink,
      send_notification: this.sendNotification,
      notes: this.rescheduleNotes
    }).subscribe({
      next: (res: any) => {
        this.isSavingReschedule = false;
        this.closeRescheduleModal();
        this.alertService.showSuccess(res?.message || 'Interviews successfully rescheduled!');
        this.selectedInterviewIds.clear();
        this.loadInterviews();
      },
      error: (err: any) => {
        this.isSavingReschedule = false;
        this.alertService.showDanger(err?.error?.detail || 'Failed to reschedule interviews.');
      }
    });
  }

  // ─── View Candidate Pop-Up ──────────────────────────────────

  viewCandidateDetails(interview: ScheduledInterview): void {
    const candidateObj: any = {
      id: interview.candidate_id || interview.candidate_email,
      user_email: interview.candidate_email,
      applicant_email: interview.candidate_email,
      full_name: interview.candidate_name,
      jobpost_id: interview.jobpost_id,
      stage_id: 'stage_interview',
      stage_name: interview.interview_type || 'Interview',
      form_data: {
        name: { value: interview.candidate_name },
        email: { value: interview.candidate_email }
      },
      resume_data: {
        personal_details: {
          full_name: interview.candidate_name,
          email: interview.candidate_email
        }
      }
    };

    this.dataService.candidate = candidateObj;
    this.dataService.openCandidateDetails = true;
  }

  // Scorecard Evaluation Pop-Up Modal state
  showScorecardModal = false;
  scorecardJobId = '';
  scorecardCandidateId = '';
  scorecardCandidateName = '';
  scorecardCandidateEmail = '';
  scorecardMode: 'manage' | 'rate' | 'consensus' = 'rate';

  // ─── Navigate to Scorecard Evaluation ───────────────────────

  navigateToScorecard(interview: ScheduledInterview): void {
    this.scorecardJobId = interview.jobpost_id;
    this.scorecardCandidateId = interview.candidate_id || interview.candidate_email;
    this.scorecardCandidateName = interview.candidate_name;
    this.scorecardCandidateEmail = interview.candidate_email;
    this.scorecardMode = 'rate';
    this.showScorecardModal = true;
  }

  closeScorecardModal(): void {
    this.showScorecardModal = false;
  }
}
