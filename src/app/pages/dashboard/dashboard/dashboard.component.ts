import { Component, OnInit } from '@angular/core';
import { CandidateListComponent } from '../components/candidate-list/candidate-list.component';
import { CommonModule } from '@angular/common';
import { CandidateRankingComponent } from '../components/candidate-ranking/candidate-ranking.component';
import { ShortlistedComponent } from '../components/shortlisted/shortlisted.component';
import { SettingsComponent } from '../components/settings/settings/settings.component';
import { RecruitingAnalyticsComponent } from '../components/recruiting-analytics/recruiting-analytics.component';
import { TalentPoolComponent } from '../components/talent-pool/talent-pool.component';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { JobpostManagerService } from '../../../services/jobpost-manager.service';
import { JobPostData, ApplicationStage } from '../../../models/jobpost.model';
import { LoaderComponent } from '../../components/loader/loader.component';
import { UserData, UserReq } from '../../../models/users.models';
import { IndexedDbService } from '../../../services/indexed-db.service';
import { DataService } from '../../../services/data.service';

import { OrgSwitcherComponent } from '../../../components/org-switcher/org-switcher.component';
import { AlertPopupComponent } from '../../components/alert-popup/alert-popup.component';
import { AlertService } from '../../../services/alert.service';
import { AlertConfig } from '../../../models/models.models';

