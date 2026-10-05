import { Component, OnInit, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CandidateService, CandidateProfile, MatchedJob } from '../../../services/candidate.service';
import { FormattingService } from '../../../services/formatting.service';
import { CustomDropdownComponent } from '../../../components/custom-dropdown/custom-dropdown.component';
import { JobpostingsApiService } from '../../../services/jobpostings-api.service';
import { SelectedJobService } from '../../../services/selected-job.service';

@Component({
  selector: 'app-candidate-portal',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, CustomDropdownComponent],
  templateUrl: './candidate-portal.component.html',
  styleUrl: './candidate-portal.component.scss'
})
export class CandidatePortalComponent implements OnInit {
  activeTab: 'matches' | 'applications' | 'offers' | 'profile' | 'resume' = 'matches';
  appSubTab: 'my-apps' | 'track-status' | 'offers' = 'my-apps';

  // Sidebar state
  sidebarOpen = signal(true);

  // Scheduled Interviews State
  myInterviews: any[] = [];
  isLoadingInterviews: boolean = false;

  // Selected Job context integration
  selectedJobId: string | null = null;

  switchMainTab(tab: 'matches' | 'applications' | 'offers' | 'profile' | 'resume', subTab?: 'my-apps' | 'track-status' | 'offers'): void {
    if (tab === 'offers') {
      this.activeTab = 'applications';
      this.appSubTab = 'offers';
      this.loadMyOffers();
    } else {
      this.activeTab = tab;
      if (subTab) this.appSubTab = subTab;
    }
  }

  isLoggedIn: boolean = false;
  userEmail: string = '';
  myApplications: any[] = [];
  appliedJobIds: Set<string> = new Set<string>();

  get candidateDisplayName(): string {
    if (this.profile?.full_name && this.profile.full_name.trim()) {
      return this.profile.full_name.trim();
    }
    if (this.userEmail) {
      const parts = this.userEmail.split('@')[0].split(/[\._-]/);
      return parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
    }
    return 'Candidate';
  }

  get candidateFirstName(): string {
    const name = this.candidateDisplayName;
    return name.split(' ')[0] || 'Candidate';
  }

  // Offers State
  myOffers: any[] = [];
  isLoadingOffers: boolean = false;
  selectedOfferForView: any = null;
  respondingOfferId: string | null = null;
  offerResponseMessage: { [offerId: string]: { type: 'success' | 'error'; message: string } } = {};
  showCompanyEmailModal: boolean = false;
  emailCompanyData: { offerId: string; companyName: string; toEmail: string; subject: string; message: string } = { offerId: '', companyName: '', toEmail: '', subject: '', message: '' };
  isSendingCompanyEmail: boolean = false;

  // Application Tracking State
  trackingEmail: string = '';
  isTrackLoading: boolean = false;
  trackedApplications: any[] = [];
  trackErrorMessage: string = '';
  hasTracked: boolean = false;

  profile: CandidateProfile = {
    full_name: '',
    phone: '',
    headline: '',
    location: '',
    country: '',
    employment_status: 'Actively Looking',
    bio: '',
    website: '',
    skills_list: [],
    structured_resume: {},
    email_notifications_enabled: true,
    notification_match_threshold: 80,
    preferred_job_types: [],
    preferred_experience_levels: [],
    preferred_locations: []
  };

  countriesList = [
    'United States', 'United Kingdom', 'Canada', 'Australia', 'Germany',
    'France', 'India', 'Nigeria', 'Ghana', 'Singapore', 'South Africa',
    'United Arab Emirates', 'Brazil', 'Netherlands', 'Japan', 'Other'
  ];

  employmentStatusOptions = [
    'Actively Looking',
    'Open to Offers',
    'Employed',
    'Freelancer / Contract',
    'Not Available'
  ];

  employmentStatuses = [
    { label: '🟢 Actively Looking for Opportunities', value: 'Actively Looking' },
    { label: '🟡 Open to Offers (Currently Employed)', value: 'Open to Offers' },
    { label: '🔵 Employed (Not Looking)', value: 'Employed' },
    { label: '🟣 Freelancer / Contract Worker', value: 'Freelancer / Contract' },
    { label: '🔴 Not Available', value: 'Not Available' }
  ];

