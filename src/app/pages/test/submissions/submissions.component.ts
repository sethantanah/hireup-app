import { Component } from '@angular/core';
import { JobtestApiService } from '../../../services/jobtest-api.service';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SendmailComponent } from './components/sendmail/sendmail.component';

export interface TestResponse {
  question: string;
  response: string;
  correct_answer: string;
}

export interface Applicant {
  id: number;
  created_at: string;
  applicant_name: string;
  applicant_email: string;
  applicant_id: string;
  test_response: TestResponse[];
  test_id: string;
  test_score: number;
  shortlisted?: boolean;
}

interface FilterOption {
  label: string;
  value: string;
  icon: string;
}

@Component({
  selector: 'app-submissions',
  imports: [CommonModule, FormsModule, SendmailComponent],
  templateUrl: './submissions.component.html',
  styleUrl: './submissions.component.scss',
})
export class SubmissionsComponent {
  applicants: Applicant[] = [
    // {
    //   id: 17,
    //   created_at: '2025-02-14T15:44:42.264732+00:00',
    //   applicant_name: 'Vanessa Paintsil',
    //   applicant_email: '1vanessapaintsil11@gmail.com',
    //   applicant_id: '99b6c6ac-1c99-3348d2-8204-20bb2d284f0d',
    //   test_response: [
    //     {
    //       question: 'What is the motto/slogan of Safety Campaign Ghana',
    //       response:
    //         'b) Mentorship! Bridging the gap between experience and knowledge',
    //       correct_answer: 'a) The safety of one, is the safety of all',
    //     },
    //   ],
    //   test_id: '0db9639f-e520-4979-b600-e2120bc10923',
    //   test_score: 58,
    // },
    // {
    //   id: 137,
    //   created_at: '2025-02-14T15:44:42.264732+00:00',
    //   applicant_name: 'Vanessa Paintsil',
    //   applicant_email: '2vanessapaintsil11@gmail.com',
    //   applicant_id: '99b6c6ac-331c99-48d2-8204-20bb2d284f0d',
    //   test_response: [
    //     {
    //       question: 'What is the motto/slogan of Safety Campaign Ghana',
    //       response:
    //         'b) Mentorship! Bridging the gap between experience and knowledge',
    //       correct_answer: 'a) The safety of one, is the safety of all',
    //     },
    //   ],
    //   test_id: '0db9639f-e520-43y3979-b600-e212tr0bc10923',
    //   test_score: 58,
    // },
    // {
    //   id: 1537,
    //   created_at: '2025-02-14T15:44:42.264732+00:00',
    //   applicant_name: 'Vanessa Paintsil',
    //   applicant_email: '3vanessapaintsil11@gmail.com',
    //   applicant_id: '99b6c6ac-1c93389-48d2-8204-20bb2d284f0d',
    //   test_response: [
    //     {
    //       question: 'What is the motto/slogan of Safety Campaign Ghana',
    //       response:
    //         'b) Mentorship! Bridging the gap between experience and knowledge',
    //       correct_answer: 'a) The safety of one, is the safety of all',
    //     },
    //   ],
    //   test_id: '0db9639f-e520-4335979-b600-e2120bc10923',
    //   test_score: 58,
    // },
    // {
    //   id: 1327,
    //   created_at: '2025-02-14T15:44:42.264732+00:00',
    //   applicant_name: 'Vanessa Paintsil',
    //   applicant_email: '4vanessapaintsil11@gmail.com',
    //   applicant_id: '99b6c6ac-133345c99-48d2-8204-20bb2d284f0d',
    //   test_response: [
    //     {
    //       question: 'What is the motto/slogan of Safety Campaign Ghana',
    //       response:
    //         'b) Mentorship! Bridging the gap between experience and knowledge',
    //       correct_answer: 'a) The safety of one, is the safety of all',
    //     },
    //   ],
    //   test_id: '0db9639f-e520-4979-b600-e2120bc10923',
    //   test_score: 58,
    // },
    // {
    //   id: 1357,
    //   created_at: '2025-02-14T15:44:42.264732+00:00',
    //   applicant_name: 'Vanessa Paintsil',
    //   applicant_email: '5vanessapaintsil11@gmail.com',
    //   applicant_id: '99b6c6ac-1c99-48drt2-8204-20bb2d284f0d',
    //   test_response: [
    //     {
    //       question: 'What is the motto/slogan of Safety Campaign Ghana',
    //       response:
    //         'b) Mentorship! Bridging the gap between experience and knowledge',
    //       correct_answer: 'a) The safety of one, is the safety of all',
    //     },
    //   ],
    //   test_id: '0db9639f-e520-4979-b600-e2120bc10923',
    //   test_score: 58,
    // },
  ];

  shortListedApplicantsData: Applicant[] = [];

  filterOptions: FilterOption[] = [
    { label: 'All', value: 'all', icon: 'fas fa-list' },
    { label: 'Passed', value: 'passed', icon: 'fas fa-check-circle' },
    { label: 'Failed', value: 'failed', icon: 'fas fa-times-circle' },
  ];

  searchTerm: string = '';
  filter: string = 'all';

