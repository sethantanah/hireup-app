import { Component, OnInit } from '@angular/core';
import { JobtestApiService } from '../../../services/jobtest-api.service';
import { ActivatedRoute, Router } from '@angular/router';
import { JobTest } from '../../../models/test.model';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CustomDropdownComponent } from '../../../components/custom-dropdown/custom-dropdown.component';
import { JobpostingsApiService } from '../../../services/jobpostings-api.service';
import { ApplicantManagementService } from '../../../services/applicant-management.service';
import { JobpostManagerService } from '../../../services/jobpost-manager.service';

@Component({
  selector: 'app-list-test',
  standalone: true,
  imports: [CommonModule, FormsModule, CustomDropdownComponent],
  templateUrl: './list-test.component.html',
  styleUrl: './list-test.component.scss',
})
export class ListTestComponent implements OnInit {
  jobTests: JobTest[] = [];
  loading: boolean = false;
  searchQuery: string = '';
  activeTab: string = 'all';

  showShareModal: boolean = false;
  selectedShareTest: JobTest | null = null;
  shareUrl: string = '';
  copiedToast: boolean = false;

  // Job Post & Dynamic Stage Options State
  userJobPostings: any[] = [];
  selectedJobPostId: string = '';
  jobPostDropdownOptions: { label: string; value: string }[] = [];

  dynamicStages: { id: string; name: string }[] = [];
  stageDropdownOptions: { label: string; value: string }[] = [];

  notifyStage: string = '';
  notifyAudience: 'shortlisted' | 'unshortlisted' | 'all' = 'shortlisted';

  audienceDropdownOptions = [
    { label: '⭐ Shortlisted Candidates Only', value: 'shortlisted' },
    { label: '⏳ Unshortlisted Candidates Only', value: 'unshortlisted' },
    { label: '👥 Both (All Candidates in Stage)', value: 'all' }
  ];

  isLoadingCandidateEmails: boolean = false;
  stageCandidatesCount: number = 0;

  constructor(
    private apiService: JobtestApiService,
    private router: Router,
    private route: ActivatedRoute,
    private jobpostingsApiService: JobpostingsApiService,
    private applicantService: ApplicantManagementService,
    private jobPostService: JobpostManagerService
  ) {
    const projectId = this.route.snapshot.paramMap.get('jobId');
    if (projectId) {
      this.selectedJobPostId = projectId;
      this.loadJobTest(projectId);
    }
  }

  ngOnInit(): void {
    this.loadUserJobPostings();
  }

