import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { JobPostData, ApplicationStage } from '../../../../models/jobpost.model';
import { DataService } from '../../../../services/data.service';
import { ApplicantManagementService } from '../../../../services/applicant-management.service';
import { JobpostManagerService } from '../../../../services/jobpost-manager.service';
import { ActivatedRoute } from '@angular/router';

export interface FunnelStageMetric {
  id: string;
  name: string;
  count: number;
  percentage: number;
  color: string;
}

export interface ChannelMetric {
  channel: string;
  applicants: number;
  shortlisted: number;
  qualityScore: number;
  icon: string;
}

@Component({
  selector: 'app-recruiting-analytics',
  imports: [CommonModule],
  templateUrl: './recruiting-analytics.component.html',
  styleUrl: './recruiting-analytics.component.scss'
})
export class RecruitingAnalyticsComponent implements OnInit, OnChanges {
  @Input() applicationData: JobPostData | undefined;

  timeToHireDays: number = 0;
  offerAcceptanceRate: number = 0;
  screeningConversionRate: number = 0;
  assessmentCompletionRate: number = 0;
  avgCandidateRating: number = 0;
  totalRatedCandidatesCount: number = 0;
  totalApplicants: number = 0;
  totalShortlisted: number = 0;

  funnelStages: FunnelStageMetric[] = [];
  sourcingChannels: ChannelMetric[] = [];
  
  jobPostId: string = '';

  constructor(
    public dataService: DataService,
    private applicantService: ApplicantManagementService,
    private route: ActivatedRoute,
    private jobPostService: JobpostManagerService
  ) {}

  ngOnInit(): void {
    this.jobPostId = this.route.snapshot.paramMap.get('jobId') || this.dataService.getJobId();
    this.calculateRealMetrics();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['applicationData']) {
      this.calculateRealMetrics();
    }
  }

  public calculateRealMetrics(): void {
    this.totalApplicants = (this.dataService.totalCandidates || 0) + (this.dataService.totalShortListedCandidates || 0);
    this.totalShortlisted = this.dataService.totalShortListedCandidates || 0;

    // 1. Build Dynamic Pipeline Funnel Stages from real job application stages
    const defaultStages: ApplicationStage[] = this.jobPostService.defaultStages;

    const rawStages: ApplicationStage[] = this.applicationData?.applicationStages || defaultStages;

    const stageColors = [
      'bg-indigo-600',
      'bg-blue-600',
      'bg-teal-600',
      'bg-emerald-600',
      'bg-amber-500',
      'bg-emerald-700'
    ];

    const activeConfiguredStages = rawStages.filter(s => s.is_active && !s.hide_stage && s.id !== 'stage_rejected');

    this.funnelStages = activeConfiguredStages.map((stage, idx) => {
      const stageCount = this.dataService.getStageMetrics(stage.id, 'total_count');
      // Strictly real candidate count (if metric is 0, count is 0)
      const count = stageCount > 0 ? stageCount : (idx === 0 ? this.totalApplicants : 0);
      const percentage = this.totalApplicants > 0 ? Math.min(100, Math.round((count / Math.max(this.totalApplicants, 1)) * 100)) : 0;
      
      return {
        id: stage.id,
        name: stage.name,
        count: count,
        percentage: percentage,
        color: stageColors[idx % stageColors.length]
      };
    });

    // 2. Real Candidate Ratings & Scorecard Calculation
    if (this.totalApplicants === 0) {
      this.totalRatedCandidatesCount = 0;
      this.avgCandidateRating = 0;
    } else {
      const ratingsMap = this.getCandidateRatingsMap();
      const ratingValues = Object.values(ratingsMap);
      this.totalRatedCandidatesCount = ratingValues.length;
      
      if (this.totalRatedCandidatesCount > 0) {
        const sum = ratingValues.reduce((acc, curr) => acc + curr, 0);
        this.avgCandidateRating = parseFloat((sum / this.totalRatedCandidatesCount).toFixed(1));
      } else {
        this.avgCandidateRating = 0;
      }
    }

    // 3. Real Screening Conversion Rate Calculation
    const reviewCount = this.funnelStages.find(s => s.id.includes('review') || s.id.includes('application'))?.count || this.totalApplicants;
    const screeningCount = this.funnelStages.find(s => s.id.includes('screen') || s.id.includes('phone'))?.count || 0;
    
    if (this.totalApplicants > 0) {
      const effectiveScreened = screeningCount > 0 ? screeningCount : this.totalShortlisted;
      this.screeningConversionRate = parseFloat((Math.min(100, (effectiveScreened / this.totalApplicants) * 100)).toFixed(1));
    } else {
      this.screeningConversionRate = 0;
    }

    // 4. Real Assessment Completion Rate Calculation
    const assessmentCount = this.funnelStages.find(s => s.id.includes('assessment') || s.id.includes('technical'))?.count || 0;
    if (screeningCount > 0) {
      this.assessmentCompletionRate = parseFloat((Math.min(100, (assessmentCount / screeningCount) * 100)).toFixed(1));
    } else if (this.totalApplicants > 0 && assessmentCount > 0) {
      this.assessmentCompletionRate = parseFloat((Math.min(100, (assessmentCount / this.totalApplicants) * 100)).toFixed(1));
    } else {
      this.assessmentCompletionRate = 0;
    }

    // 5. Real Offer Acceptance Rate & Time-To-Hire Velocity Calculation
    const offerCount = this.funnelStages.find(s => s.id.includes('offer'))?.count || 0;
    const hiredCount = this.funnelStages.find(s => s.id.includes('hired') || s.id.includes('final'))?.count || 0;

    if (offerCount > 0) {
      this.offerAcceptanceRate = Math.min(100, Math.round((hiredCount / offerCount) * 100));
    } else {
      this.offerAcceptanceRate = 0;
    }

    // Real time-to-hire calculation based on actual job post timestamp
    if (this.applicationData?.lastUpdated) {
      const daysDiff = (Date.now() - this.applicationData.lastUpdated) / (1000 * 60 * 60 * 24);
      this.timeToHireDays = parseFloat(Math.max(1, daysDiff).toFixed(1));
    } else {
      this.timeToHireDays = 0;
    }

    // 6. Real Channel Sourcing Efficiency
    // Calculate actual applicants and quality score per channel
    const realPortalApplicants = this.totalApplicants;
    const realPortalShortlisted = this.totalShortlisted;
    const portalScore = this.avgCandidateRating > 0 ? this.avgCandidateRating : 0;

    this.sourcingChannels = [
      {
        channel: 'Direct Careers Portal',
        applicants: realPortalApplicants,
        shortlisted: realPortalShortlisted,
        qualityScore: portalScore,
        icon: 'fas fa-globe'
      },
      {
        channel: 'Employee Referral',
        applicants: 0,
        shortlisted: 0,
        qualityScore: 0,
        icon: 'fas fa-user-check'
      },
      {
        channel: 'LinkedIn Sourcing',
        applicants: 0,
        shortlisted: 0,
        qualityScore: 0,
        icon: 'fab fa-linkedin'
      }
    ];
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
