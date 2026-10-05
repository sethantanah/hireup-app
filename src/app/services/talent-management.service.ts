import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment';

@Injectable({ providedIn: 'root' })
export class TalentManagementService {
  /** environment.apiUrl = 'http://localhost:8000/api' */
  private base = (environment.apiUrl ?? 'http://localhost:8000/api').replace(/\/api$/, '');

  constructor(private http: HttpClient) {}

  private get headers(): HttpHeaders {
    const token = localStorage.getItem('token') || '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  // ─── Interview Scorecards ───────────────────────────────

  createScorecardTemplate(data: any): Observable<any> {
    return this.http.post(`${this.base}/api/talent/scorecards/templates`, data, { headers: this.headers });
  }

  listScorecardTemplates(jobpostId: string): Observable<any> {
    const params = new HttpParams().set('jobpost_id', jobpostId);
    return this.http.get(`${this.base}/api/talent/scorecards/templates`, { headers: this.headers, params });
  }

  updateScorecardTemplate(templateId: string, data: any): Observable<any> {
    return this.http.put(`${this.base}/api/talent/scorecards/templates/${templateId}`, data, { headers: this.headers });
  }

  deleteScorecardTemplate(templateId: string): Observable<any> {
    return this.http.delete(`${this.base}/api/talent/scorecards/templates/${templateId}`, { headers: this.headers });
  }

  submitInterviewRating(data: any): Observable<any> {
    return this.http.post(`${this.base}/api/talent/scorecards/ratings`, data, { headers: this.headers });
  }

  getPanelConsensus(candidateId: string, templateId: string): Observable<any> {
    const params = new HttpParams().set('candidate_id', candidateId).set('scorecard_template_id', templateId);
    return this.http.get(`${this.base}/api/talent/scorecards/ratings/panel-consensus`, { headers: this.headers, params });
  }

  getRatingsByCandidate(candidateId: string, jobpostId: string): Observable<any> {
    const params = new HttpParams().set('candidate_id', candidateId).set('jobpost_id', jobpostId);
    return this.http.get(`${this.base}/api/talent/scorecards/ratings/by-candidate`, { headers: this.headers, params });
  }

  getMyRating(candidateId: string, templateId: string): Observable<any> {
    const params = new HttpParams().set('candidate_id', candidateId).set('scorecard_template_id', templateId);
    return this.http.get(`${this.base}/api/talent/scorecards/ratings/my-rating`, { headers: this.headers, params });
  }

  // ─── Offer Management ─────────────────────────────────

  createOfferTemplate(data: any): Observable<any> {
    return this.http.post(`${this.base}/api/talent/offers/templates`, data, { headers: this.headers });
  }

  listOfferTemplates(): Observable<any> {
    return this.http.get(`${this.base}/api/talent/offers/templates`, { headers: this.headers });
  }

  updateOfferTemplate(templateId: string, data: any): Observable<any> {
    return this.http.put(`${this.base}/api/talent/offers/templates/${templateId}`, data, { headers: this.headers });
  }

  deleteOfferTemplate(templateId: string): Observable<any> {
    return this.http.delete(`${this.base}/api/talent/offers/templates/${templateId}`, { headers: this.headers });
  }

  createOffer(data: any): Observable<any> {
    return this.http.post(`${this.base}/api/talent/offers`, data, { headers: this.headers });
  }

  listOffers(jobpostId?: string, candidateId?: string): Observable<any> {
    let params = new HttpParams();
    if (jobpostId) params = params.set('jobpost_id', jobpostId);
    if (candidateId) params = params.set('candidate_id', candidateId);
    return this.http.get(`${this.base}/api/talent/offers`, { headers: this.headers, params });
  }

  viewOfferByToken(linkToken: string): Observable<any> {
    return this.http.get(`${this.base}/api/talent/offers/view/${linkToken}`);
  }

  signOffer(data: { offer_id: string; signature_data: string; ip_address?: string }): Observable<any> {
    return this.http.post(`${this.base}/api/talent/offers/sign`, data);
  }

  updateOfferStatus(offerId: string, status: string, notes?: string): Observable<any> {
    return this.http.patch(`${this.base}/api/talent/offers/${offerId}/status`, { status, notes }, { headers: this.headers });
  }

  updateOffer(offerId: string, data: any): Observable<any> {
    return this.http.put(`${this.base}/api/talent/offers/${offerId}`, data, { headers: this.headers });
  }

  deleteOffer(offerId: string): Observable<any> {
    return this.http.delete(`${this.base}/api/talent/offers/${offerId}`, { headers: this.headers });
  }

  moveToOnboarding(offerId: string): Observable<any> {
    return this.http.post(`${this.base}/api/talent/offers/${offerId}/move-to-onboarding`, {}, { headers: this.headers });
  }

  // ─── Onboarding ────────────────────────────────────────

  createOnboardingTemplate(data: any): Observable<any> {
    return this.http.post(`${this.base}/api/talent/onboarding/templates`, data, { headers: this.headers });
  }

  listOnboardingTemplates(department?: string): Observable<any> {
    let params = new HttpParams();
    if (department) params = params.set('department', department);
    return this.http.get(`${this.base}/api/talent/onboarding/templates`, { headers: this.headers, params });
  }

  triggerOnboarding(data: any): Observable<any> {
    return this.http.post(`${this.base}/api/talent/onboarding/trigger`, data, { headers: this.headers });
  }

  listOnboardingRecords(filters?: { department?: string; status?: string; jobpost_id?: string }): Observable<any> {
    let params = new HttpParams();
    if (filters?.department) params = params.set('department', filters.department);
    if (filters?.status) params = params.set('status', filters.status);
    if (filters?.jobpost_id) params = params.set('jobpost_id', filters.jobpost_id);
    return this.http.get(`${this.base}/api/talent/onboarding/records`, { headers: this.headers, params });
  }

  getOnboardingRecord(candidateId: string): Observable<any> {
    return this.http.get(`${this.base}/api/talent/onboarding/records/${candidateId}`, { headers: this.headers });
  }

  completeOnboardingTask(recordId: string, data: { task_id: string; notes?: string; signature_data?: string; completed_by?: string }): Observable<any> {
    return this.http.patch(`${this.base}/api/talent/onboarding/records/${recordId}/task`, data, { headers: this.headers });
  }

  updateOnboardingRecord(recordId: string, data: any): Observable<any> {
    return this.http.patch(`${this.base}/api/talent/onboarding/records/${recordId}`, data, { headers: this.headers });
  }

  // ─── Scheduled Interviews ──────────────────────────────

  getInterviewsByJob(jobpostId: string): Observable<any> {
    const params = new HttpParams().set('jobpost_id', jobpostId);
    return this.http.get(`${this.base}/api/talent/scorecards/interviews/by-job`, { headers: this.headers, params });
  }

  getAllInterviews(jobpostId?: string): Observable<any> {
    let params = new HttpParams();
    if (jobpostId) params = params.set('jobpost_id', jobpostId);
    return this.http.get(`${this.base}/api/talent/scorecards/interviews/all`, { headers: this.headers, params });
  }

  updateInterviewStatus(interviewId: string, status: string): Observable<any> {
    return this.http.post(`${this.base}/api/talent/scorecards/interviews/update-status`, { interview_id: interviewId, status }, { headers: this.headers });
  }

  rescheduleInterviewsBulk(payload: { interview_ids: string[]; new_date: string; new_time: string; meeting_link?: string; send_notification?: boolean; notes?: string }): Observable<any> {
    return this.http.post(`${this.base}/api/talent/scorecards/interviews/reschedule-bulk`, payload, { headers: this.headers });
  }

  createInterview(payload: {
    jobpost_id: string;
    candidate_name: string;
    candidate_email: string;
    candidate_id?: string;
    job_title?: string;
    interview_type?: string;
    interview_date: string;
    interview_time: string;
    duration_minutes?: number;
    meeting_link?: string;
    notes?: string;
    send_notification?: boolean;
  }): Observable<any> {
    return this.http.post(`${this.base}/api/talent/scorecards/interviews/create`, payload, { headers: this.headers });
  }
}
