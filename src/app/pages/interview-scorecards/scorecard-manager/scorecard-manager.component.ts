import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TalentManagementService } from '../../../services/talent-management.service';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CustomDropdownComponent } from '../../../components/custom-dropdown/custom-dropdown.component';
import { JobpostingsApiService } from '../../../services/jobpostings-api.service';
import { AuthService } from '../../../services/auth.service';
import { SelectedJobService } from '../../../services/selected-job.service';
import { JobpostManagerService } from '../../../services/jobpost-manager.service';

interface Competency {
  id: string;
  name: string;
  description: string;
  weight: number;
  max_score: number;
}

interface ScorecardTemplate {
  id?: string;
  name: string;
  interview_stage: string;
  instructions: string;
  competencies: Competency[];
  jobpost_id: string;
}

interface CompetencyRating {
  competency_id: string;
  competency_name: string;
  score: number;
  notes: string;
}

@Component({
  selector: 'app-scorecard-manager',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, CustomDropdownComponent],
  templateUrl: './scorecard-manager.component.html',
  styleUrl: './scorecard-manager.component.scss'
})
export class ScorecardManagerComponent implements OnInit {
  @Input() jobpostId: string = '';
  @Input() candidateId: string = '';
  @Input() candidateName: string = '';
  @Input() candidateEmail: string = '';
  @Input() mode: 'manage' | 'rate' | 'consensus' = 'manage';
  @Output() close = new EventEmitter<void>();

  // Template management
  templates: ScorecardTemplate[] = [];
  selectedTemplate: ScorecardTemplate | null = null;
  isCreatingTemplate = false;
  isSavingTemplate = false;

  newTemplate: ScorecardTemplate = this.freshTemplate();

  // Rating mode
  ratingTemplate: ScorecardTemplate | null = null;
  competencyRatings: CompetencyRating[] = [];
  overallRecommendation = 'Neutral';
  generalNotes = '';
  isSubmittingRating = false;
  ratingSubmitted = false;

  // Consensus mode
  consensus: any = null;
  panelRatings: any[] = [];
  isLoadingConsensus = false;

  loading = false;
  errorMsg = '';
  successMsg = '';
  jobTitle = '';
  availableJobPosts: Array<{ id: string; label: string }> = [];
  // Workspace shell
  sidebarOpen = false;
  showToolsMenu = true;
  userData: any = null;
  jobPostings: any[] = [];
  selectedJobPost: any = null;

  readonly recommendations = ['Strong Yes', 'Yes', 'Neutral', 'No', 'Strong No'];
  readonly categories = ['Document Signing', 'IT Setup', 'Training', 'HR', 'General', 'Technical', 'Cultural Fit', 'Leadership'];

  get pipelineStages(): Array<{ id: string; label: string }> {
    const jp = this.selectedJobPost || this.jobPostings.find((j: any) => j.id === this.jobpostId);
    const configured = jp?.template_data?.applicationStages || jp?.application_stages;
    if (Array.isArray(configured) && configured.length > 0) {
      return configured
        .filter((s: any) => s.is_active && !s.hide_stage)
        .map((s: any) => ({ id: s.id, label: s.name }));
    }
    return this.jobPostService.defaultStages
      .filter(s => s.is_active && !s.hide_stage)
      .map(s => ({ id: s.id, label: s.name }));
  }

  getStageLabel(stageId: string): string {
    if (!stageId) return '';
    return this.pipelineStages.find(s => s.id === stageId)?.label || stageId;
  }

  getJobLabel(jobId: string): string {
    if (!jobId) return 'No Job Assigned';
    return this.availableJobPosts.find(j => j.id === jobId)?.label || jobId;
  }

  get headerJobOptions(): Array<{ id: string; label: string }> {
    const opts = [...this.availableJobPosts];
    if (this.jobpostId && !opts.find(o => o.id === this.jobpostId)) {
      const jp = this.jobPostings.find((j: any) => j.id === this.jobpostId);
      opts.unshift({ id: this.jobpostId, label: jp?.title || this.jobTitle || this.jobpostId });
    }
    return opts;
  }

