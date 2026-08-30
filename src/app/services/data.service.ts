import { Injectable } from '@angular/core';
import { Candidate } from '../pages/dashboard/models/candidate.model';

@Injectable({
  providedIn: 'root'
})
export class DataService {
  shortlistedCandidates: Candidate[] = [];
  totalCandidates: number = 0;
  totalShortListedCandidates: number = 0;
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
  }

  saveShortlistedCandidates(candidates: Candidate[]) {
    // localStorage.setItem(this.getJobId(), JSON.stringify(candidates));
  }

  retrieveShortlistedCandidates(): Candidate[] {
    return [];
    // const shortlistedCandidates = localStorage.getItem(this.getJobId());
    // return shortlistedCandidates ? JSON.parse(shortlistedCandidates) : [];
  }


  saveMetrics(metrics: any, id?: string, ) {
    localStorage.setItem(id+"_METRICS" || this.getJobId() + "_METRICS", JSON.stringify(metrics));
  }

  getMetrics(id?: string): any {
    const metrics = localStorage.getItem(id || this.getJobId() + "_METRICS");
    return metrics ? JSON.parse(metrics) : {};
  }

  getStageMetrics(stageId: string, metric: string = "total_count"): number {
    const application_metrics = this.getMetrics()
    
    const stage = stageId.replace("stage_", "")
    if (!application_metrics) return 0;

    const metric_value = application_metrics[stage] ? (application_metrics[stage][metric] ? application_metrics[stage][metric] : 0) : 0
    const distribution = {
      'application_overview': metric === "total_count" ? this.totalCandidates : metric_value,
      'stage_application_review': metric === "total_count" && metric_value == 0 ? this.totalCandidates : metric_value,
      'stage_phone_screening': metric_value,
      'stage_technical_assessment': metric_value,
      'stage_interview': metric_value,
      'stage_final_decision': metric_value,
      'stage_offer_sent': metric_value,
      'stage_rejected': metric_value
    };

    // console.log(distribution, "Distribution", "Stage ID:", stageId);
    return distribution[stageId as keyof typeof distribution] || 0;
  }

  saveJobId(id: string) {
    localStorage.setItem('jobpostId', id);
  }

  getJobId(): string {
    return localStorage.getItem('jobpostId') || 'jobpostId';
  }

  toggleEmailPopUp() {
    this.openEmailPopUp = !this.openEmailPopUp
  }

  saveCandidateRating(candidateId: string, rating: number): void {
    if (!candidateId) return;
    const ratings = this.getCandidateRatingsMap();
    ratings[candidateId] = rating;
    localStorage.setItem('HIREUP_CANDIDATE_RATINGS', JSON.stringify(ratings));
  }

  getCandidateRating(candidateId: string): number {
    if (!candidateId) return 0;
    const ratings = this.getCandidateRatingsMap();
    return ratings[candidateId] || 0;
  }

  private getCandidateRatingsMap(): { [key: string]: number } {
    try {
      const stored = localStorage.getItem('HIREUP_CANDIDATE_RATINGS');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }
}
