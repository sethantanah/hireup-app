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
    this.ensureApplicationData();
  }

  ensureApplicationData() {
    this.applicationData = this.jobPostService.getApplicationData();
    if (!this.applicationData) {
      this.applicationData = {
        templateId: '1',
        company: { name: 'Acme Inc.', logoUrl: '', navLinks: [] },
        job: { title: 'Software Engineer', description: 'We are seeking an experienced developer.' },
        applySection: { title: 'Application Form', instructions: 'Fill in your details below.', buttonText: 'Submit', declaration: '' },
        sections: ['General'],
        formData: { fields: [] },
        colorScheme: { primary: '#3b82f6', secondary: '#1e40af', borderRadius: '3xl' }
      } as any;
    }
    if (this.applicationData && !this.applicationData.job) {
      const appDataAny = this.applicationData as any;
      this.applicationData.job = {
        title: appDataAny.job_title || 'Position Title',
        description: appDataAny.job_description || 'Job details and requirements...'
      };
    }
    if (this.applicationData && !this.applicationData.company) {
      const appDataAny = this.applicationData as any;
      this.applicationData.company = {
        name: appDataAny.company_name || 'Company Name',
        logoUrl: '',
        navLinks: []
      };
    }
    if (this.applicationData && !this.applicationData.applySection) {
      this.applicationData.applySection = {
        title: 'Application Form',
        instructions: 'Please complete all required fields.',
        buttonText: 'Submit',
        declaration: ''
      };
    }
    if (this.applicationData && !this.applicationData.sections) {
      this.applicationData.sections = ['General'];
    }
  }

  selectTemplate(template: JobTemplate) {
    this.closePreview();
    this.ensureApplicationData();
    this.applicationData!.templateId = template.id;
    this.saveDataAndSync();
  }

  setCornerRadius(radius: 'none' | 'md' | 'xl' | '3xl') {
    this.ensureApplicationData();
    if (!this.applicationData) return;
    if (!this.applicationData.colorScheme) {
      this.applicationData.colorScheme = { primary: '#3b82f6', secondary: '#1e40af' };
    }
    this.applicationData.colorScheme.borderRadius = radius;
    this.saveDataAndSync();
  }

  saveDataAndSync() {
    if (!this.applicationData) return;
    this.jobPostService.updateApplicationData(this.applicationData);
    if (this.applicationData.id) {
      this.jobPostService.createUpdateJobPostData(this.applicationData.id, this.applicationData).subscribe({
        next: () => console.log('Template settings synced with backend'),
        error: (err) => console.warn('Backend sync note:', err)
      });
    }
  }

  openExternalPreview(template: JobTemplate) {
    const url = this.router.serializeUrl(
      this.router.createUrlTree(['/preview/', template.id])
    );
    window.open(url, '_blank');
  }

  previewTemplate(template: JobTemplate) {
    this.ensureApplicationData();
    this.template = template;
    this.showPreview = true;
  }

  closePreview() {
    this.showPreview = false;
  }

  getActiveTemplateTitle(): string {
    const active = this.templates.find(t => t.id === this.applicationData?.templateId);
    return active ? active.title : 'Classic Corporate';
  }
}
