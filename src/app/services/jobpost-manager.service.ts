import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, map, tap, throwError } from 'rxjs';
import { environment } from '../../environment/environment';
import { CompanyInfo, FormField, FormSection, JobInfo, JobPostData, JobPostDataCreateUpdateResponse, JobPostDataResponse, JobPostManagerError, NavLink } from '../models/jobpost.model';


@Injectable({
  providedIn: 'root',
})
export class JobpostManagerService {
  private http = inject(HttpClient);
  private applicationData!: JobPostData;
  private readonly localStorageKey = 'jobpost_application_data';
  private readonly dataVersion = '1.0.0';

  constructor() {
    this.initializeApplicationData();
  }

  /**
   * Initialize application data from localStorage or create default
   */
  private initializeApplicationData(): void {
    const storedData = this.loadFromLocalStorage();

    if (storedData) {
      this.applicationData = this.migrateData(storedData);
    } else {
      this.applicationData = this.createEmptyApplicationData();
    }
  }

  /**
   * Create empty application data with proper structure
   */
  private createEmptyApplicationData(): JobPostData {
    const timestamp = Date.now();
    return {
      company: {
        name: '',
        logoUrl: '',
        navLinks: []
      },
      job: {
        title: '',
        description: '',
        location: '',
        type: '',
        salaryRange: ''
      },
      applySection: {
        title: '',
        instructions: '',
        buttonText: 'Apply Now',
        declaration: 'I certify that the information provided is accurate and complete.'
      },
      benefits: {
        title: '',
        items: []
      },
      footer: {
        copyrightText: '',
        links: []
      },
      formData: {
        fields: [
        ]
      },
      submissionMessage: {
        title: 'Application Submitted!',
        message: 'Thank you for your application. We will review your submission and get back to you soon.',
        actionText: 'Back to Careers',
        actionLink: '/careers'
      },
      colorScheme: {
        primary: '#3b82f6',
        secondary: '#1e40af',
        accent: '#f59e0b',
        background: '#ffffff',
        text: '#1f2937'
      },
      sections: ['General'],
      deadline: '',
      templateId: '1',
      lastUpdated: timestamp,
      version: this.dataVersion
    };
  }

  /**
   * Migrate data from older versions if needed
   */
  private migrateData(data: any): JobPostData {
    // Handle migration from version to version
    if (!data.version) {
      // Migrate from pre-versioned data
      if (Array.isArray(data.formData?.fields)) {
        // Convert old flat fields structure to section-based structure
        data.formData = {
          sections: [
            {
              id: this.generateId(),
              title: 'Application Form',
              fields: data.formData.fields || []
            }
          ]
        };
      }
    }

    // Ensure all required properties exist
    const migratedData: JobPostData = {
      ...this.createEmptyApplicationData(),
      ...data,
      version: this.dataVersion,
      lastUpdated: Date.now()
    };

    return migratedData;
  }


  // Public API Methods

  /**
   * Get current application data
   */
  getApplicationData(): JobPostData {
    return { ...this.applicationData }; // Return copy to prevent direct mutation
  }

  getApplicationDataRaw(): JobPostData {
  this.applicationData = this.createEmptyApplicationData();
  return { ...this.applicationData }; // Return direct reference
  }

  /**
   * Update entire application data
   */
  updateApplicationData(data: JobPostData): void {
    this.applicationData = {
      ...data,
      lastUpdated: Date.now(),
      version: this.dataVersion
    };
    this.saveToLocalStorage();
  }

  /**
   * Update a specific section of the application data
   */
  updateSection<T extends keyof JobPostData>(sectionName: T, sectionData: JobPostData[T]): void {
    if (this.applicationData[sectionName] !== undefined) {
      this.applicationData[sectionName] = sectionData;
      this.applicationData.lastUpdated = Date.now();
      this.saveToLocalStorage();
    } else {
      this.handleError('INVALID_SECTION', `Section '${String(sectionName)}' does not exist`);
    }
  }

  /**
   * Update company information
   */
  updateCompanyInfo(companyInfo: Partial<CompanyInfo>): void {
    this.applicationData.company = {
      ...this.applicationData.company,
      ...companyInfo
    };
    this.applicationData.lastUpdated = Date.now();
    this.saveToLocalStorage();
  }

