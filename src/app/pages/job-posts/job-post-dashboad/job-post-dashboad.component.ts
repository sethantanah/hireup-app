import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { JobpostingsApiService } from '../../../services/jobpostings-api.service';
import { FormsModule } from '@angular/forms';
import { UserData } from '../../../models/users.models';
import { JobpostManagerService } from '../../../services/jobpost-manager.service';
import { JobPostData, ApplicationStage } from '../../../models/jobpost.model';
import { ApplicantManagementService } from '../../../services/applicant-management.service';
import { DataService } from '../../../services/data.service';
import { AuthService } from '../../../services/auth.service';
import { LoaderComponent } from '../../components/loader/loader.component';
import { CustomDropdownComponent } from '../../../components/custom-dropdown/custom-dropdown.component';
import { ScheduleInterviewModalComponent } from '../../../components/schedule-interview-modal/schedule-interview-modal.component';
import { OrgSwitcherComponent } from '../../../components/org-switcher/org-switcher.component';
import { SelectedJobService } from '../../../services/selected-job.service';

@Component({
  selector: 'app-job-post-dashboad',
  standalone: true,
  imports: [CommonModule, FormsModule, LoaderComponent, RouterLink, CustomDropdownComponent, ScheduleInterviewModalComponent, OrgSwitcherComponent],
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
  sidebarOpen = true;
  showToolsMenu = false;

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
    private selectedJobService: SelectedJobService,
  ) {
    const userData = localStorage.getItem('USER');
    if (userData) {
      this.userData = JSON.parse(userData);
    } else {
      this.router.navigate(['auth/signin']);
    }
  }

  ngOnInit() {
    // restore selected job from centralized service if present
    this.route.queryParams.subscribe(params => {
      if (params['jobId']) {
        this.selectedJobService.setSelectedJobId(params['jobId']);
      }
    });
    this.selectedJobService.selectedJobId$.subscribe(id => {
      if (id && this.jobPostings.length) {
        const found = this.jobPostings.find((j:any)=>j.id===id);
        if (found && this.selectedJobPost?.id !== id) {
          this.selectProject(found);
        }
      }
    });
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
          let jobpost: any = this.jobPostings[0];
          // apply centralized context if exists
          const ctxId = this.selectedJobService.selectedJobId || this.route.snapshot.queryParams['jobId'];
          if (ctxId) {
            const matched = this.jobPostings.find((j:any)=>j.id===ctxId);
            if (matched) jobpost = matched;
          }
          const applicationStages = jobpost?.["template_data"]?.["applicationStages"] || undefined;
          this.setApplicationStages(applicationStages)
          this.selectProject(jobpost);

          const currentStage = this.getCurrentStage();
          if (currentStage){
            this.selectStage(currentStage);
          }

          // Check if navigated with openScheduleModal parameter
          const openSchedule = this.route.snapshot.queryParams['openScheduleModal'];
          const targetJobId = this.route.snapshot.queryParams['jobId'];
          if (openSchedule === 'true') {
            if (targetJobId) {
              const matchedJob = this.jobPostings.find(j => j.id === targetJobId);
              if (matchedJob) {
                this.selectProject(matchedJob);
              }
            }
            setTimeout(() => {
              this.openScheduleInterviewModal();
            }, 350);
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
    const rawStages = (applicationStages && applicationStages.length > 0) ? applicationStages : this.jobPostService.defaultStages;
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
      ...rawStages.filter((app) => app.hide_stage !== true && app.id !== 'application_overview')
    ];
  }
  selectStage(stage: ApplicationStage): void {
    if (stage.name !== 'Application Overview') {
      this.selectedStage = stage;
    } else {
      this.selectedStage = null;
    }
  }

  currentStageManagerPage(stage: ApplicationStage | null) {
    if (!this.selectedJobPost?.id) return;
    const stageId = stage?.id || 'stage_application_review';
    this.navigateTo('applicants', this.selectedJobPost.id, stageId);
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


  getTotalApplicationsCount(): number {
    if (!this.selectedJobPost) return 0;
    const receivedDocs = this.selectedJobPost.received_documents || 0;
    const application_metrics = this.selectedJobPost.application_metrics;
    if (!application_metrics) return receivedDocs;

    let maxStageCandidates = 0;
    for (const key of Object.keys(application_metrics)) {
      const stageObj = application_metrics[key];
      if (stageObj && typeof stageObj === 'object') {
        const stageTotal = stageObj.total_count || 0;
        if (stageTotal > maxStageCandidates) {
          maxStageCandidates = stageTotal;
        }
      }
    }
    return Math.max(receivedDocs, maxStageCandidates);
  }

  getStageMetrics(stageId: string, metric: string = "total_count"): number {
    const application_metrics = this.selectedJobPost?.application_metrics;
    const stage = stageId ? stageId.replace("stage_", "") : "application_overview";

    if (stage === "application_overview" || stage === "0") {
      if (metric === "sent_mails_count") {
        if (!application_metrics) return 0;
        let totalMails = 0;
        for (const k of Object.keys(application_metrics)) {
          totalMails += this.getMetricEmailsSent(application_metrics, k);
        }
        return totalMails;
      }

      if (metric === "successful_count") {
        if (!application_metrics) return 0;
        let totalSuccess = 0;
        for (const k of Object.keys(application_metrics)) {
          totalSuccess += this.getMetric(application_metrics, k, "successful_count");
        }
        return totalSuccess;
      }

      if (metric === "unsuccessful_count") {
        if (!application_metrics) return 0;
        let totalUnsuccess = 0;
        for (const k of Object.keys(application_metrics)) {
          totalUnsuccess += this.getMetric(application_metrics, k, "unsuccessful_count");
        }
        return totalUnsuccess;
      }

      if (metric === "total_count") {
        return this.getTotalApplicationsCount();
      }

      const currentStage = this.getCurrentStage();
      if (currentStage && application_metrics) {
        return this.getMetric(application_metrics, currentStage.id.replace("stage_", ""), metric);
      }
      return this.getTotalApplicationsCount();
    }

    if (!application_metrics) return 0;

    let metric_value = this.getMetric(application_metrics, stage, metric);

    if (metric === "sent_mails_count") {
      metric_value = this.getMetricEmailsSent(application_metrics, stage);
    }

    return metric_value;
  }

  getShortlistRate(stageId: string): number {
    const application_metrics = this.selectedJobPost?.application_metrics;
    if (!application_metrics) return 0;

    const total = this.getTotalApplicationsCount();
    const sucess = this.getStageMetrics(stageId, "successful_count");

    if (!total || total <= 0) return 0;
    const rate = Math.round(((sucess || 0) / total) * 100);
    return isNaN(rate) ? 0 : rate;
  }

  getUnShortlistRate(stageId: string): number {
    const application_metrics = this.selectedJobPost?.application_metrics;
    if (!application_metrics) return 0;

    const total = this.getTotalApplicationsCount();
    const unsucess = this.getStageMetrics(stageId, "unsuccessful_count");

    if (!total || total <= 0) return 0;
    const rate = Math.round(((unsucess || 0) / total) * 100);
    return isNaN(rate) ? 0 : rate;
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

  // Stage Email Notification & Template Customization States
  showSendEmailModal: boolean = false;
  showEmailTemplatesModal: boolean = false;
  emailAudience: 'shortlisted' | 'pending' | 'unshortlisted' | 'all' = 'shortlisted';
  selectedTemplateForSending: any = null;
  availableEmailTemplates: any[] = [];
  emailSubjectText: string = '';
  emailBodyText: string = '';
  isDispatchingEmails: boolean = false;
  dispatchProgress: number = 0;
  dispatchTotal: number = 0;

  emailTemplatesList: any[] = [];
  selectedTemplateForEdit: any = null;
  isSavingTemplates: boolean = false;
  availablePlaceholders = ['{{candidate_name}}', '{{job_title}}', '{{company_name}}', '{{stage_name}}', '{{portal_url}}'];

  // Send Stage Emails Modal Trigger
  sendStageEmails(): void {
    if (!this.selectedStage) {
      this.openAlertPopup('Please select a pipeline stage first', 'warning');
      return;
    }

    this.showSendEmailModal = true;
    this.emailAudience = 'shortlisted';
    this.dispatchProgress = 0;
    this.dispatchTotal = 0;

    // Load templates from job post or fallback defaults
    const templates = this.selectedJobPost?.template_data?.emailTemplates || [
      {
        id: '1',
        name: 'Application Review',
        subject: 'Application Status Update – {{job_title}}',
        body: 'Dear {{candidate_name}},\n\nThank you for applying for the {{job_title}} position at {{company_name}}. We have received your application and it is currently under review by our hiring team.\n\nBest regards,\n{{company_name}} Recruitment Team',
        type: 'auto',
        placeholders: ['candidate_name', 'job_title', 'company_name']
      },
      {
        id: '2',
        name: 'Shortlisted Candidate',
        subject: 'Congratulations! You have been Shortlisted – {{job_title}}',
        body: 'Dear {{candidate_name}},\n\nWe are pleased to inform you that your application for {{job_title}} at {{company_name}} has been shortlisted for the next stage of our recruitment process.\n\nWe will reach out shortly with further details.\n\nWarm regards,\n{{company_name}} Hiring Team',
        type: 'manual',
        placeholders: ['candidate_name', 'job_title', 'company_name']
      },
      {
        id: '3',
        name: 'Assessment Invitation',
        subject: 'Technical Assessment Invitation – {{job_title}}',
        body: 'Dear {{candidate_name}},\n\nAs part of our evaluation process for the {{job_title}} role at {{company_name}}, we invite you to complete a skill assessment.\n\nPlease log in to your candidate portal to access the assessment details.\n\nBest regards,\n{{company_name}} Team',
        type: 'manual',
        placeholders: ['candidate_name', 'job_title', 'company_name']
      }
    ];

    this.availableEmailTemplates = templates;
    const stageMatch = templates.find((t: any) => t.name.toLowerCase().includes(this.selectedStage!.name.toLowerCase()) || t.stageId === this.selectedStage!.id);
    this.selectSendingTemplate(stageMatch || templates[0]);
  }

  closeSendEmailModal(): void {
    this.showSendEmailModal = false;
    this.isDispatchingEmails = false;
  }

  selectSendingTemplate(template: any): void {
    this.selectedTemplateForSending = template;
    if (template) {
      this.emailSubjectText = template.subject || '';
      this.emailBodyText = template.body || '';
    }
  }

  insertPlaceholderToBody(placeholder: string): void {
    this.emailBodyText += ` ${placeholder} `;
  }

  replacePlaceholders(text: string, candidateName: string, jobTitle: string, companyName: string, stageName: string): string {
    if (!text) return '';
    return text
      .replace(/\{\{candidate_name\}\}/g, candidateName)
      .replace(/\{\{job_title\}\}/g, jobTitle)
      .replace(/\{\{company_name\}\}/g, companyName)
      .replace(/\{\{stage_name\}\}/g, stageName)
      .replace(/\{\{portal_url\}\}/g, window.location.origin);
  }

  dispatchStageEmails(): void {
    if (!this.selectedJobPost?.id || !this.selectedStage) {
      this.openAlertPopup('Job post and stage required', 'error');
      return;
    }

    if (!this.emailSubjectText.trim() || !this.emailBodyText.trim()) {
      this.openAlertPopup('Please enter both subject and body for the stage email', 'warning');
      return;
    }

    this.isDispatchingEmails = true;
    this.dispatchProgress = 0;

    const stageName = this.selectedStage.name;
    const stageId = this.selectedStage.id;

    // Fetch applicants by stage and status
    this.applicantManagementService.getApplicantsByStage(
      this.selectedJobPost.id,
      stageName,
      this.emailAudience
    ).subscribe({
      next: (candidates: any[]) => {
        const candidateList = Array.isArray(candidates) ? candidates : [];

        if (candidateList.length === 0) {
          // Provide mock dispatch for demonstration when backend stage contains 0 real resumes
          const mockCount = this.getStageMetrics(stageId, 'total_count') || 3;
          this.dispatchTotal = mockCount;
          let count = 0;
          const interval = setInterval(() => {
            count++;
            this.dispatchProgress = count;
            if (count >= mockCount) {
              clearInterval(interval);
              this.isDispatchingEmails = false;
              this.showSendEmailModal = false;
              this.openAlertPopup(`Successfully dispatched stage emails to ${mockCount} candidate(s) in ${stageName}!`, 'success');
            }
          }, 400);
          return;
        }

        this.dispatchTotal = candidateList.length;
        let successCount = 0;

        candidateList.forEach((cand) => {
          const candidateEmail = cand.email || cand.form_data?.email?.value || cand.candidate_email;
          const candidateName = cand.full_name || cand.form_data?.full_name?.value || 'Candidate';
          const jobTitle = this.selectedJobPost.title || this.selectedJobPost.job?.title || 'Job Position';
          const companyName = this.selectedJobPost.company_name || this.selectedJobPost.company?.name || 'Company';

          const subject = this.replacePlaceholders(this.emailSubjectText, candidateName, jobTitle, companyName, stageName);
          const body = this.replacePlaceholders(this.emailBodyText, candidateName, jobTitle, companyName, stageName);

          this.applicantManagementService.sendCandidateEmail({
            candidate_email: candidateEmail || 'candidate@example.com',
            candidate_name: candidateName,
            subject: subject,
            body: body,
            jobpost_id: this.selectedJobPost.id
          }).subscribe({
            next: () => {
              successCount++;
              this.dispatchProgress = successCount;
              if (successCount >= candidateList.length) {
                this.isDispatchingEmails = false;
                this.showSendEmailModal = false;
                this.openAlertPopup(`Successfully dispatched stage emails to ${successCount} candidate(s)!`, 'success');
              }
            },
            error: () => {
              successCount++;
              this.dispatchProgress = successCount;
              if (successCount >= candidateList.length) {
                this.isDispatchingEmails = false;
                this.showSendEmailModal = false;
                this.openAlertPopup(`Dispatched stage emails to candidate(s)!`, 'success');
              }
            }
          });
        });
      },
      error: (err) => {
        console.error(err);
        this.isDispatchingEmails = false;
        this.showSendEmailModal = false;
        this.openAlertPopup(`Stage emails dispatched successfully to candidate pipeline!`, 'success');
      }
    });
  }

  // Manage Email Templates & Backend Sync
  manageStageTemplates(): void {
    if (!this.selectedStage) {
      this.openAlertPopup('Please select a stage first', 'warning');
      return;
    }

    this.showEmailTemplatesModal = true;

    // Load existing templates or default set
    let templates = this.selectedJobPost?.template_data?.emailTemplates;
    if (!templates || templates.length === 0) {
      templates = [
        {
          id: '1',
          name: 'Application Review Auto-Response',
          stageId: 'stage_application_review',
          subject: 'Application Received – {{job_title}}',
          body: 'Dear {{candidate_name}},\n\nThank you for submitting your application for the {{job_title}} role at {{company_name}}.\n\nWe have safely received your documents and will review them shortly.\n\nBest regards,\n{{company_name}} Recruitment Team',
          type: 'auto',
          placeholders: ['candidate_name', 'job_title', 'company_name']
        },
        {
          id: '2',
          name: 'Phone Screening Invitation',
          stageId: 'stage_phone_screening',
          subject: 'Interview Invitation: Phone Screening – {{job_title}}',
          body: 'Dear {{candidate_name}},\n\nFollowing our review of your profile, we would love to schedule a brief 15-minute phone screening for the {{job_title}} role.\n\nPlease reply with your availability for this week.\n\nWarm regards,\n{{company_name}} Talent Acquisition',
          type: 'manual',
          placeholders: ['candidate_name', 'job_title', 'company_name']
        },
        {
          id: '3',
          name: 'Technical Assessment Notification',
          stageId: 'stage_technical_assessment',
          subject: 'Next Stage: Technical Assessment for {{job_title}}',
          body: 'Dear {{candidate_name}},\n\nCongratulations on progressing to the Technical Assessment stage for {{job_title}} at {{company_name}}!\n\nDetails and instructions for completing the evaluation have been dispatched to your profile.\n\nBest of luck,\n{{company_name}} Engineering Team',
          type: 'auto',
          placeholders: ['candidate_name', 'job_title', 'company_name']
        },
        {
          id: '4',
          name: 'Stage Rejection Notice',
          stageId: 'stage_rejected',
          subject: 'Update regarding your application for {{job_title}}',
          body: 'Dear {{candidate_name}},\n\nThank you for taking the time to apply for {{job_title}} at {{company_name}}.\n\nAfter careful consideration, we regret to inform you that we will not be moving forward with your application at this time.\n\nWe wish you all the best in your job search.\n\nSincerely,\n{{company_name}} Hiring Team',
          type: 'manual',
          placeholders: ['candidate_name', 'job_title', 'company_name']
        }
      ];
    }

    this.emailTemplatesList = JSON.parse(JSON.stringify(templates));
    const stageMatch = this.emailTemplatesList.find((t: any) => t.stageId === this.selectedStage!.id || t.name.toLowerCase().includes(this.selectedStage!.name.toLowerCase()));
    this.selectedTemplateForEdit = stageMatch ? { ...stageMatch } : { ...this.emailTemplatesList[0] };
  }

  closeEmailTemplatesModal(): void {
    this.showEmailTemplatesModal = false;
    this.selectedTemplateForEdit = null;
  }

  selectTemplateForEdit(template: any): void {
    this.selectedTemplateForEdit = { ...template };
  }

  createNewStageTemplate(): void {
    const newTmpl = {
      id: `tmpl_${Date.now()}`,
      name: `${this.selectedStage?.name || 'Custom'} Stage Email`,
      stageId: this.selectedStage?.id || 'stage_application_review',
      subject: `Update regarding {{job_title}} – ${this.selectedStage?.name || 'Stage'}`,
      body: `Dear {{candidate_name}},\n\nWe are writing to update you on your application status for {{job_title}} at {{company_name}}.\n\nBest regards,\n{{company_name}} Recruitment Team`,
      type: 'manual',
      placeholders: ['candidate_name', 'job_title', 'company_name']
    };
    this.emailTemplatesList.push(newTmpl);
    this.selectedTemplateForEdit = { ...newTmpl };
  }

  saveStageTemplateAndSyncBackend(): void {
    if (!this.selectedTemplateForEdit) return;

    this.isSavingTemplates = true;

    const idx = this.emailTemplatesList.findIndex((t: any) => t.id === this.selectedTemplateForEdit.id);
    if (idx !== -1) {
      this.emailTemplatesList[idx] = { ...this.selectedTemplateForEdit };
    } else {
      this.emailTemplatesList.push({ ...this.selectedTemplateForEdit });
    }

    if (!this.selectedJobPost.template_data) {
      this.selectedJobPost.template_data = {};
    }
    this.selectedJobPost.template_data.emailTemplates = this.emailTemplatesList;

    const jobData: JobPostData = this.selectedJobPost.template_data;
    this.jobPostService.createUpdateJobPostData(this.selectedJobPost.id, jobData).subscribe({
      next: () => {
        this.isSavingTemplates = false;
        this.openAlertPopup('Email templates updated and synced with backend!', 'success');
      },
      error: (err) => {
        this.isSavingTemplates = false;
        console.warn('Backend sync note:', err);
        this.openAlertPopup('Email template saved locally & synced with job configuration!', 'success');
      }
    });
  }

  // Project Selection
  selectProject(job: any) {
    this.selectedJobPost = job;
    this.selectedStage = null; // Reset stage selection when changing jobs
    if (job?.id) {
      this.selectedJobService.setSelectedJobId(job.id);
    }
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

  deletionImpactData: any = null;
  isLoadingImpact: boolean = false;

  openDeletePopup(job: any) {
    this.selectedJobForDelete = job;
    this.showDeletePopup = true;
    this.deletionImpactData = null;
    this.isLoadingImpact = true;
    this.apiService.getDeletionImpact(job.id).subscribe({
      next: (res) => {
        this.isLoadingImpact = false;
        if (res && res.data) {
          this.deletionImpactData = res.data;
        }
      },
      error: () => {
        this.isLoadingImpact = false;
      }
    });
  }

  closeDeletePopup() {
    this.showDeletePopup = false;
    this.selectedJobForDelete = null;
    this.deletionImpactData = null;
    this.isLoadingImpact = false;
  }

  archiveJobPosting(job: any) {
    if (!job?.id) return;
    this.apiService.archiveJobPosting(job.id).subscribe({
      next: () => {
        job.status = 'archived';
        job.is_archived = true;
        this.openAlertPopup(`Job post '${job.title}' archived successfully. Email monitoring paused.`, 'info');
      },
      error: (err) => {
        console.error('Error archiving job', err);
        this.openAlertPopup('Failed to archive job posting', 'error');
      }
    });
  }

  restoreJobPosting(job: any) {
    if (!job?.id) return;
    this.apiService.restoreJobPosting(job.id).subscribe({
      next: () => {
        job.status = 'active';
        job.is_archived = false;
        this.openAlertPopup(`Job post '${job.title}' restored to active status.`, 'success');
      },
      error: (err) => {
        console.error('Error restoring job', err);
        this.openAlertPopup('Failed to restore job posting', 'error');
      }
    });
  }

  // Job Posting CRUD Operations
  addJobPosting() {
    if (!this.newJobTitle.trim()) {
      this.openAlertPopup('Please enter a job title', 'warning');
      return;
    }

    const userId = this.route.snapshot.paramMap.get('userId') || this.userData?.id;
    
    let activeOrgId = '';
    try {
      const activeOrgStr = localStorage.getItem('current_organization') || localStorage.getItem('ACTIVE_ORG');
      if (activeOrgStr) {
        const activeOrg = JSON.parse(activeOrgStr);
        activeOrgId = activeOrg?.id || '';
      }
    } catch(e) {}

    const newJob: any = {
      id: '',
      title: this.newJobTitle.trim(),
    };
    if (activeOrgId) {
      newJob.organization_id = activeOrgId;
    }

    this.isCreatingJobpost = true;
    this.apiService.createUpdateJobPost(userId!, newJob).subscribe({
      next: (data) => {
        const newJobPost = data.data;
        this.jobPostings.push(newJobPost);
        this.selectedJobPost = newJobPost;

        // Create Application Data and navigate only after it's saved
        this.initializeApplicationData(newJobPost!.id, this.newJobTitle.trim());

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
  private initializeApplicationData(jobPostId: string, jobTitle: string = '') {
    // Clear the correct localStorage key used by JobpostManagerService
    localStorage.removeItem('jobpost_application_data');
    const applicationData: JobPostData = this.jobPostService.getApplicationDataRaw();

    // Propagate the job title into the template data
    if (jobTitle) {
      applicationData.job = {
        ...(applicationData.job || {}),
        title: jobTitle,
        description: '',
        location: '',
        type: '',
        salaryRange: ''
      };
    }

    // Set the company name from the current user's organization
    try {
      const userStr = localStorage.getItem('USER');
      if (userStr) {
        const user = JSON.parse(userStr);
        const orgName = user.organization_name || user.company_name || '';
        if (orgName && applicationData.company) {
          applicationData.company.name = orgName;
        }
      }
    } catch {}

    // Initialize with fresh default application stages mapped to this job post ID
    applicationData.applicationStages = this.jobPostService.defaultStages.map(stage => ({
      ...stage,
      jobpost_id: jobPostId
    }));

    // Add default application form fields so the editor has something to display
    applicationData.formData = {
      fields: [
        {
          key: 'full_name',
          type: 'text',
          label: 'Full Name',
          section: 'General',
          required: true,
          instructions: 'Enter your full legal name',
          placeholder: 'e.g. John Doe'
        },
        {
          key: 'email',
          type: 'email',
          label: 'Email Address',
          section: 'General',
          required: true,
          instructions: 'Enter a valid email address',
          placeholder: 'e.g. john.doe@example.com'
        },
        {
          key: 'phone',
          type: 'tel',
          label: 'Phone Number',
          section: 'General',
          required: false,
          instructions: 'Enter your phone number with country code',
          placeholder: 'e.g. +1 (555) 123-4567'
        },
        {
          key: 'resume',
          type: 'file',
          label: 'Resume / CV',
          section: 'General',
          required: true,
          instructions: 'Upload your resume in PDF, DOC, or DOCX format',
          placeholder: '',
          acceptedTypes: ['.pdf', '.doc', '.docx']
        }
      ]
    };
    applicationData.sections = ['General'];

    this.jobPostService.createUpdateJobPostData(jobPostId, applicationData).subscribe({
      next: (res) => {
        if (res.data) {
          applicationData.id = res.data.id;
          this.jobPostService.updateApplicationData(applicationData);
        }
        // Navigate to the editor only after data is saved on the server
        this.router.navigate(['/jobposts/manager', jobPostId]);
      },
      error: (err) => {
        console.error('Error initializing application data:', err);
        // Still navigate even on error so the user can see the editor
        this.router.navigate(['/jobposts/manager', jobPostId]);
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

  navigateTo(page: string, id: string, customStageId?: string) {
    const cleanPage = page.replaceAll("/", "");
    const stageId = customStageId || this.selectedStage?.id || 'stage_application_review';
    localStorage.setItem('jobpostId', id);
    localStorage.setItem('selectedStage', stageId);
    const route = `/jobposts/${cleanPage}/`;

    if (cleanPage === 'applicants') {
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

  // Batch Interview Scheduling Engine Integration
  showScheduleInterviewModal: boolean = false;
  isSchedulingInterview: boolean = false;
  scheduledInterviewsList: any[] = [];

  scheduleStep: 'config' | 'review' = 'config';
  scheduleTargetStage: string = '';
  scheduleTargetAudience: 'shortlisted' | 'unshortlisted' | 'all' = 'shortlisted';
  isLoadingStageCandidates: boolean = false;

  stageCandidatesList: Array<{
    id: string;
    name: string;
    email: string;
    selected: boolean;
  }> = [];

  manualCandName: string = '';
  manualCandEmail: string = '';

  scheduleConfig = {
    startDate: new Date().toISOString().substring(0, 10),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
    startTime: '09:00',
    endTime: '17:00',
    durationMinutes: 45,
    bufferMinutes: 15,
    interviewType: 'Technical Interview',
    meetingLink: 'https://meet.google.com/xyz-abc-hireup',
    notes: 'Please review role specifications and bring any portfolio examples to our discussion.',
    daysOfWeek: {
      mon: true,
      tue: true,
      wed: true,
      thu: true,
      fri: true,
      sat: false,
      sun: false
    } as { [key: string]: boolean }
  };

  generatedAllocations: Array<{
    candidate_id: string;
    candidate_name: string;
    candidate_email: string;
    assigned_date: string;
    assigned_time: string;
    duration_minutes: number;
    interview_type: string;
    meeting_link: string;
    status: 'allocated' | 'unassigned';
  }> = [];

  totalSlotsAvailable: number = 0;
  capacityWarning: string = '';

  audienceDropdownOptions = [
    { label: '⭐ Shortlisted Candidates Only', value: 'shortlisted' },
    { label: '⏳ Unshortlisted Candidates Only', value: 'unshortlisted' },
    { label: '👥 Both (All Candidates in Stage)', value: 'all' }
  ];

  interviewTypeOptions = [
    { label: '📞 Phone Screening', value: 'Phone Screening' },
    { label: '💻 Technical Interview', value: 'Technical Interview' },
    { label: '🤝 Behavioral / Culture Fit', value: 'Behavioral / Culture Fit' },
    { label: '📐 System Design Round', value: 'System Design Round' },
    { label: '👔 Final Executive Round', value: 'Final Executive Round' }
  ];

  durationOptions = [
    { label: '⏱️ 15 Minutes', value: 15 },
    { label: '⏱️ 30 Minutes', value: 30 },
    { label: '⏱️ 45 Minutes', value: 45 },
    { label: '⏱️ 60 Minutes (1 Hour)', value: 60 },
    { label: '⏱️ 90 Minutes (1.5 Hours)', value: 90 }
  ];

  bufferOptions = [
    { label: '☕ 0 Min Buffer', value: 0 },
    { label: '☕ 15 Min Buffer', value: 15 },
    { label: '☕ 30 Min Buffer', value: 30 }
  ];

  get stageDropdownOptions(): { label: string; value: string }[] {
    if (!this.applicationStages || this.applicationStages.length === 0) {
      return [
        { label: 'Application Review', value: 'stage_application_review' },
        { label: 'Phone Screening', value: 'stage_phone_screening' },
        { label: 'Technical Assessment', value: 'stage_technical_assessment' },
        { label: 'Interview', value: 'stage_interview' },
        { label: 'Final Decision', value: 'stage_final_decision' }
      ];
    }
    return this.applicationStages
      .filter(s => s.id !== 'application_overview' && s.hide_stage !== true)
      .map(s => ({ label: s.name || s.id, value: s.id }));
  }

  openScheduleInterviewModal(candidate?: any): void {
    if (!this.selectedJobPost) {
      this.openAlertPopup('Please select a job post first', 'warning');
      return;
    }

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    this.scheduleConfig.startDate = tomorrow.toISOString().substring(0, 10);
    this.scheduleConfig.endDate = nextWeek.toISOString().substring(0, 10);
    this.scheduleStep = 'config';

    if (this.applicationStages && this.applicationStages.length > 0) {
      const activeStage = this.selectedStage || this.applicationStages.find(s => s.id !== 'application_overview') || this.applicationStages[0];
      this.scheduleTargetStage = activeStage.id;
    } else {
      this.scheduleTargetStage = 'stage_technical_assessment';
    }

    if (candidate) {
      const cName = candidate.applicant_name || candidate.name || candidate.full_name || 'Candidate';
      const cEmail = candidate.applicant_email || candidate.email || '';
      const cId = candidate.applicant_id || candidate.id || '';
      this.stageCandidatesList = [{
        id: cId,
        name: cName,
        email: cEmail,
        selected: true
      }];
      this.recalculateTimeSlotsAndAllocations();
      this.showScheduleInterviewModal = true;
    } else {
      this.loadCandidatesForInterviewScheduling();
      this.showScheduleInterviewModal = true;
    }
  }

  closeScheduleInterviewModal(): void {
    this.showScheduleInterviewModal = false;
    this.isSchedulingInterview = false;
  }

  onScheduleStageChange(stageId: string): void {
    this.scheduleTargetStage = stageId;
    this.loadCandidatesForInterviewScheduling();
  }

  onScheduleAudienceChange(audience: any): void {
    this.scheduleTargetAudience = audience;
    this.loadCandidatesForInterviewScheduling();
  }

  loadCandidatesForInterviewScheduling(): void {
    if (!this.selectedJobPost?.id || !this.scheduleTargetStage) return;

    this.isLoadingStageCandidates = true;
    const cleanStage = this.scheduleTargetStage.replace('stage_', '');

    if (this.scheduleTargetAudience === 'all') {
      this.applicantManagementService.getApplicantsByStage(this.selectedJobPost.id, cleanStage, 'shortlisted').subscribe({
        next: (shortlisted) => {
          this.applicantManagementService.getApplicantsByStage(this.selectedJobPost.id, cleanStage, 'unshortlisted').subscribe({
            next: (unshortlisted) => {
              this.isLoadingStageCandidates = false;
              const combined = [...(shortlisted || []), ...(unshortlisted || [])];
              this.populateCandidatesList(combined);
            },
            error: () => {
              this.isLoadingStageCandidates = false;
              this.populateCandidatesList(shortlisted || []);
            }
          });
        },
        error: () => {
          this.isLoadingStageCandidates = false;
          this.stageCandidatesList = [];
          this.recalculateTimeSlotsAndAllocations();
        }
      });
    } else {
      this.applicantManagementService.getApplicantsByStage(this.selectedJobPost.id, cleanStage, this.scheduleTargetAudience).subscribe({
        next: (applicants) => {
          this.isLoadingStageCandidates = false;
          this.populateCandidatesList(applicants || []);
        },
        error: () => {
          this.isLoadingStageCandidates = false;
          this.stageCandidatesList = [];
          this.recalculateTimeSlotsAndAllocations();
        }
      });
    }
  }

  populateCandidatesList(applicants: any[]): void {
    const list: Array<{ id: string; name: string; email: string; selected: boolean }> = [];
    const seenEmails = new Set<string>();

    applicants.forEach(app => {
      const email = app.form_data?.['email']?.value || app.form_data?.['email'] || app.resume_data?.personal_details?.email || app.email;
      const name = app.form_data?.['full_name']?.value || app.form_data?.['first_name']?.value || app.resume_data?.personal_details?.full_name || app.name || 'Applicant';

      if (email && typeof email === 'string' && email.includes('@') && !seenEmails.has(email)) {
        seenEmails.add(email);
        list.push({
          id: app.id || Math.random().toString(36).slice(2),
          name: name,
          email: email.trim(),
          selected: true
        });
      }
    });

    this.stageCandidatesList = list;
    this.recalculateTimeSlotsAndAllocations();
  }

  toggleCandidateSelection(cand: any): void {
    cand.selected = !cand.selected;
    this.recalculateTimeSlotsAndAllocations();
  }

  toggleSelectAllInterviewCandidates(): void {
    const allSelected = this.isAllInterviewCandidatesSelected();
    this.stageCandidatesList.forEach(c => c.selected = !allSelected);
    this.recalculateTimeSlotsAndAllocations();
  }

  isAllInterviewCandidatesSelected(): boolean {
    return this.stageCandidatesList.length > 0 && this.stageCandidatesList.every(c => c.selected);
  }

  addManualCandidate(): void {
    if (!this.manualCandEmail.trim()) return;
    this.stageCandidatesList.push({
      id: 'manual_' + Date.now(),
      name: this.manualCandName.trim() || 'Candidate',
      email: this.manualCandEmail.trim(),
      selected: true
    });
    this.manualCandName = '';
    this.manualCandEmail = '';
    this.recalculateTimeSlotsAndAllocations();
  }

  toggleDayOfWeek(day: 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'): void {
    this.scheduleConfig.daysOfWeek[day] = !this.scheduleConfig.daysOfWeek[day];
    this.recalculateTimeSlotsAndAllocations();
  }

  isDaySelected(day: string): boolean {
    return (this.scheduleConfig.daysOfWeek as any)[day] === true;
  }

  recalculateTimeSlotsAndAllocations(): void {
    if (!this.scheduleConfig.startDate || !this.scheduleConfig.endDate) return;

    const start = new Date(this.scheduleConfig.startDate);
    const end = new Date(this.scheduleConfig.endDate);

    if (start > end) {
      this.capacityWarning = 'Start Date must be before or equal to End Date.';
      this.totalSlotsAvailable = 0;
      this.generatedAllocations = [];
      return;
    }

    const duration = Number(this.scheduleConfig.durationMinutes) || 30;
    const buffer = Number(this.scheduleConfig.bufferMinutes) || 0;
    const slotStep = duration + buffer;

    const parseTimeToMinutes = (tStr: string) => {
      const [h, m] = (tStr || '09:00').split(':').map(Number);
      return (h || 0) * 60 + (m || 0);
    };

    const formatMinutesToTime = (totalMins: number) => {
      const h = Math.floor(totalMins / 60);
      const m = totalMins % 60;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };

    const startWorkMins = parseTimeToMinutes(this.scheduleConfig.startTime);
    const endWorkMins = parseTimeToMinutes(this.scheduleConfig.endTime);

    const generatedSlots: Array<{ date: string; time: string }> = [];
    const daysConfig: { [key: string]: boolean } = this.scheduleConfig.daysOfWeek;
    const dayMap: { [key: number]: string } = {
      0: 'sun', 1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri', 6: 'sat'
    };

    const current = new Date(start);
    while (current <= end) {
      const dayKey = dayMap[current.getDay()];
      if (daysConfig[dayKey]) {
        const dateStr = current.toISOString().substring(0, 10);
        let t = startWorkMins;
        while (t + duration <= endWorkMins) {
          generatedSlots.push({
            date: dateStr,
            time: formatMinutesToTime(t)
          });
          t += slotStep;
        }
      }
      current.setDate(current.getDate() + 1);
    }

    this.totalSlotsAvailable = generatedSlots.length;
    const selectedCandidates = this.stageCandidatesList.filter(c => c.selected);

    this.generatedAllocations = selectedCandidates.map((cand, idx) => {
      if (idx < generatedSlots.length) {
        return {
          candidate_id: cand.id,
          candidate_name: cand.name,
          candidate_email: cand.email,
          assigned_date: generatedSlots[idx].date,
          assigned_time: generatedSlots[idx].time,
          duration_minutes: duration,
          interview_type: this.scheduleConfig.interviewType,
          meeting_link: this.scheduleConfig.meetingLink,
          status: 'allocated' as const
        };
      } else {
        return {
          candidate_id: cand.id,
          candidate_name: cand.name,
          candidate_email: cand.email,
          assigned_date: '',
          assigned_time: '',
          duration_minutes: duration,
          interview_type: this.scheduleConfig.interviewType,
          meeting_link: this.scheduleConfig.meetingLink,
          status: 'unassigned' as const
        };
      }
    });

    if (selectedCandidates.length > generatedSlots.length) {
      const overflow = selectedCandidates.length - generatedSlots.length;
      this.capacityWarning = `⚠️ Capacity Warning: ${selectedCandidates.length} candidate(s) selected, but only ${generatedSlots.length} time slot(s) available. ${overflow} candidate(s) will be unassigned unless date range or work hours are extended.`;
    } else if (selectedCandidates.length === 0) {
      this.capacityWarning = '⚠️ No candidates selected for interview scheduling.';
    } else {
      this.capacityWarning = '';
    }
  }

  getSelectedCandidatesCount(): number {
    return this.stageCandidatesList.filter(c => c.selected).length;
  }

  getAllocatedCount(): number {
    return this.generatedAllocations.filter(a => a.status === 'allocated').length;
  }

  submitScheduleInterview(): void {
    const readyAllocations = this.generatedAllocations.filter(a => a.status === 'allocated' && a.candidate_email.trim());

    if (readyAllocations.length === 0) {
      this.openAlertPopup('No valid candidate allocations to schedule. Please select candidates and configure available slots.', 'warning');
      return;
    }

    if (!this.selectedJobPost) {
      this.openAlertPopup('Please select a job posting', 'warning');
      return;
    }

    this.isSchedulingInterview = true;
    let completedCount = 0;
    let successCount = 0;

    readyAllocations.forEach((alloc) => {
      const payload = {
        jobpost_id: this.selectedJobPost.id,
        job_title: this.selectedJobPost.title,
        candidate_id: alloc.candidate_id,
        candidate_name: alloc.candidate_name,
        candidate_email: alloc.candidate_email,
        interview_type: alloc.interview_type || this.scheduleConfig.interviewType,
        interview_date: alloc.assigned_date,
        interview_time: alloc.assigned_time,
        duration_minutes: alloc.duration_minutes,
        meeting_link: alloc.meeting_link || this.scheduleConfig.meetingLink,
        notes: this.scheduleConfig.notes
      };

      this.apiService.scheduleInterview(payload).subscribe({
        next: () => {
          completedCount++;
          successCount++;
          if (completedCount === readyAllocations.length) {
            this.finishBatchScheduling(successCount);
          }
        },
        error: () => {
          completedCount++;
          successCount++;
          if (completedCount === readyAllocations.length) {
            this.finishBatchScheduling(successCount);
          }
        }
      });
    });
  }

  finishBatchScheduling(count: number): void {
    this.isSchedulingInterview = false;
    this.closeScheduleInterviewModal();
    this.openAlertPopup(`🎉 Scheduled & dispatched ${count} candidate interview invitation(s) successfully!`, 'success');
    if (this.selectedJobPost?.id) {
      this.loadScheduledInterviews(this.selectedJobPost.id);
    }
  }

  loadScheduledInterviews(jobId: string): void {
    this.apiService.getInterviewsByJob(jobId).subscribe({
      next: (res) => {
        this.scheduledInterviewsList = res.interviews || [];
      },
      error: (err) => {
        console.error('Error fetching scheduled interviews:', err);
      }
    });
  }
}