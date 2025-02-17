import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../environment/environment';
import {
  Field,
  FormSection,
  FormSubSection,
  TestData,
} from '../models/test-models';

@Injectable({
  providedIn: 'root',
})
export class JobtestApiService {
  private test: TestData | null = null;
  private readonly storageKey = 'testData';
  constructor(private http: HttpClient) {
    this.loadFromLocalStorage();
  }

  jobTests(project_id: string): Observable<any> {
    const apiUrl = environment.apiUrl + `/jobtests/?project_id=${project_id}`;
    const headers = new HttpHeaders({
      accept: 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    });

    return this.http.get(apiUrl, { headers });
  }

  jobTest(test_id: string): Observable<any> {
    const apiUrl = environment.apiUrl + `/jobtests/test/?test_id=${test_id}`;
    const headers = new HttpHeaders({
      accept: 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    });

    return this.http.get(apiUrl, { headers });
  }

  createUpdateJobTests(project_id: string, test_data: any): Observable<any> {
    const apiUrl =
      environment.apiUrl + `/jobtests/create-update/?project_id=${project_id}`;
    const headers = new HttpHeaders({
      accept: 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    });

    return this.http.post(apiUrl, test_data, { headers });
  }

  checkApplicantCredentials(email: string, full_name: string): Observable<any> {
    const apiUrl =
      environment.apiUrl +
      `/jobtests/check-credentials?email=${email}&full_name=${full_name}`;
    const headers = new HttpHeaders({
      accept: 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    });

    return this.http.get(apiUrl, { headers });
  }

  saveTestResponse(data: any): Observable<any> {
    const apiUrl =
      environment.apiUrl +
      `/jobtests/save-response`;
    const headers = new HttpHeaders({
      accept: 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    });

    return this.http.post(apiUrl, data, { headers });
  }

  testResponses(testId: string): Observable<any> {
    const apiUrl =
      environment.apiUrl +
      `/jobtests/test-responses?test_id=0db9639f-e520-4979-b600-e2120bc10923`;
    const headers = new HttpHeaders({
      accept: 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    });

    return this.http.get(apiUrl, { headers });
  }

  getTest(): TestData | null {
    return this.test;
  }

  saveTest(testData: TestData): void {
    this.test = testData;
    this.saveToLocalStorage();
  }

  addField(field: Field): void {
    if (this.test) {
      this.test.formData.fields.push(field);
      this.saveToLocalStorage();
    }
  }

  updateField(
    fieldKey: string,
    updatedField: Partial<Field>
  ): Field | undefined {
    if (this.test) {
      const fieldIndex = this.test.formData.fields.findIndex(
        (field) => field.question.toLowerCase() === fieldKey
      );
      if (fieldIndex !== -1) {
        this.test.formData.fields[fieldIndex] = {
          ...this.test.formData.fields[fieldIndex],
          ...updatedField,
        };
        this.saveToLocalStorage();
        return this.test.formData.fields[fieldIndex];
      }
    }
    return undefined;
  }

  deleteField(fieldKey: string): boolean {
    if (this.test) {
      const initialLength = this.test.formData.fields.length;
      this.test.formData.fields = this.test.formData.fields.filter(
        (field) => field.question.toLowerCase() !== fieldKey
      );
      if (this.test.formData.fields.length !== initialLength) {
        this.saveToLocalStorage();
        return true;
      }
    }
    return false;
  }

  clearTest(): void {
    this.test = {
      id: '',
      formData: { fields: [] },
      sections: [
        {
          title: '',
          scoring: {
            wrong: 0,
            correct: 1,
            passmark: 50,
            instructions: '',
          },
          instructions: '',
          duration: 50,
          sectionId:
            this.test!.sections.length > 1 ? this.test!.sections.length - 1 : 0,
          subsection: [],
        },
      ],
    };
    localStorage.removeItem(this.storageKey);
  }

  createSection(section: FormSection) {
    this.test?.sections.push(section);
  }

  createSubSection(sectionId: number, subSection: FormSubSection) {
    this.test?.sections.forEach((section) => {
      if (section.sectionId === sectionId) {
        section.subsection?.push(subSection);
      }
    });
  }

  private saveToLocalStorage(): void {
    if (this.test) {
      localStorage.setItem(this.storageKey, JSON.stringify(this.test));
    }
  }

  private loadFromLocalStorage(): void {
    const savedData = localStorage.getItem(this.storageKey);
    if (savedData) {
      this.test = JSON.parse(savedData);
    } else {
      this.test = {
        id: '',
        formData: { fields: [] },
        sections: [
          {
            title: '',
            scoring: {
              wrong: 0,
              correct: 1,
              passmark: 50,
              instructions: '',
            },
            instructions: '',
            duration: 50,
            sectionId: 1,
            subsection: [],
          },
        ],
      };
    }
  }
}
