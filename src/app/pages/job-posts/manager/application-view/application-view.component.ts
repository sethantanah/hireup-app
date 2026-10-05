import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { JobpostManagerService } from '../../../../services/jobpost-manager.service';
import { CommonModule } from '@angular/common';
import { JobPostData } from '../../../../models/jobpost.model';
import { TemplatesManagerComponent } from '../templates-manager/templates-manager.component';
import { LoaderComponent } from '../../../components/loader/loader.component';

@Component({
  selector: 'app-application-view',
  imports: [CommonModule, TemplatesManagerComponent, LoaderComponent],
  templateUrl: './application-view.component.html',
  styleUrl: './application-view.component.scss',
})
export class ApplicationViewComponent implements OnInit {
  applicationData: JobPostData | undefined;
  templateId!: string;
  mode: string = 'testing';
  formOnly: boolean = false;
  loading: boolean = false;
  formType: string | undefined;

  jobPostId: string = '';

  constructor(
    private route: ActivatedRoute,
    private jobPostService: JobpostManagerService
  ) {
    const formOnly = this.route.snapshot.paramMap.get('formOnly');
    if (formOnly) {
      if (formOnly === 'form') {
        this.formOnly = true;
      }
    }
  }
  ngOnInit(): void {
    const applicationId = this.route.snapshot.paramMap.get('applicationId');
    this.jobPostId = applicationId || '';

    if (applicationId) {
      this.loading = true;
      this.jobPostService.getJobPostData(applicationId).subscribe({
        next: (res: any) => {
          this.loading = false;
          this.mode = 'submission';
          const item = Array.isArray(res?.data) ? res.data[0] : (res?.data || res);
          const tData = item?.template_data || item;
          
          if (tData && (tData.formData || tData.job || tData.company)) {
            this.applicationData = tData;
          } else {
            this.applicationData = this.jobPostService.getApplicationData();
          }
          
          this.templateId = this.applicationData?.templateId || '1';

          const formType = this.route.snapshot.paramMap.get('applicationType') || this.route.snapshot.paramMap.get('formOnly') || "Application";
          if (formType === "Additional Data" || formType === "Request For Additional Data") {
            if (this.applicationData && this.applicationData.additionalSections && this.applicationData.requestForDataForm) {
              this.applicationData.sections = this.applicationData.additionalSections;
              this.applicationData.formData = this.applicationData.requestForDataForm;
            }
          }

          this.formType = formType;
        },
        error: (error) => {
          this.loading = false;
          console.error('Failed to load job post data from server:', error);
          this.applicationData = this.jobPostService.getApplicationData();
          this.templateId = this.applicationData?.templateId || '1';
          this.formType = this.route.snapshot.paramMap.get('applicationType') || "Application";
        },
      });
    } else {
      this.templateId = this.route.snapshot.paramMap.get('templateId') || '1';
      this.applicationData = this.jobPostService.getApplicationData();

      const formType = this.route.snapshot.paramMap.get('applicationType') || this.route.snapshot.paramMap.get('formOnly') || "Application";
      if (formType === "Additional Data" || formType === "Request For Additional Data") {
        if (this.applicationData && this.applicationData.additionalSections && this.applicationData.requestForDataForm) {
          this.applicationData.sections = this.applicationData.additionalSections;
          this.applicationData.formData = this.applicationData.requestForDataForm;
        }
      }

      this.formType = formType;
    }


  }
}
