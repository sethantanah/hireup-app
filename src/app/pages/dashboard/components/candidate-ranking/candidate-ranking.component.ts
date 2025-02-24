import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../../services/api.service';
import { Candidate } from '../../models/candidate.model';
import { DataService } from '../../../../services/data.service';
import { ShortlistPopupComponent } from '../shortlist-popup/shortlist-popup.component';
import { CandidateDetailsComponent } from '../candidate-details/candidate-details.component';

@Component({
  selector: 'app-candidate-ranking',
  imports: [CommonModule, FormsModule, ShortlistPopupComponent, CandidateDetailsComponent],
  templateUrl: './candidate-ranking.component.html',
  styleUrl: './candidate-ranking.component.scss'
})
export class CandidateRankingComponent {
  candidates: Candidate[] = [];
  showOptions: boolean = false; // Controls visibility of the options panel
  isLoading: boolean = false; // Loading state
  onError: boolean = false;
  file: File | undefined;
  jobDescription: string = '';
  weights = {
    skills: 25,
    projects: 25,
    work_experience: 25,
    education: 25,
  };

  constructor(private apiService: ApiService, public dataService: DataService) {

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
    formData.append('weights', JSON.stringify(this.weights));
    formData.append('job_description', this.jobDescription);
    formData.append('jobpost_id', this.apiService.jobpost_id);

    this.apiService.rankCandidates(formData).subscribe({
      next: (data) => {
        this.isLoading = false;
        this.candidates = data as Candidate[];
      },
      error: (err) => {
        this.isLoading = false;
        console.log(err);
      },
    })
  }



  onFilterByIds(filters: string[]) {
    this.candidates = this.candidates.filter((candidate) => {
      return !filters.includes(candidate.id);
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
}