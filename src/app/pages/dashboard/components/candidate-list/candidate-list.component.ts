import { Component, createNgModule, Input, OnInit } from '@angular/core';
import { ApiService } from '../../../../services/api.service';
import { Candidate, FormData } from '../../models/candidate.model';
import { CommonModule } from '@angular/common';
import { FiltersComponent } from '../filters/filters.component';
import { DataService } from '../../../../services/data.service';
import { ShortlistPopupComponent } from '../shortlist-popup/shortlist-popup.component';
import { CandidateDetailsComponent } from '../candidate-details/candidate-details.component';
import { AdvanceFilterComponent } from '../advance-filter/advance-filter.component';
import { ActivatedRoute } from '@angular/router';
import { JobPostData } from '../../../../models/jobpost.model';
import { CandidateFiltersComponent } from '../candidate-filters/candidate-filters.component';
import { BulkDocumentUploadsComponent } from '../../../job-posts/manager/components/data-uploads/bulk-document-uploads/bulk-document-uploads.component';

export const COMMON_FORM_FIELDS = [
  'full_name',
  'email'
];

@Component({
  selector: 'app-candidate-list',
  imports: [
    CommonModule,
    ShortlistPopupComponent,
    CandidateDetailsComponent,
    CandidateFiltersComponent,
    BulkDocumentUploadsComponent
  ],
  templateUrl: './candidate-list.component.html',
  styleUrl: './candidate-list.component.scss',
})
export class CandidateListComponent implements OnInit {
  @Input() applicationData!: JobPostData | undefined;
  candidates: Candidate[] = [];
  filteredCandidates: Candidate[] = [];
  isLoading: boolean = true; // Loading state
  viewMode: string = 'cards';
  jobPostId?: string;
  

  filters = {
    search: '',
    availability: '',
    yearsOfExperience: 0,
    education: '',
    dateOfBirth: '', // Advanced filter
    highestDegree: '', // Advanced filter
    fieldOfStudy: '', // Advanced filter
    institutionName: '', // Advanced filter
    yearOfGraduation: '', // Advanced filter
    skills: [] as string[],
    certifications: [] as string[],
  };

  advanceFilters = {
    search: '',
    educationDegree: '',
    projects: '',
    skills: '',
  };

  private relevantFields = COMMON_FORM_FIELDS;
  filteredFields = COMMON_FORM_FIELDS

  constructor(
    private candidateService: ApiService,
    public dataService: DataService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const jobpostId = this.route.snapshot.paramMap.get('jobId');
    this.jobPostId = jobpostId || '';
    this.dataService.saveJobId(jobpostId || '')

    if (jobpostId) {
      this.isLoading = true; // Show loading indicator
      this.candidateService.getDocuments(jobpostId).subscribe({
        next: (data) => {
          this.candidates = data as Candidate[];
          this.filteredCandidates = this.candidates;
          this.isLoading = false;
        },
        error: (error) => {
          this.isLoading = false;
        },
      });
    }

    if(this.applicationData){
      this.relevantFields = this. applicationData?.cardSettings || COMMON_FORM_FIELDS;
      this.filteredFields = this.applicationData?.searchFilterSettings || COMMON_FORM_FIELDS; 
      this.dataService.selectedCardFields = this.relevantFields;
    }
  }

  refreshData() {
    const jobpostId = this.route.snapshot.paramMap.get('jobId');
    if (jobpostId) {
      this.isLoading = true; // Show loading indicator
      this.candidateService.getDocuments(jobpostId).subscribe({
        next: (data) => {
          this.candidates = data as Candidate[];
          this.filteredCandidates = this.candidates;
          this.isLoading = false;
        },
        error: (error) => {
          this.isLoading = false;
        },
      });
    }
  }

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

  getExperience(candidate: any): string {
    if (candidate.form_data?.years_of_experience?.value) {
      return candidate.form_data.years_of_experience.value;
    }
    return '';
  }

  getRelevantFields(formData: any): any[] {
    return Object.entries(formData)
      .filter(([key]) => this.relevantFields.includes(key))
      .map(([key, value]) => ({ key, value }));
  }

