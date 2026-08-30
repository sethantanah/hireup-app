import { Component, OnInit } from '@angular/core';
import { CandidateListComponent } from '../components/candidate-list/candidate-list.component';
import { CommonModule } from '@angular/common';
import { CandidateRankingComponent } from '../components/candidate-ranking/candidate-ranking.component';
import { ShortlistedComponent } from '../components/shortlisted/shortlisted.component';
import { SettingsComponent } from '../components/settings/settings/settings.component';
import { RecruitingAnalyticsComponent } from '../components/recruiting-analytics/recruiting-analytics.component';
import { TalentPoolComponent } from '../components/talent-pool/talent-pool.component';
import { ActivatedRoute, Router } from '@angular/router';
import { JobpostManagerService } from '../../../services/jobpost-manager.service';
import { JobPostData } from '../../../models/jobpost.model';
import { LoaderComponent } from '../../components/loader/loader.component';
import { UserData, UserReq } from '../../../models/users.models';
import { IndexedDbService } from '../../../services/indexed-db.service';
import { DataService } from '../../../services/data.service';

@Component({
  selector: 'app-dashboard',
  imports: [
    CommonModule,
    CandidateListComponent,
    CandidateRankingComponent,
    ShortlistedComponent,
    SettingsComponent,
    RecruitingAnalyticsComponent,
    TalentPoolComponent,
    LoaderComponent,
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

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private indexedDbService: IndexedDbService,
    private jobPostService: JobpostManagerService,
    public dataService: DataService

  ) {
    const userData = localStorage.getItem('USER');
    if (userData) {
      this.userData = JSON.parse(userData);
    }

       const stageId = this.route.snapshot.paramMap.get('stageId') || '';
       this.applicationStage = stageId.replace("stage_", "").replace("_", " ")
  }

  ngOnInit(): void {
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
          this.dataService.saveMetrics(data.data![0].application_metrics, jobpostId)
          const stageId = this.route.snapshot.paramMap.get('stageId') || '';
          this.dataService.totalShortListedCandidates = this.dataService.getStageMetrics(stageId, "successful_count");
          this.applicationData = data !== undefined ? data.data![0].template_data : undefined;
          this.jobPostService.updateApplicationData(this.applicationData!);
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
    this.router.navigate(['/jobposts', this.userData.id])
  }

  navigateToAssessmentCenter() {
    const jobId = this.route.snapshot.paramMap.get('jobId');
    if (jobId) {
      this.router.navigate(['/jobposts/tests', jobId]);
    }
  }
}