  experienceLevels = ['All', 'Entry Level', 'Intermediate', 'Senior', 'Executive'];
  jobTypes = ['All', 'Remote', 'Hybrid', 'On-site', 'Full-Time', 'Part-Time', 'Contract'];
  
  matchScoreFilterOptions = [
    'All Matches (50%+)',
    'Moderate Match (60%+)',
    'Good Match (70%+)',
    'High Relevance (80%+)',
    'Exceptional Match (85%+)',
    'Top Tier Match (90%+)'
  ];

  selectedMatchScoreFilterLabel: string = 'All Matches (50%+)';

  onMatchScoreFilterChange(label: string): void {
    this.selectedMatchScoreFilterLabel = label;
    if (label.includes('90%')) {
      this.filterMinMatchScore = 90;
    } else if (label.includes('85%')) {
      this.filterMinMatchScore = 85;
    } else if (label.includes('80%')) {
      this.filterMinMatchScore = 80;
    } else if (label.includes('70%')) {
      this.filterMinMatchScore = 70;
    } else if (label.includes('60%')) {
      this.filterMinMatchScore = 60;
    } else {
      this.filterMinMatchScore = 50;
    }
    this.onMatchFiltersChange();
  }

  // Matched Opportunities Filter Controls
  filterExperienceLevel: string = 'All';
  filterJobType: string = 'All';
  filterLocation: string = '';
  filterCountry: string = 'All';
  filterMinMatchScore: number = 50;
  filterSearchQuery: string = '';

  // Notification Settings Modal state
  showNotificationSettingsModal: boolean = false;

  matchedJobs: MatchedJob[] = [];
  newSkill: string = '';
  
  isUploading: boolean = false;
  isUploadingAvatar: boolean = false;
  isLoading: boolean = false;
  isLoadingApplications: boolean = false;
  isSaving: boolean = false;

  onAvatarSelected(event: any): void {
    const file: File = event.target.files[0];
    if (!file) return;

    this.isUploadingAvatar = true;
    this.feedback = null;

    this.candidateService.uploadCandidateAvatar(file).subscribe({
      next: (res: any) => {
        this.isUploadingAvatar = false;
        if (res.avatar_url) {
          this.profile.avatar_url = res.avatar_url;
          this.feedback = {
            type: 'success',
            message: 'Profile picture updated successfully!'
          };
          this.loadProfile();
        }
      },
      error: (err: any) => {
        this.isUploadingAvatar = false;
        console.error('Candidate avatar upload error:', err);
        this.feedback = {
          type: 'error',
          message: err?.error?.detail || 'Failed to upload profile picture.'
        };
      }
    });
  }
  applyingJobId: string | null = null;

  selectedJobDetailsModal: any = null;

  feedback: { type: 'success' | 'error'; message: string } | null = null;
  applyFeedback: { [jobId: string]: { type: 'success' | 'error'; message: string } } = {};

  openJobDetailsModal(job: MatchedJob): void {
    this.selectedJobDetailsModal = job;
  }

  closeJobDetailsModal(): void {
    this.selectedJobDetailsModal = null;
  }

  openNotificationSettingsModal(): void {
    this.showNotificationSettingsModal = true;
  }

  closeNotificationSettingsModal(): void {
    this.showNotificationSettingsModal = false;
  }

  togglePrefJobType(type: string): void {
    if (!this.profile.preferred_job_types) this.profile.preferred_job_types = [];
    const idx = this.profile.preferred_job_types.indexOf(type);
    if (idx >= 0) {
      this.profile.preferred_job_types.splice(idx, 1);
    } else {
      this.profile.preferred_job_types.push(type);
    }
  }

  isPrefJobTypeSelected(type: string): boolean {
    return (this.profile.preferred_job_types || []).includes(type);
  }

  togglePrefExpLevel(level: string): void {
    if (!this.profile.preferred_experience_levels) this.profile.preferred_experience_levels = [];
    const idx = this.profile.preferred_experience_levels.indexOf(level);
    if (idx >= 0) {
      this.profile.preferred_experience_levels.splice(idx, 1);
    } else {
      this.profile.preferred_experience_levels.push(level);
    }
  }

