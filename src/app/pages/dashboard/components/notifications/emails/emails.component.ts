import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../../../../services/data.service';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { FormattingService } from '../../../../../services/formatting.service';
import { FormField, JobPostData } from '../../../../../models/jobpost.model';
import { JobpostingsApiService } from '../../../../../services/jobpostings-api.service';
import { ActivatedRoute } from '@angular/router';
import { JobpostManagerService } from '../../../../../services/jobpost-manager.service';
import { SendemailsPopupComponent } from './sendemails-popup/sendemails-popup.component';
import { EmailData } from '../../../../../models/messaging.model';
import { MessagingService } from '../../../../../services/messaging.service';
import { AlertPopupComponent } from '../../../../components/alert-popup/alert-popup.component';
import { AlertService } from '../../../../../services/alert.service';

// interface EmailTemplate {
//   subject: string;
//   body: string;
//   isAutoSend: boolean;
// }

@Component({
  selector: 'app-emails',
  imports: [
    CommonModule,
    FormsModule,
    SendemailsPopupComponent,
    AlertPopupComponent,
  ],
  templateUrl: './emails.component.html',
  styleUrl: './emails.component.scss',
})
export class EmailsComponent implements OnInit {
  @Input() applicationData!: JobPostData | undefined;
  @Input() variables: FormField[] | undefined;
  @Input() emailsList: string[] = [];
  showPreview = false;
  isOpen: boolean = false;
  activeView: 'general' | 'personalized' = 'general';
  activeTab: 'shortlisted' | 'unshortlisted' = 'shortlisted';

  emailTemplates = {
    general: {
      shortlisted: { subject: '', body: '', isAutoSend: false },
      unshortlisted: { subject: '', body: '', isAutoSend: false },
    },
    personalized: {
      shortlisted: { subject: '', body: '', isAutoSend: false },
      unshortlisted: { subject: '', body: '', isAutoSend: false },
    },
  };

  showFormattingGuide = false;

  formattingGuide = {
    basics: [
      { syntax: '**bold**', description: 'Makes text bold' },
      { syntax: '*italic*', description: 'Makes text italic' },
      { syntax: '[link](url)', description: 'Creates a clickable link' },
    ],
    lists: [
      { syntax: '- item', description: 'Bullet point' },
      { syntax: '1. item', description: 'Numbered list' },
    ],
    structure: [
      { syntax: '# Heading', description: 'Large heading' },
      { syntax: '## Subheading', description: 'Smaller heading' },
      { syntax: '---', description: 'Horizontal line' },
    ],
    variables: [
      { syntax: '{{candidateName}}', description: 'Inserts candidate name' },
      { syntax: '{{position}}', description: 'Inserts job position' },
      { syntax: '{{company}}', description: 'Inserts company name' },
      { syntax: '{{interviewDate}}', description: 'Inserts interview date' },
    ],
  };

  selectedGroups = {
    shortlisted: true,
    unshortlisted: false,
  };

  showInsertVariables: boolean = false;
  isSaving: boolean = false;

  showEmailPopup = false;

  emailsSent: boolean = false;
  sendingEmail: boolean = false;
  sendingEmailFailed: boolean = false;

  alert: any = null;

  constructor(
    private route: ActivatedRoute,
    public dataService: DataService,
    private messagingService: MessagingService,
    private jobPostService: JobpostManagerService,
    private formatService: FormattingService,
    private alertService: AlertService
  ) {}

  ngOnInit(): void {
    this.formattingGuide.variables = [];
    if (this.variables) {
      this.variables.forEach((variable) => {
        this.formattingGuide.variables.push({
          syntax: `{{${variable.label}}}`,
          description: `Inserts ${variable.label}`,
        });
      });
    }

    if (this.applicationData?.emailTemplates) {
      const emailTemps = this.applicationData.emailTemplates.filter(
        (f) => f.stage === 'first_shortlist'
      );

      if (emailTemps.length > 0) {
        this.emailTemplates = emailTemps[0].templates;
      }
    }

    this.alertService.alert$.subscribe((alert) => {
      this.alert = alert;
    });
  }

