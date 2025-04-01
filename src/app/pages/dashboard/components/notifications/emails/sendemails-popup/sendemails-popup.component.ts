import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FormattingService } from '../../../../../../services/formatting.service';
import { DataService } from '../../../../../../services/data.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
interface EmailPage {
  emails: string[];
  isSent: boolean;
}

export type ContentType = 'plain' | 'html' | 'markdown';
@Component({
  selector: 'app-sendemails-popup',
  imports: [CommonModule, FormsModule],
  templateUrl: './sendemails-popup.component.html',
  styleUrl: './sendemails-popup.component.scss',
})
export class SendemailsPopupComponent implements OnInit {
  @Input() emails: string[] = [];
  @Input() emailSubject: string = '';
  @Input() emailBody: string = '';
  @Output() closePopup = new EventEmitter<void>();
  emailPages: EmailPage[] = [];
  currentPage = 0;
  threshold = 200;
  emailClient = 'gmail';

  contentType: ContentType = 'html';
  renderedContent: SafeHtml = '';

  constructor(
    private sanitizer: DomSanitizer,
    private formatService: FormattingService,
    private dataService: DataService
  ) {}

  ngOnInit() {
    this.emails = this.dataService.emailsList;
    this.paginateEmails();
  }

  paginateEmails() {
    this.emailPages = [];
    for (let i = 0; i < this.emails.length; i += this.threshold) {
      this.emailPages.push({
        emails: this.emails.slice(i, i + this.threshold),
        isSent: false,
      });
    }
  }

  sendEmails() {
    const currentEmails = this.emailPages[this.currentPage].emails;
    let mailtoLink = '';

    const formattedBody = this.emailBody;
    switch (this.emailClient) {
      case 'gmail':
        mailtoLink = `https://mail.google.com/mail/?view=cm&fs=1&to=${currentEmails.join(
          ','
        )}&su=${encodeURIComponent(
          this.emailSubject
        )}&body=${encodeURIComponent(formattedBody)}&html=${
          this.contentType !== 'plain'
        }`;
        break;
      case 'outlook':
        // Outlook Web specific formatting
        mailtoLink = `https://outlook.office.com/mail/deeplink/compose?to=${currentEmails.join(
          ','
        )}&subject=${encodeURIComponent(
          this.emailSubject
        )}&body=${encodeURIComponent(formattedBody)}&isHtml=${
          this.contentType !== 'plain'
        }`;
        break;
      default:
        mailtoLink = `mailto:${currentEmails.join(
          ','
        )}?subject=${encodeURIComponent(
          this.emailSubject
        )}&body=${encodeURIComponent(formattedBody)}`;
    }

    // switch (this.emailClient) {
    //   case 'gmail':
    //     mailtoLink = `https://mail.google.com/mail/?view=cm&fs=1&to=${currentEmails.join(
    //       ','
    //     )}&su=${encodeURIComponent(
    //       this.emailSubject
    //     )}&body=${encodeURIComponent(this.emailBody)}`;
    //     break;
    //   case 'outlook':
    //     mailtoLink = `ms-outlook://compose?to=${currentEmails.join(
    //       ','
    //     )}&subject=${encodeURIComponent(
    //       this.emailSubject
    //     )}&body=${encodeURIComponent(this.emailBody)}`;
    //     break;
    //   default:
    //     mailtoLink = `mailto:${currentEmails.join(
    //       ','
    //     )}?subject=${encodeURIComponent(
    //       this.emailSubject
    //     )}&body=${encodeURIComponent(this.emailBody)}`;
    // }

    window.open(mailtoLink, '_blank');
    this.emailPages[this.currentPage].isSent = true;
  }

  updateThreshold() {
    this.paginateEmails();
    this.currentPage = 0;
  }

  getPreviewContent() {
    return this.formatService.parseMarkdown(this.emailBody);
  }

  close() {
    this.closePopup.emit();
  }
}
