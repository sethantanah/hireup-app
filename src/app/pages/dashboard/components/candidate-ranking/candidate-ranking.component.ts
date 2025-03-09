import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../../services/api.service';
import { Candidate } from '../../models/candidate.model';
import { DataService } from '../../../../services/data.service';
import {
  COMMON_FORM_FIELDS,
  ShortlistPopupComponent,
} from '../shortlist-popup/shortlist-popup.component';
import { CandidateDetailsComponent } from '../candidate-details/candidate-details.component';
import { JobPostData } from '../../../../models/jobpost.model';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-candidate-ranking',
  imports: [
    CommonModule,
    FormsModule,
    ShortlistPopupComponent,
    CandidateDetailsComponent,
  ],
  templateUrl: './candidate-ranking.component.html',
  styleUrl: './candidate-ranking.component.scss',
})
export class CandidateRankingComponent implements OnInit {
  @Input() applicationData!: JobPostData | undefined;
  candidates: Candidate[] = [];
  showOptions: boolean = false; // Controls visibility of the options panel
  isLoading: boolean = false; // Loading state
  onError: boolean = false;
  file: File | undefined;
  jobDescription: string = '';
  evaluationData: any = {};
  selectedCategories: string[] = [];
  private expandedScores = new Set<any>();
  areAllScoresExpanded = false;

  private relevantFields = COMMON_FORM_FIELDS;
  filteredFields = COMMON_FORM_FIELDS;

  constructor(
    private apiService: ApiService,
    public dataService: DataService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.evaluationData = this.applicationData?.rankingSettings;

    const jobpostId = this.route.snapshot.paramMap.get('jobId');
    this.dataService.saveJobId(jobpostId || '');

    if (jobpostId) {
      this.isLoading = true; // Show loading indicator
      this.apiService.getRankedCandidates(jobpostId).subscribe({
        next: (data) => {
          this.candidates = data as Candidate[];
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
      this.filteredFields =
        this.applicationData?.searchFilterSettings || COMMON_FORM_FIELDS;
      this.dataService.selectedCardFields = this.relevantFields;
    }
  }

  toggleOptions() {
    this.showOptions = !this.showOptions;
  }

  onFileUpload(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.file = file;
    }
  }

  onSubmit() {
    // Create a FormData object
    this.showOptions = false;
    this.isLoading = true;
    const formData = new FormData();
    formData.append('evaluations', JSON.stringify(this.evaluationData));
    formData.append(
      'selected_evaluations',
      JSON.stringify(this.selectedCategories)
    );
    const jobpostId = this.route.snapshot.paramMap.get('jobId');
    formData.append('jobpost_id', jobpostId || '');

    this.apiService.rankCandidates(formData).subscribe({
      next: (data) => {
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        console.log(err);
      },
    });
  }

  onFilterByIds(filters: string[]) {
    this.candidates = this.candidates.filter((candidate) => {
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
    // Handle "View Details" action
    this.dataService.candidate = candidate;
    this.dataService.openCandidateDetails = true;
    // Example: Open a modal or navigate to a detailed view
  }

  getEvaluationCategories(): string[] {
    return Object.keys(this.evaluationData);
  }

  formatCategoryName(category: string): string {
    return category
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  toggleCategory(category: string) {
    const index = this.selectedCategories.indexOf(category);
    if (index === -1) {
      this.selectedCategories.push(category);
    } else {
      this.selectedCategories.splice(index, 1);
    }
  }

  removeCategory(category: string) {
    const index = this.selectedCategories.indexOf(category);
    if (index > -1) {
      this.selectedCategories.splice(index, 1);
    }
  }

  resetSettings() {
    this.selectedCategories = [];
  }

  isResumeCategory(category: string): boolean {
    return ['cv', 'resume'].includes(category.toLowerCase());
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

  toggleAllScores(): void {
    const scores = this.candidates.flatMap(
      (c) => c.document_ranking?.individual_scores || []
    );

    if (this.areAllScoresExpanded) {
      this.expandedScores.clear();
    } else {
      scores.forEach((score) => this.expandedScores.add(score));
    }

    this.areAllScoresExpanded = !this.areAllScoresExpanded;
  }

  toggleScoreDetails(score: any): void {
    if (this.expandedScores.has(score)) {
      this.expandedScores.delete(score);
    } else {
      this.expandedScores.add(score);
    }

    this.updateAllExpandedState();
  }

  private updateAllExpandedState(): void {
    const scores = this.candidates.flatMap(
      (c) => c.document_ranking?.individual_scores || []
    );
    this.areAllScoresExpanded = scores.every((score) =>
      this.expandedScores.has(score)
    );
  }

  isScoreExpanded(score: any): boolean {
    return this.expandedScores.has(score);
  }

  getScoreKeys(score: any): string[] {
    return Object.keys(score);
  }
}