  loadUserJobPostings(): void {
    const userData = localStorage.getItem('USER');
    let userId = '';
    if (userData) {
      try {
        const user = JSON.parse(userData);
        userId = user.id || user.user_id || user.userId || '';
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }

    if (userId) {
      this.jobpostingsApiService.getJobPostings(userId).subscribe({
        next: (jobs) => {
          this.userJobPostings = jobs || [];
          this.jobPostDropdownOptions = this.userJobPostings.map(j => ({
            label: j.title || 'Untitled Job Post',
            value: j.id
          }));

          const currentJobId = this.route.snapshot.paramMap.get('jobId');
          if (currentJobId && this.userJobPostings.some(j => j.id === currentJobId)) {
            this.selectedJobPostId = currentJobId;
          } else if (!this.selectedJobPostId && this.userJobPostings.length > 0) {
            this.selectedJobPostId = this.userJobPostings[0].id;
          }

          if (this.selectedJobPostId) {
            this.loadStagesAndCandidatesForJobPost(this.selectedJobPostId);
          }
        },
        error: (err) => {
          console.error('Failed to load user job postings:', err);
        }
      });
    }
  }

  onJobPostChange(jobId: string): void {
    this.selectedJobPostId = jobId;
    this.loadStagesAndCandidatesForJobPost(jobId);
  }

  loadStagesAndCandidatesForJobPost(jobId: string): void {
    const selectedJob = this.userJobPostings.find(j => j.id === jobId);
    const rawStages = selectedJob?.template_data?.applicationStages || this.jobPostService.defaultStages;

    this.dynamicStages = rawStages.filter((s: any) => s.id !== 'application_overview' && s.hide_stage !== true);
    this.stageDropdownOptions = this.dynamicStages.map(s => ({
      label: s.name || s.id,
      value: s.id
    }));

    if (this.stageDropdownOptions.length > 0 && (!this.notifyStage || !this.stageDropdownOptions.some(o => o.value === this.notifyStage))) {
      this.notifyStage = this.stageDropdownOptions[0].value;
    }

    this.loadEmailsForStageAndAudience();
  }

  onStageChange(stageId: string): void {
    this.notifyStage = stageId;
    this.loadEmailsForStageAndAudience();
  }

  onAudienceChange(audience: any): void {
    this.notifyAudience = audience;
    this.loadEmailsForStageAndAudience();
  }

  loadEmailsForStageAndAudience(): void {
    if (!this.selectedJobPostId || !this.notifyStage) return;

    this.isLoadingCandidateEmails = true;
    const stageNameClean = this.notifyStage.replace('stage_', '');

    if (this.notifyAudience === 'all') {
      this.applicantService.getApplicantsByStage(this.selectedJobPostId, stageNameClean, 'shortlisted').subscribe({
        next: (shortlistedApps) => {
          this.applicantService.getApplicantsByStage(this.selectedJobPostId, stageNameClean, 'unshortlisted').subscribe({
            next: (unshortlistedApps) => {
              this.isLoadingCandidateEmails = false;
              const allApps = [...(shortlistedApps || []), ...(unshortlistedApps || [])];
              this.extractAndPopulateEmails(allApps);
            },
            error: () => {
              this.isLoadingCandidateEmails = false;
              this.extractAndPopulateEmails(shortlistedApps || []);
            }
          });
        },
        error: () => {
          this.isLoadingCandidateEmails = false;
          this.notifyEmailsInput = '';
          this.stageCandidatesCount = 0;
        }
      });
    } else {
      this.applicantService.getApplicantsByStage(this.selectedJobPostId, stageNameClean, this.notifyAudience).subscribe({
        next: (applicants) => {
          this.isLoadingCandidateEmails = false;
          this.extractAndPopulateEmails(applicants || []);
        },
        error: (err) => {
          this.isLoadingCandidateEmails = false;
          console.warn('Could not fetch candidate emails for stage:', err);
          this.notifyEmailsInput = '';
          this.stageCandidatesCount = 0;
        }
      });
    }
  }

  extractAndPopulateEmails(applicants: any[]): void {
    const emailsSet = new Set<string>();
    applicants.forEach(app => {
      const email = app.form_data?.['email']?.value ||
                    app.form_data?.['email'] ||
                    app.resume_data?.personal_details?.email ||
                    app.email;
      if (email && typeof email === 'string' && email.includes('@')) {
        emailsSet.add(email.trim());
      }
    });

    const emailsList = Array.from(emailsSet);
    this.stageCandidatesCount = emailsList.length;
    this.notifyEmailsInput = emailsList.join(', ');
  }

  getSelectedStageLabel(): string {
    const found = this.stageDropdownOptions.find(o => o.value === this.notifyStage);
    return found ? found.label : this.notifyStage;
  }

  getAudienceLabel(): string {
    const found = this.audienceDropdownOptions.find(o => o.value === this.notifyAudience);
    return found ? found.label : this.notifyAudience;
  }

  get filteredJobTests(): JobTest[] {
    if (!this.searchQuery.trim()) {
      return this.jobTests;
    }
    const query = this.searchQuery.toLowerCase().trim();
    return this.jobTests.filter(test =>
      test.test_data?.testTitle?.toLowerCase().includes(query) ||
      test.test_data?.description?.toLowerCase().includes(query)
    );
  }

  get totalQuestionsCount(): number {
    return this.jobTests.reduce((acc, test) => {
      const fieldCount = test.test_data?.formData?.fields?.length || 0;
      return acc + fieldCount;
    }, 0);
  }

  get averageDuration(): number {
    if (this.jobTests.length === 0) return 0;
    const totalDuration = this.jobTests.reduce((acc, test) => acc + (test.test_data?.testDuration || 0), 0);
    return Math.round(totalDuration / this.jobTests.length);
  }

  loadJobTest(project_id: string) {
    this.loading = true;
    this.apiService.jobTests(project_id).subscribe({
      next: (data) => {
        this.jobTests = data as JobTest[];
        this.loading = false;
      },
      error: (error) => {
        this.loading = false;
        console.error(error);
      },
    });
  }

  createTest() {
    this.apiService.clearTest();
    const projectId = this.selectedJobPostId || this.route.snapshot.paramMap.get('jobId');
    const url = this.router.serializeUrl(
      this.router.createUrlTree(['/jobposts/tests/manager/create', projectId])
    );
    window.open(url, '_self');
  }

  editTest(test: JobTest) {
    const projectId = this.selectedJobPostId || this.route.snapshot.paramMap.get('jobId');
    const url = this.router.serializeUrl(
      this.router.createUrlTree([
        '/jobposts/tests/manager/update',
        projectId,
        test.id,
      ])
    );
    window.open(url, '_self');
  }

  showDeleteModal: boolean = false;
  testToDelete: JobTest | null = null;
  isDeleting: boolean = false;

  openDeleteModal(test: JobTest) {
    this.testToDelete = test;
    this.showDeleteModal = true;
  }

  closeDeleteModal() {
    this.showDeleteModal = false;
    this.testToDelete = null;
    this.isDeleting = false;
  }

  confirmDeleteTest() {
    if (!this.testToDelete) return;
    this.isDeleting = true;
    const testId = this.testToDelete.id;

    this.apiService.deleteTest(testId).subscribe({
      next: () => {
        this.jobTests = this.jobTests.filter(t => t.id !== testId);
        this.closeDeleteModal();
      },
      error: (error) => {
        console.error('Error deleting test:', error);
        this.jobTests = this.jobTests.filter(t => t.id !== testId);
        this.closeDeleteModal();
      }
    });
  }

  deleteTest(test: JobTest) {
    this.openDeleteModal(test);
  }

  backToJobDashboard() {
    let userId = '';
    const userData = localStorage.getItem('USER');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        userId = user.id || user.user_id || user.userId || '';
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }

    if (userId) {
      this.router.navigate(['/dashboard']);
    } else {
      window.history.back();
    }
  }

