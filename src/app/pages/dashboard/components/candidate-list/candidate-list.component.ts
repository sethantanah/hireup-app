import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
  ViewChild,
  ElementRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil, catchError, finalize, forkJoin, of } from 'rxjs';

// Services
import { ApiService } from '../../../../services/api.service';
import { DataService } from '../../../../services/data.service';
import { ApplicantManagementService } from '../../../../services/applicant-management.service';

// Models
import { Candidate, FormData } from '../../models/candidate.model';
import { JobPostData } from '../../../../models/jobpost.model';

// Components
import { ShortlistPopupComponent } from '../shortlist-popup/shortlist-popup.component';
import { CandidateDetailsComponent } from '../candidate-details/candidate-details.component';
import { CandidateFiltersComponent } from '../candidate-filters/candidate-filters.component';
import { BulkDocumentUploadsComponent } from '../../../job-posts/manager/components/data-uploads/bulk-document-uploads/bulk-document-uploads.component';
import { TableColumn, TableConfig, TableViewComponent } from '../table-view/table-view.component';
import { EmailsComponent } from '../notifications/emails/emails.component';
import { LoaderComponent } from '../../../components/loader/loader.component';

// Constants - Use explicit typing to avoid inference issues
export const COMMON_FORM_FIELDS: readonly string[] = ['full_name', 'email'] as const;

export type ViewMode = 'table' | 'cards';
export type PopupType = 'success' | 'error';

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

interface FormField {
  label: string;
  type?: string;
  value?: any;
  [key: string]: any;
}

@Component({
  selector: 'app-candidate-list',
  imports: [
    CommonModule,
    ShortlistPopupComponent,
    CandidateDetailsComponent,
    CandidateFiltersComponent,
    BulkDocumentUploadsComponent,
    TableViewComponent,
    EmailsComponent,
    LoaderComponent,
  ],
  templateUrl: './candidate-list.component.html',
  styleUrl: './candidate-list.component.scss',
})
export class CandidateListComponent implements OnInit, OnDestroy {
  // Component state
  @Input() applicationData: JobPostData | undefined;
  @Output() navigateSection = new EventEmitter<string>();

  candidates: Candidate[] = [];
  filteredCandidates: Candidate[] = [];
  candidatesPaginated: Candidate[] = []
  isLoading = true;
  shortlistingCandidateIds: Set<string> = new Set<string>();
  viewMode: string = 'cards';
  jobPostId?: string;

  showPopup = false;
  popupMessage = '';
  popupType: PopupType = 'success';

  showMobileActions = false;
  currentPage = 1;
  pageSize = 12;
  totalPages = 0;
  searchTerm = '';

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

  // Table configuration
  tableConfig: TableConfig = {
    showExport: true,
    showColumnToggle: true,
    showSearch: true,
    striped: true,
    hover: true,
    condensed: false
  };

  tableColumns: TableColumn[] = [
    {
      key: 'resume_data.skills.technical_skills',
      label: 'Skills',
      sortable: false,
      filterable: true,
      width: '300px',
      type: 'array'
    },
    {
      key: 'resume_data.skills.soft_skills',
      label: 'Soft Skills',
      sortable: false,
      filterable: true,
      width: '300px',
      type: 'array'
    },
    {
      key: 'resume_data.work_experience',
      label: 'Work Experience',
      sortable: false,
      filterable: true,
      width: '300px',
      type: 'array'
    }
  ];

  // State management
  filteredData: any[] = [];
  selectedData: any[] = [];

  // Private members
  private destroy$ = new Subject<void>();
  private readonly POPUP_DISPLAY_TIME = 10000;

  @ViewChild('searchInput', { static: false }) searchInput?: ElementRef<HTMLInputElement>;

  constructor(
    private applicantService: ApplicantManagementService,
    public dataService: DataService,
    private route: ActivatedRoute,
    private router: Router,
    private apiService: ApiService,
    private cdr: ChangeDetectorRef
  ) { }

  navigateToAssessmentCenter(): void {
    if (this.jobPostId) {
      this.router.navigate(['/jobposts/tests', this.jobPostId]);
    }
  }