  isPrefExpLevelSelected(level: string): boolean {
    return (this.profile.preferred_experience_levels || []).includes(level);
  }

  constructor(
    private candidateService: CandidateService,
    private router: Router,
    public formattingService: FormattingService,
    private jobpostingsApiService: JobpostingsApiService,
    private selectedJobService: SelectedJobService
  ) {}

  openJobSelectionDropdown(): void {
    // Candidate job filter dropdown action
  }

  ngOnInit(): void {
    this.checkAuthentication();
    this.selectedJobId = this.selectedJobService.selectedJobId;
    this.selectedJobService.selectedJobId$.subscribe(id => {
      this.selectedJobId = id;
    });
  }

  checkAuthentication(): void {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('USER');

    if (token) {
      this.isLoggedIn = true;
      if (userStr) {
        try {
          const userObj = JSON.parse(userStr);
          this.userEmail = userObj.email || userObj.username || '';
          if (userObj.first_name || userObj.last_name) {
            this.profile.full_name = `${userObj.first_name || ''} ${userObj.last_name || ''}`.trim();
          }
        } catch (e) {
          console.warn('Could not parse stored USER object:', e);
        }
      }
      this.loadProfile();
      this.loadMatchedJobs();
      this.loadMyApplications();
      this.loadMyOffers();
      this.loadMyInterviews();
    } else {
      this.isLoggedIn = false;
    }
  }

  toggleSidebar(): void {
    this.sidebarOpen.update(val => !val);
  }

  getTimeStamp(item: any): number {
    if (!item) return 0;
    const dateVal =
      item.created_at ||
      item.applied_at ||
      item.submitted_at ||
      item.issued_at ||
      item.scheduled_at ||
      item.interview_date ||
      item.updated_at ||
      item.date ||
      item.timestamp;

    if (dateVal) {
      const parsed = new Date(dateVal).getTime();
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }

    if (typeof item.id === 'number') return item.id;
    if (typeof item.application_id === 'number') return item.application_id;

    return 0;
  }

  sortItemsByNewest(items: any[]): any[] {
    if (!Array.isArray(items)) return [];
    return [...items].sort((a, b) => {
      const timeA = this.getTimeStamp(a);
      const timeB = this.getTimeStamp(b);
      if (timeA !== timeB) return timeB - timeA;
      const idA = String(a.id || a.application_id || a.job_id || '');
      const idB = String(b.id || b.application_id || b.job_id || '');
      return idB.localeCompare(idA, undefined, { numeric: true });
    });
  }

  loadMyInterviews(): void {
    this.isLoadingInterviews = true;
    const targetEmail = this.userEmail || this.profile?.user_email;
    this.jobpostingsApiService.getMyInterviews(targetEmail).subscribe({
      next: (res) => {
        this.isLoadingInterviews = false;
        this.myInterviews = this.sortItemsByNewest(res.interviews || []);
      },
      error: (err) => {
        this.isLoadingInterviews = false;
        console.error('Failed to load candidate interviews:', err);
      }
    });
  }

  redirectToLogin(): void {
    this.router.navigate(['/auth/signin']);
  }

  redirectToRegister(): void {
    this.router.navigate(['/auth/signup']);
  }

  signOut(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('USER');
    localStorage.clear();
    this.isLoggedIn = false;
    this.userEmail = '';
    this.profile = {
      full_name: '',
      phone: '',
      headline: '',
      location: '',
      employment_status: 'Actively Looking',
      bio: '',
      website: '',
      skills_list: [],
      structured_resume: {}
    };
    this.matchedJobs = [];
    this.myApplications = [];
    this.router.navigate(['/auth/signin']);
  }

  switchAccount(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('USER');
    localStorage.clear();
    this.isLoggedIn = false;
    this.userEmail = '';
    this.router.navigate(['/auth/signin']);
  }

