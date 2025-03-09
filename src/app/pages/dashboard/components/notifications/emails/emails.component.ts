import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../../../../services/data.service';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { FormattingService } from '../../../../../services/formatting.service';
import { FormField, JobPostData } from '../../../../../models/jobpost.model';

interface EmailTemplate {
  subject: string;
  body: string;
  isAutoSend: boolean;
}
@Component({
  selector: 'app-emails',
  imports: [CommonModule, FormsModule],
  templateUrl: './emails.component.html',
  styleUrl: './emails.component.scss',
})
export class EmailsComponent implements OnInit {
  @Input() applicationData!: JobPostData | undefined;
  @Input() variables: FormField[] | undefined;
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

  constructor(
    public dataService: DataService,
    private formatService: FormattingService
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
  }

  switchView(view: 'general' | 'personalized') {
    this.activeView = view;
  }

  saveTemplate(type: 'shortlisted' | 'unshortlisted') {
    const template = this.emailTemplates[this.activeView][type];
    const emailTemplate = {
      id: `${this.activeView}_${type}`,
      stage: 'first_shortlist',
      type: this.activeView,
      candidate: type,
      template: template,
    };

    if(this.applicationData?.emailTemplates){
      const index = this.applicationData.emailTemplates.findIndex((template) => template.id === emailTemplate.id);
      if(index > -1){
        this.applicationData.emailTemplates[index] = emailTemplate;
      }else{
        this.applicationData.emailTemplates.push(emailTemplate);
      }
    }else{
      this.applicationData!.emailTemplates = [emailTemplate];
    }

    console.log(this.applicationData!.emailTemplates)
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

  sendEmails() {
    const selectedTemplates = Object.entries(this.selectedGroups)
      .filter(([_, isSelected]) => isSelected)
      .map(([group]) => ({
        group,
        template:
          this.emailTemplates[this.activeView][
            group as keyof typeof this.selectedGroups
          ],
      }));

    console.log('Sending emails for:', selectedTemplates);
  }
}
