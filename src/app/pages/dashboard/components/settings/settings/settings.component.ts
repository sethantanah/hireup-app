import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CardDisplaySettingsComponent } from '../card-display-settings/card-display-settings.component';
import { JobpostManagerService } from '../../../../../services/jobpost-manager.service';
import { ActivatedRoute } from '@angular/router';
import { FormattingService } from '../../../../../services/formatting.service';
import { JobPostData } from '../../../../../models/jobpost.model';
import { LoaderComponent } from '../../../../components/loader/loader.component';
import { SearchFilterSettingsComponent } from '../search-filter-settings/search-filter-settings.component';
import { CandidateRankingSettingsComponent } from '../candidate-ranking-settings/candidate-ranking-settings.component';
export type SettingType =
  | 'card-display'
  | 'search-filter'
  | 'candidate-ranking'
  | 'notifications'
  | 'preferences'
  | 'integrations';
@Component({
  selector: 'app-settings',
  imports: [
    CommonModule,
    CardDisplaySettingsComponent,
    SearchFilterSettingsComponent,
    CandidateRankingSettingsComponent,
  ],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
})
export class SettingsComponent implements OnInit {
  @Input() applicationData!: JobPostData | undefined;
  @Output() updateApplicationData = new EventEmitter<any>();
  currentSetting: SettingType = 'card-display';
  settingsMenu: Array<{ id: SettingType; label: string; icon: string }> = [
    { id: 'card-display', label: 'Card Display', icon: 'fas fa-id-card' },
    { id: 'search-filter', label: 'Search and Filter', icon: 'fas fa-search' },
    {
      id: 'candidate-ranking',
      label: 'Candidate Ranking',
      icon: 'fas fa-sort-amount-down',
    },
    { id: 'notifications', label: 'Notifications', icon: 'fas fa-bell' },
    { id: 'preferences', label: 'Preferences', icon: 'fas fa-cog' },
    { id: 'integrations', label: 'Integrations', icon: 'fas fa-plug' },
  ];

  loading: boolean = false;
  loadingText: string = 'Loading ...';

  constructor(
    private route: ActivatedRoute,
    private jobPostService: JobpostManagerService,
    public formattingService: FormattingService
  ) {
    const jobpostId = this.route.snapshot.paramMap.get('jobId');
  }

  ngOnInit(): void {
    // const jobpostId = this.route.snapshot.paramMap.get('jobId');
    // this.loading = true;
    // if (jobpostId) {
    //   this.jobPostService.jobPostData(jobpostId).subscribe({
    //     next: (data) => {
    //       this.loading = false;
    //       this.applicationData = data[0].template_data;
    //     },
    //     error: (error) => {
    //       this.loading = false;
    //       console.error(error);
    //     },
    //   });
    // }
  }

  selectSetting(setting: SettingType): void {
    this.currentSetting = setting;
  }

  saveChanges(applicationData: any): void {
    const jobpostId = this.route.snapshot.paramMap.get('jobId');
    if (jobpostId) {
      this.loading = true;
      this.loadingText = 'Saving ...';
      this.jobPostService
        .createUpdateJobPostData(jobpostId, applicationData)
        .subscribe({
          next: (data) => {
            if (data.data) {
              applicationData!.id = data.data.id;
              this.updateApplicationData.emit(applicationData);
            }
            this.loading = false;
            this.loadingText = 'Loading ...';
          },
          error: (error) => {
            this.loading = false;
            this.loadingText = 'Loading ...';
            console.error(error);
          },
        });
    }
  }
}
