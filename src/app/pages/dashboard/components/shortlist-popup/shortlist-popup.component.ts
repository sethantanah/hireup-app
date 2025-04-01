import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Candidate } from '../../models/candidate.model';
import { CommonModule } from '@angular/common';
import { DataService } from '../../../../services/data.service';
import { ApiService } from '../../../../services/api.service';
import { JobPostData } from '../../../../models/jobpost.model';


@Component({
  selector: 'app-shortlist-popup',
  imports: [CommonModule],
  templateUrl: './shortlist-popup.component.html',
  styleUrl: './shortlist-popup.component.scss',
})
export class ShortlistPopupComponent {
  @Output() filterChange = new EventEmitter<any>();

  isLoading: boolean = false;
  onError: boolean = false;
  showPopup: boolean = false;
  popupMessage: string = '';
  popupType: 'success' | 'error' = 'success';

  selectedFields: string[] = [];

  constructor(
    public dataService: DataService,
    private apiService: ApiService
  ) {
    this.selectedFields = this.dataService.selectedCardFields;
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
      .filter(([key]) =>{
        const containsKey = this.dataService.selectedCardFields.includes(key);
        if(containsKey){
          if(!this.selectedFields.includes(key)){
             this.selectedFields.push(key)
          }
        }
        return containsKey;
      })
      .map(([key, value]) => ({ key, value }));
  }

  formatFieldName(fieldName: string): string {
    return fieldName
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
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

    this.dataService.saveShortlistedCandidates(
      this.dataService.shortlistedCandidates
    );
  }

  saveShortListing() {
    this.isLoading = true;
    const ids: string[] = [];
    this.dataService.shortlistedCandidates.forEach((candidate) => {
      ids.push(candidate.id);
    });

    this.apiService.shortListCandidates(ids).subscribe({
      next: () => {
        this.showPopupMessage('Candidates shortlisting successful!', 'success');
        this.isLoading = false;
        this.dataService.shortlistedCandidates = [];
        this.filterChange.emit(ids);
      },
      error: () => {
        this.showPopupMessage('Candidates shortlisting failed!', 'error');
        this.isLoading = false;
      },
    });
  }

  showPopupMessage(message: string, type: 'success' | 'error'): void {
    this.popupMessage = message;
    this.popupType = type;
    this.showPopup = true;

    // Hide the popup after 5 seconds
    setTimeout(() => {
      this.showPopup = false;
    }, 10000);
  }

  // Open the popup
  open() {
    this.dataService.openShortList = true;
  }

  // Close the popup
  close() {
    this.dataService.openShortList = false;
  }
}
