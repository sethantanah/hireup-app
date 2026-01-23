import { HttpClient, HttpContextToken, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../environment/environment';
import { catchError, Observable, throwError } from 'rxjs';



export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

// Error Interfaces
export interface ApiError {
  success: false;
  error: string;
  details?: string;
  statusCode: number;
}


export interface Applicants {
  id: string; // UUID
  form_data?: Record<string, any> | null;
  uploaded_files?: Record<string, any> | null;
  resume_data?: Record<string, any> | null;
  short_listed?: boolean | null;
  created_at?: string | null; // ISO timestamp
  jobpost_id?: string | null; // UUID
  ranking_score?: number | null;
  document_ranking?: Record<string, any> | null;
  application_stages?: Record<string, any> | null;
}

export interface ApplicantCounts {
  stage: string,
  count: number
}

export interface Stage {
  stage_name: string;
  status: string;
  emailed: boolean;
  is_current: boolean;
}

export interface CandidateStatus {
  candidate_id: string;
  email: string;
  jobpost_id: string;
  job_title: string;
  current_stage: string;
  current_status: string;
  history: Stage[];
}


// HTTP Context Tokens
export const SKIP_AUTH_INTERCEPTOR = new HttpContextToken<boolean>(() => false);
export const SKIP_ERROR_HANDLING = new HttpContextToken<boolean>(() => false);


@Injectable({
  providedIn: 'root'
})
export class ApplicantManagementService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/applicants`;
  private readonly defaultHeaders = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  };


 /**
 * Get all job applicants for a jobpost with stage filters
 * @param jobpost_id - Job post ID to filter
 * @param stage_name - The stage name to filter
 * @param stage_status - Stage status (default: "pending")
 */
getApplicantsByStage(
  jobpost_id: string,
  stage_name: string,
  stage_status: string = "pending"
): Observable<Applicants[]> {

  if (!jobpost_id) {
    return throwError(() => new Error('Job ID is required'));
  }

  let params = new HttpParams()
    .set('jobpost_id', jobpost_id)
    .set('stage_name', stage_name)
    .set('stage_status', stage_status);

  const headers = this.createHeaders();

  return this.http.get<Applicants[]>(`${this.baseUrl}/bystage`, { headers, params })
    .pipe(
      catchError(this.handleError.bind(this))
    );
}


/**
 * Get job applicants count with stage filters
 * @param jobpost_id - Job post ID
 * @param stage_filters - Array of dicts, e.g. [{ stage: "pending" }]
 */
getApplicantsCount(
  jobpost_id: string,
  stage_filters: Record<string, any>
): Observable<Record<string, any>> {

  if (!jobpost_id) {
    return throwError(() => new Error('Jobpost ID is required'));
  }

  let params = new HttpParams()
    .set('jobpost_id', jobpost_id)
    // encode the list of dicts as JSON for query parameter
    .set('stage_filters', JSON.stringify(stage_filters));

  const headers = this.createHeaders();

  return this.http.get<Record<string, any>>(`${this.baseUrl}/bystage-count`, { headers, params })
    .pipe(
      catchError(this.handleError.bind(this))
    );
}



 /**
 * Get all job applicants for a jobpost with stage filters
 * @param email - Applicant email to filter
 * @param stage_name - The stage name to filter
 * @param stage_status - Stage status (default: "pending")
 */
getApplicantStatus(
  email: string
): Observable<CandidateStatus[]> {

  if (!email) {
    return throwError(() => new Error('Job ID is required'));
  }

  let params = new HttpParams()
    .set('email', email)

  const headers = this.createHeaders();

  return this.http.get<CandidateStatus[]>(`${this.baseUrl}/candidate-status`, { headers, params })
    .pipe(
      catchError(this.handleError.bind(this))
    );
}


  /**
   * Create headers with authorization token
   * @returns HttpHeaders object with authorization
   */
  private createHeaders(): HttpHeaders {
    const token = this.getToken();

    if (!token) {
      console.warn('No authentication token found');
    }

    return new HttpHeaders({
      ...this.defaultHeaders,
      ...(token && { 'Authorization': `Bearer ${token}` })
    });
  }

  /**
   * Get authentication token from storage
   * @returns Token string or null if not found
   */
  private getToken(): string | null {
    try {
      return localStorage.getItem('token');
    } catch (error) {
      console.error('Error accessing localStorage:', error);
      return null;
    }
  }

  /**
   * Handle HTTP errors
   * @param error - HttpErrorResponse object
   * @returns Observable with error
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An unexpected error occurred';
    let errorDetails: string | undefined;

    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Client error: ${error.error.message}`;
    } else {
      // Server-side error
      errorMessage = this.getServerErrorMessage(error);
      errorDetails = error.error?.details || error.message;
    }

    console.error('API Error:', {
      status: error.status,
      message: errorMessage,
      details: errorDetails,
      url: error.url
    });

    const apiError: ApiError = {
      success: false,
      error: errorMessage,
      details: errorDetails,
      statusCode: error.status
    };

    return throwError(() => apiError);
  }

  /**
   * Get user-friendly server error messages
   * @param error - HttpErrorResponse object
   * @returns User-friendly error message
   */
  private getServerErrorMessage(error: HttpErrorResponse): string {
    switch (error.status) {
      case 0:
        return 'Unable to connect to server. Please check your internet connection.';
      case 400:
        return error.error?.error || 'Invalid request. Please check your input.';
      case 401:
        return 'Authentication required. Please log in again.';
      case 403:
        return 'You do not have permission to perform this action.';
      case 404:
        return 'The requested resource was not found.';
      case 409:
        return error.error?.error || 'A conflict occurred with the current state.';
      case 422:
        return error.error?.error || 'Unable to process the request.';
      case 429:
        return 'Too many requests. Please try again later.';
      case 500:
        return 'Server error. Please try again later.';
      case 503:
        return 'Service temporarily unavailable. Please try again later.';
      default:
        return error.error?.error || `Server error: ${error.status}`;
    }
  }

}



