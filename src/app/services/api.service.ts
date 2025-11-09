import { Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { environment } from '../../environment/environment';
import {
  HttpClient,
  HttpEventType,
  HttpHeaders,
  HttpRequest,
} from '@angular/common/http';
import { Candidate } from '../pages/dashboard/models/candidate.model';
import { EmailAttachment } from '../pages/job-posts/manager/components/data-uploads/bulk-document-uploads/bulk-document-uploads.component';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private candidates: Candidate[] = [];
  jobpost_id: string = '';
  baseURL =  environment.apiUrl + `/applications`;

  constructor(private http: HttpClient) {}


  submitForm(formData: any): Observable<any> {
    const headers = new HttpHeaders({
      accept: 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    });

    return this.http.post(`${this.baseURL}/submit-application`, formData, { headers });
  }

  // Add this method to your existing ApiService

  /**
   * Uploads a single file with form data
   * @param formData The form data containing the file and other information
   * @returns Observable with upload progress and completion events
   */
  uploadSingleFile(formData: FormData): Observable<any> {
    const url = environment.apiUrl + `/upload-resumes`;

    // Create a custom HttpRequest to track upload progress
    const req = new HttpRequest('POST', url, formData, {
      reportProgress: true,
    });

    return this.http.request(req).pipe(
      map((event) => {
        if (event.type === HttpEventType.UploadProgress && event.total) {
          // Return progress event
          return {
            type: 'progress',
            loaded: event.loaded,
            total: event.total,
          };
        } else if (event.type === HttpEventType.Response) {
          // Return completion event
          return {
            type: 'complete',
            body: event.body,
          };
        }
        return event;
      }),
      catchError((error) => {
        console.error('Error uploading file:', error);
        return throwError(() => error);
      })
    );
  }

  getDocuments(jobpost_id: string) {
    const apiUrl = environment.apiUrl + `/documents?jobpost_id=${jobpost_id}`;
    const headers = new HttpHeaders({
      accept: 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    });

    return this.http.get(apiUrl, { headers });
  }

  getRankedCandidates(jobpost_id: string) {
    const apiUrl =
      environment.apiUrl +
      `/documents/ranked-documents?jobpost_id=${jobpost_id}`;
    const headers = new HttpHeaders({
      accept: 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    });

    return this.http.get(apiUrl, { headers });
  }

  rankCandidates(formData: any): Observable<any> {
    const apiUrl = environment.apiUrl + `/shortlisting/rank-resumes`;
    const headers = new HttpHeaders({
      accept: 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    });

    return this.http.post(apiUrl, formData, { headers });
  }

  shortListCandidates(resumes_ids: string[]): Observable<any> {
    const apiUrl =
      environment.apiUrl +
      `/shortlisting/shortlist/jobpost_id=${this.jobpost_id}`;
    const headers = new HttpHeaders({
      accept: 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    });

    return this.http.post(apiUrl, resumes_ids, { headers });
  }

  removeListCandidates(
    resumes_ids: string[],
    jobpost_id: string
  ): Observable<any> {
    const apiUrl =
      environment.apiUrl + `/shortlisting/remove-shortlist/${jobpost_id}`;
    const headers = new HttpHeaders({
      accept: 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    });

    return this.http.post(apiUrl, resumes_ids, { headers });
  }

  getShortListedCandidates(jobpost_id: string): Observable<any> {
    const apiUrl =
      environment.apiUrl + `/shortlisting/shortlisted?jobpost_id=${jobpost_id}`;
    const headers = new HttpHeaders({
      accept: 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    });

    return this.http.get(apiUrl, { headers });
  }


  getEmailAttachments(source: string, query: string): Observable<any> {
    const apiUrl = environment.apiUrl + `/connect-mail/gmail-attachments`;
  
    const headers = new HttpHeaders({
      accept: 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token')}`, // Optional if you're using cookies for auth
    });
  
    return this.http.get(apiUrl, {
      headers: headers,
      params: { subject: query }
    });
  }

  downloadFileAttachment(attachment: EmailAttachment) {
    const apiUrl = environment.apiUrl + `/connect-mail/download-attachment`;
    const headers = new HttpHeaders({
      accept: 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    });

    return this.http.get(apiUrl, {
      headers: headers,
      params: {
        attachment_id: attachment.attachment_id,
        filename: attachment.filename,
        message_id: attachment.message_id || "",
      },
      responseType: 'blob',
    });
  }
}
