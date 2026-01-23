import {
  Component,
  Input,
  OnInit,
  OnDestroy,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Subject, takeUntil, catchError, finalize } from 'rxjs';

// Services
import { ApiService } from '../../../../services/api.service';
import { DataService } from '../../../../services/data.service';
import { ApplicantManagementService } from '../../../../services/applicant-management.service';

// Models
import { Candidate, FormData } from '../../models/candidate.model';
import { JobPostData } from '../../../../models/jobpost.model';

// Components
import { CandidateDetailsComponent } from '../candidate-details/candidate-details.component';
import { CandidateFiltersComponent } from '../candidate-filters/candidate-filters.component';
import { EmailsComponent } from '../notifications/emails/emails.component';

// Constants
export const COMMON_FORM_FIELDS: readonly string[] = ['full_name', 'first_name', 'last_name'] as const;

export type ViewMode = 'cards' | 'table' | 'list';
export type SortOption = 'score' | 'experience' | 'name' | 'date';

interface CandidateFilters {
  search: string;
  availability: string;
  yearsOfExperience: number;
  education: string;
  dateOfBirth: string;
  highestDegree: string;
  fieldOfStudy: string;
  institutionName: string;
  yearOfGraduation: string;
  skills: string[];
  certifications: string[];
}

interface AdvanceFilters {
  search: string;
  educationDegree: string;
  projects: string;
  skills: string;
}

@Component({
  selector: 'app-shortlisted',
  imports: [
    CommonModule,
    CandidateDetailsComponent,
    CandidateFiltersComponent,
    EmailsComponent,
  ],
  templateUrl: './shortlisted.component.html',
  styleUrl: './shortlisted.component.scss',
})
export class ShortlistedComponent implements OnInit, OnDestroy {
  // Component state
  @Input() applicationData: JobPostData | undefined;

  candidates: Candidate[] = [];
  filteredCandidates: Candidate[] = [];
  isLoading = true;
  isUpdating = false;
  viewMode: ViewMode = 'cards';
  openEmailingPopup = false;

  // Filters
  filters: CandidateFilters = {
    search: '',
    availability: '',
    yearsOfExperience: 0,
    education: '',
    dateOfBirth: '',
    highestDegree: '',
    fieldOfStudy: '',
    institutionName: '',
    yearOfGraduation: '',
    skills: [],
    certifications: [],
  };

  advanceFilters: AdvanceFilters = {
    search: '',
    educationDegree: '',
    projects: '',
    skills: '',
  };

  private relevantFields: string[] = [...COMMON_FORM_FIELDS];
  filteredFields: string[] = [...COMMON_FORM_FIELDS];

  emailsList: string[] = [];

  showMobileActions = false;
  searchTerm = '';
  sortBy: SortOption = 'score';

  // Private members
  private destroy$ = new Subject<void>();

  constructor(
    private apiService: ApiService,
    public dataService: DataService,
    private route: ActivatedRoute,
    private applicantService: ApplicantManagementService,
    private cdr: ChangeDetectorRef
  ) { }

