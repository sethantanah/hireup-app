import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment';
import { EmailData, EmailDataAPISend } from '../models/messaging.model';

export interface SmtpSettings {
  id?: string;
  smtp_server: string;
  smtp_port: number;
  sender_email: string;
  sender_name?: string;
  sender_password?: string;
  use_ssl: boolean;
  use_tls: boolean;
  is_enabled: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class MessagingService {
  constructor(private http: HttpClient) {}

  sendEmails(
    emails_data: EmailDataAPISend,
    application_stage: string,
    jobpost_id: string
  ): Observable<any> {
    const apiUrl =
      environment.apiUrl +
      `/messaging/notify/${jobpost_id}/${application_stage}`;
    const headers = new HttpHeaders({
      accept: 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    });

    return this.http.post(apiUrl, emails_data, { headers });
  }

  sendTestEmail(testData: {
    recipient_email: string;
    subject: string;
    html_template: string;
    text_content?: string;
  }): Observable<any> {
    const apiUrl = `${environment.apiUrl}/messaging/send-test-email`;
    const headers = new HttpHeaders({
      accept: 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    });
    return this.http.post(apiUrl, testData, { headers });
  }

  getSmtpSettings(): Observable<any> {
    const apiUrl = `${environment.apiUrl}/messaging/smtp-settings`;
    const headers = new HttpHeaders({
      accept: 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    });
    return this.http.get(apiUrl, { headers });
  }

  saveSmtpSettings(settingsData: SmtpSettings): Observable<any> {
    const apiUrl = `${environment.apiUrl}/messaging/smtp-settings`;
    const headers = new HttpHeaders({
      accept: 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    });
    return this.http.post(apiUrl, settingsData, { headers });
  }

  testSmtpConnection(testData: SmtpSettings & { test_recipient?: string }): Observable<any> {
    const apiUrl = `${environment.apiUrl}/messaging/smtp-settings/test`;
    const headers = new HttpHeaders({
      accept: 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    });
    return this.http.post(apiUrl, testData, { headers });
  }
}
