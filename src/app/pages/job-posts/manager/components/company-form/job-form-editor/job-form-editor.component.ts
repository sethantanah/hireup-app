import { Component, OnInit } from '@angular/core';
import { FormField, JobPostData } from '../../../../../../models/jobpost.model';
import { JobpostManagerService } from '../../../../../../services/jobpost-manager.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FormattingService } from '../../../../../../services/formatting.service';
import { DynamicFormComponent } from '../dynamic-form/dynamic-form.component';
import { PreviewComponent } from '../preview/preview.component';
import { LoaderComponent } from '../../../../../components/loader/loader.component';
import { ActivatedRoute } from '@angular/router';
import { EmailTemplatesComponent } from '../email-templates/email-templates.component';
import { ApplicationStagesComponent } from '../application-stages/application-stages.component';
import { ApplicantManagementService } from '../../../../../../services/applicant-management.service';
import { error } from 'console';
import { CandidateRankingSettingsComponent } from '../../../../../dashboard/components/settings/candidate-ranking-settings/candidate-ranking-settings.component';

@Component({
  selector: 'app-job-form-editor',
  imports: [
    CommonModule,
    FormsModule,
    DynamicFormComponent,
    PreviewComponent,
    LoaderComponent,
    ApplicationStagesComponent,
    EmailTemplatesComponent,
    CandidateRankingSettingsComponent,
  ],
  templateUrl: './job-form-editor.component.html',
  styleUrl: './job-form-editor.component.scss',
})
export class JobFormEditorComponent implements OnInit {
  applicationData: JobPostData | undefined;
  editorSections = [
    'Company Details',
    'Job Description',
    'Application Section',
    'Submission Message',
    'Contact Section',
    'Application Form',
    'Request For Additional Data',
    'Application Stages',
    'Auto Screening'
  ];

  templateSections = ['Job Templates', 'Email Templates', 'Color Scheme'];

  sections = [...this.editorSections, ...this.templateSections];
  selectedSection: string = this.sections[0];

  showPreview: boolean = true;
  isExpanded: boolean = false;
  showMarkdownGuide: boolean = false;
  mobileMenuOpen: boolean = false;
  loading: boolean = false;
  loadingText: string = 'Loading ...';

  colors: any = {
    primary: '',
    secondary: '',
  };

  stageMetrics: Record<string, any> | undefined

  constructor(
    private route: ActivatedRoute,
    private jobPostService: JobpostManagerService,
    private applicantManagementService: ApplicantManagementService,
    public formattingService: FormattingService
  ) { }

  ngOnInit(): void {
    const jobpostId = this.route.snapshot.paramMap.get('jobId');
    this.loading = true;
    if (jobpostId) {
      this.jobPostService.getJobPostData(jobpostId).subscribe({
        next: (data) => {
          this.loading = false;
          if (data.success) {
            const localData = this.jobPostService.getApplicationData();
            const uploadedData = data?.data![0].template_data;

            if (
              uploadedData.lastUpdated &&
              localData.lastUpdated &&
              uploadedData.id === localData.id
            ) {
              if (uploadedData.lastUpdated > localData.lastUpdated) {
                this.applicationData = uploadedData;
                this.jobPostService.updateApplicationData(
                  this.applicationData!
                );
              } else {
                this.applicationData = this.jobPostService.getApplicationData();
              }
            } else {
              this.applicationData = uploadedData;
              this.jobPostService.updateApplicationData(this.applicationData!);
            }
          } else {
            this.applicationData = this.jobPostService.getApplicationData();
          }

          setInterval(() => {
            this.autoSave();
          }, 5000);
        },
        error: (error) => {
          this.loading = false;
          // console.error(error);
          this.applicationData = this.jobPostService.getApplicationData();

          setInterval(() => {
            this.autoSave();
          }, 5000);
        },
      });
    }
  }

  selectSection(section: string): void {
    this.selectedSection = section;
    this.jobPostService.formType = section;
  }

  getSectionIcon(section: string): string {
    const icons: Record<string, string> = {
      'Company Details': 'fa-building',
      'Job Description': 'fa-briefcase',
      'Application Section': 'fa-file-lines',
      'Color Scheme': 'fa-palette',
      'Submission Message': 'fa-paper-plane',
      'Contact Section': 'fa-address-book',
      'Application Form': 'fa-wpforms',
      'Request For Additional Data': 'fa-wpforms',
      'Auto Screening': 'fa-search',
      'Job Templates': 'fa-copy',
      'Email Templates': 'fa-envelope-open-text',
      'Application Stages': 'fa-list-check',
    };
    return icons[section] || 'fa-pen-to-square';
  }

  addNavLink(): void {
    this.applicationData!.company.navLinks.push({
      text: '', url: '',
      label: ''
    });
  }

  deleteNavLink(index: number): void {
    this.applicationData!.company.navLinks.splice(index, 1);
  }

  addBenefitItem(): void {
    this.applicationData!.benefits.items.push('');
  }

  deleteBenefitItem(index: number): void {
    this.applicationData!.benefits.items.splice(index, 1);
  }

  addFooterLink(): void {
    this.applicationData!.footer.links.push({ text: '', url: '' });
  }

  deleteFooterLink(index: number): void {
    this.applicationData!.footer.links.splice(index, 1);
  }

  autoSave() {
    if (this.applicationData) {
      this.applicationData.lastUpdated = Date.now(); // Set to the current timestamp
      this.jobPostService.updateApplicationData(this.applicationData);
    }
  }

  saveChanges(): void {
    const jobpostId = this.route.snapshot.paramMap.get('jobId');
    if (jobpostId) {
      this.loading = true;
      this.loadingText = 'Saving ...';
      this.jobPostService
        .createUpdateJobPostData(jobpostId, this.applicationData!)
        .subscribe({
          next: (data) => {
            if (data.data) {
              this.applicationData!.id = data.data.id;
              this.jobPostService.updateApplicationData(this.applicationData!);
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

  saveAutoScreenRequiremnts(data: any) {
    this.applicationData = data;
    this.jobPostService.updateApplicationData(this.applicationData!);
    this.saveChanges();
  }
}