  /**
   * Update job information
   */
  updateJobInfo(jobInfo: Partial<JobInfo>): void {
    this.applicationData.job = {
      ...this.applicationData.job,
      ...jobInfo
    };
    this.applicationData.lastUpdated = Date.now();
    this.saveToLocalStorage();
  }

  // Form Section Management

  /**
   * Add a new form section
   */
  addFormSection(section: string): void {
    this.applicationData.sections.push(section);
    this.applicationData.lastUpdated = Date.now();
    this.saveToLocalStorage();
  }

  /**
   * Update a form section
   */
  updateFormSection(sectionName: string, updates: string): void {

    // any for flexibility
    const index = this.applicationData.sections.findIndex(
      (section: string) => section == sectionName
    );
    this.applicationData.sections[index] = updates;
    this.saveToLocalStorage();
  }

  /**
   * Delete a form section
   */
  // deleteFormSection(sectionId: string): void {
  //   const sectionIndex = this.applicationData.formData.sections.findIndex(
  //     section => section.id === sectionId
  //   );

  //   if (sectionIndex !== -1) {
  //     this.applicationData.formData.sections.splice(sectionIndex, 1);
  //     this.applicationData.lastUpdated = Date.now();
  //     this.saveToLocalStorage();
  //   } else {
  //     this.handleError('SECTION_NOT_FOUND', `Form section with ID '${sectionId}' not found`);
  //   }
  // }

  // Field Management

  /**
   * Add a field to a form section
   */
  addField(sectionName: string, field: Omit<FormField, 'id'>): void {
    if (sectionName === 'formData') {
      this.applicationData.formData.fields.push(field);
      this.saveToLocalStorage();
    }
  }

  /**
   * Update a field in a form section
  */

  updateField(sectionName: string, fieldIndex: number, updatedField: FormField): void {

    if (
      sectionName === 'formData' &&
      this.applicationData.formData.fields[fieldIndex]
    ) {
      this.applicationData.formData.fields[fieldIndex] = updatedField;
      this.saveToLocalStorage();
    }
  }

  /**
   * Delete a field from a form section
   */
  deleteField(sectionName: string, fieldIndex: number): void {
     if (
      sectionName === 'formData' &&
      this.applicationData.formData.fields[fieldIndex]
    ) {
      this.applicationData.formData.fields.splice(fieldIndex, 1);
      this.saveToLocalStorage();
    }
  }

  // Navigation Management

  /**
   * Add a navigation item
   */
  addNavItem(navLink: Omit<NavLink, 'id'>): void {
    const newNavLink: NavLink = {
      ...navLink,
      id: this.generateId()
    };

    this.applicationData.company.navLinks.push(newNavLink);
    this.applicationData.lastUpdated = Date.now();
    this.saveToLocalStorage();
  }

  /**
   * Update a navigation item
   */
  updateNavItem(navItemId: string, updatedNavLink: Partial<NavLink>): void {
    const navIndex = this.applicationData.company.navLinks.findIndex(
      nav => nav.id === navItemId
    );

    if (navIndex !== -1) {
      this.applicationData.company.navLinks[navIndex] = {
        ...this.applicationData.company.navLinks[navIndex],
        ...updatedNavLink
      };
      this.applicationData.lastUpdated = Date.now();
      this.saveToLocalStorage();
    } else {
      this.handleError('NAV_ITEM_NOT_FOUND', `Navigation item with ID '${navItemId}' not found`);
    }
  }

  /**
   * Delete a navigation item
   */
  deleteNavItem(navItemId: string): void {
    const navIndex = this.applicationData.company.navLinks.findIndex(
      nav => nav.id === navItemId
    );

    if (navIndex !== -1) {
      this.applicationData.company.navLinks.splice(navIndex, 1);
      this.applicationData.lastUpdated = Date.now();
      this.saveToLocalStorage();
    } else {
      this.handleError('NAV_ITEM_NOT_FOUND', `Navigation item with ID '${navItemId}' not found`);
    }
  }

