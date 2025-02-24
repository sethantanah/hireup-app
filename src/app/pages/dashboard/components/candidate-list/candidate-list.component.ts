import { Component, createNgModule, Input, OnInit } from '@angular/core';
import { ApiService } from '../../../../services/api.service';
import { Candidate } from '../../models/candidate.model';
import { CommonModule } from '@angular/common';
import { FiltersComponent } from '../filters/filters.component';
import { DataService } from '../../../../services/data.service';
import { ShortlistPopupComponent } from '../shortlist-popup/shortlist-popup.component';
import { CandidateDetailsComponent } from '../candidate-details/candidate-details.component';
import { AdvanceFilterComponent } from '../advance-filter/advance-filter.component';
import { ActivatedRoute } from '@angular/router';
import { JobPostData } from '../../../../models/jobpost.model';

export const COMMON_FORM_FIELDS = [
  'full_name',
  'first_name',
  'last_name',
  'age',
  'years_of_experience',
  'email',
  'phone',
  'position',
  'education',
  'skills',
];

@Component({
  selector: 'app-candidate-list',
  imports: [
    CommonModule,
    FiltersComponent,
    ShortlistPopupComponent,
    CandidateDetailsComponent,
    AdvanceFilterComponent,
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

  constructor(
    private candidateService: ApiService,
    public dataService: DataService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
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

    if (this.applicationData) {
      this.relevantFields =
        this.applicationData?.cardSettings || COMMON_FORM_FIELDS;
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
    // this.filters = filters;
    // this.filteredCandidates = this.candidates.filter((candidate) => {
    //   const { form_data, resume_data } = candidate;
    //   const data =
    //     Object.keys(form_data).length > 0
    //       ? form_data
    //       : resume_data.personal_details;
    //   if (
    //     this.filters.search &&
    //     !data.full_name
    //       .valueOf()
    //       .toString()
    //       .toLowerCase()
    //       .includes(this.filters.search.toLowerCase())
    //   ) {
    //     return false;
    //   }
    //   if (
    //     this.filters.availability &&
    //     form_data.availability.value !== this.filters.availability
    //   ) {
    //     return false;
    //   }
    //   if (
    //     this.filters.yearsOfExperience &&
    //     +form_data.years_of_experience < this.filters.yearsOfExperience
    //   ) {
    //     return false;
    //   }
    //   if (
    //     this.filters.skills.length > 0 &&
    //     !this.filters.skills.every((skill) =>
    //       resume_data.skills.technical_skills.includes(skill)
    //     )
    //   ) {
    //     return false;
    //   }
    //   if (
    //     this.filters.education &&
    //     !resume_data.education.some(
    //       (edu) =>
    //         edu.degree === this.filters.education ||
    //         edu.institution === this.filters.education
    //     )
    //   ) {
    //     return false;
    //   }
    //   if (
    //     this.filters.education &&
    //     !resume_data.education.some(
    //       (edu) =>
    //         edu.degree === this.filters.education ||
    //         edu.institution === this.filters.education
    //     )
    //   ) {
    //     return false;
    //   }
    //   // Advanced Filters
    //   if (
    //     this.filters.dateOfBirth &&
    //     form_data.date_of_birth.value !== this.filters.dateOfBirth
    //   ) {
    //     return false;
    //   }
    //   if (
    //     this.filters.highestDegree &&
    //     form_data.highest_degree.value !== this.filters.highestDegree
    //   ) {
    //     return false;
    //   }
    //   if (
    //     this.filters.fieldOfStudy &&
    //     form_data.field_of_study.value !== this.filters.fieldOfStudy
    //   ) {
    //     return false;
    //   }
    //   if (
    //     this.filters.institutionName &&
    //     form_data.institution_name.value !== this.filters.institutionName
    //   ) {
    //     return false;
    //   }
    //   if (
    //     this.filters.yearOfGraduation &&
    //     form_data.year_of_graduation.value !== this.filters.yearOfGraduation
    //   ) {
    //     return false;
    //   }
    //   return true;
    // });
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
  }

  // Open the shortlist popup
  viewShortlist() {
    this.dataService.openShortList = true;
  }

  viewDetails(candidate: Candidate) {
    // console.log(candidate.id)
    console.log(candidate);
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
