import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MessagingService, SmtpSettings } from '../../../../../services/messaging.service';

@Component({
  selector: 'app-smtp-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './smtp-settings.component.html',
  styleUrl: './smtp-settings.component.scss'
})
export class SmtpSettingsComponent implements OnInit {
  smtpSettings: SmtpSettings = {
    smtp_server: '',
    smtp_port: 587,
    sender_email: '',
    sender_name: '',
    sender_password: '',
    use_ssl: false,
    use_tls: true,
    is_enabled: true
  };

  testRecipient: string = '';
  isLoading: boolean = false;
  isTesting: boolean = false;
  isSaving: boolean = false;
  
  feedback: { type: 'success' | 'error'; message: string } | null = null;
  testFeedback: { type: 'success' | 'error'; message: string } | null = null;

  presets = [
    { name: 'Gmail / Google Workspace', server: 'smtp.gmail.com', port: 587, tls: true, ssl: false },
    { name: 'Microsoft Outlook / Office 365', server: 'smtp.office365.com', port: 587, tls: true, ssl: false },
    { name: 'SendGrid', server: 'smtp.sendgrid.net', port: 587, tls: true, ssl: false },
    { name: 'Mailgun', server: 'smtp.mailgun.org', port: 587, tls: true, ssl: false },
    { name: 'Amazon SES', server: 'email-smtp.us-east-1.amazonaws.com', port: 587, tls: true, ssl: false }
  ];

  constructor(private messagingService: MessagingService) {}

  ngOnInit(): void {
    this.fetchSettings();
  }

  fetchSettings() {
    this.isLoading = true;
    this.messagingService.getSmtpSettings().subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res.success && res.settings) {
          this.smtpSettings = {
            ...this.smtpSettings,
            ...res.settings
          };
          if (!this.testRecipient) {
            this.testRecipient = this.smtpSettings.sender_email;
          }
        }
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Failed to load SMTP settings:', err);
      }
    });
  }

  applyPreset(preset: typeof this.presets[0]) {
    this.smtpSettings.smtp_server = preset.server;
    this.smtpSettings.smtp_port = preset.port;
    this.smtpSettings.use_tls = preset.tls;
    this.smtpSettings.use_ssl = preset.ssl;
    this.feedback = { type: 'success', message: `Applied ${preset.name} preset configuration.` };
    setTimeout(() => { if (this.feedback?.message.includes('Applied')) this.feedback = null; }, 3000);
  }

  setSecurity(type: 'tls' | 'ssl') {
    if (type === 'tls') {
      this.smtpSettings.use_tls = true;
      this.smtpSettings.use_ssl = false;
    } else {
      this.smtpSettings.use_tls = false;
      this.smtpSettings.use_ssl = true;
    }
  }

  saveSettings() {
    if (!this.smtpSettings.smtp_server || !this.smtpSettings.sender_email) {
      this.feedback = { type: 'error', message: 'SMTP Server Host and Sender Email are required.' };
      return;
    }

    this.isSaving = true;
    this.feedback = null;

    this.messagingService.saveSmtpSettings(this.smtpSettings).subscribe({
      next: (res) => {
        this.isSaving = false;
        this.feedback = { type: 'success', message: res.message || 'Custom SMTP configuration saved successfully!' };
      },
      error: (err) => {
        this.isSaving = false;
        console.error('Error saving SMTP settings:', err);
        this.feedback = {
          type: 'error',
          message: err?.error?.detail || 'Failed to save SMTP settings. Please try again.'
        };
      }
    });
  }

  testConnection() {
    if (!this.smtpSettings.smtp_server || !this.smtpSettings.sender_email) {
      this.testFeedback = { type: 'error', message: 'Please provide SMTP host and sender email to test.' };
      return;
    }

    this.isTesting = true;
    this.testFeedback = null;

    this.messagingService.testSmtpConnection({
      ...this.smtpSettings,
      test_recipient: this.testRecipient || this.smtpSettings.sender_email
    }).subscribe({
      next: (res) => {
        this.isTesting = false;
        this.testFeedback = { type: 'success', message: res.message || 'SMTP Connection Verified!' };
      },
      error: (err) => {
        this.isTesting = false;
        console.error('SMTP test error:', err);
        this.testFeedback = {
          type: 'error',
          message: err?.error?.detail || err?.message || 'SMTP connection failed. Check host, port, or password.'
        };
      }
    });
  }
}
