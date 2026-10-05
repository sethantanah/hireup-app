import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment';

export interface CandidateProfile {
  id?: string;
  user_email?: string;
  full_name: string;
  phone?: string;
  headline?: string;
  location?: string;
  country?: string;
  employment_status?: string;
  bio?: string;
  website?: string;
  skills_list: string[];
  structured_resume?: any;
  resume_data?: any;
  raw_text?: string;
  resume_url?: string;
  avatar_url?: string;
  email_notifications_enabled?: boolean;
  notification_match_threshold?: number;
  preferred_job_types?: string[];
  preferred_experience_levels?: string[];
  preferred_locations?: string[];
  created_at?: string;
  updated_at?: string;
  match_score?: number;
  matched_skills?: string[];
}

export interface MatchedJob {
  job_id: string;
  job_title: string;
  has_form?: boolean;
  form_id?: string;
  has_applied?: boolean;
  application_stage?: string;
  application_type?: string;
  applied_at?: string;
  company_name?: string;
  company_logo?: string;
  company_website?: string;
  department: string;
  location: string;
  country?: string;
  work_mode?: string;
  experience_level?: string;
  employment_type: string;
  salary_range?: string;
  description?: string;
  requirements?: any;
  skills?: string[];
  match_score: number;
  matched_skills: string[];
  created_at: string;
  application_deadline?: string;
  section_visibility?: {
    showCompanyDetails?: boolean;
    showJobDescription?: boolean;
    showSalaryRange?: boolean;
    showDeadline?: boolean;
    showRequirements?: boolean;
    showBenefits?: boolean;
    showContactSection?: boolean;
  };
  [key: string]: any;
}

