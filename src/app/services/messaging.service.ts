import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment';
import { EmailData } from '../models/messaging.model';

@Injectable({
  providedIn: 'root',
})
export class MessagingService {
  constructor(private http: HttpClient) {}

  sendEmails(
    emails_data: EmailData[],
    email_group: string,
    jobpost_id: string
  ): Observable<any> {
    const apiUrl =
      environment.apiUrl +
      `/messaging/email/${jobpost_id}/${email_group}`;
    const headers = new HttpHeaders({
      accept: 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    });

    return this.http.post(apiUrl, emails_data, { headers });
  }
}