  onHeaderJobChange(jobId: string): void {
    this.jobpostId = jobId;
    this.newTemplate.jobpost_id = jobId;
    this.selectedJobService.setSelectedJobId(jobId);
    this.loadTemplates();
  }

  constructor(
    private talentSvc: TalentManagementService,
    private route: ActivatedRoute,
    private router: Router,
    private jobpostingsApi: JobpostingsApiService,
    private location: Location,
    private authService: AuthService,
    private selectedJobService: SelectedJobService,
    private jobPostService: JobpostManagerService
  ) {}

  goBack(): void {
    this.location.back();
  }
  toggleSidebar(): void { this.sidebarOpen = !this.sidebarOpen; }
  logOut(): void { this.authService.logOut(); }
  getInitials(name:string): string { return (name||'').split(' ').map((n:string)=>n[0]).join('').toUpperCase().slice(0,2); }
  selectJobFromSidebar(job:any): void { this.selectedJobPost = job; this.jobpostId = job.id; this.newTemplate.jobpost_id = job.id; this.selectedJobService.setSelectedJobId(job.id); this.loadTemplates(); }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['jobId']) {
        this.jobpostId = params['jobId'];
        this.newTemplate.jobpost_id = this.jobpostId;
        this.selectedJobService.setSelectedJobId(params['jobId']);
      } else {
        const svcId = this.selectedJobService.selectedJobId;
        if (svcId && !this.jobpostId) {
          this.jobpostId = svcId;
          this.newTemplate.jobpost_id = svcId;
        }
      }
      if (params['candidateId']) {
        this.candidateId = params['candidateId'];
      }
      if (params['candidateName']) {
        this.candidateName = params['candidateName'];
      }
      if (params['candidateEmail']) {
        this.candidateEmail = params['candidateEmail'];
      }
      if (params['mode']) {
        this.mode = params['mode'] as any;
      }
      this.initComponent();
    });
    this.selectedJobService.selectedJobId$.subscribe(id => {
      if (id && id !== this.jobpostId) {
        this.jobpostId = id;
        this.newTemplate.jobpost_id = id;
        this.loadTemplates();
      }
    });
  }

  initComponent(): void {
    if (this.mode === 'manage' || this.mode === 'rate') {
      this.loadTemplates();
    }
    if (this.mode === 'consensus' && this.candidateId) {
      // Consensus will load once a template is selected
    }
    this.newTemplate.jobpost_id = this.jobpostId;
    if (this.jobpostId) {
      this.jobpostingsApi.getJobPostingById(this.jobpostId).subscribe({
        next: (res: any) => {
          this.jobTitle = res?.title || '';
          
          if (this.jobpostId && this.jobTitle) {
            const exists = this.availableJobPosts.find(j => j.id === this.jobpostId);
            if (!exists) {
              this.availableJobPosts = [...this.availableJobPosts, { id: this.jobpostId, label: this.jobTitle }];
            } else {
              exists.label = this.jobTitle;
            }
          }
        }
      });
    }

    try {
      const userStr = localStorage.getItem('USER');
      if (userStr) {
        const user = JSON.parse(userStr);
        this.userData = user;
        if (user && user.id) {
          this.jobpostingsApi.getJobPostings(user.id).subscribe({
            next: (jobs: any[]) => {
              const newJobs = jobs.map(j => ({ id: j.id, label: j.title }));
              const existingIds = new Set(this.availableJobPosts.map(j => j.id));
              const missingJobs = newJobs.filter(j => !existingIds.has(j.id));
              this.availableJobPosts = [...this.availableJobPosts, ...missingJobs];
              this.jobPostings = jobs as any[];
              if (this.jobpostId) this.selectedJobPost = this.jobPostings.find((j:any)=>j.id===this.jobpostId) || this.jobPostings[0] || null;
            }
          });
        }
      }
    } catch (e) {}
  }

  freshTemplate(): ScorecardTemplate {
    return {
      name: this.jobTitle ? `${this.jobTitle} Interview` : '',
      interview_stage: '',
      instructions: '',
      competencies: [],
      jobpost_id: this.jobpostId || '',
    };
  }

  loadTemplates(): void {
    if (!this.jobpostId) return;
    this.loading = true;
    this.talentSvc.listScorecardTemplates(this.jobpostId).subscribe({
      next: (res: any) => {
        this.templates = res.templates || [];
        this.loading = false;
        if (this.mode === 'rate' && this.templates.length > 0) {
          this.selectTemplateForRating(this.templates[0]);
        }
      },
      error: () => { this.loading = false; }
    });
  }

  // ─── Template Management ───────────────────────────

  startCreate(): void {
    this.isCreatingTemplate = true;
    this.newTemplate = this.freshTemplate();
    this.newTemplate.jobpost_id = this.jobpostId;
    // ensure the default name populates if we just fetched jobTitle
    if (this.jobTitle && !this.newTemplate.name) {
      this.newTemplate.name = `${this.jobTitle} Interview`;
    }
    this.selectedTemplate = null;
  }

  cancelCreate(): void {
    this.isCreatingTemplate = false;
    this.newTemplate = this.freshTemplate();
  }

  duplicateTemplate(): void {
    if (!this.selectedTemplate) return;
    this.isCreatingTemplate = true;
    this.newTemplate = JSON.parse(JSON.stringify(this.selectedTemplate));
    this.newTemplate.id = undefined;
    this.newTemplate.name = `${this.newTemplate.name} (Copy)`;
    this.selectedTemplate = null;
  }

  selectTemplate(t: ScorecardTemplate): void {
    this.selectedTemplate = JSON.parse(JSON.stringify(t));
    this.isCreatingTemplate = false;
  }

  addCompetency(target: ScorecardTemplate): void {
    target.competencies.push({
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2),
      name: '',
      description: '',
      weight: 1,
      max_score: 5,
    });
  }

  removeCompetency(target: ScorecardTemplate, idx: number): void {
    target.competencies.splice(idx, 1);
  }

  saveNewTemplate(): void {
    if (!this.newTemplate.name || this.newTemplate.competencies.length === 0) {
      this.errorMsg = 'Please add a template name and at least one competency.';
      return;
    }
    this.isSavingTemplate = true;
    this.errorMsg = '';
    this.talentSvc.createScorecardTemplate(this.newTemplate).subscribe({
      next: (res: any) => {
        this.templates.push(res.template);
        this.isSavingTemplate = false;
        this.isCreatingTemplate = false;
        this.successMsg = 'Scorecard template created!';
        this.newTemplate = this.freshTemplate();
        setTimeout(() => this.successMsg = '', 3000);
      },
      error: (err: any) => {
        this.isSavingTemplate = false;
        this.errorMsg = err?.error?.detail || 'Failed to save template.';
      }
    });
  }

  saveUpdatedTemplate(): void {
    if (!this.selectedTemplate) return;
    this.isSavingTemplate = true;
    this.talentSvc.updateScorecardTemplate(this.selectedTemplate.id!, this.selectedTemplate).subscribe({
      next: (res: any) => {
        const idx = this.templates.findIndex(t => t.id === res.template.id);
        if (idx !== -1) this.templates[idx] = res.template;
        this.isSavingTemplate = false;
        this.successMsg = 'Template updated!';
        setTimeout(() => this.successMsg = '', 3000);
      },
      error: (err: any) => {
        this.isSavingTemplate = false;
        this.errorMsg = err?.error?.detail || 'Failed to update template.';
      }
    });
  }

  deleteTemplate(template: ScorecardTemplate): void {
    if (!confirm(`Delete scorecard "${template.name}"?`)) return;
    this.talentSvc.deleteScorecardTemplate(template.id!).subscribe({
      next: () => {
        this.templates = this.templates.filter(t => t.id !== template.id);
        if (this.selectedTemplate?.id === template.id) this.selectedTemplate = null;
      },
      error: (err: any) => { this.errorMsg = err?.error?.detail || 'Delete failed.'; }
    });
  }

  // ─── Interview Rating ───────────────────────────────

  selectTemplateForRating(t: ScorecardTemplate): void {
    this.ratingTemplate = t;
    this.competencyRatings = t.competencies.map(c => ({
      competency_id: c.id,
      competency_name: c.name,
      score: 0,
      notes: '',
    }));
    this.ratingSubmitted = false;

    // Pre-load existing rating if any
    this.talentSvc.getMyRating(this.candidateId, t.id!).subscribe({
      next: (res: any) => {
        if (res.rating) {
          this.competencyRatings = res.rating.ratings || this.competencyRatings;
          this.overallRecommendation = res.rating.overall_recommendation || 'Neutral';
          this.generalNotes = res.rating.general_notes || '';
          this.ratingSubmitted = true;
        }
      }
    });

    if (this.mode === 'consensus') {
      this.loadConsensus(t.id!);
    }
  }

  submitRating(): void {
    if (!this.ratingTemplate || !this.candidateId) return;
    const unrated = this.competencyRatings.filter(r => r.score === 0);
    if (unrated.length > 0) {
      this.errorMsg = `Please rate all ${unrated.length} remaining competency/ies.`;
      return;
    }
    this.isSubmittingRating = true;
    this.errorMsg = '';
    const payload = {
      scorecard_template_id: this.ratingTemplate.id,
      jobpost_id: this.jobpostId,
      candidate_id: this.candidateId,
      candidate_name: this.candidateName,
      candidate_email: this.candidateEmail,
      interview_stage: this.ratingTemplate.interview_stage,
      ratings: this.competencyRatings,
      overall_recommendation: this.overallRecommendation,
      general_notes: this.generalNotes,
    };
    this.talentSvc.submitInterviewRating(payload).subscribe({
      next: () => {
        this.isSubmittingRating = false;
        this.ratingSubmitted = true;
        this.successMsg = 'Rating submitted successfully!';

        // Persist rating to localStorage for instant scorecard average sync
        try {
          const stored = JSON.parse(localStorage.getItem('HIREUP_CANDIDATE_SCORECARDS') || '{}');
          const stage = this.ratingTemplate?.interview_stage || 'application_review';
          const key1 = `${this.candidateId}_${this.jobpostId}_${stage}`;
          const key2 = `${this.candidateId}_${this.jobpostId}`;
          const ratedScores = this.competencyRatings.map(r => r.score).filter(s => typeof s === 'number' && s > 0);
          const avgScore = ratedScores.length > 0 ? (ratedScores.reduce((a, b) => a + b, 0) / ratedScores.length) : 0;
          const scObj = {
            averageScore: avgScore,
            ratings: this.competencyRatings,
            recommendation: this.overallRecommendation,
            generalNotes: this.generalNotes,
            updatedAt: new Date().toISOString()
          };
          stored[key1] = scObj;
          stored[key2] = scObj;
          localStorage.setItem('HIREUP_CANDIDATE_SCORECARDS', JSON.stringify(stored));
        } catch (e) {}

        setTimeout(() => this.successMsg = '', 4000);
      },
      error: (err: any) => {
        this.isSubmittingRating = false;
        this.errorMsg = err?.error?.detail || 'Failed to submit rating.';
      }
    });
  }

  // ─── Panel Consensus ───────────────────────────────

  loadConsensus(templateId: string): void {
    if (!this.candidateId) return;
    this.isLoadingConsensus = true;
    this.talentSvc.getPanelConsensus(this.candidateId, templateId).subscribe({
      next: (res: any) => {
        this.consensus = res.consensus;
        this.panelRatings = res.ratings || [];
        this.isLoadingConsensus = false;
      },
      error: () => { this.isLoadingConsensus = false; }
    });
  }

  getRecommendationColor(rec: string): string {
    const map: Record<string, string> = {
      'Strong Hire': 'text-emerald-700 bg-emerald-50 border-emerald-200',
      'Hire': 'text-green-700 bg-green-50 border-green-200',
      'Mixed Signals': 'text-amber-700 bg-amber-50 border-amber-200',
      'No Hire': 'text-rose-700 bg-rose-50 border-rose-200',
      'Strong No Hire': 'text-red-800 bg-red-100 border-red-300',
    };
    return map[rec] || 'text-slate-700 bg-slate-50 border-slate-200';
  }

  scorePercent(score: number, max: number): number {
    return max > 0 ? Math.round((score / max) * 100) : 0;
  }
}
