import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment';
import { EmailData, EmailDataAPISend } from '../models/messaging.model';

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
}
