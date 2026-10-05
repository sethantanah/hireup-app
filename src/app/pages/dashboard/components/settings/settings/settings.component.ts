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
import { SmtpSettingsComponent } from '../smtp-settings/smtp-settings.component';
import { UserProfileSettingsComponent } from '../user-profile-settings/user-profile-settings.component';
import { AlertPopupComponent } from '../../../../components/alert-popup/alert-popup.component';
import { AlertService } from '../../../../../services/alert.service';

export type SettingType =
  | 'user-profile'
  | 'card-display'
  | 'search-filter'
  | 'candidate-ranking'
  | 'smtp-settings'
  | 'notifications'
  | 'preferences'
  | 'integrations';

@Component({
  selector: 'app-settings',
  imports: [
    CommonModule,
    UserProfileSettingsComponent,
    CardDisplaySettingsComponent,
    SearchFilterSettingsComponent,
    CandidateRankingSettingsComponent,
    SmtpSettingsComponent,
    AlertPopupComponent,
  ],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
})
export class SettingsComponent implements OnInit {
  @Input() applicationData?: JobPostData;
  @Output() updateApplicationData = new EventEmitter<any>();
  currentSetting: SettingType = 'user-profile';
  settingsMenu: Array<{ id: SettingType; label: string; icon: string }> = [
    { id: 'user-profile', label: 'Recruiter Profile & Avatar', icon: 'fas fa-user-circle' },
    { id: 'card-display', label: 'Card Display', icon: 'fas fa-id-card' },
    { id: 'search-filter', label: 'Search and Filter', icon: 'fas fa-search' },
    {
      id: 'candidate-ranking',
      label: 'Candidate Ranking',
      icon: 'fas fa-sort-amount-down',
    },
    {
      id: 'smtp-settings',
      label: 'Organization SMTP Mail',
      icon: 'fas fa-paper-plane',
    },
  ];

  loading: boolean = false;
  loadingText: string = 'Loading ...';
  alert: any = null;

  constructor(
    private route: ActivatedRoute,
    private jobPostService: JobpostManagerService,
    public formattingService: FormattingService,
    private alertService: AlertService
  ) {}

  ngOnInit(): void {
    this.alertService.alert$.subscribe((alert) => {
      this.alert = alert;
    });

    const jobpostId = this.route.snapshot.paramMap.get('jobId') || this.route.parent?.snapshot.paramMap.get('jobId');
    if (jobpostId && !this.applicationData) {
      this.loading = true;
      this.loadingText = 'Loading settings...';
      this.jobPostService.getJobPostData(jobpostId).subscribe({
        next: (res: any) => {
          this.loading = false;
          if (res?.success && res.data?.[0]?.template_data) {
            this.applicationData = res.data[0].template_data;
          } else {
            this.applicationData = this.jobPostService.getApplicationData();
          }
        },
        error: (error) => {
          this.loading = false;
          this.applicationData = this.jobPostService.getApplicationData();
        },
      });
    } else if (!this.applicationData) {
      this.applicationData = this.jobPostService.getApplicationData();
    }
  }

  selectSetting(setting: SettingType): void {
    this.currentSetting = setting;
  }

  saveChanges(applicationData: any): void {
    const jobpostId = this.route.snapshot.paramMap.get('jobId') || this.route.parent?.snapshot.paramMap.get('jobId');
    this.applicationData = applicationData;
    this.jobPostService.updateApplicationData(applicationData);

    if (jobpostId) {
      this.loading = true;
      this.loadingText = 'Saving settings...';
      this.jobPostService
        .createUpdateJobPostData(jobpostId, applicationData)
        .subscribe({
          next: (data) => {
            if (data?.data) {
              this.applicationData!.id = data.data.id || jobpostId;
            }
            this.updateApplicationData.emit(this.applicationData);
            this.loading = false;
            this.alertService.showSuccess('Candidate ranking requirements saved successfully.');
          },
          error: (error) => {
            this.loading = false;
            console.error('Error saving settings:', error);
            this.alertService.showDanger('Failed to save settings: ' + (error?.error?.detail || error?.message || 'Server error'));
          },
        });
    } else {
      this.updateApplicationData.emit(this.applicationData);
      this.alertService.showSuccess('Candidate ranking requirements updated locally.');
    }
  }

  onAlertClosed(): void {
    this.alertService.clearAlert();
  }
}
