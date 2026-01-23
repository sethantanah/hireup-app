import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { JobpostingsApiService } from '../../../services/jobpostings-api.service';
import { FormsModule } from '@angular/forms';
import { UserData } from '../../../models/users.models';
import { JobpostManagerService } from '../../../services/jobpost-manager.service';
import { JobPostData, ApplicationStage } from '../../../models/jobpost.model';
import { ApplicantManagementService } from '../../../services/applicant-management.service';
import { DataService } from '../../../services/data.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-job-post-dashboad',
  imports: [CommonModule, FormsModule],
  templateUrl: './job-post-dashboad.component.html',
  styleUrl: './job-post-dashboad.component.scss',
})
export class JobPostDashboadComponent implements OnInit {
  loading: boolean = false;
  isRefreshing: boolean = false;
  jobPostings: any[] = [];

  selectedJobPost: any = null;
  selectedJobForEdit: any = null;
  selectedJobForDelete: any = null;
  selectedStage: ApplicationStage | null = null;

  showAddPopup = false;
  showEditPopup = false;
  showDeletePopup = false;

  newJobTitle = '';
  editJobTitle = '';

  isCreatingJobpost: boolean = false;
  isDeleting: boolean = false;

  sharePopover: boolean = false;
  showAlertPopup: boolean = false;
  popupAlertMessage: string = '';
  alertPopupType: string = '';

  userData!: UserData;
  sidebarOpen = false;

  // Application Stages
  applicationStages: ApplicationStage[] = [];

