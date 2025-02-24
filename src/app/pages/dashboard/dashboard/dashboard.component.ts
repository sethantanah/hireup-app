import { Component, OnInit } from '@angular/core';
import { CandidateListComponent } from '../components/candidate-list/candidate-list.component';
import { CommonModule } from '@angular/common';
import { CandidateRankingComponent } from '../components/candidate-ranking/candidate-ranking.component';
import { ShortlistedComponent } from '../components/shortlisted/shortlisted.component';
import { SettingsComponent } from '../components/settings/settings/settings.component';
import { ActivatedRoute } from '@angular/router';
import { JobpostManagerService } from '../../../services/jobpost-manager.service';
import { JobPostData } from '../../../models/jobpost.model';
import { LoaderComponent } from '../../components/loader/loader.component';

@Component({
  selector: 'app-dashboard',
  imports: [
    CommonModule,
    CandidateListComponent,
    CandidateRankingComponent,
    ShortlistedComponent,
    SettingsComponent,
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

  constructor(
    private route: ActivatedRoute,
    private jobPostService: JobpostManagerService
  ) {
    const jobpostId = this.route.snapshot.paramMap.get('jobId');
  }

  ngOnInit(): void {
    const jobpostId = this.route.snapshot.paramMap.get('jobId');
    this.loading = true;
    if (jobpostId) {
      this.jobPostService.jobPostData(jobpostId).subscribe({
        next: (data) => {
          this.loading = false;
          this.applicationData = data[0].template_data;
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
}
