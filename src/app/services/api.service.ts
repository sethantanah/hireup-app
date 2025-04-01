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

  jobpost_id: string = '943ee467-f686-4703-acd1-ce50ecb676ac';

  constructor(private http: HttpClient) {}

  getData(id: string) {
    return {
      company: {
        name: 'SafetyCampaignGh',
        logoUrl:
          'https://fyidkwgutjawdydqghan.supabase.co/storage/v1/object/public/assets/users/SCG%20LOGO%2041-1.png?t=2025-01-14T22%3A10%3A39.370Z',
        navLinks: [
          { text: 'Home', url: '#' },
          { text: 'Careers', url: '#' },
          { text: 'Contact', url: '#' },
        ],
      },
      job: {
        title: '',
        description: '',
      },
      applySection: {
        title: 'Apply Now',
        instructions:
          "Upload your resume to start your application. We'll review your qualifications and get back to you shortly.",
        buttonText: 'Upload Resume',
      },
      benefits: {
        title: 'Why Join Us?',
        items: [
          {
            title: 'Innovative Projects',
            description:
              'Work on cutting-edge technologies and solve real-world problems.',
          },
          {
            title: 'Collaborative Culture',
            description:
              'Join a team that values collaboration and open communication.',
          },
          {
            title: 'Career Growth',
            description:
              'We invest in your development and help you achieve your career goals.',
          },
        ],
      },
      footer: {
        copyrightText: '© 2023 Tech Innovators. All rights reserved.',
        links: [
          { text: 'Privacy Policy', url: '#' },
          { text: 'Terms of Service', url: '#' },
        ],
      },
      formData: {
        title: 'SAFETY MENTORSHIP COHORT 2 - APPLICATION FORM',
        description: '',
        fields: [
          {
            type: 'text',
            label: 'Full Name',
            key: 'fullName',
            required: true,
            section: 'general',
          },
          {
            type: 'date',
            label: 'Date of Birth',
            key: 'dateOfBirth',
            required: true,
            section: 'general',
          },
          {
            type: 'email',
            label: 'Email Address',
            key: 'email',
            required: true,
            section: 'general',
          },
          {
            type: 'tel',
            label: 'Phone Number',
            key: 'phoneNumber',
            required: true,
            section: 'general',
          },
          {
            type: 'text',
            label: 'Residential Address',
            key: 'residentialAddress',
            required: true,
            section: 'general',
          },
          {
            type: 'text',
            label: 'Highest Degree/Diploma/HND Earned',
            key: 'highestDegree',
            required: true,
            section: 'general',
          },
          {
            type: 'text',
            label: 'Field of Study',
            key: 'fieldOfStudy',
            required: true,
            section: 'general',
          },
          {
            type: 'text',
            label: 'Institution Name',
            key: 'institutionName',
            required: true,
            section: 'general',
          },
          {
            type: 'text',
            label: 'Year of Graduation',
            key: 'yearOfGraduation',
            required: true,
            section: 'general',
          },
          {
            type: 'text',
            label: 'Occupation',
            key: 'occupation',
            required: true,
            section: 'general',
          },
          {
            type: 'text',
            label: 'Organization',
            key: 'organization',
            required: true,
            section: 'general',
          },
          {
            type: 'text',
            label: 'Total Years of Experience',
            key: 'yearsOfExperience',
            required: true,
            section: 'general',
          },

          {
            type: 'text-area',
            label:
              'Why do you want to be part of this mentorship Cohort. (Personal and proffessional motivation)',
            key: 'personalMotivation',
            required: true,
            section: 'personal-motivation',
          },
          {
            type: 'text-area',
            label:
              'Health and safety is about people, communities, and organisations. So how are you going to use the skills acquired from this Cohort improve you immediate community.',
            key: 'community-involvement',
            required: true,
            section: 'personal-motivation',
          },
          {
            type: 'text-area',
            label:
              'How are you going to improve your workplace or industry with the skills from the Cohort.',
            key: 'professionalImprovement',
            required: true,
            section: 'personal-motivation',
          },
          {
            type: 'text-area',
            label:
              'Who do you look upto  and how has the person inspired you in your career.',
            key: 'mentor',
            required: true,
            section: 'personal-motivation',
          },

          {
            type: 'text-area',
            label:
              'How are you going to manage your time to remain committed to the program.',
            key: 'timeManagement',
            required: true,
            section: 'personal-motivation',
          },
          {
            type: 'text-area',
            label:
              'Will you be available to join and contribute to Safety Campaign Ghana’s weekly virtual training, whether or not you are successful with the application?',
            key: 'participationAvailability',
            required: true,
            section: 'personal-motivation',
          },
          {
            type: 'select',
            label: 'Availability to Complete Mentorship',
            key: 'availability',
            required: true,
            section: 'general',
            options: ['Yes', 'No'],
          },
          {
            type: 'select',
            label: 'Can you dedicate minimum 6 hours of your weekend time?',
            key: 'availabilityHours',
            required: true,
            section: 'general',
            options: ['Yes', 'No'],
          },
          {
            type: 'file',
            label: 'Upload CV (PDF)',
            key: 'cv',
            required: true,
            section: 'upload',
          },
          {
            type: 'file',
            label: 'Upload Reference Letter (Max 250 words)',
            key: 'referenceLetter',
            required: true,
            section: 'upload',
            info: [
              '1 page reference letter (in pdf) from and academic or professional referee detailing: 1. Academic and professional abilities. 2. Motivation and desire to succeed  3. Soft skills that the applicant possess to excel in the program 4. Applicants contribution to the workplace or industry so far.',
            ],
          },
          {
            type: 'checkbox',
            lable: '',
            key: 'agreeToDeclaration',
            required: false,
            section: 'upload',
          },
        ],
        submitButtonText: 'Submit Application',
        declaration:
          'I hereby declare that the information provided is true and correct to the best of my knowledge. I understand that providing false information may result in disqualification from the mentorship program.',
        contactInfo: {
          email: 'mentorship@safetycampaignph.com',
          phone: '+233 549 931 835 / +233 273 063 351',
          website: 'www.safetycampaignph.com',
          linkedin: 'https://www.linkedin.com/company/safety-campaign-ghana',
        },
      },

      submissionMessage: {
        title: 'Application Received!',
        message:
          'Thank you for applying for this position! We appreciate your interest and the time you took to submit your application. Our team is currently reviewing your profile, and we’ll get back to you shortly with an update. If you have any questions in the meantime, feel free to reach out to us. Wishing you the best of luck!',
      },

      colorsScheme: {
        primary: '#282157',
        secondary: '#FF4E04',
      },
    };
  }

  submitForm(formData: any): Observable<any> {
    const apiUrl = environment.apiUrl + `/submit-application`;
    const headers = new HttpHeaders({
      accept: 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    });

    return this.http.post(apiUrl, formData, { headers });
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