  formatFieldName(fieldName: string): string {
    return fieldName
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  onFilterChange(filters: any) {
    this.filteredCandidates = this.candidates.filter((candidate) => {
      const { form_data, resume_data } = candidate;
  
      // Use form_data if available, else fall back to resume_data.personal_details
      const data = form_data && Object.keys(form_data).length > 0
        ? form_data
        : (resume_data?.personal_details || {});
  
      // Loop through all filter keys dynamically
      for (const key in filters) {
        const filterValue = filters[key];
  
        // Skip empty filter values
        if (!filterValue || filterValue.toString().trim() === "") {
          continue;
        }
  
        // Check if the field exists in form_data first
        let fieldValue = (data as FormData)[key]?.value || (data as FormData)[key];
  
        // If not found in form_data, look in resume_data
        if (!fieldValue && resume_data) {
          // Flatten resume_data and check for the key
          const resumeValue = this.findInResumeData(resume_data, key);
          fieldValue = resumeValue !== undefined ? resumeValue : null;
        }
  
        // Perform a case-insensitive comparison for strings
        if (
          typeof fieldValue === "string" &&
          !fieldValue.toLowerCase().includes(filterValue.toLowerCase())
        ) {
          return false;
        }
  
        // Perform a direct comparison for other data types (numbers, etc.)
        if (
          typeof fieldValue !== "string" &&
          fieldValue !== null &&
          fieldValue !== filterValue
        ) {
          return false;
        }
      }
  
      return true;
    });
  }
  
  // Helper function to search deeply in resume_data
  findInResumeData(resumeData: any, key: string): any {
    for (const section in resumeData) {
      const sectionData = resumeData[section];
      if (Array.isArray(sectionData)) {
        for (const item of sectionData) {
          if (item[key] !== undefined) {
            return item[key];
          }
        }
      } else if (sectionData && sectionData[key] !== undefined) {
        return sectionData[key];
      }
    }
    return undefined;
  }
  

  onAdvanceFilterChange(filters: any) {
    this.advanceFilters = filters;
    this.filteredCandidates = this.candidates.filter((candidate) => {
      const resumeData = candidate.resume_data;

      // Case-insensitive matching using toLowerCase()
      const lowerCaseResumeText = candidate.resume_text?.toLowerCase() || '';
      const lowerCaseSearchText = filters.search.toLowerCase();
      const matchAny = lowerCaseResumeText.includes(lowerCaseSearchText);

      // Filter by skills (from resume_data.skills.technical_skills)
      const skillsMatch =
        this.advanceFilters.skills.length === 0 ||
        this.advanceFilters.skills
          .split(',')
          .every((skill) =>
            resumeData?.skills?.technical_skills?.some((s) =>
              s.toLowerCase().includes(skill.toLowerCase())
            )
          );

      // Filter by education degree (from resume_data.education.degree)
      const educationDegreeMatch =
        this.advanceFilters.educationDegree === '' ||
        resumeData?.education?.some((edu) =>
          edu.degree
            ?.toLowerCase()
            .includes(this.advanceFilters.educationDegree.toLowerCase())
        );

      // Filter by projects (from resume_data.projects.name)
      const projectsMatch =
        this.advanceFilters.projects === '' ||
        resumeData?.projects?.some((project) =>
          project.name
            ?.toLowerCase()
            .includes(this.advanceFilters.projects.toLowerCase())
        );

      // Combine all filters
      return matchAny && skillsMatch && educationDegreeMatch && projectsMatch;
    });
  }

  onFilterByIds(filters: string[]) {
    this.candidates = this.candidates.filter((candidate) => {
      return !filters.includes(candidate.id);
    });

    this.filteredCandidates = this.filteredCandidates.filter((candidate) => {
      return !filters.includes(candidate.id);
    });
  }

  // Check if a candidate is shortlisted
  isShortlisted(candidate: Candidate): boolean {
    return this.dataService.shortlistedCandidates.some(
      (c) => c.id === candidate.id
    );
  }

  // Toggle shortlist status for a candidate
  toggleShortlist(candidate: Candidate) {
    if (this.isShortlisted(candidate)) {
      this.dataService.shortlistedCandidates =
        this.dataService.shortlistedCandidates.filter(
          (c) => c.id !== candidate.id
        );
    } else {
      this.dataService.shortlistedCandidates.push(candidate);
    }
    this.dataService.saveShortlistedCandidates(this.dataService.shortlistedCandidates);
  }

  // Open the shortlist popup
  viewShortlist() {
    this.dataService.openShortList = true;
  }

  openDataUpload(){
   this.dataService.openDocumentsUpload = true;
  }

  viewDetails(candidate: Candidate) {
    // console.log(candidate.id)
    // Handle "View Details" action
    // candidate.form_data = this.transformObject(candidate.form_data);
    this.dataService.candidate = candidate;
    this.dataService.openCandidateDetails = true;
    // Example: Open a modal or navigate to a detailed view
  }

  toggleFilters() {
    this.dataService.showFilters = false;
  }
}
