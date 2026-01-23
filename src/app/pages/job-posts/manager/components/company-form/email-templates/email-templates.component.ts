import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ApplicationStage, EmailTemplate } from '../../../../../../models/jobpost.model';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-email-templates',
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './email-templates.component.html',
  styleUrl: './email-templates.component.scss'
})
export class EmailTemplatesComponent {
  @Input() emailTemplates: EmailTemplate[] = [];
  @Input() applicationStages: ApplicationStage[] = [];
  @Output() templatesChange = new EventEmitter<EmailTemplate[]>();

  selectedTemplate: EmailTemplate | null = null;
  isEditing = false;
  viewMode: 'editor' | 'preview' = 'editor';
  previewHtml: SafeHtml = '';

  // Sample data for preview
  previewData = {
    candidate_name: 'John Doe',
    candidate_email: 'john.doe@example.com',
    job_title: 'Senior Software Engineer',
    company_name: 'Tech Innovations Inc',
    stage_name: 'Technical Interview',
    application_date: new Date().toLocaleDateString()
  };

  availablePlaceholders = ['{{candidate_name}}', '{{candidate_email}}', '{{job_title}}', '{{company_name}}', '{{stage_name}}', '{{application_date}}'];

  defaultTemplates = [
    {
      name: 'Application Received',
      subject: 'Application Received - {{job_title}}',
      body: `<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
        .header { background: #f8f9fa; padding: 30px 20px; text-align: center; border-bottom: 3px solid #4f46e5; }
        .content { padding: 30px 20px; background: white; }
        .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; background: #f8f9fa; border-top: 1px solid #e5e7eb; }
        .button { display: inline-block; padding: 12px 24px; background: #4f46e5; color: white; text-decoration: none; border-radius: 6px; margin: 15px 0; }
        .signature { margin-top: 25px; padding-top: 25px; border-top: 1px solid #e5e7eb; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="margin: 0; color: #1f2937;">Application Received</h1>
        </div>
        <div class="content">
            <p>Dear {{candidate_name}},</p>
            <p>Thank you for applying for the <strong>{{job_title}}</strong> position at {{company_name}}.</p>
            <p>We have successfully received your application submitted on {{application_date}}. Our hiring team will carefully review your application and we will get back to you within the next 5-7 business days.</p>
            <p>In the meantime, feel free to explore more about our company and values on our website.</p>
            
            <div class="signature">
                <p>Best regards,<br>
                <strong>The {{company_name}} Team</strong></p>
            </div>
        </div>
        <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
            <p>&copy; 2024 {{company_name}}. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`,
      type: 'auto' as const,
      placeholders: ['candidate_name', 'job_title', 'company_name', 'application_date'],
      for: 'shortlisted'
    },
    {
      name: 'Application Shortlisted',
      subject: 'Congratulations! Your Application has been Shortlisted - {{job_title}}',
      body: `<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
        .header { background: #ecfdf5; padding: 30px 20px; text-align: center; border-bottom: 3px solid #10b981; }
        .content { padding: 30px 20px; background: white; }
        .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; background: #f8f9fa; border-top: 1px solid #e5e7eb; }
        .button { display: inline-block; padding: 12px 24px; background: #10b981; color: white; text-decoration: none; border-radius: 6px; margin: 15px 0; }
        .next-steps { background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0ea5e9; }
        .signature { margin-top: 25px; padding-top: 25px; border-top: 1px solid #e5e7eb; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="margin: 0; color: #065f46;">Great News!</h1>
            <p style="margin: 10px 0 0 0; color: #047857; font-size: 18px;">Your application has been shortlisted</p>
        </div>
        <div class="content">
            <p>Dear {{candidate_name}},</p>
            
            <p>We are excited to inform you that your application for the <strong>{{job_title}}</strong> position at {{company_name}} has been shortlisted for the next stage!</p>
            
            <div class="next-steps">
                <h3 style="margin-top: 0; color: #0c4a6e;">Next Steps</h3>
                <p><strong>Current Stage:</strong> {{stage_name}}</p>
                <p>Our recruitment team will contact you within the next 3 business days to schedule the next phase of the selection process.</p>
            </div>

            <p>Congratulations on reaching this stage - we were particularly impressed with your qualifications and experience.</p>
            
            <div class="signature">
                <p>Best regards,<br>
                <strong>The Hiring Team</strong><br>
                {{company_name}}</p>
            </div>
        </div>
        <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
            <p>&copy; 2024 {{company_name}}. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`,
      type: 'auto' as const,
      placeholders: ['candidate_name', 'job_title', 'company_name', 'stage_name'],
      for: 'unshortlisted'
    }
  ];

