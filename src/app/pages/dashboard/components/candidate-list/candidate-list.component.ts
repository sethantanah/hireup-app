import {
  Component,
  Input,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
  ViewChild,
  ElementRef
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
import { ShortlistPopupComponent } from '../shortlist-popup/shortlist-popup.component';
import { CandidateDetailsComponent } from '../candidate-details/candidate-details.component';
import { CandidateFiltersComponent } from '../candidate-filters/candidate-filters.component';
import { BulkDocumentUploadsComponent } from '../../../job-posts/manager/components/data-uploads/bulk-document-uploads/bulk-document-uploads.component';
import { TableColumn, TableConfig, TableViewComponent } from '../table-view/table-view.component';
import { EmailsComponent } from '../notifications/emails/emails.component';

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
  ],
  templateUrl: './candidate-list.component.html',
  styleUrl: './candidate-list.component.scss',
})
export class CandidateListComponent implements OnInit, OnDestroy {
  // Component state
  @Input() applicationData: JobPostData | undefined;

  candidates: Candidate[] = [];
  filteredCandidates: Candidate[] = [];
  candidatesPaginated: Candidate[] = []
  isLoading = true;
  viewMode: ViewMode = 'cards';
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
    private apiService: ApiService,
    private cdr: ChangeDetectorRef
  ) { }

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
    const jobPostId = this.route.snapshot.paramMap.get('jobId') || '';
    this.jobPostId = jobPostId;
    this.dataService.saveJobId(jobPostId);

    if (jobPostId) {
      this.loadCandidates(jobPostId);
    }

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

  private loadCandidates(jobPostId: string): void {
    this.isLoading = true;
    const stageId = this.route.snapshot.paramMap.get('stageId') || '';
    this.applicantService.getApplicantsByStage(jobPostId, stageId.replace("stage_", ""), 'pending')
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          console.error('Error loading candidates:', error);
          this.showPopupMessage('Failed to load candidates', 'error');
          return [];
        }),
        finalize(() => {
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (data) => {
          this.candidates = data as Candidate[];
          this.filteredCandidates = [...this.candidates];
          this.updateTableColumns();
          this.dataService.totalCandidates = this.candidates.length;
        }
      });


    // Load Unshortlisted Candidates Too
    this.applicantService.getApplicantsByStage(jobPostId, stageId.replace("stage_", ""), 'unshortlisted')
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          console.error('Error loading candidates:', error);
          this.showPopupMessage('Failed to load candidates', 'error');
          return [];
        }),
        finalize(() => {
          this.isLoading = false;
          this.cdr.markForCheck();
          this.calculatePagination();
        })
      )
      .subscribe({
        next: (data) => {
          this.candidates = [...this.candidates, ...(data as Candidate[])];
          this.filteredCandidates = [...this.candidates];
          this.updateTableColumns();
          this.dataService.totalCandidates = this.candidates.length;
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
  toggleShortlist(candidate: Candidate): void {
    const isShortlisted = this.isShortlisted(candidate);

    if (isShortlisted) {
      this.dataService.shortlistedCandidates =
        this.dataService.shortlistedCandidates.filter(c => c.id !== candidate.id);
    } else {
      this.dataService.shortlistedCandidates.push(candidate);
    }

    this.saveShortListingDB();
  }

  isShortlisted(candidate: Candidate): boolean {
    const stageId = this.route.snapshot.paramMap.get('stageId') || '';
    const status = candidate.application_stages?.[stageId.replace("stage_", "")]?.["status"] === "shortlisted" ? true : false;
    return status;
  }

  saveShortListing(data: Candidate[]): void {
    for (const candidate of data) {
      if (!this.isShortlisted(candidate)) {
        this.toggleShortlist(candidate);
      }
    }
  }

  saveShortListingDB(): void {
    const ids = this.dataService.shortlistedCandidates.map(candidate => candidate.id);

    const initaillyRejectedIds = this.dataService.shortlistedCandidates.filter(candidate => this.getCandidateStatusRaw(candidate) === "unshortlisted").map(candidate => candidate.id);
    const shortListIds = this.dataService.shortlistedCandidates.filter(candidate => this.getCandidateStatusRaw(candidate) === "pending").map(candidate => candidate.id);

    const shortListData = { shortlisted: shortListIds, was_rejected: initaillyRejectedIds }

    if (ids.length === 0 || !this.jobPostId) {
      this.showPopupMessage('No candidates selected for shortlisting', 'error');
      return;
    }

    console.log(shortListData)


    this.apiService.shortListCandidates(shortListData, this.jobPostId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.showPopupMessage('Candidates shortlisted successfully!', 'success');
          this.dataService.shortlistedCandidates = [];

          // Remove shortlisted candidates from view
          this.dataService.totalShortListedCandidates += ids.length;
          this.dataService.totalCandidates -= ids.length;
          this.candidates = this.candidates.filter(c => !ids.includes(c.id));
          this.filteredCandidates = this.filteredCandidates.filter(c => !ids.includes(c.id));

          this.calculatePagination();
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Shortlisting failed:', error);
          this.showPopupMessage('Candidates shortlisting failed!', 'error');
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


    this.apiService.rejectCandidates(ids, this.jobPostId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.showPopupMessage('Candidates unshortlisted successfully!', 'success');

          this.candidates.forEach(c => {
            if (!ids.includes(c.id)) {

            }
          });
          this.filteredCandidates = this.filteredCandidates.filter(c => !ids.includes(c.id));
        },
        error: (error) => {
          console.error('Unshortlisting failed:', error);
          this.showPopupMessage('Candidates unshortlisting failed!', 'error');
        }
      });
  }

  // UI operations
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
      const nameFields = ['full_name', 'first_name', 'last_name', 'name'];
      for (const field of nameFields) {
        if (candidate.form_data[field]?.value) {
          return candidate.form_data[field].value;
        }
      }
    }

    return 'N/A';
  }

  getCandidateEmail(candidate: any): string {
    return candidate.email || candidate.form_data?.email?.value || 'N/A';
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

  getExperience(candidate: any): string {
    if (candidate.form_data?.years_of_experience?.value) {
      return candidate.form_data.years_of_experience.value;
    }
    return '';
  }


  getCandidateStatusRaw(candidate: Candidate): string {
    const stageId = this.route.snapshot.paramMap.get('stageId') || '';
    const status = candidate.application_stages?.[stageId.replace("stage_", "")]?.["status"]
    return status;
  }

  getCandidateStatus(candidate: any): string {
    const stageId = this.route.snapshot.paramMap.get('stageId') || '';
    const status = candidate.application_stages?.[stageId.replace("stage_", "")]?.["status"]
    if (status === "pending") {
      return "New";
    } else if (status === "unshortlisted") {
      return "Rejected";
    } else {
      return "Shortlisted"
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
    // Implement row click logic
    console.log('Row clicked:', row);
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

  viewDetails(candidate: Candidate): void {
    this.dataService.candidate = candidate;
    this.dataService.openCandidateDetails = true;
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