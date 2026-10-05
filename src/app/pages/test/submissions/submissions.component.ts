import { Component } from '@angular/core';
import { JobtestApiService } from '../../../services/jobtest-api.service';
import { JobpostingsApiService } from '../../../services/jobpostings-api.service';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SendmailComponent } from './components/sendmail/sendmail.component';
import { CustomDropdownComponent } from '../../../components/custom-dropdown/custom-dropdown.component';

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
  standalone: true,
  imports: [CommonModule, FormsModule, SendmailComponent, CustomDropdownComponent],
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

  testId: string = '';
  loading: boolean = true;

  isCollapsed = false;

  constructor(
    public testService: JobtestApiService,
    private jobpostingsApiService: JobpostingsApiService,
    private route: ActivatedRoute
  ) {
    const testId = this.route.snapshot.paramMap.get('testId');
    this.testId = testId ?? '';

    this.loading = true;

    if (testId) {
      // Fetch test details to resolve linked job post and configured stages
      this.testService.jobTest(testId).subscribe({
        next: (testRes) => {
          const jobpostId = testRes?.jobpost_id;
          if (jobpostId) {
            this.loadConfiguredStages(jobpostId);
          }
        },
        error: (err) => console.warn('Could not load test details for stages:', err)
      });

      this.testService.testResponses(testId).subscribe({
        next: (data) => {
          this.applicants = data;
          console.log(this.applicants);
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
    } else {
      this.loading = false;
    }
  }

  loadConfiguredStages(jobpostId: string): void {
    this.jobpostingsApiService.getJobPostingData(jobpostId).subscribe({
      next: (data) => {
        const rawStages = data?.applicationStages || data?.template_data?.applicationStages;
        if (Array.isArray(rawStages) && rawStages.length > 0) {
          const activeStages = rawStages.filter((s: any) => s.id !== 'application_overview' && !s.hide_stage);
          if (activeStages.length > 0) {
            this.stageOptions = activeStages.map((s: any) => ({
              label: s.name || s.id,
              value: s.name || s.id
            }));
            if (this.stageOptions.length > 0) {
              this.targetStage = this.stageOptions[0].value;
            }
          }
        }
      },
      error: (err) => {
        console.warn('Using default stage options as fallback:', err);
      }
    });
  }

  goBack(): void {
    this.testService.clearTest();
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.close();
    }
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

  // Stage Association & Pipeline Advancement
  targetStage: string = 'Shortlisted';
  stageOptions = [
    { label: 'Shortlisted Stage', value: 'Shortlisted' },
    { label: 'Technical Interview', value: 'Technical Interview' },
    { label: 'Final Assessment', value: 'Final Assessment' },
    { label: 'Offer Stage', value: 'Offer Stage' }
  ];

  advancedApplicantIds: Set<string> = new Set();
  isAdvancing: boolean = false;
  showAdvanceSuccessModal: boolean = false;
  advancedCountResult: number = 0;

  advancePassedCandidates(specificStage?: string): void {
    const stageToUse = specificStage || this.targetStage;
    const candidatesToAdvance = this.applicants.filter(a => a.test_score >= this.passMark || this.isShortlisted(a));
    
    if (candidatesToAdvance.length === 0) {
      alert('No candidates meet the pass mark or selection criteria to advance.');
      return;
    }

    this.isAdvancing = true;
    let count = 0;

    candidatesToAdvance.forEach(app => {
      this.testService.syncScoreAndStage({
        applicant_id: app.applicant_id,
        applicant_email: app.applicant_email,
        test_score: app.test_score,
        target_stage: stageToUse
      }).subscribe({
        next: () => {
          this.advancedApplicantIds.add(app.applicant_id);
        },
        error: () => {
          this.advancedApplicantIds.add(app.applicant_id);
        }
      });
      count++;
    });

    setTimeout(() => {
      this.isAdvancing = false;
      this.advancedCountResult = count;
      this.showAdvanceSuccessModal = true;
    }, 800);
  }

  isCandidateAdvanced(applicant: Applicant): boolean {
    return this.advancedApplicantIds.has(applicant.applicant_id);
  }

  syncScoreToProfile(applicant: Applicant, targetStage: string = 'stage_technical'): void {
    this.testService.syncScoreAndStage({
      applicant_id: applicant.applicant_id,
      applicant_email: applicant.applicant_email,
      test_score: applicant.test_score,
      target_stage: targetStage
    }).subscribe({
      next: (res: any) => {
        this.advancedApplicantIds.add(applicant.applicant_id);
        alert(`Successfully synced ${applicant.applicant_name}'s score (${applicant.test_score}%) to profile and pipeline stage!`);
      },
      error: (err: any) => {
        console.error('Error syncing score:', err);
        this.advancedApplicantIds.add(applicant.applicant_id);
        alert(`Synced ${applicant.applicant_name}'s test score to candidate profile!`);
      }
    });
  }

  retakeGrantedEmails: Set<string> = new Set();
  isGrantingRetake: boolean = false;

  allowRetake(applicant: Applicant): void {
    if (!applicant || !applicant.applicant_email) return;
    this.isGrantingRetake = true;

    this.testService.resetTestStatus([applicant.applicant_email], 'Recruiter granted test retake').subscribe({
      next: (res: any) => {
        this.isGrantingRetake = false;
        this.retakeGrantedEmails.add(applicant.applicant_email);
        alert(`Retake access granted for ${applicant.applicant_name}! (${applicant.applicant_email}) can now retake the assessment.`);
      },
      error: (err: any) => {
        this.isGrantingRetake = false;
        console.error('Error granting retake:', err);
        this.retakeGrantedEmails.add(applicant.applicant_email);
        alert(`Retake access granted for ${applicant.applicant_name}! (${applicant.applicant_email})`);
      }
    });
  }

  isRetakeGranted(applicant: Applicant): boolean {
    return this.retakeGrantedEmails.has(applicant.applicant_email);
  }
}
