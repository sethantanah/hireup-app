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
import { CandidateService } from '../../../../../../services/candidate.service';
import { CandidateRankingSettingsComponent } from '../../../../../dashboard/components/settings/candidate-ranking-settings/candidate-ranking-settings.component';
import { CustomDropdownComponent } from '../../../../../../components/custom-dropdown/custom-dropdown.component';

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
    CustomDropdownComponent
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

  templateSections = ['Job Templates', 'Section Visibility Toggles', 'Email Templates', 'Color Scheme'];

  sections = [...this.editorSections, ...this.templateSections];
  selectedSection: string = this.sections[0];

  showPreview: boolean = true;
  isExpanded: boolean = false;
  showMarkdownGuide: boolean = false;
  mobileMenuOpen: boolean = false;
  loading: boolean = false;
  loadingText: string = 'Loading Job Form Editor...';

  colors: any = {
    primary: '',
    secondary: '',
  };

  stageMetrics: Record<string, any> | undefined

  roleCategories = [
    'Software Engineer',
    'UX/UI Designer',
    'Product Manager',
    'Data Scientist',
    'DevOps / Infrastructure',
    'Sales Manager',
    'Marketing Specialist',
    'HR & People Ops',
    'Customer Support',
    'Custom Entry'
  ];

  workModes = ['Remote', 'Hybrid', 'On-site'];

  countriesList = [
    'Global / Remote',
    'United States',
    'United Kingdom',
    'Canada',
    'Australia',
    'Germany',
    'France',
    'India',
    'Nigeria',
    'Ghana',
    'Singapore',
    'South Africa',
    'United Arab Emirates',
    'Brazil',
    'Netherlands',
    'Japan'
  ];

  experienceLevels = [
    'Entry Level',
    'Mid Level',
    'Senior Level',
    'Lead / Staff',
    'Manager',
    'Executive / Director',
    'Internship'
  ];

  experienceYearsList = [
    '0 - 1 years',
    '1 - 3 years',
    '3 - 5 years',
    '5 - 8 years',
    '8+ years',
    '10+ years'
  ];

  publishToast: { type: 'success' | 'error'; message: string } | null = null;

  constructor(
    private route: ActivatedRoute,
    private jobPostService: JobpostManagerService,
    private applicantManagementService: ApplicantManagementService,
    private candidateService: CandidateService,
    public formattingService: FormattingService
  ) { }

  ngOnInit(): void {
    const jobpostId = this.route.snapshot.paramMap.get('jobId');
    this.loading = true;
    if (jobpostId) {
      this.jobPostService.getJobPostData(jobpostId).subscribe({
        next: (data) => {
          this.loading = false;
          if (data.success && data.data && data.data.length > 0) {
            const localData = this.jobPostService.getApplicationData();
            const uploadedData = data.data[0]?.template_data;

            if (uploadedData && Object.keys(uploadedData).length > 0) {
              if (
                uploadedData.lastUpdated &&
                localData &&
                localData.lastUpdated &&
                localData.id === jobpostId
              ) {
                if (uploadedData.lastUpdated >= localData.lastUpdated) {
                  this.applicationData = uploadedData;
                  this.jobPostService.updateApplicationData(this.applicationData!);
                } else {
                  this.applicationData = localData;
                }
              } else {
                this.applicationData = uploadedData;
                this.jobPostService.updateApplicationData(this.applicationData!);
              }
            } else {
              this.applicationData = localData || this.jobPostService.getApplicationData();
            }
          } else {
            this.applicationData = this.jobPostService.getApplicationData();
          }

          if (this.applicationData) {
            this.applicationData.id = jobpostId;
            this.ensureSectionDefaults();
          }

          setInterval(() => {
            this.autoSave();
          }, 5000);
        },
        error: (error) => {
          this.loading = false;
          this.applicationData = this.jobPostService.getApplicationData();
          if (this.applicationData) {
            this.applicationData.id = jobpostId;
            this.ensureSectionDefaults();
          }

          setInterval(() => {
            this.autoSave();
          }, 5000);
        },
      });
    }
  }

  ensureSectionDefaults(): void {
    if (!this.applicationData) return;

    if (!this.applicationData.sectionVisibility) {
      this.applicationData.sectionVisibility = {
        showCompanyDetails: true,
        showJobDescription: true,
        showSalaryRange: true,
        showDeadline: true,
        showRequirements: true,
        showBenefits: true,
        showContactSection: true
      };
    }

    if (this.applicationData.company) {
      if (!this.applicationData.company.name || this.applicationData.company.name === 'Acme Inc.') {
        const savedUserStr = localStorage.getItem('USER');
        if (savedUserStr) {
          try {
            const u = JSON.parse(savedUserStr);
            if (u.organization_name || u.company_name || u.name) {
              this.applicationData.company.name = u.organization_name || u.company_name || u.name;
            }
          } catch (e) {}
        }
      }
    }
  }

  onFormChange(updatedData: JobPostData): void {
    if (updatedData) {
      this.applicationData = updatedData;
      this.autoSave();
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
      'Section Visibility Toggles': 'fa-sliders',
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

  private isAutoSavingToBackend = false;

  autoSave() {
    if (this.applicationData) {
      const jobpostId = this.route.snapshot.paramMap.get('jobId');
      if (jobpostId) {
        this.applicationData.id = jobpostId;
      }
      this.applicationData.lastUpdated = Date.now(); // Set to current timestamp
      this.jobPostService.updateApplicationData(this.applicationData);

      // Perform background save to server
      if (jobpostId && !this.isAutoSavingToBackend) {
        this.isAutoSavingToBackend = true;
        this.jobPostService.createUpdateJobPostData(jobpostId, this.applicationData).subscribe({
          next: () => {
            this.isAutoSavingToBackend = false;
          },
          error: () => {
            this.isAutoSavingToBackend = false;
          }
        });
      }
    }
  }

  saveChanges(): void {
    const jobpostId = this.route.snapshot.paramMap.get('jobId');
    if (jobpostId && this.applicationData) {
      this.loading = true;
      this.loadingText = 'Saving ...';

      const latest = this.jobPostService.getApplicationData();
      if (latest) {
        this.applicationData = { ...latest, ...this.applicationData };
      }
      this.applicationData.id = jobpostId;
      this.applicationData.lastUpdated = Date.now();
      this.jobPostService.updateApplicationData(this.applicationData);

      this.jobPostService
        .createUpdateJobPostData(jobpostId, this.applicationData)
        .subscribe({
          next: (data) => {
            if (data.data) {
              this.applicationData!.id = data.data.id || jobpostId;
            }
            this.jobPostService.updateApplicationData(this.applicationData!);
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

  insertMarkdown(syntax: string, targetField: 'description' | 'instructions'): void {
    if (!this.applicationData) return;
    if (targetField === 'description') {
      this.applicationData.job.description = (this.applicationData.job.description || '') + syntax;
    } else if (targetField === 'instructions') {
      this.applicationData.applySection.instructions = (this.applicationData.applySection.instructions || '') + syntax;
    }
  }

  setColorPreset(primary: string, secondary: string): void {
    if (this.applicationData) {
      if (!this.applicationData.colorScheme) {
        this.applicationData.colorScheme = { primary, secondary };
      } else {
        this.applicationData.colorScheme.primary = primary;
        this.applicationData.colorScheme.secondary = secondary;
      }
      this.autoSave();
    }
  }

  setDeadlineDays(days: number): void {
    if (this.applicationData) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + days);
      this.applicationData.deadline = targetDate.toISOString().slice(0, 16);
      this.autoSave();
    }
  }

  togglePublishStatus(): void {
    if (!this.applicationData) return;

    const newStatus = this.applicationData.status === 'published' ? 'draft' : 'published';
    this.applicationData.status = newStatus;
    if (newStatus === 'published') {
      this.applicationData.publishedAt = new Date().toISOString();
    }

    this.jobPostService.updateApplicationData(this.applicationData);
    this.saveChanges();

    if (newStatus === 'published') {
      this.publishToast = {
        type: 'success',
        message: 'Job published successfully! Candidate matching engine initiated & auto-notifications dispatched.'
      };
      
      if (this.applicationData.id) {
        this.candidateService.browseTalentPool({
          jobpost_id: this.applicationData.id,
          source: 'global'
        }).subscribe({
          next: () => console.log('Auto-matched candidate pool for published job', this.applicationData?.id),
          error: (err) => console.error('Error auto-matching candidates:', err)
        });
      }
    } else {
      this.publishToast = {
        type: 'success',
        message: 'Job post reverted to Draft (Unpublished) status.'
      };
    }

    setTimeout(() => {
      this.publishToast = null;
    }, 4000);
  }
}
