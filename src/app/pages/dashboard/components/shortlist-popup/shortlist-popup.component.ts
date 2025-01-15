import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Candidate } from '../../models/candidate.model';
import { CommonModule } from '@angular/common';
import { DataService } from '../../../../services/data.service';
import { ApiService } from '../../../../services/api.service';

@Component({
  selector: 'app-shortlist-popup',
  imports: [CommonModule],
  templateUrl: './shortlist-popup.component.html',
  styleUrl: './shortlist-popup.component.scss'
})
export class ShortlistPopupComponent {
   @Output() filterChange = new EventEmitter<any>();
  isLoading: boolean = false;
  onError: boolean = false;
  showPopup: boolean = false;
  popupMessage: string = '';
  popupType: 'success' | 'error' = 'success';
  constructor(public dataService: DataService, private apiService: ApiService) {

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

  saveShortListing() {
    this.isLoading = true;
    const ids: string[] = [];
    this.dataService.shortlistedCandidates.forEach((candidate) => {
      ids.push(candidate.id);
    });

    this.apiService.shortListCandidates(ids).subscribe({
      next: () => {
        this.showPopupMessage('Candidates shortlisting successful!', 'success')
        this.isLoading = false;
        this.dataService.shortlistedCandidates = [];
        this.filterChange.emit(ids);
      },
      error: () => {
        this.showPopupMessage('Candidates shortlisting failed!', 'error');
        this.isLoading = false;
      }
    })
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
