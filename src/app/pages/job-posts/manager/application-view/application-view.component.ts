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
        next: (data) => {
          this.loading = false;
          this.mode = 'submission';
          this.applicationData = data?.data![0].template_data;
          this.templateId = this.applicationData!.templateId || '1';
        },
        error: (error) => {
          this.loading = false;
          console.error(error);
        },
      });
    } else {
      this.templateId = this.route.snapshot.paramMap.get('templateId') || '1';
      this.applicationData = this.jobPostService.getApplicationData();
    }
  }
}
