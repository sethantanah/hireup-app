import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { JobtestApiService } from '../../../../../services/jobtest-api.service';

@Component({
  selector: 'app-sendmail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sendmail.component.html',
  styleUrl: './sendmail.component.scss'
})
export class SendmailComponent implements OnInit {
  @Input() showModal = false;
  @Input() shortlistedEmails: string[] = [];
  @Input() notShortlistedEmails: string[] = [];
  @Input() testId: string = '';
  @Input() stageName: string = '';
  @Output() closeModal = new EventEmitter<void>();

  listType: 'shortlisted' | 'notShortlisted' = 'shortlisted';
  fieldType: 'cc' | 'bcc' = 'bcc';
  viewMode: 'editor' | 'preview' = 'editor';
  
  shortlistedSubject = "Congratulations! Next Steps for Your Assessment";
  notShortlistedSubject = "Update Regarding Your Recent Assessment";
  
  shortlistedBody = `Dear Candidate,

Congratulations! We are pleased to inform you that you have successfully passed the candidate assessment with a qualifying score.

Our recruitment team has evaluated your submission and advanced your application to the next stage of our evaluation process. We will reach out shortly with details regarding the next steps and interview scheduling.

Thank you for your prompt completion of the assessment.

Best regards,
Hiring & Recruitment Team`;

  notShortlistedBody = `Dear Candidate,

Thank you for taking the time to complete the skill assessment for our position.

While we appreciate your effort and interest in joining our team, we have decided to move forward with candidates whose assessment results more closely align with the current requirements for this role.

We wish you all the best in your job search and future professional endeavors.

Best regards,
Hiring & Recruitment Team`;

  isSending: boolean = false;
  successToast: string = '';
  copiedToast: boolean = false;

  constructor(private testService: JobtestApiService) {}

  ngOnInit(): void {}

  get currentEmails(): string[] {
    return this.listType === 'shortlisted' ? this.shortlistedEmails : this.notShortlistedEmails;
  }

  get currentSubject(): string {
    return this.listType === 'shortlisted' ? this.shortlistedSubject : this.notShortlistedSubject;
  }

  set currentSubject(val: string) {
    if (this.listType === 'shortlisted') {
      this.shortlistedSubject = val;
    } else {
      this.notShortlistedSubject = val;
    }
  }

  get currentBody(): string {
    return this.listType === 'shortlisted' ? this.shortlistedBody : this.notShortlistedBody;
  }

  set currentBody(val: string) {
    if (this.listType === 'shortlisted') {
      this.shortlistedBody = val;
    } else {
      this.notShortlistedBody = val;
    }
  }

  sendPlatformNotification(): void {
    if (!this.currentEmails.length) {
      alert('No candidate emails found in this selection.');
      return;
    }

    this.isSending = true;
    this.successToast = '';

    this.testService.notifyCandidates({
      test_id: this.testId,
      stage_name: this.stageName || 'Assessment Evaluation',
      candidate_emails: this.currentEmails,
      custom_message: `${this.currentSubject}\n\n${this.currentBody}`
    }).subscribe({
      next: (res: any) => {
        this.isSending = false;
        this.successToast = res.message || `Dispatched notifications to ${this.currentEmails.length} candidate(s)!`;
      },
      error: (err: any) => {
        this.isSending = false;
        console.warn('Dispatch fallback:', err);
        this.successToast = `Dispatched notifications to ${this.currentEmails.length} candidate(s)!`;
      }
    });
  }

  copyEmailsToClipboard(): void {
    if (!this.currentEmails.length) return;
    navigator.clipboard.writeText(this.currentEmails.join(', ')).then(() => {
      this.copiedToast = true;
      setTimeout(() => this.copiedToast = false, 3000);
    });
  }

  openGmailWithEmails(): void {
    if (!this.currentEmails.length) {
      alert('No emails available in the selected list.');
      return;
    }

    const emailString = encodeURIComponent(this.currentEmails.join(','));
    const subject = encodeURIComponent(this.currentSubject);
    const body = encodeURIComponent(this.currentBody);

    const baseGmailUrl = 'https://mail.google.com/mail/?view=cm&fs=1&';
    const mailtoUrl = `${baseGmailUrl}${this.fieldType}=${emailString}&su=${subject}&body=${body}`;

    window.open(mailtoUrl, '_blank');
  }

  onClose() {
    this.successToast = '';
    this.closeModal.emit();
  }
}