  switchView(view: 'general' | 'personalized') {
    this.activeView = view;
  }

  saveTemplate(type: 'shortlisted' | 'unshortlisted') {
    const emailTemplate = {
      stage: 'first_shortlist',
      templates: this.emailTemplates,
    };

    if (this.applicationData?.emailTemplates) {
      const index = this.applicationData.emailTemplates.findIndex(
        (template) => template.stage === emailTemplate.stage
      );
      if (index > -1) {
        this.applicationData.emailTemplates[index] = emailTemplate;
      } else {
        this.applicationData.emailTemplates.push(emailTemplate);
      }
    } else {
      this.applicationData!.emailTemplates = [emailTemplate];
    }

    this.saveChanges(this.applicationData);
  }

  toggleAutoSend(type: 'shortlisted' | 'unshortlisted') {
    const template = this.emailTemplates[this.activeView][type];
    template.isAutoSend = !template.isAutoSend;
  }

  toggleshowPreview() {
    this.showPreview = !this.showPreview;
  }

  getPreviewContent() {
    const template = this.emailTemplates[this.activeView][this.activeTab].body;
    return this.formatService.parseMarkdown(template);
    // // Replace variables with sample data
    // const withVariables = template
    //   .replace(/{{candidateName}}/g, 'John Doe')
    //   .replace(/{{position}}/g, 'Software Engineer')
    //   .replace(/{{company}}/g, 'Tech Corp')
    //   .replace(/{{interviewDate}}/g, 'Monday, March 1st');

    // // Convert markdown to HTML and sanitize
    // const htmlContent = DOMPurify.sanitize(await marked.parse(withVariables));
    // return htmlContent;
  }

  insertVariable(variable: string) {
    this.emailTemplates[this.activeView][this.activeTab].body = `${
      this.emailTemplates[this.activeView][this.activeTab].body
    } ${variable}`;
  }

  saveChanges(applicationData: any): void {
    const jobpostId = this.route.snapshot.paramMap.get('jobId');
    if (jobpostId) {
      this.isSaving = true;
      this.jobPostService
        .createUpdateJobPostData(jobpostId, applicationData)
        .subscribe({
          next: (data) => {
            if (data.data) {
              applicationData!.id = data.data.id;
            }
            this.isSaving = false;
          },
          error: (error) => {
            this.isSaving = false;
            console.error(error);
          },
        });
    }
  }

  sendEmails() {
    this.sendingEmailFailed = false;
    this.emailsSent = false;
    this.sendingEmail = true;
    const selectedTemplates = Object.entries(this.selectedGroups)
      .filter(([_, isSelected]) => isSelected)
      .map(([group]) => ({
        group,
        template:
          this.emailTemplates[this.activeView][
            group as keyof typeof this.selectedGroups
          ],
      }));

    const emails_data: EmailData[] = [];

    for (let index = 0; index < selectedTemplates.length; index++) {
      const email_data: EmailData = {
        html_template: '',
        text_content: '',
        subject: '',
        short_listed: false,
        variables: {},
      };
      const template = selectedTemplates[index];
      email_data.html_template = template.template.body;
      email_data.text_content = this.formatService.stripHtmlAndMarkdown(
        template.template.body
      );
      email_data.subject = template.template.subject;
      email_data.short_listed = template.group === 'shortlisted' ? true : false;
      email_data.variables = this.formattingGuide.variables.map(
        (variable) => variable.syntax
      );
      emails_data.push(email_data);
    }
    const jobpostId = this.route.snapshot.paramMap.get('jobId') ?? '';
    this.messagingService
      .sendEmails(emails_data, this.activeView, jobpostId)
      .subscribe({
        next: () => {
          this.emailsSent = true;
          this.sendingEmail = false;
          this.alertService.showSuccess('Emails sent successfully!');
        },
        error: () => {
          this.sendingEmail = false;
          this.sendingEmailFailed = true;
          this.alertService.showDanger(
            'Failed to send emails. Please try again.'
          );
        },
      });
  }

  closeEmailPopup() {
    this.showEmailPopup = false;
  }

  onAlertClosed(): void {
    this.alertService.clearAlert();
  }
}
