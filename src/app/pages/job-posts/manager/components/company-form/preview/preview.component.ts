import { Component } from '@angular/core';
import {
  JobTemplate,
  TemplatesService,
} from '../../../../../../services/templates.service';
import { CommonModule } from '@angular/common';
import { TemplatesManagerComponent } from '../../../templates-manager/templates-manager.component';
import { JobpostManagerService } from '../../../../../../services/jobpost-manager.service';
import { JobPostData } from '../../../../../../models/jobpost.model';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-preview',
  imports: [CommonModule, FormsModule, TemplatesManagerComponent],
  templateUrl: './preview.component.html',
  styleUrl: './preview.component.scss',
})
export class PreviewComponent {
  showPreview = false;
  applicationData: JobPostData | undefined;
  templates: JobTemplate[] = [];
  template!: JobTemplate;

  constructor(
    private templateService: TemplatesService,
    private jobPostService: JobpostManagerService,
    private router: Router
  ) {
    this.templates = templateService.templates;
    this.applicationData = jobPostService.getApplicationData();
  }

  selectTemplate(template: JobTemplate) {
    this.closePreview();
    this.applicationData!.templateId = template.id;
    this.jobPostService.updateApplicationData(this.applicationData!);

    // this.jobPostService
    //   .createUpdateJobPostData(this.applicationData!)
    //   .subscribe((response) => {
    //     console.log(response);
    //   });
  }

  openExternalPreview(template: JobTemplate) {
    const url = this.router.serializeUrl(
      this.router.createUrlTree(['/preview/', template.id])
    );
    window.open(url, '_blank');
  }

  previewTemplate(template: JobTemplate) {
    this.template = template;
    this.showPreview = true;
  }

  closePreview() {
    this.showPreview = false;
  }
}