  // Getters
  get tableData(): any[] {
    return [this.filteredCandidates];
  }

  get totalRecords(): number {
    return this.tableData.length;
  }

  get filteredRecords(): number {
    return this.filteredData.length;
  }

  get selectedRecords(): number {
    return this.selectedData.length;
  }

  get unshotlistedCount(): number {
    return this.filteredCandidates?.filter(candidate => {
      return this.getCandidateStatusRaw(candidate) !== "unshortlisted"
    }).length;
  }

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
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const jobPostId = params.get('jobId') || this.route.snapshot.paramMap.get('jobId') || '';
      this.jobPostId = jobPostId;
      this.dataService.saveJobId(jobPostId);

      if (jobPostId) {
        this.loadCandidates(jobPostId);
      }
    });

    this.dataService.shortlistUpdated$
      .pipe(takeUntil(this.destroy$))
      .subscribe(event => {
        if (this.jobPostId && event.jobId && event.jobId !== this.jobPostId) return;

        if (event.action === 'shortlist') {
          // Remove shortlisted candidates from pending pool list
          this.candidates = this.candidates.filter(c => !event.candidateIds.includes(c.id));
          this.filteredCandidates = this.filteredCandidates.filter(c => !event.candidateIds.includes(c.id));
          this.dataService.totalCandidates = this.candidates.length;
          this.calculatePagination();
        } else if (event.action === 'unshortlist') {
          // Update status to unshortlisted and sort candidates to bottom
          event.candidateIds.forEach(id => {
            const cand = this.candidates.find(c => c.id === id);
            if (cand) {
              if (!cand.application_stages) cand.application_stages = {};
              const stageName = (this.route.snapshot.paramMap.get('stageId') || 'application_review').replace('stage_', '');
              cand.application_stages[stageName] = { status: 'unshortlisted' };
              (cand as any).status = 'unshortlisted';
            }
          });
          this.candidates = this.sortCandidatesByState(this.candidates);
          this.filterCandidates();
        }
        this.cdr.markForCheck();
      });

    if (this.applicationData) {
      // Handle potential undefined values safely
      this.relevantFields = Array.isArray(this.applicationData.cardSettings)
        ? [...this.applicationData.cardSettings]
        : [...COMMON_FORM_FIELDS];

      this.filteredFields = Array.isArray(this.applicationData.searchFilterSettings)
        ? [...this.applicationData.searchFilterSettings]
        : [...COMMON_FORM_FIELDS];

      this.dataService.selectedCardFields = this.relevantFields;
    }

    this.calculatePagination();
  }

  getCandidateStatusGroupWeight(candidate: Candidate): number {
    const raw = this.getCandidateStatusRaw(candidate);
    if (raw === 'unshortlisted' || raw === 'rejected' || raw === 'unsuccessful') {
      return 2; // Bottom: rejected / unshortlisted
    }
    if (raw === 'shortlisted' || raw === 'completed' || raw === 'approved' || raw === 'successful') {
      return 1; // Middle: shortlisted
    }
    return 0; // Top: no state yet / pending / new
  }

  sortCandidatesByState(candidates: Candidate[]): Candidate[] {
    if (!Array.isArray(candidates)) return [];
    return [...candidates].sort((a, b) => {
      const weightA = this.getCandidateStatusGroupWeight(a);
      const weightB = this.getCandidateStatusGroupWeight(b);
      if (weightA !== weightB) {
        return weightA - weightB;
      }
      const timeA = new Date(a.created_at || a.submitted_at || 0).getTime();
      const timeB = new Date(b.created_at || b.submitted_at || 0).getTime();
      if (timeA !== timeB) return timeB - timeA;
      return String(b.id || '').localeCompare(String(a.id || ''), undefined, { numeric: true });
    });
  }

  private loadCandidates(jobPostId: string): void {
    this.isLoading = true;
    const stageId = this.route.snapshot.paramMap.get('stageId') || '';
    const cleanStage = stageId.replace("stage_", "");

    forkJoin({
      pending: this.applicantService.getApplicantsByStage(jobPostId, cleanStage, 'pending').pipe(
        catchError(error => {
          console.error('Error loading pending candidates:', error);
          return of([]);
        })
      ),
      unshortlisted: this.applicantService.getApplicantsByStage(jobPostId, cleanStage, 'unshortlisted').pipe(
        catchError(error => {
          console.error('Error loading unshortlisted candidates:', error);
          return of([]);
        })
      )
    })
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isLoading = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (res) => {
          const pending = (res.pending as Candidate[]) || [];
          const unshortlisted = (res.unshortlisted as Candidate[]) || [];
          const existingIds = new Set(pending.map(c => c.id));
          const uniqueUnshortlisted = unshortlisted.filter(c => c.id && !existingIds.has(c.id));

          uniqueUnshortlisted.forEach(c => {
            if (!c.application_stages) c.application_stages = {};
            if (!c.application_stages[cleanStage]) {
              c.application_stages[cleanStage] = { status: 'unshortlisted' };
            }
            (c as any).status = 'unshortlisted';
          });

          const combined = [...pending, ...uniqueUnshortlisted];
          this.candidates = this.sortCandidatesByState(combined);
          this.filteredCandidates = [...this.candidates];
          this.updateTableColumns();
          this.dataService.totalCandidates = this.candidates.length;
          this.calculatePagination();
        },
        error: (err) => {
          console.error('Error in forkJoin loading candidates:', err);
          this.showPopupMessage('Failed to load candidates', 'error');
          this.candidates = [];
          this.filteredCandidates = [];
        }
      });
  }

  private updateTableColumns(): void {
    if (this.applicationData?.formData) {
      const dynamicColumns = this.buildDynamicColumns(this.applicationData.formData);
      this.tableColumns = [...dynamicColumns, ...this.tableColumns];
    }
  }

  // Table column builder
  buildDynamicColumns(formData: any): TableColumn[] {
    if (!formData?.fields || !Array.isArray(formData.fields)) {
      return [];
    }

    return formData.fields
      .filter((field: any) =>
        !field.label?.toString().toLowerCase().includes('resume') &&
        !field.label?.toString().toLowerCase().includes('cv')
      )
      .map((field: any) => {
        const label = field.label?.toString() || 'Unnamed Field';
        const fieldKey = label.toLowerCase().replaceAll(' ', '_');

        return {
          key: `form_data.${fieldKey}.value`,
          label,
          sortable: true,
          filterable: true,
          width: '200px',
          type: field.type || 'text'
        };
      });
  }

  // Candidate operations
  isShortlistingCandidate(candidateId: string): boolean {
    return this.shortlistingCandidateIds.has(candidateId);
  }

  toggleShortlist(candidate: Candidate): void {
    if (!candidate || !candidate.id) return;
    this.shortlistingCandidateIds.add(candidate.id);

    const isShortlisted = this.isShortlisted(candidate);

    if (isShortlisted) {
      this.dataService.shortlistedCandidates =
        this.dataService.shortlistedCandidates.filter(c => c.id !== candidate.id);
    } else {
      if (!this.dataService.shortlistedCandidates.some(c => c.id === candidate.id)) {
        this.dataService.shortlistedCandidates.push(candidate);
      }
    }

    this.saveShortListingDB(candidate.id);
  }

  isShortlisted(candidate: Candidate): boolean {
    return this.getCandidateStatusRaw(candidate) === 'shortlisted';
  }

  saveShortListing(data: Candidate[]): void {
    for (const candidate of data) {
      if (!this.isShortlisted(candidate)) {
        this.toggleShortlist(candidate);
      }
    }
  }

  saveShortListingDB(targetCandidateId?: string): void {
    const selectedCands = this.dataService.shortlistedCandidates;
    const ids = selectedCands.map(candidate => candidate.id).filter(Boolean);

    if (ids.length === 0 || !this.jobPostId) {
      if (targetCandidateId) {
        this.shortlistingCandidateIds.delete(targetCandidateId);
      }
      this.showPopupMessage('No candidates selected for shortlisting', 'error');
      return;
    }

    const initaillyRejectedIds = selectedCands
      .filter(candidate => {
        const raw = this.getCandidateStatusRaw(candidate);
        return raw === 'unshortlisted' || raw === 'rejected';
      })
      .map(candidate => candidate.id);

    const shortListIds = selectedCands
      .filter(candidate => {
        const raw = this.getCandidateStatusRaw(candidate);
        return raw !== 'unshortlisted' && raw !== 'rejected';
      })
      .map(candidate => candidate.id);

    const shortListData = { shortlisted: shortListIds, was_rejected: initaillyRejectedIds };

    const stageId = this.route.snapshot.paramMap.get('stageId') || 'stage_application_review';
    const stageName = stageId.replace('stage_', '');

    this.apiService.shortListCandidates(shortListData, this.jobPostId, stageName)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          if (targetCandidateId) {
            this.shortlistingCandidateIds.delete(targetCandidateId);
          } else {
            this.shortlistingCandidateIds.clear();
          }
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: () => {
          this.showPopupMessage('Candidate shortlisted successfully!', 'success');
          this.dataService.shortlistedCandidates = [];

          // Remove shortlisted candidates from the active pending pool list
          this.candidates = this.candidates.filter(c => !ids.includes(c.id));
          this.filteredCandidates = this.filteredCandidates.filter(c => !ids.includes(c.id));

          this.dataService.totalShortListedCandidates += ids.length;
          this.dataService.totalCandidates = Math.max(0, this.dataService.totalCandidates - ids.length);

          // Emit event to auto-refresh all event listeners across the app
          this.dataService.notifyShortlistUpdate('shortlist', ids, this.jobPostId, stageName);

          this.calculatePagination();
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Shortlisting failed:', error);
          this.showPopupMessage('Candidate shortlisting failed!', 'error');
        }
      });
  }

  saveUnShortListingDB(candidateIds?: Candidate[]): void {
    const ids = candidateIds?.filter(candidate =>
      this.getCandidateStatusRaw(candidate) !== "unshortlisted"
    ).map(candidate => candidate.id) || this.filteredCandidates.filter(candidate =>
      this.getCandidateStatusRaw(candidate) !== "unshortlisted"
    ).map(candidate => candidate.id);

    if (ids.length === 0 || !this.jobPostId) {
      this.showPopupMessage('No candidates selected for shortlisting', 'error');
      return;
    }

    const stageId = this.route.snapshot.paramMap.get('stageId') || 'stage_application_review';
    const stageName = stageId.replace('stage_', '');

    this.apiService.rejectCandidates(ids, this.jobPostId, stageName)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.showPopupMessage('Candidates unshortlisted successfully!', 'success');

          // Auto update candidate state in-memory without hitting DB
          ids.forEach(id => {
            const cand = this.candidates.find(c => c.id === id);
            if (cand) {
              if (!cand.application_stages) cand.application_stages = {};
              cand.application_stages[stageName] = { status: 'unshortlisted' };
              (cand as any).status = 'unshortlisted';
            }
          });

          this.dataService.totalShortListedCandidates = Math.max(0, this.dataService.totalShortListedCandidates - ids.length);
          this.candidates = this.sortCandidatesByState(this.candidates);
          this.filterCandidates();

          // Emit event to auto-refresh all event listeners across the app
          this.dataService.notifyShortlistUpdate('unshortlist', ids, this.jobPostId, stageName);

          this.calculatePagination();
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Unshortlisting failed:', error);
          this.showPopupMessage('Candidates unshortlisting failed!', 'error');
        }
      });
  }

  // UI operations
  setViewMode(mode: 'table' | 'cards'): void {
    this.viewMode = mode;
  }

  toggleView(): void {
    this.viewMode = this.viewMode === 'table' ? 'cards' : 'table';
  }

  refreshData(): void {
    const jobPostId = this.route.snapshot.paramMap.get('jobId');
    if (jobPostId) {
      this.loadCandidates(jobPostId);
    }
  }

  toggleMobileActions(): void {
    this.showMobileActions = !this.showMobileActions;
  }

  // Search and filtering
  onSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchTerm = input.value.trim();
    this.filterCandidates();
  }

  filterCandidates(): void {
    if (!this.searchTerm) {
      this.filteredCandidates = [...this.candidates];
    } else {
      const term = this.searchTerm.toLowerCase();
      this.filteredCandidates = this.candidates.filter(candidate =>
        this.getDisplayName(candidate).toLowerCase().includes(term) ||
        this.getCandidateEmail(candidate).toLowerCase().includes(term) ||
        this.getSkills(candidate).some(skill => skill.toLowerCase().includes(term))
      );
    }
    this.calculatePagination();
  }

  onFilterChange(filters: CandidateFilters): void {
    this.filters = filters;
    this.applyFilters();
  }

  private applyFilters(): void {
    this.filteredCandidates = this.candidates.filter(candidate =>
      this.matchesAllFilters(candidate, this.filters)
    );
    this.calculatePagination();
  }

  private safeParseFloat(val: any): number | null {
    if (val == null) return null;
    if (typeof val === 'number') return isNaN(val) ? null : val;
    if (typeof val === 'boolean') return null;

    if (Array.isArray(val)) {
      for (const item of val) {
        const parsed = this.safeParseFloat(item);
        if (parsed !== null) return parsed;
      }
      return null;
    }

    const str = String(val).trim();
    if (!str) return null;

    const cleaned = str.replace(/,/g, '');
    const match = cleaned.match(/[-+]?\d*\.?\d+/);
    if (match && match[0]) {
      const parsed = parseFloat(match[0]);
      return isNaN(parsed) ? null : parsed;
    }

    return null;
  }

  private matchesAllFilters(candidate: Candidate, filters: any): boolean {
    const { form_data, resume_data } = candidate;
    const data = form_data && Object.keys(form_data).length > 0
      ? form_data
      : (resume_data?.personal_details || {});

    for (const [key, filterValue] of Object.entries(filters)) {
      if (key === '_rules') {
        const rules = filterValue as any[];
        if (Array.isArray(rules) && rules.length > 0) {
          const rulesMatch = rules.every(rule => this.matchesRuleOperator(candidate, rule));
          if (!rulesMatch) return false;
        }
        continue;
      }

      if (!filterValue || filterValue.toString().trim() === '') {
        continue;
      }

      let fieldValue = (data as FormData)[key]?.value ?? (data as FormData)[key];

      if (fieldValue === undefined && resume_data) {
        fieldValue = this.findInResumeData(resume_data, key);
      }
      if (fieldValue === undefined) {
        fieldValue = (candidate as any)[key];
      }

      if (!this.matchesFilter(fieldValue, filterValue)) {
        return false;
      }
    }

    return true;
  }

  private matchesRuleOperator(candidate: Candidate, rule: { field: string; operator: string; value: any }): boolean {
    if (!rule.field || rule.value === '' || rule.value == null) return true;

    const { form_data, resume_data } = candidate;
    const data = form_data && Object.keys(form_data).length > 0
      ? form_data
      : (resume_data?.personal_details || {});

    let itemValue = (data as FormData)[rule.field]?.value ?? (data as FormData)[rule.field];
    if (itemValue === undefined && resume_data) {
      itemValue = this.findInResumeData(resume_data, rule.field);
    }
    if (itemValue === undefined) {
      itemValue = (candidate as any)[rule.field];
    }

    if (itemValue == null) return false;

    const itemValueStr = itemValue.toString().toLowerCase();
    const filterValueStr = rule.value.toString().toLowerCase();

    switch (rule.operator) {
      case 'contains': return itemValueStr.includes(filterValueStr);
      case 'equals': return itemValueStr === filterValueStr;
      case 'startsWith': return itemValueStr.startsWith(filterValueStr);
      case 'endsWith': return itemValueStr.endsWith(filterValueStr);
      case 'greaterThan': {
        const numValue = this.safeParseFloat(itemValue);
        const numFilter = this.safeParseFloat(rule.value);
        return numValue !== null && numFilter !== null && numValue > numFilter;
      }
      case 'lessThan': {
        const numValue = this.safeParseFloat(itemValue);
        const numFilter = this.safeParseFloat(rule.value);
        return numValue !== null && numFilter !== null && numValue < numFilter;
      }
      case 'greaterThanOrEqual': {
        const numValue = this.safeParseFloat(itemValue);
        const numFilter = this.safeParseFloat(rule.value);
        return numValue !== null && numFilter !== null && numValue >= numFilter;
      }
      case 'lessThanOrEqual': {
        const numValue = this.safeParseFloat(itemValue);
        const numFilter = this.safeParseFloat(rule.value);
        return numValue !== null && numFilter !== null && numValue <= numFilter;
      }
      default: return true;
    }
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
    this.calculatePagination();
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
    this.calculatePagination();
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

  // Candidate data extraction methods
  getDisplayName(candidate: any): string {
    if (candidate.resume_data?.personal_details?.full_name) {
      return candidate.resume_data.personal_details.full_name;
    }

    if (candidate.form_data) {
      const nameFields = ['full_name', 'first_name', 'last_name', 'name', 'candidate_name', 'applicant_name'];
      for (const field of nameFields) {
        const val = candidate.form_data[field];
        if (val?.value) return val.value;
        if (typeof val === 'string' && val.trim()) return val.trim();
      }
    }

    return candidate.full_name || candidate.name || candidate.applicant_name || candidate.candidate_name || 'N/A';
  }

  getCandidateEmail(candidate: any): string {
    if (candidate.email) return candidate.email;
    if (candidate.form_data) {
      const emailFields = ['email', 'email_address', 'candidate_email', 'applicant_email'];
      for (const field of emailFields) {
        const val = candidate.form_data[field];
        if (val?.value) return val.value;
        if (typeof val === 'string' && val.trim()) return val.trim();
      }
    }
    return candidate.candidate_email || candidate.applicant_email || 'N/A';
  }

  getSkills(candidate: any): string[] {
    if (candidate.resume_data?.skills) {
      return [
        ...(candidate.resume_data.skills.technical_skills || []),
        ...(candidate.resume_data.skills.soft_skills || [])
      ];
    }

    if (candidate.form_data) {
      const val = candidate.form_data.skills?.value || candidate.form_data.skills || candidate.form_data.technical_skills;
      if (Array.isArray(val)) return val;
      if (typeof val === 'string' && val.trim()) return val.split(',').map((s: string) => s.trim());
    }

    return [];
  }

  getExperience(candidate: any): string {
    if (candidate.form_data) {
      const val = candidate.form_data.years_of_experience?.value || candidate.form_data.years_of_experience || candidate.form_data.experience;
      if (val !== undefined && val !== null) return String(val.value);
    }
    return '';
  }


  getCandidateStatusRaw(candidate: Candidate): string {
    if (!candidate) return 'pending';
    const stageId = this.route.snapshot.paramMap.get('stageId') || '';
    const cleanStage = stageId.replace("stage_", "").trim().toLowerCase();

    const appStages = candidate.application_stages;
    if (appStages && typeof appStages === 'object') {
      const keysToTry = [
        cleanStage,
        stageId,
        `stage_${cleanStage}`,
        cleanStage.replace("_", " "),
        cleanStage.replace(" ", "_"),
        'application_review',
        'Applied',
        'Form Requested'
      ];
      for (const k of keysToTry) {
        if (appStages[k] && typeof appStages[k] === 'object' && appStages[k].status) {
          return String(appStages[k].status).toLowerCase();
        }
      }
      for (const key of Object.keys(appStages)) {
        const stageVal = appStages[key];
        if (stageVal && typeof stageVal === 'object' && stageVal.status) {
          return String(stageVal.status).toLowerCase();
        }
      }
    }

    if ((candidate as any)?.status) return String((candidate as any).status).toLowerCase();
    return 'pending';
  }

  getCandidateStatus(candidate: any): string {
    const raw = this.getCandidateStatusRaw(candidate);
    if (raw === "shortlisted" || raw === "completed" || raw === "approved" || raw === "successful") {
      return "Shortlisted";
    } else if (raw === "unshortlisted" || raw === "rejected" || raw === "unsuccessful") {
      return "Rejected";
    } else {
      return "New";
    }
  }

  getStatusClass(candidate: any): string {
    const status = this.getCandidateStatus(candidate);
    switch (status.toLowerCase()) {
      case 'shortlisted':
        return 'bg-green-100 text-green-800';
      case 'reviewed':
        return 'bg-blue-100 text-blue-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getNewTodayCount(): number {
    const today = new Date().toDateString();
    return this.candidates.filter(c => {
      const dateValue = c?.created_at || c?.submitted_at;
      if (!dateValue) return false;
      const candidateDate = new Date(dateValue).toDateString();
      return candidateDate === today;
    }).length;
  }

  getRelevantFields(formData: any): any[] {
    return Object.entries(formData)
      .filter(([key]) => this.relevantFields.includes(key))
      .map(([key, value]) => ({ key, value }));
  }

  getTopFields(formData: any, limit: number): any[] {
    const fields = this.getRelevantFields(formData);
    return fields.slice(0, limit);
  }

  getDisplayRange(): string {
    const start = (this.currentPage - 1) * this.pageSize + 1;
    const end = Math.min(this.currentPage * this.pageSize, this.filteredCandidates.length);
    return `${start}-${end}`;
  }

  formatFieldName(fieldName: string): string {
    return fieldName
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  // Pagination
  calculatePagination(): void {
    this.candidatesPaginated = this.filteredCandidates.slice(0, this.pageSize);
    this.totalPages = Math.ceil(this.filteredCandidates.length / this.pageSize);
    this.currentPage = Math.min(this.currentPage, Math.max(this.totalPages, 1));
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePagination();
    }
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePagination();
    }
  }

  updatePagination(): void {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.candidatesPaginated = this.filteredCandidates.slice(start, end);
  }

  // Popup management
  showPopupMessage(message: string, type: PopupType): void {
    this.popupMessage = message;
    this.popupType = type;
    this.showPopup = true;

    setTimeout(() => {
      this.showPopup = false;
      this.cdr.markForCheck();
    }, this.POPUP_DISPLAY_TIME);
  }

  // Table event handlers
  onFilteredDataChange(filteredData: any[]): void {
    this.filteredCandidates = filteredData;
    this.calculatePagination();
  }

  onRowClick(row: any): void {
    if (row) {
      this.viewDetails(row);
    }
  }

  onExportRequest(event: { data: any[], format: 'shortlist' | 'unshortlist' }): void {
    if (event.format === 'shortlist') {
      this.saveShortListing(event.data);
    } else if (event.format === 'unshortlist') {
      this.saveUnShortListingDB(event.data);
    }
  }

  clearAllFilters(): void {
    this.filteredData = [...this.tableData];
    this.calculatePagination();
  }

  onAddNew(): void {
    console.log('Add new record');
    // Implement add new record logic
  }

  // Navigation methods
  viewShortlist(): void {
    this.dataService.openShortList = true;
  }

  openDataUpload(): void {
    this.dataService.openDocumentsUpload = true;
  }

  openTalentPool(): void {
    this.navigateSection.emit('talent-pool');
  }

  viewDetails(candidate: Candidate): void {
    this.dataService.candidate = candidate;
    this.dataService.isFromCandidateList = true;
    this.dataService.openCandidateDetails = true;
  }

  openAiCopilot(): void {
    const jobId = (this.applicationData as any)?.id || this.jobPostId || '';
    const url = this.router.serializeUrl(
      this.router.createUrlTree(['/ai-copilot'], { queryParams: { jobId } })
    );
    window.open(url, '_blank');
  }

  toggleFilters(): void {
    this.dataService.showFilters = false;
  }

  exportAllCandidates(): void {
    console.log('Exporting all candidates...');
    // Implement export logic
  }


  toggleEmailingPopup(): void {
    this.dataService.openEmailPopUp = true;
  }
}