@Injectable({
  providedIn: 'root'
})
export class CandidateService {
  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    return new HttpHeaders({
      accept: 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token') || ''}`
    });
  }

  uploadResume(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file, file.name);

    const headers = new HttpHeaders({
      Authorization: `Bearer ${localStorage.getItem('token') || ''}`
    });

    return this.http.post(`${environment.apiUrl}/candidates/upload-resume`, formData, { headers });
  }

  saveProfile(profileData: CandidateProfile): Observable<any> {
    return this.http.post(`${environment.apiUrl}/candidates/profile`, profileData, {
      headers: this.getAuthHeaders()
    });
  }

  getProfile(): Observable<any> {
    return this.http.get(`${environment.apiUrl}/candidates/profile/me`, {
      headers: this.getAuthHeaders()
    });
  }

  getMatchedJobs(filters?: {
    experience_level?: string;
    job_type?: string;
    location?: string;
    country?: string;
    min_match_score?: number;
    search?: string;
  }): Observable<any> {
    let params = new HttpParams();
    if (filters?.experience_level) params = params.set('experience_level', filters.experience_level);
    if (filters?.job_type) params = params.set('job_type', filters.job_type);
    if (filters?.location) params = params.set('location', filters.location);
    if (filters?.country) params = params.set('country', filters.country);
    if (filters?.min_match_score !== undefined && filters?.min_match_score !== null) params = params.set('min_match_score', filters.min_match_score.toString());
    if (filters?.search) params = params.set('search', filters.search);

    return this.http.get(`${environment.apiUrl}/candidates/matched-jobs`, {
      headers: this.getAuthHeaders(),
      params
    });
  }

  notifyMatchingCandidates(jobId: string): Observable<any> {
    return this.http.post(`${environment.apiUrl}/candidates/notify-matches/${jobId}`, {}, {
      headers: this.getAuthHeaders()
    });
  }

  applyToJob(jobId: string): Observable<any> {
    return this.http.post(`${environment.apiUrl}/candidates/apply-job/${jobId}`, {}, {
      headers: this.getAuthHeaders()
    });
  }

  getMyApplications(): Observable<any> {
    return this.http.get(`${environment.apiUrl}/candidates/my-applications`, {
      headers: this.getAuthHeaders()
    });
  }

  trackApplications(email: string): Observable<any> {
    const params = new HttpParams().set('email', email);
    return this.http.get(`${environment.apiUrl}/candidates/track-application`, { params });
  }

  withdrawApplication(applicationId: string): Observable<any> {
    return this.http.post(`${environment.apiUrl}/candidates/withdraw-application/${applicationId}`, {}, {
      headers: this.getAuthHeaders()
    });
  }

  getCandidateById(candidateId: string): Observable<any> {
    return this.http.get(`${environment.apiUrl}/candidates/detail/${candidateId}`, {
      headers: this.getAuthHeaders()
    });
  }

  browseTalentPool(filters?: { query?: string; skill?: string; jobpost_id?: string; jobpost_ids?: string; source?: string; min_match_score?: number }): Observable<any> {
    let params = new HttpParams();
    if (filters?.query) params = params.set('query', filters.query);
    if (filters?.skill) params = params.set('skill', filters.skill);
    if (filters?.jobpost_id) params = params.set('jobpost_id', filters.jobpost_id);
    if (filters?.jobpost_ids) params = params.set('jobpost_ids', filters.jobpost_ids);
    if (filters?.source) params = params.set('source', filters.source);
    if (filters?.min_match_score !== undefined && filters?.min_match_score !== null) params = params.set('min_match_score', filters.min_match_score.toString());

    return this.http.get(`${environment.apiUrl}/candidates/talent-pool`, {
      headers: this.getAuthHeaders(),
      params
    });
  }

  addCandidateToJob(candidateId: string, jobpostId: string, stage: string = 'Applied'): Observable<any> {
    return this.http.post(`${environment.apiUrl}/candidates/add-to-job`, {
      candidate_id: candidateId,
      jobpost_id: jobpostId,
      stage
    }, {
      headers: this.getAuthHeaders()
    });
  }

  getMyOffers(email?: string, candidateId?: string): Observable<any> {
    let params = new HttpParams();
    if (email) params = params.set('candidate_email', email);
    if (candidateId) params = params.set('candidate_id', candidateId);

    return this.http.get(`${environment.apiUrl}/talent/offers`, {
      headers: this.getAuthHeaders(),
      params
    });
  }

  respondToOffer(offerId: string, payload: { status: string; candidate_email: string; notes?: string; signature_data?: string }): Observable<any> {
    return this.http.post(`${environment.apiUrl}/talent/offers/${offerId}/respond`, payload, {
      headers: this.getAuthHeaders()
    });
  }

  contactCompany(payload: { offer_id: string; candidate_email: string; candidate_name: string; subject: string; message: string }): Observable<any> {
    return this.http.post(`${environment.apiUrl}/talent/offers/contact-company`, payload, {
      headers: this.getAuthHeaders()
    });
  }

  getOfferByToken(token: string): Observable<any> {
    return this.http.get(`${environment.apiUrl}/talent/offers/view/${token}`);
  }

  signOffer(payload: { offer_id: string; signature_data: string; ip_address?: string }): Observable<any> {
    return this.http.post(`${environment.apiUrl}/talent/offers/sign`, payload);
  }

  uploadCandidateAvatar(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.http.post(`${environment.apiUrl}/candidates/upload-avatar`, formData, {
      headers: new HttpHeaders({
        Authorization: `Bearer ${localStorage.getItem('token') || ''}`
      })
    });
  }

  uploadUserAvatar(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.http.post(`${environment.apiUrl}/auth/upload-avatar`, formData, {
      headers: new HttpHeaders({
        Authorization: `Bearer ${localStorage.getItem('token') || ''}`
      })
    });
  }

  updateUserProfile(payload: { full_name?: string; company_name?: string; position_in_company?: string; avatar_url?: string; logo_url?: string }): Observable<any> {
    return this.http.put(`${environment.apiUrl}/auth/user/profile`, payload, {
      headers: this.getAuthHeaders()
    });
  }
}
