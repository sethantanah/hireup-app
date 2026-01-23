import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../../../../services/data.service';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { FormattingService } from '../../../../../services/formatting.service';
import { EmailTemplate, FormField, JobPostData } from '../../../../../models/jobpost.model';
import { JobpostingsApiService } from '../../../../../services/jobpostings-api.service';
import { ActivatedRoute } from '@angular/router';
import { JobpostManagerService } from '../../../../../services/jobpost-manager.service';
import { SendemailsPopupComponent } from './sendemails-popup/sendemails-popup.component';
import { EmailData, EmailDataAPISend } from '../../../../../models/messaging.model';
import { MessagingService } from '../../../../../services/messaging.service';
import { AlertPopupComponent } from '../../../../components/alert-popup/alert-popup.component';
import { AlertService } from '../../../../../services/alert.service';



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
  activeView: 'general' | 'personalized' = 'personalized';
  activeTab: 'shortlisted' | 'unshortlisted' | 'other' = 'shortlisted';



  otherEmailTemplates: EmailTemplate[] = [];
  emailTemplates: EmailTemplate[] = [];
  emailTemplate: EmailTemplate = {
    id: 'stmtgr56983',
    subject: 'General Email',
    body: '',
    type: "auto",
    name: 'General Email Template',
    placeholders: [],
    stageId: '',
    for: 'other'
  }

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
  applicationStage: string = 'stage_application_review'

  constructor(
    private route: ActivatedRoute,
    public dataService: DataService,
    private messagingService: MessagingService,
    private jobPostService: JobpostManagerService,
    private formatService: FormattingService,
    private alertService: AlertService
  ) {
    this.applicationStage = this.route.snapshot.paramMap.get('stageId') || '';
  }

  ngOnInit(): void {
    this.formattingGuide.variables = [];

    if (this.applicationData?.emailTemplates) {
      const emailTemps = this.applicationData.emailTemplates.filter(
        (f) => f.stageId === this.applicationStage
      );

      if (emailTemps.length > 0) {
        this.emailTemplates = emailTemps;
        this.emailTemplate = emailTemps[0];
        const f = this.emailTemplate.for;
        this.activeTab =
          f === 'shortlisted' || f === 'unshortlisted' || f === 'other'
            ? f
            : 'shortlisted';

        if (this.emailTemplate.placeholders) {
          this.emailTemplate.placeholders.forEach((variable) => {
            this.formattingGuide.variables.push({
              syntax: `{{${variable}}}`,
              description: `Inserts ${variable.replace("_", " ")}`,
            });
          });
        }
      }
    }


    // Set All Templates
    if (this.applicationData?.emailTemplates) {
      const emailTemps = this.applicationData.emailTemplates.filter(
        (f) => f.stageId !== this.applicationStage
      );

      if (emailTemps.length > 0) {
        this.otherEmailTemplates = emailTemps;
      }
    }

    this.alertService.alert$.subscribe((alert) => {
      this.alert = alert;
    });
  }

  switchView(view: 'general' | 'personalized') {
    this.activeView = view;
  }

  setTemplate(template: EmailTemplate) {
    this.emailTemplate = template;
    const f = template.for;
    this.activeTab =
      f === 'shortlisted' || f === 'unshortlisted' || f === 'other'
        ? f
        : 'other';
  }

  switchTemplate(activeTab: 'shortlisted' | 'unshortlisted' | 'other') {
    this.activeTab = activeTab;
    for (let i = 0; i < this.emailTemplates.length; i++) {
      const eTemp = this.emailTemplates[i];
      if (eTemp.for === activeTab && eTemp.stageId === this.applicationStage) {
        this.emailTemplate = eTemp;

        if (this.emailTemplate.placeholders) {
          this.emailTemplate.placeholders.forEach((variable) => {
            this.formattingGuide.variables.push({
              syntax: `{{${variable}}}`,
              description: `Inserts ${variable.replace("_", " ")}`,
            });
          });
        }
        break;
      }
    }
  }

  saveTemplate(type: 'shortlisted' | 'unshortlisted' | 'other') {
    if (this.applicationData?.emailTemplates) {
      const index = this.applicationData.emailTemplates.findIndex(
        (template) => template.id === this.emailTemplate.id
      );
      if (index > -1) {
        this.applicationData.emailTemplates[index] = this.emailTemplate;
      } else {
        this.applicationData.emailTemplates.push(this.emailTemplate);
      }
    } else {
      this.applicationData!.emailTemplates = [this.emailTemplate];
    }

    this.saveChanges(this.applicationData);
  }

  toggleAutoSend(type: 'shortlisted' | 'unshortlisted') {

  }

  toggleshowPreview() {
    this.showPreview = !this.showPreview;
  }

  getPreviewContent() {
    const template = this.emailTemplate?.body || "";
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
    this.emailTemplate!.body = `${this.emailTemplate!.body
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

    const email_data: EmailData = {
      html_template: '',
      text_content: '',
      subject: '',
      short_listed: '',
      variables: {},
    };
    const template = this.emailTemplate;
    email_data.html_template = template.body;
    email_data.text_content = this.formatService.stripHtmlAndMarkdown(
      template.body
    );
    email_data.subject = template.subject;
    email_data.short_listed = template.for!;
    email_data.variables = template.placeholders

    const send_email_data: EmailDataAPISend = {
      template_data: email_data,
      short_listed: template.for!,
      batch_size: 20
    }

    const jobpostId = this.route.snapshot.paramMap.get('jobId') ?? '';

    this.messagingService
      .sendEmails(send_email_data, this.applicationStage, jobpostId)
      .subscribe({
        next: (data) => {
          console.log(data)
          this.emailsSent = true;
          this.sendingEmail = false;

          if (data.status === "failed") {
            this.alertService.showDanger(
              `Failed to send emails: ${data.message}.  Please try again.`
            );
          } else {
            this.alertService.showSuccess(`Emails sent successfully!  ${data.message}`);
          }

        },
        error: (error) => {
          this.sendingEmail = false;
          this.sendingEmailFailed = true;
          this.alertService.showDanger(
            `Failed to send emails: ${error.error.detail}.  Please try again.`
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