  // Lifecycle hooks
  ngOnInit(): void {
    this.initializeComponent();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Initialization
  private initializeComponent(): void {
    const jobPostId = this.route.snapshot.paramMap.get('jobId');

    if (jobPostId) {
      this.loadShortlistedCandidates(jobPostId);
    }

    if (this.applicationData) {
      this.relevantFields = Array.isArray(this.applicationData.cardSettings)
        ? [...this.applicationData.cardSettings]
        : [...COMMON_FORM_FIELDS];

      this.filteredFields = Array.isArray(this.applicationData.searchFilterSettings)
        ? [...this.applicationData.searchFilterSettings]
        : [...COMMON_FORM_FIELDS];
    }
  }

  private loadShortlistedCandidates(jobPostId: string): void {
    this.isLoading = true;
    const stageId = this.route.snapshot.paramMap.get('stageId') || '';
    this.applicantService.getApplicantsByStage(jobPostId, stageId.replace("stage_", ""), 'shortlisted')
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          console.error('Error loading shortlisted candidates:', error);
          return [];
        }),
        finalize(() => {
          this.isLoading = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (data) => {
          this.candidates = data as Candidate[];
          this.filteredCandidates = [...this.candidates];
          this.extractEmailsList();
          this.sortCandidates();
          this.dataService.totalShortListedCandidates = this.candidates.length;
          this.dataService.saveShortlistedCandidates(this.candidates);
        }
      });
  }

  refreshData(): void {
    const jobPostId = this.route.snapshot.paramMap.get('jobId');

    if (jobPostId) {
      this.loadShortlistedCandidates(jobPostId);
    }
  }

  // Candidate operations
  isShortlisted(candidate: Candidate): boolean {
    return this.dataService.shortlistedCandidates.some(c => c.id === candidate.id);
  }

  toggleShortlist(candidate: Candidate): void {
    if (this.isShortlisted(candidate)) {
      this.dataService.shortlistedCandidates =
        this.dataService.shortlistedCandidates.filter(c => c.id !== candidate.id);
    } else {
      this.dataService.shortlistedCandidates.push(candidate);
    }
  }

  removeFromShortList(candidate: Candidate): void {
    const jobPostId = this.route.snapshot.paramMap.get('jobId');

    if (!jobPostId) {
      console.error('No job post ID found');
      return;
    }

    this.isUpdating = true;

    this.apiService.removeListCandidates([candidate.id], jobPostId)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isUpdating = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: () => {
          // Remove candidate from local arrays
          this.candidates = this.candidates.filter(c => c.id !== candidate.id);
          this.filteredCandidates = this.filteredCandidates.filter(c => c.id !== candidate.id);
          this.dataService.totalShortListedCandidates -= 1;
          this.dataService.totalCandidates += 1;
          this.extractEmailsList();
        },
        error: (error) => {
          console.error('Error removing candidate from shortlist:', error);
          // Show user-friendly error message
          alert('An error occurred while updating!');
        }
      });
  }

  // UI operations
  toggleMobileActions(): void {
    this.showMobileActions = !this.showMobileActions;
  }

  toggleFilters(): void {
    this.dataService.showFilters = false;
  }

  toggleEmailingPopup(): void {
    this.dataService.openEmailPopUp = true;
  }

  viewShortlist(): void {
    this.dataService.openShortList = true;
  }

  viewDetails(candidate: Candidate): void {
    this.dataService.candidate = candidate;
    this.dataService.openCandidateDetails = true;
  }

  // Search and filtering
  onSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchTerm = input.value.trim();
    this.filterCandidates();
  }

  onSortChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.sortBy = select.value as SortOption;
    this.sortCandidates();
  }

  filterCandidates(): void {
    if (!this.searchTerm.trim()) {
      this.filteredCandidates = [...this.candidates];
    } else {
      // Implement search logic based on your requirements
      // Currently commented out in original code
      this.filteredCandidates = [...this.candidates]; // Placeholder
    }
    this.sortCandidates();
  }

  sortCandidates(): void {
    this.filteredCandidates.sort((a, b) => {
      switch (this.sortBy) {
        case 'score':
          return this.getCandidateScore(b) - this.getCandidateScore(a);
        case 'experience':
          return (this.getExperience(b) || 0) - (this.getExperience(a) || 0);
        case 'name':
          return this.getDisplayName(a).localeCompare(this.getDisplayName(b));
        case 'date':
          const dateA = new Date(a.created_at || 0).getTime();
          const dateB = new Date(b.created_at || 0).getTime();
          return dateB - dateA;
        default:
          return 0;
      }
    });
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.filteredCandidates = [...this.candidates];
    this.sortCandidates();
  }

  // Filter handlers
  onFilterChange(filters: CandidateFilters): void {
    this.filters = filters;
    this.applyFilters();
  }

  private applyFilters(): void {
    this.filteredCandidates = this.candidates.filter(candidate =>
      this.matchesAllFilters(candidate, this.filters)
    );
    this.sortCandidates();
  }

  private matchesAllFilters(candidate: Candidate, filters: CandidateFilters): boolean {
    const { form_data, resume_data } = candidate;
    const data = form_data && Object.keys(form_data).length > 0
      ? form_data
      : (resume_data?.personal_details || {});

    for (const [key, filterValue] of Object.entries(filters)) {
      if (!filterValue || filterValue.toString().trim() === '') {
        continue;
      }

      let fieldValue = (data as FormData)[key]?.value || (data as FormData)[key];

      if (!fieldValue && resume_data) {
        fieldValue = this.findInResumeData(resume_data, key);
      }

      if (!this.matchesFilter(fieldValue, filterValue)) {
        return false;
      }
    }

    return true;
  }

  private matchesFilter(fieldValue: any, filterValue: any): boolean {
    if (fieldValue === null || fieldValue === undefined) {
      return false;
    }

    if (typeof fieldValue === 'string') {
      return fieldValue.toLowerCase().includes(filterValue.toString().toLowerCase());
    }

    if (Array.isArray(filterValue)) {
      if (Array.isArray(fieldValue)) {
        return filterValue.some(fv =>
          fieldValue.some(f => f.toString().toLowerCase().includes(fv.toString().toLowerCase()))
        );
      }
      return filterValue.some(fv =>
        fieldValue.toString().toLowerCase().includes(fv.toString().toLowerCase())
      );
    }

    return fieldValue.toString() === filterValue.toString();
  }

  onAdvanceFilterChange(filters: AdvanceFilters): void {
    this.advanceFilters = filters;
    this.applyAdvanceFilters();
  }

  private applyAdvanceFilters(): void {
    this.filteredCandidates = this.candidates.filter(candidate =>
      this.matchesAdvanceFilters(candidate)
    );
    this.sortCandidates();
  }

  private matchesAdvanceFilters(candidate: Candidate): boolean {
    const { resume_data } = candidate;

    // Search in entire candidate object
    const jsonString = JSON.stringify(candidate, (key, value) =>
      typeof value === 'function' ? undefined : value
    )?.toLowerCase() || '';

    const searchMatch = !this.advanceFilters.search ||
      jsonString.includes(this.advanceFilters.search.toLowerCase());

    // Skills filter
    const skillsMatch = !this.advanceFilters.skills ||
      this.advanceFilters.skills.split(',').every(skill =>
        resume_data?.skills?.technical_skills?.some((s: string) =>
          s.toLowerCase().includes(skill.trim().toLowerCase())
        )
      );

    // Education filter
    const educationMatch = !this.advanceFilters.educationDegree ||
      resume_data?.education?.some((edu: any) =>
        edu.degree?.toLowerCase().includes(this.advanceFilters.educationDegree.toLowerCase())
      );

    // Projects filter
    const projectsMatch = !this.advanceFilters.projects ||
      resume_data?.projects?.some((project: any) =>
        project.name?.toLowerCase().includes(this.advanceFilters.projects.toLowerCase())
      );

    return searchMatch && skillsMatch && educationMatch && projectsMatch;
  }

  onFilterByIds(filterIds: string[]): void {
    this.candidates = this.candidates.filter(candidate => !filterIds.includes(candidate.id));
    this.filteredCandidates = this.filteredCandidates.filter(candidate => !filterIds.includes(candidate.id));
    this.extractEmailsList();
    this.dataService.saveShortlistedCandidates(this.candidates);
  }

  // Helper methods
  private findInResumeData(resumeData: any, key: string): any {
    if (!resumeData) return undefined;

    // Try direct access first
    if (resumeData[key] !== undefined) {
      return resumeData[key];
    }

    // Search recursively
    for (const section in resumeData) {
      if (typeof resumeData[section] === 'object' && resumeData[section] !== null) {
        if (Array.isArray(resumeData[section])) {
          for (const item of resumeData[section]) {
            if (item && item[key] !== undefined) {
              return item[key];
            }
          }
        } else if (resumeData[section][key] !== undefined) {
          return resumeData[section][key];
        }
      }
    }

    return undefined;
  }

  // Email extraction
  private extractEmailsList(): void {
    const emails = new Set<string>();

    this.candidates.forEach(candidate => {
      // Extract from form_data
      if (candidate.form_data?.['email']?.value && typeof candidate.form_data['email'].value === 'string') {
        emails.add(candidate.form_data['email'].value);
      }

      // Extract from resume_data
      if (candidate.resume_data?.personal_details?.email) {
        emails.add(candidate.resume_data.personal_details.email);
      }
    });

    this.emailsList = Array.from(emails);
    this.dataService.emailsList = this.emailsList;
  }

  // Candidate data extraction
  getDisplayName(candidate: any): string {
    if (candidate.resume_data?.personal_details?.full_name) {
      return candidate.resume_data.personal_details.full_name;
    }

    if (candidate.form_data) {
      const nameFields = ['full_name', 'first_name', 'last_name', 'name'];
      for (const field of nameFields) {
        if (candidate.form_data[field]?.value) {
          return candidate.form_data[field].value;
        }
      }
    }

    return 'N/A';
  }

  getExperience(candidate: any): number {
    if (candidate.form_data?.years_of_experience?.value) {
      const exp = Number(candidate.form_data.years_of_experience.value);
      return isNaN(exp) ? 0 : exp;
    }
    return 0;
  }

  getLocation(candidate: any): string {
    return candidate.location || candidate.form_data?.location?.value || 'Remote';
  }

  getRelevantFields(formData: any): any[] {
    return Object.entries(formData)
      .filter(([key]) => this.relevantFields.includes(key))
      .map(([key, value]) => ({ key, value }));
  }

  getTopFields(formData: any, limit: number): any[] {
    const fields = this.getRelevantFields(formData);
    const importantFields = ['current_role', 'education', 'phone', 'linkedin'];

    const sortedFields = fields.sort((a, b) => {
      const aImportance = importantFields.includes(a.key) ? 1 : 0;
      const bImportance = importantFields.includes(b.key) ? 1 : 0;
      return bImportance - aImportance;
    });

    return sortedFields.slice(0, limit);
  }

  formatFieldName(fieldName: string): string {
    return fieldName
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  // Analytics methods
  getLastUpdateTime(): string {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    return `${hours}:${minutes < 10 ? '0' : ''}${minutes}`;
  }

  getAverageScore(): number {
    if (this.candidates.length === 0) return 0;

    const total = this.candidates.reduce((sum, candidate) => {
      return sum + this.getCandidateScore(candidate);
    }, 0);

    return Math.round(total / this.candidates.length);
  }

  calculateCandidateScore(candidate: any): number {
    let score = 0;

    // Experience scoring
    const experience = this.getExperience(candidate);
    score += Math.min(experience * 5, 30);

    // Skills scoring
    const skills = this.getSkills(candidate);
    score += Math.min(skills.length * 3, 40);

    // Education scoring
    if (candidate.resume_data?.education?.length > 0 || candidate.form_data?.education?.value) {
      score += 20;
    }

    // References scoring
    if (candidate.resume_data?.references?.length > 0 || candidate.form_data?.references?.value) {
      score += 10;
    }

    return Math.min(score, 100);
  }

  getCandidateScore(candidate: any): number {
    return candidate.score || this.calculateCandidateScore(candidate);
  }

  getAverageExperience(): number {
    if (this.candidates.length === 0) return 0;

    const total = this.candidates.reduce((sum, candidate) => {
      return sum + this.getExperience(candidate);
    }, 0);

    return Math.round(total / this.candidates.length);
  }

  getSkills(candidate: any): string[] {
    if (candidate.resume_data?.skills) {
      return [
        ...(candidate.resume_data.skills.technical_skills || []),
        ...(candidate.resume_data.skills.soft_skills || [])
      ];
    }

    if (candidate.form_data?.skills?.value) {
      return candidate.form_data.skills.value.split(',').map((s: string) => s.trim());
    }

    return [];
  }

  getSkillsMatchRate(): number {
    // Implement actual skills matching logic based on job requirements
    // For now, return a placeholder value
    return 85;
  }

  getReviewReadyCount(): number {
    return this.candidates.filter(candidate =>
      this.getCandidateScore(candidate) >= 70
    ).length;
  }

  // Action methods
  exportShortlist(): void {
    console.log('Exporting shortlist...');
    // Implement export logic
  }

  bulkActions(): void {
    console.log('Opening bulk actions...');
    // Implement bulk actions logic
  }

  navigateToCandidates(): void {
    console.log('Navigating to all candidates...');
    // Implement navigation logic
  }
}