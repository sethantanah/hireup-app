import { Injectable } from '@angular/core';
import {
  FormField,
  FormSection,
  JobPostData,
  NavLink,
} from '../models/jobpost.model';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment';

@Injectable({
  providedIn: 'root',
})
export class JobpostManagerService {
  private applicationData!: JobPostData;

  private localStorageKey = 'applicationData';

  constructor(private http: HttpClient) {
    this.loadFromLocalStorage(); // Load on service initialization
    if (!this.applicationData) {
      // Create default if nothing in localstorage
      this.applicationData = this.createEmptyApplicationData();
    }
  }

  private createEmptyApplicationData(): JobPostData {
    return {
      company: { name: '', logoUrl: '', navLinks: [] },
      job: { title: '', description: '' },
      applySection: {
        title: '',
        instructions: '',
        buttonText: 'Apply Now',
        declaration: '',
      },
      benefits: { title: '', items: [] },
      footer: { copyrightText: '', links: [] },
      formData: { fields: [] },
      submissionMessage: {
        title: '',
        message: '',
        actionText: '',
        actionLink: '',
      },
      colorScheme: { primary: '', secondary: '' },
      id: 0,
      sections: ['General'],
      deadline: '',
      templateId: '',
      lastUpdated: 0
    };
  }

  getApplicationData(): JobPostData {
    return this.applicationData;
  }

  upDateApplicationData(data: JobPostData) {
    this.applicationData = data;
    this.saveToLocalStorage();
  }

  updateSection(sectionName: string, sectionData: any) {
    // any for flexibility
    const index = this.applicationData.sections.findIndex(
      (section: string) => section == sectionName
    );
    this.applicationData.sections[index] = sectionData;
    this.saveToLocalStorage();
  }

  addField(sectionName: string, field: FormField) {
    if (sectionName === 'formData') {
      this.applicationData.formData.fields.push(field);
      this.saveToLocalStorage();
    } // Add similar logic for other sections as needed
  }

  updateField(
    sectionName: string,
    fieldIndex: number,
    updatedField: FormField
  ) {
    if (
      sectionName === 'formData' &&
      this.applicationData.formData.fields[fieldIndex]
    ) {
      this.applicationData.formData.fields[fieldIndex] = updatedField;
      this.saveToLocalStorage();
    }
  }

  deleteField(sectionName: string, fieldIndex: number) {
    if (
      sectionName === 'formData' &&
      this.applicationData.formData.fields[fieldIndex]
    ) {
      this.applicationData.formData.fields.splice(fieldIndex, 1);
      this.saveToLocalStorage();
    }
  }

  addNavItem(navLink: NavLink) {
    this.applicationData.company.navLinks.push(navLink);
    this.saveToLocalStorage();
  }

  updateNavItem(index: number, updatedNavLink: NavLink) {
    if (this.applicationData.company.navLinks[index]) {
      this.applicationData.company.navLinks[index] = updatedNavLink;
      this.saveToLocalStorage();
    }
  }

  deleteNavItem(index: number) {
    if (this.applicationData.company.navLinks[index]) {
      this.applicationData.company.navLinks.splice(index, 1);
      this.saveToLocalStorage();
    }
  }

  /// Utility Funtions ///

  private saveToLocalStorage() {
    localStorage.setItem(
      this.localStorageKey,
      JSON.stringify(this.applicationData)
    );
  }

  private loadFromLocalStorage() {
    const storedData = localStorage.getItem(this.localStorageKey);
    if (storedData) {
      this.applicationData = JSON.parse(storedData);
    }
  }

  clearLocalStorage() {
    localStorage.removeItem(this.localStorageKey);
    this.applicationData = this.createEmptyApplicationData(); // Reset data
  }


  // API
  jobPostData(jobpost_id: string): Observable<any> {
    const apiUrl = environment.apiUrl + `/jobposts/jobpost-data/?jobpost_id=${jobpost_id}`;
    const headers = new HttpHeaders({
      accept: 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    });

    return this.http.get(apiUrl, { headers });
  }

  createUpdateJobPostData(jobpost_id: string, test_data: any): Observable<any> {
    const apiUrl =
      environment.apiUrl + `/jobposts/jobpost-data/create-update/?jobpost_id=${jobpost_id}`;
    const headers = new HttpHeaders({
      accept: 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    });

    return this.http.post(apiUrl, test_data, { headers });
  }
}
