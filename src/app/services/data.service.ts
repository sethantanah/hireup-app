import { Injectable } from '@angular/core';
import { Candidate } from '../pages/dashboard/models/candidate.model';

@Injectable({
  providedIn: 'root'
})
export class DataService {
  shortlistedCandidates: Candidate[] = [];
  candidate: Candidate | undefined;
  selectedCardFields: string[] = [];
  emailsList: string[] = [];

  applicationId: string = '';
  openCandidateDetails: boolean = false;
  openShortList: boolean = false;
  showFilters: boolean = false;
  openEmailPopUp: boolean = false;
  openDocumentsUpload: boolean = false;
  
  constructor() {
    this.shortlistedCandidates = this.retrieveShortlistedCandidates();
   }

  saveShortlistedCandidates(candidates: Candidate[]) {
    localStorage.setItem(this.getJobId(), JSON.stringify(candidates));
  }
  

  retrieveShortlistedCandidates(): Candidate[] {
    const shortlistedCandidates = localStorage.getItem(this.getJobId());
    return shortlistedCandidates ? JSON.parse(shortlistedCandidates) : [];
  }

  saveJobId(id: string) {
    localStorage.setItem('jobpostId', id);
  }

  getJobId(): string {
    return localStorage.getItem('jobpostId') || 'jobpostId';
  }

  toggleEmailPopUp(){
    this.openEmailPopUp = !this.openEmailPopUp
  }
}