  loadProfile(): void {
    this.isLoading = true;
    this.candidateService.getProfile().subscribe({
      next: (res: any) => {
        this.isLoading = false;
        if (res.success && res.profile) {
          this.profile = { 
            ...this.profile, 
            ...res.profile,
            country: res.profile.country || this.profile.country || '',
            employment_status: res.profile.employment_status || 'Actively Looking',
            structured_resume: res.profile.structured_resume || {},
            skills_list: res.profile.skills_list || [],
            email_notifications_enabled: res.profile.email_notifications_enabled !== undefined ? res.profile.email_notifications_enabled : true,
            notification_match_threshold: res.profile.notification_match_threshold || 80,
            preferred_job_types: res.profile.preferred_job_types || [],
            preferred_experience_levels: res.profile.preferred_experience_levels || [],
            preferred_locations: res.profile.preferred_locations || []
          };
          if (res.profile.user_email) {
            this.userEmail = res.profile.user_email;
          }
          this.loadMyOffers();
        }
      },
      error: (err: any) => {
        this.isLoading = false;
        console.error('Failed to load candidate profile:', err);
      }
    });
  }

  loadMatchedJobs(): void {
    this.isLoading = true;
    const filters = {
      experience_level: this.filterExperienceLevel,
      job_type: this.filterJobType,
      location: this.filterLocation,
      country: this.filterCountry,
      min_match_score: this.filterMinMatchScore,
      search: this.filterSearchQuery
    };

    this.candidateService.getMatchedJobs(filters).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        if (res.success && res.matched_jobs) {
          this.matchedJobs = res.matched_jobs;
        }
      },
      error: (err: any) => {
        this.isLoading = false;
        console.error('Failed to load matched jobs:', err);
      }
    });
    this.loadMyApplications();
  }

  get displayMatchedJobs(): MatchedJob[] {
    const list = (this.matchedJobs || []).filter(job => {
      const jid = job.job_id || (job as any).id;
      if (jid && this.appliedJobIds.has(jid)) return false;
      if (job.has_applied) return false;
      if (job.match_score !== undefined && job.match_score < 50) return false;
      return true;
    });

    return list.sort((a: any, b: any) => {
      const timeA = this.getTimeStamp(a);
      const timeB = this.getTimeStamp(b);
      if (timeA !== timeB) return timeB - timeA;
      return (b.match_score || 0) - (a.match_score || 0);
    });
  }

  loadMyApplications(): void {
    this.isLoadingApplications = true;
    this.candidateService.getMyApplications().subscribe({
      next: (res: any) => {
        this.isLoadingApplications = false;
        if (res.success && res.applications) {
          this.myApplications = this.sortItemsByNewest(res.applications);
          this.appliedJobIds = new Set(
            this.myApplications.map(a => a.job_id || a.jobpost_id).filter(id => !!id)
          );
        }
        const targetEmail = this.userEmail || this.profile?.user_email;
        if (targetEmail) {
          this.trackingEmail = targetEmail;
          this.trackApplicationsByEmail(targetEmail);
        }
      },
      error: (err: any) => {
        this.isLoadingApplications = false;
        console.error('Failed to load candidate applications:', err);
        const targetEmail = this.userEmail || this.profile?.user_email;
        if (targetEmail) {
          this.trackingEmail = targetEmail;
          this.trackApplicationsByEmail(targetEmail);
        }
      }
    });
  }

  trackApplicationsByEmail(emailOverride?: string): void {
    const targetEmail = (emailOverride || this.trackingEmail || this.userEmail || '').trim();
    if (!targetEmail || !targetEmail.includes('@')) {
      this.trackErrorMessage = 'Please enter a valid email address.';
      return;
    }
    this.trackingEmail = targetEmail;
    this.isTrackLoading = true;
    this.trackErrorMessage = '';
    this.hasTracked = true;

    this.candidateService.trackApplications(targetEmail).subscribe({
      next: (res: any) => {
        this.isTrackLoading = false;
        if (res.success && res.applications && res.applications.length > 0) {
          this.trackedApplications = this.sortItemsByNewest(res.applications);
        } else {
          this.trackedApplications = [];
          this.trackErrorMessage = res.message || 'No applications or submissions found for this email address.';
        }
      },
      error: (err: any) => {
        this.isTrackLoading = false;
        this.trackedApplications = [];
        this.trackErrorMessage = 'Unable to search application records. Please try again.';
      }
    });
  }

  getStageProgress(stageName: string): { step: number; percentage: number; label: string; status: 'in-progress' | 'completed' | 'rejected' } {
    const st = (stageName || '').toLowerCase();
    if (st.includes('hired') || st.includes('offer')) {
      return { step: 4, percentage: 100, label: 'Offer / Hired', status: 'completed' };
    } else if (st.includes('interview') || st.includes('assessment')) {
      return { step: 3, percentage: 75, label: 'Interview & Evaluation', status: 'in-progress' };
    } else if (st.includes('shortlist') || st.includes('review') || st.includes('screening')) {
      return { step: 2, percentage: 50, label: 'Recruiter Review', status: 'in-progress' };
    } else if (st.includes('reject') || st.includes('declined')) {
      return { step: 2, percentage: 50, label: 'Not Selected', status: 'rejected' };
    } else {
      return { step: 1, percentage: 25, label: 'Application Received', status: 'completed' };
    }
  }

  onMatchFiltersChange(): void {
    this.loadMatchedJobs();
  }

  resetMatchFilters(): void {
    this.filterExperienceLevel = 'All';
    this.filterJobType = 'All';
    this.filterLocation = '';
    this.filterCountry = 'All';
    this.filterMinMatchScore = 50;
    this.selectedMatchScoreFilterLabel = 'All Matches (50%+)';
    this.filterSearchQuery = '';
    this.loadMatchedJobs();
  }

  onFileSelected(event: any): void {
    const file: File = event.target.files[0];
    if (!file) return;

    this.isUploading = true;
    this.feedback = null;

    this.candidateService.uploadResume(file).subscribe({
      next: (res: any) => {
        this.isUploading = false;
        if (res.success && res.data) {
          const d = res.data;
          if (d.extracted_name) {
            this.profile.full_name = d.extracted_name;
          }
          if (d.extracted_phone) {
            this.profile.phone = d.extracted_phone;
          }
          if (d.extracted_address) {
            this.profile.location = d.extracted_address;
          }
          if (d.skills_list && d.skills_list.length > 0) {
            this.profile.skills_list = Array.from(new Set([...(this.profile.skills_list || []), ...d.skills_list]));
          }
          if (d.structured_resume || d.resume_data) {
            this.profile.structured_resume = d.structured_resume || d.resume_data;
            this.profile.resume_data = d.resume_data || d.structured_resume;
          }
          if (d.raw_text) {
            this.profile.raw_text = d.raw_text;
          }
          this.feedback = {
            type: 'success',
            message: 'Resume parsed, structured & updated in your profile!'
          };
          // Immediately reload from backend to ensure UI displays persisted database state
          this.loadProfile();
          this.loadMatchedJobs();
        }
      },
      error: (err: any) => {
        this.isUploading = false;
        console.error('Resume upload error:', err);
        this.feedback = {
          type: 'error',
          message: err?.error?.detail || 'Failed to parse resume. Please try again.'
        };
      }
    });
  }

  addSkill(): void {
    if (!this.newSkill || !this.newSkill.trim()) return;
    const trimmed = this.newSkill.trim();
    if (!this.profile.skills_list.includes(trimmed)) {
      this.profile.skills_list.push(trimmed);
    }
    this.newSkill = '';
  }

  removeSkill(skill: string): void {
    this.profile.skills_list = this.profile.skills_list.filter((s: string) => s !== skill);
  }

  // Structured Resume Editable Section Helpers
  ensureStructuredResume(): void {
    if (!this.profile.structured_resume) {
      this.profile.structured_resume = {};
    }
    if (!this.profile.structured_resume.work_experience) {
      this.profile.structured_resume.work_experience = [];
    }
    if (!this.profile.structured_resume.education) {
      this.profile.structured_resume.education = [];
    }
    if (!this.profile.structured_resume.projects) {
      this.profile.structured_resume.projects = [];
    }
    if (!this.profile.structured_resume.personal_details) {
      this.profile.structured_resume.personal_details = {};
    }
  }

  addWorkExperience(): void {
    this.ensureStructuredResume();
    this.profile.structured_resume.work_experience.push({
      job_title: '',
      company: '',
      start_date: '',
      end_date: '',
      location: '',
      description: ''
    });
  }

  removeWorkExperience(index: number): void {
    if (this.profile.structured_resume?.work_experience) {
      this.profile.structured_resume.work_experience.splice(index, 1);
    }
  }

  addEducation(): void {
    this.ensureStructuredResume();
    this.profile.structured_resume.education.push({
      institution: '',
      degree: '',
      field_of_study: '',
      start_date: '',
      end_date: ''
    });
  }

  removeEducation(index: number): void {
    if (this.profile.structured_resume?.education) {
      this.profile.structured_resume.education.splice(index, 1);
    }
  }

  addProject(): void {
    this.ensureStructuredResume();
    this.profile.structured_resume.projects.push({
      name: '',
      description: ''
    });
  }

  removeProject(index: number): void {
    if (this.profile.structured_resume?.projects) {
      this.profile.structured_resume.projects.splice(index, 1);
    }
  }

  saveProfile(): void {
    if (!this.profile.full_name) {
      this.feedback = { type: 'error', message: 'Full name is required.' };
      return;
    }

    this.isSaving = true;
    this.feedback = null;

    this.candidateService.saveProfile(this.profile).subscribe({
      next: (res: any) => {
        this.isSaving = false;
        this.feedback = { type: 'success', message: 'Profile saved & talent pool updated!' };
        this.loadMatchedJobs();
      },
      error: (err: any) => {
        this.isSaving = false;
        console.error('Profile save error:', err);
        this.feedback = {
          type: 'error',
          message: err?.error?.detail || 'Failed to save profile.'
        };
      }
    });
  }

  openApplicationForm(job: MatchedJob | any): void {
    const compName = job.company_name || job.company || job.org_name || 'HireUp';
    const jobId = job.job_id || job.id;
    const candEmail = this.profile?.user_email || this.userEmail || '';
    const candId = this.profile?.id || '';

    const queryParams: any = {};
    if (candId) queryParams.candidateId = candId;
    if (candEmail) queryParams.email = candEmail;

    const url = this.router.serializeUrl(
      this.router.createUrlTree(['/apply', compName, jobId], { queryParams })
    );
    window.open(url, '_blank');
  }

  oneClickApply(job: MatchedJob): void {
    this.applyingJobId = job.job_id;
    this.candidateService.applyToJob(job.job_id).subscribe({
      next: (res: any) => {
        this.applyingJobId = null;
        this.applyFeedback[job.job_id] = {
          type: 'success',
          message: res.message || 'Application submitted successfully! Added to recruiter queue.'
        };
        this.loadMatchedJobs();
      },
      error: (err: any) => {
        this.applyingJobId = null;
        this.applyFeedback[job.job_id] = {
          type: 'error',
          message: err?.error?.detail || 'Failed to apply.'
        };
      }
    });
  }

  withdrawingAppId: string | null = null;

  applyToJob(job: MatchedJob): void {
    const hasForm = job.has_form || !!job.form_id || !!(job as any).template_data?.form_schema;
    if (hasForm) {
      this.openApplicationForm(job);
      return;
    }
    this.oneClickApply(job);
  }

  withdrawApplication(app: any): void {
    if (!app || !app.application_id) return;
    if (!confirm(`Are you sure you want to withdraw your application for "${app.job_title}" at ${app.company_name}?`)) {
      return;
    }

    this.withdrawingAppId = app.application_id;
    this.feedback = null;

    this.candidateService.withdrawApplication(app.application_id).subscribe({
      next: (res: any) => {
        this.withdrawingAppId = null;
        this.feedback = {
          type: 'success',
          message: res.message || 'Application withdrawn successfully.'
        };
        this.loadMyApplications();
        this.loadMatchedJobs();
      },
      error: (err: any) => {
        this.withdrawingAppId = null;
        console.error('Error withdrawing application:', err);
        this.feedback = {
          type: 'error',
          message: err?.error?.detail || 'Failed to withdraw application.'
        };
      }
    });
  }

  loadMyOffers(): void {
    this.isLoadingOffers = true;
    const email = this.userEmail || this.profile.user_email || '';
    const candId = this.profile.id || '';
    this.candidateService.getMyOffers(email, candId).subscribe({
      next: (res: any) => {
        this.isLoadingOffers = false;
        if (res.success && res.offers) {
          this.myOffers = res.offers;
        }
      },
      error: (err: any) => {
        this.isLoadingOffers = false;
        console.error('Failed to load candidate offers:', err);
      }
    });
  }

  openViewOfferModal(offer: any): void {
    this.selectedOfferForView = offer;
  }

  closeViewOfferModal(): void {
    this.selectedOfferForView = null;
  }

  acceptOffer(offer: any): void {
    if (!offer || !offer.id) return;
    this.respondingOfferId = offer.id;
    const email = this.userEmail || offer.candidate_email || '';
    const payload = {
      status: 'accepted',
      candidate_email: email,
      notes: 'Accepted via Candidate Portal'
    };
    this.candidateService.respondToOffer(offer.id, payload).subscribe({
      next: (res: any) => {
        this.respondingOfferId = null;
        offer.status = 'accepted';
        this.offerResponseMessage[offer.id] = { type: 'success', message: 'Congratulations! Offer accepted successfully.' };
        this.loadMyOffers();
      },
      error: (err: any) => {
        this.respondingOfferId = null;
        this.offerResponseMessage[offer.id] = { type: 'error', message: err?.error?.detail || 'Failed to accept offer.' };
      }
    });
  }

  // Confirmation Modal state for declining offers
  showDeclineConfirmModal: boolean = false;
  offerToDecline: any = null;
  declineReasonNote: string = '';

  declineOffer(offer: any): void {
    if (!offer || !offer.id) return;
    this.offerToDecline = offer;
    this.declineReasonNote = '';
    this.showDeclineConfirmModal = true;
  }

  closeDeclineModal(): void {
    this.showDeclineConfirmModal = false;
    this.offerToDecline = null;
    this.declineReasonNote = '';
  }

  confirmDeclineOffer(): void {
    if (!this.offerToDecline || !this.offerToDecline.id) return;
    const offer = this.offerToDecline;
    this.respondingOfferId = offer.id;
    const email = this.userEmail || offer.candidate_email || '';
    const payload = {
      status: 'declined',
      candidate_email: email,
      notes: this.declineReasonNote.trim() || 'Declined via Candidate Portal'
    };
    this.candidateService.respondToOffer(offer.id, payload).subscribe({
      next: (res: any) => {
        this.respondingOfferId = null;
        offer.status = 'declined';
        this.offerResponseMessage[offer.id] = { type: 'success', message: 'Offer declined.' };
        this.closeDeclineModal();
        this.loadMyOffers();
      },
      error: (err: any) => {
        this.respondingOfferId = null;
        this.offerResponseMessage[offer.id] = { type: 'error', message: err?.error?.detail || 'Failed to decline offer.' };
        this.closeDeclineModal();
      }
    });
  }

  openContactCompanyModal(offer: any): void {
    this.emailCompanyData = {
      offerId: offer.id,
      companyName: offer.company_name || 'Company Hiring Team',
      toEmail: offer.issued_by || 'recruitment@company.com',
      subject: `Inquiry Regarding Offer: ${offer.job_title}`,
      message: ''
    };
    this.showCompanyEmailModal = true;
  }

  closeContactCompanyModal(): void {
    this.showCompanyEmailModal = false;
  }

  sendEmailToCompany(): void {
    if (!this.emailCompanyData.message || !this.emailCompanyData.message.trim()) return;
    this.isSendingCompanyEmail = true;
    const email = this.userEmail || this.profile.user_email || '';
    const name = this.profile.full_name || 'Candidate';
    const payload = {
      offer_id: this.emailCompanyData.offerId,
      candidate_email: email,
      candidate_name: name,
      subject: this.emailCompanyData.subject,
      message: this.emailCompanyData.message
    };
    this.candidateService.contactCompany(payload).subscribe({
      next: (res: any) => {
        this.isSendingCompanyEmail = false;
        this.showCompanyEmailModal = false;
        this.feedback = { type: 'success', message: 'Your message has been sent to the company hiring team successfully!' };
      },
      error: (err: any) => {
        this.isSendingCompanyEmail = false;
        this.feedback = { type: 'error', message: err?.error?.detail || 'Failed to send message to company.' };
      }
    });
  }
}
