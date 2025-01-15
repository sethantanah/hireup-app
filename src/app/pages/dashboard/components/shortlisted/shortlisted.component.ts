import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../../services/api.service';
import { Candidate } from '../../models/candidate.model';
import { CommonModule } from '@angular/common';
import { FiltersComponent } from '../filters/filters.component';
import { DataService } from '../../../../services/data.service';
import { ShortlistPopupComponent } from '../shortlist-popup/shortlist-popup.component';
import { CandidateDetailsComponent } from '../candidate-details/candidate-details.component';
import { AdvanceFilterComponent } from '../advance-filter/advance-filter.component';


@Component({
  selector: 'app-shortlisted',
  imports: [CommonModule, FiltersComponent, ShortlistPopupComponent, CandidateDetailsComponent, AdvanceFilterComponent],
  templateUrl: './shortlisted.component.html',
  styleUrl: './shortlisted.component.scss'
})
export class ShortlistedComponent implements OnInit {
  candidates: Candidate[] = [];
  filteredCandidates: Candidate[] = [];
  isLoading: boolean = true; // Loading state
  isUpdating: boolean = false;
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
    skills: ''
  };

  constructor(private apiService: ApiService, public dataService: DataService) { }

  ngOnInit(): void {
    this.isLoading = true; // Show loading indicator
    this.apiService.getShortListedCandidates(this.apiService.project_id).subscribe({
      next: (data) => {
        this.candidates = data as Candidate[];
        this.filteredCandidates = this.candidates;
        this.isLoading = false;
      },
      error: (error) => {
        this.isLoading = false;
      }
    });
  }

  refreshData() {
    this.isLoading = true; // Show loading indicator
    this.apiService.getShortListedCandidates(this.apiService.project_id).subscribe({
      next: (data) => {
        this.candidates = data as Candidate[];
        this.filteredCandidates = this.candidates;
        this.isLoading = false;
      },
      error: (error) => {
        this.isLoading = false;
      }
    });
  }

  onFilterChange(filters: any) {
    this.filters = filters;
    this.filteredCandidates = this.candidates.filter((candidate) => {
      const { form_data, resume_data } = candidate;
      const data = Object.keys(form_data).length > 0 ? form_data : resume_data.personal_details;

      if (
        this.filters.search &&
        !data.full_name.toLowerCase().includes(this.filters.search.toLowerCase())
      ) {
        return false;
      }

      if (
        this.filters.availability &&
        form_data.availability !== this.filters.availability
      ) {
        return false;
      }

      if (
        this.filters.yearsOfExperience &&
        +form_data.years_of_experience < this.filters.yearsOfExperience
      ) {
        return false;
      }

      if (
        this.filters.skills.length > 0 &&
        !this.filters.skills.every((skill) =>
          resume_data.skills.technical_skills.includes(skill)
        )
      ) {
        return false;
      }

      if (
        this.filters.education &&
        !resume_data.education.some(
          (edu) =>
            edu.degree === this.filters.education ||
            edu.institution === this.filters.education
        )
      ) {
        return false;
      }


      if (
        this.filters.education &&
        !resume_data.education.some(
          (edu) =>
            edu.degree === this.filters.education ||
            edu.institution === this.filters.education
        )
      ) {
        return false;
      }

      // Advanced Filters
      if (
        this.filters.dateOfBirth &&
        form_data.date_of_birth !== this.filters.dateOfBirth
      ) {
        return false;
      }

      if (
        this.filters.highestDegree &&
        form_data.highest_degree !== this.filters.highestDegree
      ) {
        return false;
      }

      if (
        this.filters.fieldOfStudy &&
        form_data.field_of_study !== this.filters.fieldOfStudy
      ) {
        return false;
      }

      if (
        this.filters.institutionName &&
        form_data.institution_name !== this.filters.institutionName
      ) {
        return false;
      }

      if (
        this.filters.yearOfGraduation &&
        form_data.year_of_graduation !== this.filters.yearOfGraduation
      ) {
        return false;
      }

      return true;
    });
  }



  onAdvanceFilterChange(filters: any) {
    this.advanceFilters = filters;
    this.filteredCandidates = this.candidates.filter((candidate) => {
      const resumeData = candidate.resume_data;

      // Case-insensitive matching using toLowerCase()
      const lowerCaseResumeText = candidate.resume_text?.toLowerCase() || "";
      const lowerCaseSearchText = filters.search.toLowerCase();
      const matchAny = lowerCaseResumeText.includes(lowerCaseSearchText)

      // Filter by skills (from resume_data.skills.technical_skills)
      const skillsMatch =
        this.advanceFilters.skills.length === 0 ||
        this.advanceFilters.skills.split(',').every((skill) =>
          resumeData?.skills?.technical_skills?.some((s) =>
            s.toLowerCase().includes(skill.toLowerCase())
          )
        );

      // Filter by education degree (from resume_data.education.degree)
      const educationDegreeMatch =
        this.advanceFilters.educationDegree === '' ||
        resumeData?.education?.some((edu) =>
          edu.degree?.toLowerCase().includes(this.advanceFilters.educationDegree.toLowerCase())
        );

      // Filter by projects (from resume_data.projects.name)
      const projectsMatch =
        this.advanceFilters.projects === '' ||
        resumeData?.projects?.some((project) =>
          project.name?.toLowerCase().includes(this.advanceFilters.projects.toLowerCase())
        );

      // Combine all filters
      return matchAny && skillsMatch && educationDegreeMatch && projectsMatch;
    });
  }


  // Check if a candidate is shortlisted
  isShortlisted(candidate: Candidate): boolean {
    return this.dataService.shortlistedCandidates.some((c) => c.id === candidate.id);
  }

  // Toggle shortlist status for a candidate
  toggleShortlist(candidate: Candidate) {
    if (this.isShortlisted(candidate)) {
      this.dataService.shortlistedCandidates = this.dataService.shortlistedCandidates.filter((c) => c.id !== candidate.id);
    } else {
      this.dataService.shortlistedCandidates.push(candidate);
    }
  }

  // Open the shortlist popup
  viewShortlist() {
    this.dataService.openShortList = true;
  }


  viewDetails(candidate: Candidate) {
    // Handle "View Details" action
    this.dataService.candidate = candidate;
    this.dataService.openCandidateDetails = true;
    // Example: Open a modal or navigate to a detailed view
  }

  removeFromShortList(candidate: Candidate) {
    this.isUpdating = true;
    this.apiService.removeListCandidates([candidate.id]).subscribe({
      next: (res) => {
        this.isUpdating = false;
        this.candidates = this.candidates.filter((cand) => {
          cand.id != candidate.id
        });

        this.filteredCandidates = this.candidates;
      },
      error: (error) => {
        alert("An error occured while updating!");
        this.isUpdating = false;
      }
    })
  }

  toggleFilters() {
    this.dataService.showFilters = false;
  }
}