  // Utility Methods

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Save data to localStorage
   */
  private saveToLocalStorage(): void {
    try {
      localStorage.setItem(
        this.localStorageKey,
        JSON.stringify(this.applicationData)
      );
    } catch (error) {
      this.handleError('STORAGE_ERROR', 'Failed to save data to localStorage');
    }
  }

  /**
   * Load data from localStorage
   */
  private loadFromLocalStorage(): JobPostData | null {
    try {
      const storedData = localStorage.getItem(this.localStorageKey);
      return storedData ? JSON.parse(storedData) : null;
    } catch (error) {
      this.handleError('STORAGE_ERROR', 'Failed to load data from localStorage');
      return null;
    }
  }

  /**
   * Clear localStorage and reset to default data
   */
  clearLocalStorage(): void {
    try {
      localStorage.removeItem(this.localStorageKey);
      this.applicationData = this.createEmptyApplicationData();
    } catch (error) {
      this.handleError('STORAGE_ERROR', 'Failed to clear localStorage');
    }
  }

  /**
   * Export application data as JSON
   */
  exportData(): string {
    return JSON.stringify(this.applicationData, null, 2);
  }

  /**
   * Import application data from JSON
   */
  importData(jsonData: string): void {
    try {
      const importedData = JSON.parse(jsonData) as JobPostData;
      this.updateApplicationData(importedData);
    } catch (error) {
      this.handleError('IMPORT_ERROR', 'Failed to import data: Invalid JSON format');
    }
  }

  // Error Handling

  /**
   * Handle service errors
   */
  private handleError(code: string, message: string, details?: string): never {
    const error: JobPostManagerError = {
      code,
      message,
      details,
      timestamp: Date.now()
    };

    console.error('JobPostManagerService Error:', error);
    throw new Error(JSON.stringify(error));
  }

  // API Methods

  /**
   * Get job post data from API
   */
  getJobPostData(jobpostId: string): Observable<JobPostDataResponse> {
    if (!jobpostId) {
      return throwError(() => this.createApiError('INVALID_INPUT', 'Job post ID is required'));
    }

    const apiUrl = `${environment.apiUrl}/jobposts/${jobpostId}/data`;
    const headers = this.createHeaders();

    return this.http.get<JobPostDataResponse>(apiUrl, { headers })
      .pipe(
        catchError(this.handleApiError.bind(this))
      );
  }

  /**
   * Create or update job post data via API
   */
  createUpdateJobPostData(
    jobpostId: string,
    jobPostData: JobPostData
  ): Observable<JobPostDataCreateUpdateResponse> {
    if (!jobpostId) {
      return throwError(() => this.createApiError('INVALID_INPUT', 'Job post ID is required'));
    }

    if (!jobPostData) {
      return throwError(() => this.createApiError('INVALID_INPUT', 'Job post data is required'));
    }

    const apiUrl = `${environment.apiUrl}/jobposts/${jobpostId}/data/create-update`;
    const headers = this.createHeaders();

    return this.http.post<JobPostDataCreateUpdateResponse>(
      apiUrl,
      { ...jobPostData, lastUpdated: Date.now() },
      { headers }
    ).pipe(
      tap(response => {
        if (response.success) {
          // Update local data if API call successful
          this.applicationData.lastUpdated = Date.now();
          this.saveToLocalStorage();
        }
      }),
      catchError(this.handleApiError.bind(this))
    );
  }

  /**
   * Create HTTP headers with authorization
   */
  private createHeaders(): HttpHeaders {
    const token = this.getToken();

    return new HttpHeaders({
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    });
  }

  /**
   * Get authentication token
   */
  private getToken(): string | null {
    try {
      return localStorage.getItem('token');
    } catch (error) {
      console.error('Error accessing token from localStorage:', error);
      return null;
    }
  }

  /**
   * Handle API errors
   */
  private handleApiError(error: HttpErrorResponse): Observable<never> {
    const apiError = this.createApiError(
      'API_ERROR',
      error.error?.error || 'Failed to communicate with server',
      error.message
    );

    return throwError(() => apiError);
  }

  /**
   * Create standardized API error
   */
  private createApiError(code: string, message: string, details?: string): JobPostManagerError {
    return {
      code,
      message,
      details,
      timestamp: Date.now()
    };
  }
}