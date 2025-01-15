import { Injectable } from '@angular/core';
import { Candidate } from '../pages/dashboard/models/candidate.model';

@Injectable({
  providedIn: 'root'
})
export class DataService {
  shortlistedCandidates: Candidate[] = [];
  candidate: Candidate | undefined;

  openShortList: boolean = false;
  openCandidateDetails: boolean = false;
  showFilters: boolean = false;
  constructor() { }
}
