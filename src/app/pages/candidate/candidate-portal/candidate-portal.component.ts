import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CandidateService, CandidateProfile, MatchedJob } from '../../../services/candidate.service';
import { FormattingService } from '../../../services/formatting.service';
import { CustomDropdownComponent } from '../../../components/custom-dropdown/custom-dropdown.component';

@Component({
  selector: 'app-candidate-portal',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, CustomDropdownComponent],
  templateUrl: './candidate-portal.component.html',
  styleUrl: './candidate-portal.component.scss'
})
export class CandidatePortalComponent implements OnInit {
  activeTab: 'matches' | 'applications' | 'profile' | 'resume' = 'matches';

  isLoggedIn: boolean = false;
  userEmail: string = '';
  myApplications: any[] = [];
  appliedJobIds: Set<string> = new Set<string>();

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
    'All Matches (0%+)',
    'High Relevance (80%+)',
    'Exceptional Match (85%+)',
    'Top Tier Match (90%+)'
  ];

  selectedMatchScoreFilterLabel: string = 'All Matches (0%+)';

  onMatchScoreFilterChange(label: string): void {
    this.selectedMatchScoreFilterLabel = label;
    if (label.includes('80%')) {
      this.filterMinMatchScore = 80;
    } else if (label.includes('85%')) {
      this.filterMinMatchScore = 85;
    } else if (label.includes('90%')) {
      this.filterMinMatchScore = 90;
    } else {
      this.filterMinMatchScore = 0;
    }
    this.onMatchFiltersChange();
  }

  // Matched Opportunities Filter Controls
  filterExperienceLevel: string = 'All';
  filterJobType: string = 'All';
  filterLocation: string = '';
  filterCountry: string = 'All';
  filterMinMatchScore: number = 0;
  filterSearchQuery: string = '';

  // Notification Settings Modal state
  showNotificationSettingsModal: boolean = false;

  matchedJobs: MatchedJob[] = [];
  newSkill: string = '';
  
  isUploading: boolean = false;
  isLoading: boolean = false;
  isLoadingApplications: boolean = false;
  isSaving: boolean = false;
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
    public formattingService: FormattingService
  ) {}

  ngOnInit(): void {
    this.checkAuthentication();
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
    } else {
      this.isLoggedIn = false;
    }
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
      min_match_score: this.filterMinMatchScore > 0 ? this.filterMinMatchScore : undefined,
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
    return (this.matchedJobs || []).filter(job => {
      const jid = job.job_id || (job as any).id;
      if (jid && this.appliedJobIds.has(jid)) return false;
      if (job.has_applied) return false;
      return true;
    });
  }

  loadMyApplications(): void {
    this.isLoadingApplications = true;
    this.candidateService.getMyApplications().subscribe({
      next: (res: any) => {
        this.isLoadingApplications = false;
        if (res.success && res.applications) {
          this.myApplications = res.applications;
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
          this.trackedApplications = res.applications;
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
    this.filterMinMatchScore = 0;
    this.selectedMatchScoreFilterLabel = 'All Matches (0%+)';
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
}