@Component({
  selector: 'app-dashboard',
  imports: [
    CommonModule,
    RouterLink,
    OrgSwitcherComponent,
    CandidateListComponent,
    CandidateRankingComponent,
    ShortlistedComponent,
    SettingsComponent,
    RecruitingAnalyticsComponent,
    TalentPoolComponent,
    LoaderComponent,
    AlertPopupComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  applicationData: JobPostData | undefined;
  activeSection: string = 'candidates'; // Default active section
  sidebarOpen: boolean = true;
  sidebarCollapse: boolean = false;

  loading: boolean = false;
  loadingText: string = 'Loading ...';

  userData!: UserData;
  applicationStage = "Application Review";
  allJobPosts: any[] = [];
  currentJobId: string = '';

  get currentJobTitle(): string {
    if (this.applicationData?.job?.title) {
      return this.applicationData.job.title;
    }
    const job = this.allJobPosts.find(j => j.id === this.currentJobId);
    return job ? job.job_title : 'TalentFlow';
  }

  get userAvatarUrl(): string | null {
    const userStr = localStorage.getItem('USER');
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        return u.avatar_url || u.logo_url || null;
      } catch (e) {}
    }
    return null;
  }

  get userDisplayName(): string {
    const userStr = localStorage.getItem('USER');
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        return u.full_name || u.first_name || u.email || 'Recruiter';
      } catch (e) {}
    }
    return 'Recruiter';
  }

  alert: AlertConfig | null = null;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private indexedDbService: IndexedDbService,
    private jobPostService: JobpostManagerService,
    public dataService: DataService,
    private alertService: AlertService
  ) {
    const userData = localStorage.getItem('USER');
    if (userData) {
      this.userData = JSON.parse(userData);
    }

    const stageId = this.route.snapshot.paramMap.get('stageId') || '';
    this.setApplicationStageName(stageId);
  }

  setApplicationStageName(stageId: string): void {
    if (!stageId) {
      this.applicationStage = 'Application Review';
      return;
    }

    const cleanId = stageId.trim();
    const stages: ApplicationStage[] = this.applicationData?.applicationStages || this.jobPostService.defaultStages;

    // 1. Direct match by ID (exact or without 'stage_' prefix)
    let matched = stages?.find(
      (s: ApplicationStage) =>
        s.id === cleanId ||
        s.id === `stage_${cleanId}` ||
        s.id.replace('stage_', '') === cleanId
    );

    // 2. Direct match by name (case-insensitive)
    if (!matched) {
      const cleanName = cleanId.replace(/_/g, ' ').toLowerCase();
      matched = stages?.find(
        (s: ApplicationStage) => s.name?.toLowerCase() === cleanName
      );
    }

    // 3. Match by numeric order index (e.g. "0", "1", "2")
    if (!matched) {
      const num = parseInt(cleanId.replace('stage_', ''), 10);
      if (!isNaN(num)) {
        matched = stages?.find((s: ApplicationStage) => s.order === num);
        if (!matched && stages && num >= 0 && num < stages.length) {
          matched = stages[num];
        }
      }
    }

    if (matched && matched.name) {
      this.applicationStage = matched.name;
    } else {
      const formatted = cleanId.replace('stage_', '').replace(/_/g, ' ');
      this.applicationStage = (formatted && isNaN(Number(formatted))) ? formatted : 'Application Review';
    }
  }

  ngOnInit(): void {
    this.alertService.alert$.subscribe((alertConfig) => {
      this.alert = alertConfig;
    });

    const jobpostId = this.route.snapshot.paramMap.get('jobId');
    if (jobpostId) {
      this.currentJobId = jobpostId;
    }

    const userId = this.userData?.id || (this.userData as any)?.user_id;
    if (userId) {
      this.jobPostService.getJobPosts(userId).subscribe({
        next: (res: any) => {
          const rawPosts = Array.isArray(res) ? res : (res?.data || []);
          this.allJobPosts = rawPosts.map((jp: any) => ({
            ...jp,
            id: jp.id,
            job_title: jp.job_title || jp.title || jp.template_data?.job?.title || 'Job Posting',
            company_name: jp.company_name || jp.company || jp.template_data?.company?.name || this.userData?.company_name || 'Organization',
            department: jp.department || jp.template_data?.job?.department || ''
          }));
        },
        error: (err: any) => console.error('Failed to load job posts:', err)
      });
    }

    if (jobpostId) {
      this.loading = true;
      this.jobPostService.getJobPostData(jobpostId).subscribe({
        next: (data) => {
          this.loading = false;
          this.dataService.saveMetrics(data.data![0].application_metrics, jobpostId);
          const stageId = this.route.snapshot.paramMap.get('stageId') || '';
          this.dataService.totalShortListedCandidates = this.dataService.getStageMetrics(stageId, "successful_count");
          this.applicationData = data !== undefined ? data.data![0].template_data : undefined;
          this.jobPostService.updateApplicationData(this.applicationData!);
          this.setApplicationStageName(stageId);
        },
        error: (error) => {
          this.loading = false;
          console.error(error);
        },
      });
    }
  }

  updateApplicationData(data: any) {
    this.applicationData = data;
    this.jobPostService.updateApplicationData(this.applicationData!);
    const stageId = this.route.snapshot.paramMap.get('stageId') || '';
    this.setApplicationStageName(stageId);
  }

  setActiveSection(section: string) {
    this.activeSection = section;
  }

  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
  }

  toggleSidebarCollapse() {
    this.sidebarCollapse = !this.sidebarCollapse;
  }

  // Method to get section description
  getSectionDescription(section: string): string {
    const descriptions: { [key: string]: string } = {
      'candidates': 'Manage and review all candidate applications',
      'shortlisting': 'View and manage shortlisted candidates for this position',
      'ranking': 'Rank candidates based on evaluation criteria',
      'settings': 'Configure application settings and preferences'
    };
    return descriptions[section] || 'Manage recruitment activities';
  }


  // Add this method to your component class
  getInitials(fullName: string): string {
    if (!fullName) return '';

    return fullName
      .split(' ')
      .map((name) => name.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2); // Limit to first 2 initials
  }


  back() {
    this.router.navigate(['/dashboard']);
  }

  openAiCopilot(): void {
    const url = this.router.serializeUrl(
      this.router.createUrlTree(['/ai-copilot'], {
        queryParams: this.currentJobId ? { jobId: this.currentJobId } : null
      })
    );
    window.open(url, '_blank');
  }

  navigateToAssessmentCenter() {
    const jobId = this.route.snapshot.paramMap.get('jobId');
    if (jobId) {
      this.router.navigate(['/jobposts/tests', jobId]);
    }
  }
}
