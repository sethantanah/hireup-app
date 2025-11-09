import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpContext, HttpContextToken, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, throwError } from 'rxjs';
import { environment } from '../../environment/environment';

// Response Interfaces
export interface JobPosting {
  id: string;
  user_id: string;
  title: string;
  received_documents?: number;
  created_at?: string;
  updated_at?: string;
}

export interface JobPostingCreateUpdateRequest {
  id?: string;
  title: string;
}

export interface JobPostingCreateUpdateResponse {
  success: boolean;
  message: string;
  data?: {
    id: string;
    [key: string]: any;
  };
}

export interface JobPostingDeleteResponse {
  success: boolean;
  message: string;
}

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

// HTTP Context Tokens
export const SKIP_AUTH_INTERCEPTOR = new HttpContextToken<boolean>(() => false);
export const SKIP_ERROR_HANDLING = new HttpContextToken<boolean>(() => false);

@Injectable({
  providedIn: 'root',
})
export class JobpostingsApiService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/jobposts`;
  private readonly defaultHeaders = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  };

  /**
   * Get all job postings for a user
   * @param userId - The user ID to fetch job postings for
   * @returns Observable array of job postings
   */
  getJobPostings(userId: string): Observable<JobPosting[]> {
    if (!userId) {
      return throwError(() => new Error('User ID is required'));
    }

    const params = new HttpParams().set('user_id', userId);
    const headers = this.createHeaders();

    return this.http.get<JobPosting[]>(`${this.baseUrl}/`, { headers, params })
      .pipe(
        catchError(this.handleError.bind(this))
      );
  }

  /**
   * Create or update a job posting
   * @param userId - The user ID creating/updating the job post
   * @param jobPostData - Job post data including title and optional ID
   * @returns Observable with operation result
   */
  createUpdateJobPost(
    userId: string, 
    jobPostData: JobPostingCreateUpdateRequest
  ): Observable<JobPostingCreateUpdateResponse> {
    if (!userId) {
      return throwError(() => new Error('User ID is required'));
    }

    if (!jobPostData?.title?.trim()) {
      return throwError(() => new Error('Job post title is required'));
    }

    const params = new HttpParams().set('user_id', userId);
    const headers = this.createHeaders();

    return this.http.post<JobPostingCreateUpdateResponse>(
      `${this.baseUrl}/create-update`, 
      jobPostData, 
      { headers, params }
    ).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * Delete a job posting
   * @param jobPostId - The ID of the job post to delete
   * @returns Observable with operation result
   */
  deleteJobPosting(jobPostId: string): Observable<JobPostingDeleteResponse> {
    if (!jobPostId) {
      return throwError(() => new Error('Job post ID is required'));
    }

    const headers = this.createHeaders();

    return this.http.delete<JobPostingDeleteResponse>(
      `${this.baseUrl}/${jobPostId}`, 
      { headers }
    ).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * Get a specific job posting by ID
   * @param jobPostId - The ID of the job post to retrieve
   * @returns Observable with job posting data
   */
  getJobPostingById(jobPostId: string): Observable<JobPosting> {
    if (!jobPostId) {
      return throwError(() => new Error('Job post ID is required'));
    }

    const headers = this.createHeaders();

    return this.http.get<JobPosting>(
      `${this.baseUrl}/${jobPostId}`, 
      { headers }
    ).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * Get job posting data (template data)
   * @param jobPostId - The ID of the job post
   * @returns Observable with job posting template data
   */
  getJobPostingData(jobPostId: string): Observable<any> {
    if (!jobPostId) {
      return throwError(() => new Error('Job post ID is required'));
    }

    const headers = this.createHeaders();

    return this.http.get<any>(
      `${this.baseUrl}/${jobPostId}/data`, 
      { headers }
    ).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * Create or update job posting template data
   * @param jobPostId - The ID of the job post
   * @param templateData - Template data for the job post
   * @returns Observable with operation result
   */
  createUpdateJobPostingData(
    jobPostId: string, 
    templateData: any
  ): Observable<JobPostingCreateUpdateResponse> {
    if (!jobPostId) {
      return throwError(() => new Error('Job post ID is required'));
    }

    const headers = this.createHeaders();

    return this.http.post<JobPostingCreateUpdateResponse>(
      `${this.baseUrl}/${jobPostId}/data/create-update`, 
      templateData, 
      { headers }
    ).pipe(
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

// Optional: Service for handling job posting operations with additional business logic
@Injectable({
  providedIn: 'root'
})
export class JobPostingService {
  private apiService = inject(JobpostingsApiService);

  /**
   * Create a new job posting
   * @param userId - User ID
   * @param title - Job post title
   * @returns Observable with created job post
   */
  createJobPosting(userId: string, title: string): Observable<JobPostingCreateUpdateResponse> {
    const jobPostData: JobPostingCreateUpdateRequest = {
      title: title.trim()
    };

    return this.apiService.createUpdateJobPost(userId, jobPostData);
  }

  /**
   * Update an existing job posting
   * @param userId - User ID
   * @param jobPostId - Job post ID to update
   * @param title - New title
   * @returns Observable with update result
   */
  updateJobPosting(
    userId: string, 
    jobPostId: string, 
    title: string
  ): Observable<JobPostingCreateUpdateResponse> {
    const jobPostData: JobPostingCreateUpdateRequest = {
      id: jobPostId,
      title: title.trim()
    };

    return this.apiService.createUpdateJobPost(userId, jobPostData);
  }

  /**
   * Get job postings with additional processing
   * @param userId - User ID
   * @returns Observable with processed job postings
   */
  getUserJobPostings(userId: string): Observable<JobPosting[]> {
    return this.apiService.getJobPostings(userId).pipe(
      map(jobPostings => jobPostings.map(jp => ({
        ...jp,
        // Add any additional processing here
        received_documents: jp.received_documents || 0
      })))
    );
  }
}