  constructor(private sanitizer: DomSanitizer) { }

  ngOnInit() {
    if (!this.emailTemplates || this.emailTemplates.length === 0) {
      this.initializeDefaultTemplates();
    }
  }

  initializeDefaultTemplates() {
    this.emailTemplates = this.defaultTemplates.map(template => ({
      ...template,
      id: this.generateId(),
      stageId: undefined
    }));
    this.templatesChange.emit(this.emailTemplates);
  }

  createNewTemplate() {
    const newTemplate: EmailTemplate = {
      id: this.generateId(),
      name: 'New Template',
      subject: '',
      body: `<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
        .header { background: #f8f9fa; padding: 30px 20px; text-align: center; }
        .content { padding: 30px 20px; background: white; }
        .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; background: #f8f9fa; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="margin: 0;">Email Title</h1>
        </div>
        <div class="content">
            <p>Dear {{candidate_name}},</p>
            
            <p>Your email content goes here...</p>
            
            <p>Best regards,<br>
            <strong>The {{company_name}} Team</strong></p>
        </div>
        <div class="footer">
            <p>This is an automated message.</p>
        </div>
    </div>
</body>
</html>`,
      type: 'manual',
      placeholders: [],
      stageId: undefined,
      for: 'other'
    };
    this.selectedTemplate = newTemplate;
    this.isEditing = true;
    this.viewMode = 'editor';
    this.updatePreview();
  }

  editTemplate(template: EmailTemplate) {
    this.selectedTemplate = { ...template };
    this.isEditing = true;
    this.viewMode = 'editor';
    this.updatePreview();
  }

  saveTemplate() {
    if (this.selectedTemplate) {
      const existingIndex = this.emailTemplates.findIndex(t => t.id === this.selectedTemplate!.id);

      if (existingIndex >= 0) {
        this.emailTemplates[existingIndex] = this.selectedTemplate;
      } else {
        this.emailTemplates.push(this.selectedTemplate);
      }

      this.templatesChange.emit(this.emailTemplates);
      this.cancelEdit();
    }
  }

  cancelEdit() {
    this.selectedTemplate = null;
    this.isEditing = false;
    this.viewMode = 'editor';
  }

  deleteTemplate(templateId: string) {
    this.emailTemplates = this.emailTemplates.filter(t => t.id !== templateId);
    this.templatesChange.emit(this.emailTemplates);
  }

  switchView(mode: 'editor' | 'preview') {
    this.viewMode = mode;
    if (mode === 'preview') {
      this.updatePreview();
    }
  }

  updatePreview() {
    if (this.selectedTemplate) {
      let previewContent = this.selectedTemplate.body;

      // Replace placeholders with sample data
      Object.keys(this.previewData).forEach(key => {
        const placeholder = `{{${key}}}`;
        const value = this.previewData[key as keyof typeof this.previewData];
        previewContent = previewContent.replace(new RegExp(placeholder, 'g'), value);
      });

      // Sanitize the HTML for safe display
      this.previewHtml = this.sanitizer.bypassSecurityTrustHtml(previewContent);
    }
  }

  insertPlaceholder(placeholder: string) {
    if (this.selectedTemplate) {
      const textarea = document.getElementById('templateBody') as HTMLTextAreaElement;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      this.selectedTemplate.body =
        this.selectedTemplate.body.substring(0, start) +
        placeholder +
        this.selectedTemplate.body.substring(end);

      // Add to placeholders if not already included
      const placeholderKey = placeholder.replace(/[{}]/g, '');
      if (!this.selectedTemplate.placeholders.includes(placeholderKey)) {
        this.selectedTemplate.placeholders.push(placeholderKey);
      }

      // Update cursor position
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + placeholder.length, start + placeholder.length);
      }, 0);

      this.updatePreview();
    }
  }

  generateId(): string {
    return 'template_' + Math.random().toString(36).substr(2, 9);
  }

  trackByFn(index: number, item: EmailTemplate): string {
    return item.id;
  }
}