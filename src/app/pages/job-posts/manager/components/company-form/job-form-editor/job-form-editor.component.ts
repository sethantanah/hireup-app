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

@Component({
  selector: 'app-job-form-editor',
  imports: [
    CommonModule,
    FormsModule,
    DynamicFormComponent,
    PreviewComponent,
    LoaderComponent,
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
  constructor(
    private route: ActivatedRoute,
    private jobPostService: JobpostManagerService,
    public formattingService: FormattingService
  ) {}

  ngOnInit(): void {
    const jobpostId = this.route.snapshot.paramMap.get('jobId');
    this.loading = true;
    if (jobpostId) {
      this.jobPostService.jobPostData(jobpostId).subscribe({
        next: (data) => {
          this.loading = false;
          if (data.length > 0) {
            const localData = this.jobPostService.getApplicationData();
            const uploadedData = data[0].template_data;
            if (
              uploadedData.lastUpdated &&
              localData.lastUpdated &&
              uploadedData.id === localData.id
            ) {
              if (uploadedData.lastUpdated > localData.lastUpdated) {
                this.applicationData = uploadedData;
                this.jobPostService.upDateApplicationData(
                  this.applicationData!
                );
              } else {
                this.applicationData = this.jobPostService.getApplicationData();
              }
            } else {
              this.applicationData = uploadedData;
              this.jobPostService.upDateApplicationData(this.applicationData!);
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
          console.error(error);

          setInterval(() => {
            this.autoSave();
          }, 5000);
        },
      });
    }
  }

  selectSection(section: string): void {
    this.selectedSection = section;
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
      'Job Templates': 'fa-copy',
      'Email Templates': 'fa-envelope-open-text',
    };
    return icons[section] || 'fa-pen-to-square';
  }

  addNavLink(): void {
    this.applicationData!.company.navLinks.push({ text: '', url: '' });
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
      this.jobPostService.upDateApplicationData(this.applicationData);
    }
  }

  saveChanges(): void {
    const jobpostId = this.route.snapshot.paramMap.get('jobId');
    if (jobpostId) {
      this.loading = true;
      this.loadingText = 'Saving ...';
      this.jobPostService
        .createUpdateJobPostData(jobpostId, this.applicationData)
        .subscribe({
          next: (data) => {
            if (data.data) {
              this.applicationData!.id = data.data.id;
              this.jobPostService.upDateApplicationData(this.applicationData!);
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
