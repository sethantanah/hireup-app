import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-sendmail',
  imports: [CommonModule, FormsModule],
  templateUrl: './sendmail.component.html',
  styleUrl: './sendmail.component.scss'
})
export class SendmailComponent {
  @Input() showModal = false;
  @Input() shortlistedEmails: string[] = [];
  @Input() notShortlistedEmails: string[] = [];

  listType: 'shortlisted' | 'notShortlisted' = 'shortlisted';
  fieldType: 'cc' | 'bcc' = 'cc';
  
  shortlistedSubject = "";
  notShortlistedSubject = "";
  
  shortlistedBody = "";

  notShortlistedBody = "";

  get currentEmails(): string[] {
    return this.listType === 'shortlisted' ? this.shortlistedEmails : this.notShortlistedEmails;
  }

  openGmailWithEmails(): void {
    if (!this.currentEmails.length) {
      alert('No emails available in the selected list.');
      return;
    }

    const emailString = encodeURIComponent(this.currentEmails.join(','));
    const subject = encodeURIComponent(
      this.listType === 'shortlisted' ? this.shortlistedSubject : this.notShortlistedSubject
    );
    const body = encodeURIComponent(
      this.listType === 'shortlisted' ? this.shortlistedBody : this.notShortlistedBody
    );

    const baseGmailUrl = 'https://mail.google.com/mail/?view=cm&fs=1&';
    const mailtoUrl = `${baseGmailUrl}${this.fieldType}=${emailString}&su=${subject}&body=${body}`;

    window.open(mailtoUrl, '_blank');
  }

  closeModal(){
    this.showModal = false;
  }
}