  // Mock stage metrics data
  private stageMetrics: { [key: string]: any } = {
    '1': { candidates: 0, completionRate: 95, successRate: 80, avgTime: '2 days' },
    '2': { candidates: 0, completionRate: 85, successRate: 65, avgTime: '3 days' },
    '3': { candidates: 0, completionRate: 70, successRate: 50, avgTime: '5 days' },
    '4': { candidates: 0, completionRate: 60, successRate: 40, avgTime: '4 days' },
    '5': { candidates: 0, completionRate: 50, successRate: 30, avgTime: '2 days' },
    '6': { candidates: 0, completionRate: 40, successRate: 25, avgTime: '1 day' },
    '7': { candidates: 0, completionRate: 30, successRate: 0, avgTime: '1 day' }
  };

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private apiService: JobpostingsApiService,
    private jobPostService: JobpostManagerService,
    private dataService: DataService,
    private authService: AuthService,
    private applicantManagementService: ApplicantManagementService,
  ) {
    const userData = localStorage.getItem('USER');
    if (userData) {
      this.userData = JSON.parse(userData);
    } else {
      this.router.navigate(['auth/signin']);
    }
  }

  ngOnInit() {
    this.loadData();
  }


  logOut() {
    this.authService.logOut();
  }

  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
  }

  loadData() {
    const userId = this.route.snapshot.paramMap.get('userId') || this.userData?.id;
    if (!userId) {
      this.router.navigate(['/auth/signin']);
      return;
    }

    this.loading = true;
    this.apiService.getJobPostings(userId).subscribe({
      next: (data) => {
        this.jobPostings = data as any[];
        if (this.jobPostings?.length > 0) {
          const jobpost = this.jobPostings[0];
          const applicationStages = jobpost?.["template_data"]?.["applicationStages"] || undefined;
          this.setApplicationStages(applicationStages)
          this.selectProject(jobpost);

          const currentStage = this.getCurrentStage();
          if (currentStage){
            this.selectStage(currentStage);
          }
        }
        this.loading = false;
      },
      error: (error) => {
        this.loading = false;
        console.error(error);
        this.openAlertPopup('Error loading job postings', 'error');
      },
    });

  }

  refresh() {
    const userId = this.route.snapshot.paramMap.get('userId') || this.userData?.id;
    this.isRefreshing = true;

    this.apiService.getJobPostings(userId).subscribe({
      next: (data) => {
        this.jobPostings = data as any[];
        if (this.jobPostings.length > 0 && this.selectedJobPost) {
          // Refresh the selected job post data
          const refreshedJob = this.jobPostings.find(job => job.id === this.selectedJobPost.id);
          if (refreshedJob) {
            this.selectedJobPost = refreshedJob;
          }
        }
        this.isRefreshing = false;
        this.openAlertPopup('Data refreshed successfully', 'success');
      },
      error: (error) => {
        this.isRefreshing = false;
        console.error(error);
        this.openAlertPopup('Error refreshing data', 'error');
      },
    });
  }

  // Stage Management Methods
  setApplicationStages(applicationStages?: ApplicationStage[]) {
    this.applicationStages = applicationStages || this.jobPostService.defaultStages;
    this.applicationStages = [
      {
        id: 'application_overview',
        name: 'Application Overview',
        jobpost_id: '',
        order: 0,
        is_active: true,
        is_skippable: true,
        stage_type: 'standard'
      },
      ... this.applicationStages.filter((app) => app.hide_stage !== true)
    ]
  }
  selectStage(stage: ApplicationStage): void {
    if (stage.name !== 'Application Overview') {
      this.selectedStage = stage;
    } else {
      this.selectedStage = null;
    }
  }

  currentStageManagerPage(stage: ApplicationStage | null) {
    if (stage === null) return;
    if (stage.id === 'stage_application_review' || stage.id === 'application_overview') {
      this.navigateTo('/applicants/', this.selectedJobPost.id);
    }
  }


  getCurrentStage(): any | null {
    let current: any = null;
    const application_metrics = this.selectedJobPost?.application_metrics
    if (!application_metrics) return 0;

    const sortedStages = this.applicationStages
      .filter(s => s.id !== "application_overview")
      .sort((a, b) => a.order - b.order);

    for (const stage of sortedStages) {
      const stageId = stage.id.replace("stage_", "")
      const dataCount = this.getMetric(application_metrics, stageId, "successful_count") + this.getMetric(application_metrics, stageId, "unsuccessful_count");

      if (dataCount > 0) {
        current = stage; // keep updating until the last one with data
      }
    }

    return current;
  }

  getMetric(application_metrics: Record<string, any>, stage: string, metric: string = "total_count"): number {
    return application_metrics[stage] ? (application_metrics[stage][metric] ? application_metrics[stage][metric] : 0) : 0
  }

  getMetricEmailsSent(application_metrics: Record<string, any>, stage: string): number {
    let metric_value = 0;
    if (application_metrics[stage]) {
      const shortListedCount = application_metrics[stage]["success_emails_shortlisted"] | 0;
      const UnshortListedCount = application_metrics[stage]["success_emails_unshortlisted"] | 0;
      const pendingCount = application_metrics[stage]["success_emails_pending"] | 0;
      const generalCount = application_metrics[stage]["success_emails_general"] | 0;
      metric_value = shortListedCount + UnshortListedCount + pendingCount + generalCount;
    }

    return metric_value;
  }


  getStageMetrics(stageId: string, metric: string = "total_count"): number {
    this.getCurrentStage()
    const application_metrics = this.selectedJobPost?.application_metrics
    const stage = stageId.replace("stage_", "")
    if (!application_metrics) return 0;

    let metric_value = this.getMetric(application_metrics, stage, metric);

    if (metric === "sent_mails_count") {
      metric_value = this.getMetricEmailsSent(application_metrics, stage);
    }

    
    if (metric === "total_count") {
      metric_value = this.getMetric(application_metrics, stage, "total_count") - this.getMetric(application_metrics, stage, "successful_count")
    }

    if (stage == "application_overview") {
      const currentStage = this.getCurrentStage();
      if (metric === "sent_mails_count") {
        if(currentStage){
           return this.getMetricEmailsSent(application_metrics, currentStage.id.replace("stage_", ""))
        }
        return this.getMetricEmailsSent(application_metrics, "application_review") +
          this.getMetricEmailsSent(application_metrics, "phone_screening") +
          this.getMetricEmailsSent(application_metrics, "technical_assessment") +
          this.getMetricEmailsSent(application_metrics, "interview") +
          this.getMetricEmailsSent(application_metrics, "final_decision") +
          this.getMetricEmailsSent(application_metrics, "stage_offer_sent") +
          this.getMetricEmailsSent(application_metrics, "stage_rejected")
      }

      if(currentStage){
           return this.getMetric(application_metrics, currentStage.id.replace("stage_", ""), metric)
        }
      return this.getMetric(application_metrics, "application_review", metric) +
        this.getMetric(application_metrics, "phone_screening", metric) +
        this.getMetric(application_metrics, "technical_assessment", metric) +
        this.getMetric(application_metrics, "interview", metric) +
        this.getMetric(application_metrics, "final_decision", metric) +
        this.getMetric(application_metrics, "stage_offer_sent", metric) +
        this.getMetric(application_metrics, "stage_rejected", metric)
    }


    const distribution = {
      'application_overview': metric === "total_count" ? this.selectedJobPost.received_documents : metric_value,
      'stage_application_review': metric_value,
      'stage_phone_screening': metric_value,
      'stage_technical_assessment': metric_value,
      'stage_interview': metric_value,
      'stage_final_decision': metric_value,
      'stage_offer_sent': metric_value,
      'stage_rejected': metric_value
    };

    // console.log(distribution, "Distribution", "Stage ID:", stageId);
    return distribution[stageId as keyof typeof distribution] || 0;
  }

  getShortlistRate(stageId: string): number {
    const application_metrics = this.selectedJobPost?.application_metrics
    const stage = stageId.replace("stage_", "")
    if (!application_metrics) return 0;

    const total = this.getStageMetrics(stageId, "total_count")
    const sucess = this.getStageMetrics(stageId, "successful_count")

    return Math.round(((sucess || 0) / (total + sucess)) * 100);
  }

    getUnShortlistRate(stageId: string): number {
    const application_metrics = this.selectedJobPost?.application_metrics
    const stage = stageId.replace("stage_", "")
    if (!application_metrics) return 0;

    const total = this.getStageMetrics(stageId, "total_count")
    const sucess = this.getStageMetrics(stageId, "unsuccessful_count")

    return Math.round(((sucess || 0) / (total + sucess)) * 100);
  }


  getCurrentStageCount(): number {
    return this.selectedStage ? this.getStageMetrics(this.selectedStage.id) : 0;
  }

  getStageCompletionRate(stageId: string): number {
    const rates: { [key: string]: number } = {
      '1': 95, '2': 85, '3': 70, '4': 60, '5': 50, '6': 40, '7': 30
    };
    return rates[stageId] || 0;
  }

  getStageSuccessRate(stageId: string): number {
    const rates: { [key: string]: number } = {
      '1': 80, '2': 65, '3': 50, '4': 40, '5': 30, '6': 25, '7': 0
    };
    return rates[stageId] || 0;
  }

  getAverageTimeInStage(stageId: string): string {
    const times: { [key: string]: string } = {
      '1': '2 days', '2': '3 days', '3': '5 days', '4': '4 days', '5': '2 days', '6': '1 day', '7': '1 day'
    };
    return times[stageId] || '0 days';
  }

  sendStageEmails(): void {
    if (!this.selectedStage) return;

    this.openAlertPopup(`Preparing to send emails for ${this.selectedStage.name} stage`, 'info');
    // Implement actual email sending logic here
    console.log('Sending emails for stage:', this.selectedStage.name);
  }

  manageStageTemplates(): void {
    if (!this.selectedStage) return;

    this.openAlertPopup(`Opening template manager for ${this.selectedStage.name}`, 'info');
    // Navigate to template management or open template modal
    console.log('Managing templates for stage:', this.selectedStage.name);
  }

  // Project Selection
  selectProject(job: any) {
    this.selectedJobPost = job;
    this.selectedStage = null; // Reset stage selection when changing jobs
  }

  // Popup Management
  openAddPopup() {
    this.showAddPopup = true;
  }

  closeAddPopup() {
    this.showAddPopup = false;
    this.newJobTitle = '';
    this.isCreatingJobpost = false;
  }

  openEditPopup(jobTitle: string, jobId: string) {
    this.showEditPopup = true;
    this.newJobTitle = jobTitle;
    this.selectedJobForEdit = this.jobPostings.find((job) => job.id === jobId);
  }

  closeEditPopup() {
    this.isCreatingJobpost = false;
    this.showEditPopup = false;
    this.newJobTitle = '';
    this.selectedJobForEdit = null;
  }

  openDeletePopup(job: any) {
    this.selectedJobForDelete = job;
    this.showDeletePopup = true;
  }

  closeDeletePopup() {
    this.showDeletePopup = false;
    this.selectedJobForDelete = null;
  }

  // Job Posting CRUD Operations
  addJobPosting() {
    if (!this.newJobTitle.trim()) {
      this.openAlertPopup('Please enter a job title', 'warning');
      return;
    }

    const userId = this.route.snapshot.paramMap.get('userId') || this.userData?.id;
    const newJob = {
      id: '',
      title: this.newJobTitle.trim(),
    };

    this.isCreatingJobpost = true;
    this.apiService.createUpdateJobPost(userId!, newJob).subscribe({
      next: (data) => {
        const newJobPost = data.data;
        this.jobPostings.push(newJobPost);
        this.selectedJobPost = newJobPost;

        // Create Application Data
        this.initializeApplicationData(newJobPost!.id);

        this.closeAddPopup();
        this.openAlertPopup('Job posting created successfully', 'success');
      },
      error: (error) => {
        this.isCreatingJobpost = false;
        console.error('Error creating job posting', error);
        this.openAlertPopup('Error creating job posting', 'error');
      },
    });
  }

  editJobPosting() {
    if (!this.newJobTitle.trim() || !this.selectedJobForEdit) {
      this.openAlertPopup('Please enter a job title', 'warning');
      return;
    }

    const userId = this.route.snapshot.paramMap.get('userId') || this.userData?.id;
    const editedJob = {
      id: this.selectedJobForEdit.id,
      title: this.newJobTitle.trim(),
    };

    this.isCreatingJobpost = true;
    this.apiService.createUpdateJobPost(userId!, editedJob).subscribe({
      next: (data) => {
        this.jobPostings.forEach((job) => {
          if (job.id === this.selectedJobForEdit.id) {
            job.title = this.newJobTitle.trim();
          }
        });

        // Update selected job if it's the one being edited
        if (this.selectedJobPost?.id === this.selectedJobForEdit.id) {
          this.selectedJobPost.title = this.newJobTitle.trim();
        }

        this.closeEditPopup();
        this.openAlertPopup('Job posting updated successfully', 'success');
      },
      error: (error) => {
        this.isCreatingJobpost = false;
        console.error('Error updating job posting', error);
        this.openAlertPopup('Error updating job posting', 'error');
      },
    });
  }

  deleteJobPosting() {
    if (!this.selectedJobForDelete) return;

    this.isDeleting = true;
    this.apiService.deleteJobPosting(this.selectedJobForDelete.id).subscribe({
      next: (data) => {
        this.jobPostings = this.jobPostings.filter(
          (job) => job.id !== this.selectedJobForDelete.id
        );

        // Clear selection if the deleted job was selected
        if (this.selectedJobPost?.id === this.selectedJobForDelete.id) {
          this.selectedJobPost = this.jobPostings.length > 0 ? this.jobPostings[0] : null;
          this.selectedStage = null;
        }

        this.closeDeletePopup();
        this.isDeleting = false;
        this.openAlertPopup('Job posting deleted successfully', 'success');
      },
      error: (error) => {
        this.isDeleting = false;
        console.error('Error deleting job posting', error);
        this.openAlertPopup('Error deleting job posting', 'error');
      },
    });
  }

  // Application Data Initialization
  private initializeApplicationData(jobPostId: string) {
    localStorage.removeItem('applicationData');
    const applicationData: JobPostData = this.jobPostService.getApplicationDataRaw();

    // Initialize with application stages
    applicationData.applicationStages = this.applicationStages;
    applicationData.formData.fields = [];
    applicationData.sections = [];

    this.jobPostService.createUpdateJobPostData(jobPostId, applicationData).subscribe({
      next: (res) => {
        if (res.data) {
          applicationData.id = res.data.id;
          this.jobPostService.updateApplicationData(applicationData);
        }
      },
      error: (err) => {
        console.error('Error initializing application data:', err);
      },
    });
  }

  // Sharing and Navigation
  openSharePopover() {
    this.sharePopover = true;
  }

  closeSharePopover() {
    this.sharePopover = false;
  }

  shareJob(job: any) {
    if (!this.selectedJobPost) return;

    const baseUrl = window.location.origin;
    const shareUrl = `${baseUrl}/apply/${this.selectedJobPost.title}/${this.selectedJobPost.id}/`;

    if (navigator.share) {
      navigator.share({
        title: this.selectedJobPost.title,
        text: `Check out this job opportunity: ${this.selectedJobPost.title}`,
        url: shareUrl,
      }).catch((error) => {
        console.error('Error sharing job:', error);
        this.copyUrl(); // Fallback to copy URL
      });
    } else {
      this.copyUrl(); // Fallback for browsers that don't support Web Share API
    }
  }

  copyUrl() {
    if (!this.selectedJobPost) return;

    const baseUrl = window.location.origin;
    const shareUrl = `${baseUrl}/apply/${this.selectedJobPost.title}/${this.selectedJobPost.id}/`;
    navigator.clipboard.writeText(shareUrl);
    this.openAlertPopup('URL copied to clipboard', 'success');
    this.closeSharePopover();
  }

  copyReqFormUrl() {
    if (!this.selectedJobPost) return;

    const baseUrl = window.location.origin;
    const shareUrl = `${baseUrl}/apply/${this.selectedJobPost.title}/${this.selectedJobPost.id}/Additional Data`;
    navigator.clipboard.writeText(shareUrl);
    this.openAlertPopup('URL copied to clipboard', 'success');
    this.closeSharePopover();
  }


    copyApplicantionTrackingUrl() {
    if (!this.selectedJobPost) return;

    const baseUrl = window.location.origin;
    const shareUrl = `${baseUrl}/jobpost/tracking`;
    navigator.clipboard.writeText(shareUrl);
    this.openAlertPopup('URL copied to clipboard', 'success');
    this.closeSharePopover();
  }

  embedJobForm(jobId: string) {
    if (!this.selectedJobPost) return;

    const baseUrl = window.location.origin;
    const shareUrl = `${baseUrl}/apply/${this.selectedJobPost.title}/${this.selectedJobPost.id}/form`;
    const iframe = `<iframe src="${shareUrl}" width="100%" height="600" frameborder="0" style="border: none;"></iframe>`;
    navigator.clipboard.writeText(iframe);
    this.openAlertPopup('Embed code copied to clipboard', 'success');
    this.closeSharePopover();
  }

  navigateTo(page: string, id: string) {
    const stageId = this.selectedStage?.id || 'stage_application_review';
    localStorage.setItem('jobpostId', id);
    localStorage.setItem('selectedStage', stageId)
    const route = `/jobposts/${page}/`;

    if (page.replaceAll("/", "") == 'applicants') {
      const url = this.router.serializeUrl(
        this.router.createUrlTree([route, id, stageId])
      );
      window.open(url, '_self');
    } else {
      const url = this.router.serializeUrl(
        this.router.createUrlTree([route, id])
      );

      window.open(url, '_self');
    }

  }

  // Utility Methods
  openAlertPopup(message: string, type: string) {
    this.popupAlertMessage = message;
    this.alertPopupType = type;
    this.showAlertPopup = true;
    setTimeout(() => {
      this.showAlertPopup = false;
    }, 4000);
  }

  getInitials(fullName: string): string {
    if (!fullName) return '';

    return fullName
      .split(' ')
      .map((name) => name.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }

  // Stage Toggle Method
  toggleStageActive(stage: ApplicationStage): void {
    stage.is_active = !stage.is_active;
    this.openAlertPopup(`${stage.name} ${stage.is_active ? 'activated' : 'deactivated'}`, 'info');
  }
}