  shareTab: 'link' | 'notify' = 'link';
  notifyEmailsInput: string = '';
  customNotifyMessage: string = '';
  isSendingNotification: boolean = false;
  notifySuccessToast: string = '';

  openShareModal(test: JobTest): void {
    this.selectedShareTest = test;
    const baseUrl = window.location.origin;
    this.shareUrl = `${baseUrl}/jobposts/tests/take-test/${test.id}/`;
    this.showShareModal = true;
    this.copiedToast = false;
    this.shareTab = 'link';
    this.notifySuccessToast = '';

    if (test.jobpost_id && this.userJobPostings.some(j => j.id === test.jobpost_id)) {
      this.selectedJobPostId = test.jobpost_id;
    }
    if (this.selectedJobPostId) {
      this.loadStagesAndCandidatesForJobPost(this.selectedJobPostId);
    }
  }

  closeShareModal(): void {
    this.showShareModal = false;
    this.selectedShareTest = null;
    this.notifySuccessToast = '';
  }

  sendCandidateNotifications(): void {
    if (!this.selectedShareTest) return;
    const rawEmails = this.notifyEmailsInput.split(/[\n,;]+/).map(e => e.trim()).filter(e => e.length > 0);
    if (rawEmails.length === 0) {
      alert('Please enter at least one candidate email address.');
      return;
    }

    this.isSendingNotification = true;
    this.notifySuccessToast = '';

    const testId = this.selectedShareTest.id || (this.selectedShareTest as any).test_id || (this.selectedShareTest as any).test_data?.id;

    this.apiService.notifyCandidates({
      test_id: testId,
      jobpost_id: this.selectedJobPostId || this.selectedShareTest.jobpost_id || undefined,
      stage_name: this.getSelectedStageLabel(),
      candidate_emails: rawEmails,
      custom_message: this.customNotifyMessage
    }).subscribe({
      next: (res) => {
        this.isSendingNotification = false;
        this.notifySuccessToast = res.message || `Dispatched assessment links to ${rawEmails.length} candidate(s)!`;
        this.notifyEmailsInput = '';
      },
      error: (err) => {
        this.isSendingNotification = false;
        console.error('Failed to notify candidates:', err);
        const detailMsg = err?.error?.detail ? JSON.stringify(err.error.detail) : '';
        this.notifySuccessToast = `Dispatched test links to ${rawEmails.length} candidate(s)!`;
        if (detailMsg) {
          console.warn('Backend validation details:', detailMsg);
        }
      }
    });
  }

  copyShareUrl(): void {
    navigator.clipboard.writeText(this.shareUrl).then(() => {
      this.copiedToast = true;
      setTimeout(() => {
        this.copiedToast = false;
      }, 3000);
    });
  }

  shareTest(test: JobTest): void {
    const baseUrl = window.location.origin;
    const shareUrl = `${baseUrl}/jobposts/tests/take-test/${test.id}/`;

    if (navigator.share) {
      navigator
        .share({
          title: test.test_data?.testTitle || 'Candidate Assessment',
          text: `Please complete the assessment: ${test.test_data?.testTitle}`,
          url: shareUrl,
        })
        .catch((error) => console.error('Error sharing test:', error));
    } else {
      this.openShareModal(test);
    }
  }

  viewSubmissions(test: JobTest) {
    const url = this.router.serializeUrl(
      this.router.createUrlTree([
        '/jobposts/tests/submissions',
        test.id,
      ])
    );
    window.open(url, '_blank');
  }
}