  showResponsesModal = false;
  selectedApplicant: Applicant | null = null;
  showShortlistPopup = false;
  shortlistCount = 0;
  passMark = 80;

  showPassMarkModal = false;
  newPassMark = 70;

  loading: boolean = true;

  isCollapsed = false;

  constructor(
    public testService: JobtestApiService,
    private route: ActivatedRoute
  ) {
    const testId = this.route.snapshot.paramMap.get('testId');

    this.loading = true;
    // setTimeout(() => {
    //   this.loading = false;
    // }, 1000);

    
    this.testService.testResponses(testId ?? '').subscribe({
      next: (data) => {
        this.applicants = data;
        this.applicants.forEach((app) => {
          if (app.test_score >= this.passMark) {
            this.shortlistedApplicants.add(app.id);
            this.shortlistCount = this.shortlistedApplicants.size;
          }
        });

        this.loading = false;
      },
      error: (error) => {
        this.loading = false;
      },
    });
  }

  get searchFilteredApplicants() {
    return this.applicants.filter((applicant) => {
      const searchLower = this.searchTerm.toLowerCase();
      return (
        applicant.applicant_name.toLowerCase().includes(searchLower) ||
        applicant.applicant_email.toLowerCase().includes(searchLower) ||
        applicant.test_score.toString().includes(searchLower)
      );
    });
  }

  openResponsesModal(applicant: Applicant) {
    this.selectedApplicant = applicant;
    this.showResponsesModal = true;
  }

  closeResponsesModal() {
    this.showResponsesModal = false;
    this.selectedApplicant = null;
  }

  get filteredApplicants() {
    if (this.filter === 'passed') {
      return this.applicants.filter((a) => a.test_score >= this.passMark);
    } else if (this.filter === 'failed') {
      return this.applicants.filter((a) => a.test_score < this.passMark);
    } else if (this.searchTerm.length > 0) {
      return this.applicants.filter((applicant) => {
        const searchLower = this.searchTerm.toLowerCase();
        return (
          applicant.applicant_name.toLowerCase().includes(searchLower) ||
          applicant.applicant_email.toLowerCase().includes(searchLower) ||
          applicant.test_score.toString().includes(searchLower)
        );
      });
    } else {
      return this.applicants;
    }
  }

  openShortlistPopup() {
    this.showShortlistPopup = true;
  }

  closeShortlistPopup() {
    this.showShortlistPopup = false;
  }

  get passedCount() {
    return this.applicants.filter((a) => a.test_score >= this.passMark).length;
  }

  shortlistedApplicants: Set<number> = new Set();

  toggleShortlist(applicant: Applicant): void {
    if (this.shortlistedApplicants.has(applicant.id)) {
      this.shortlistedApplicants.delete(applicant.id);
    } else {
      this.shortlistedApplicants.add(applicant.id);
    }
    this.shortlistCount = this.shortlistedApplicants.size;
  }

  isShortlisted(applicant: Applicant): boolean {
    return this.shortlistedApplicants.has(applicant.id);
  }

  openPassMarkModal(): void {
    this.newPassMark = this.passMark;
    this.showPassMarkModal = true;
  }

  closePassMarkModal(): void {
    this.showPassMarkModal = false;
  }

  updatePassMark(): void {
    this.passMark = this.newPassMark;
    this.closePassMarkModal();
    // Recalculate passed/failed counts
    this.calculatePassedCount();

    this.shortlistedApplicants.clear();
    this.applicants.forEach((app) => {
      if (app.test_score >= this.passMark) {
        this.shortlistedApplicants.add(app.id);
        this.shortlistCount = this.shortlistedApplicants.size;
      }
    });
  }

  getPassCountForMark(mark: number): number {
    return this.applicants.filter((a) => a.test_score >= mark).length;
  }

  calculatePassedCount(): void {
    // this.passedCount = this.getPassCountForMark(this.passMark);
  }

  confirmShortlist() {
    const count = Math.min(
      this.shortlistCount || 0,
      this.shortlistedApplicants.size
    );

    let shortlistIds: string[] = [];
    if (this.shortlistCount <= this.shortlistedApplicants.size) {
      this.shortListedApplicantsData = this.applicants
        .filter((applicant) => this.shortlistedApplicants.has(applicant.id))
        .slice(0, count);
    } else {
      this.shortListedApplicantsData = this.applicants.slice(
        0,
        this.shortlistCount
      );
    }

    this.shortlistedApplicants.clear();
    this.shortListedApplicantsData.forEach((app) => {
      this.shortlistedApplicants.add(app.id);
      shortlistIds.push(app.applicant_id);
    });

    this.openEmailSender();
  }

  showEmailSender = false;

  getShortlistedEmails(): string[] {
    return this.shortListedApplicantsData
      .filter((applicant) => this.shortlistedApplicants.has(applicant.id))
      .map((a) => a.applicant_email);
  }

  getNotShortlistedEmails(): string[] {
    return this.applicants
      .filter((applicant) => !this.shortlistedApplicants.has(applicant.id))
      .map((a) => a.applicant_email);
  }

  openEmailSender(): void {
    this.showShortlistPopup = false;
    this.showEmailSender = true;
  }
}
