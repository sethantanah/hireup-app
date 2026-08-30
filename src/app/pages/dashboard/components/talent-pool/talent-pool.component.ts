import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { CandidateService, CandidateProfile } from '../../../../services/candidate.service';
import { ApplicantManagementService } from '../../../../services/applicant-management.service';
import { JobpostManagerService } from '../../../../services/jobpost-manager.service';
import { CustomDropdownComponent } from '../../../../components/custom-dropdown/custom-dropdown.component';

@Component({
  selector: 'app-talent-pool',
  standalone: true,
  imports: [CommonModule, FormsModule, CustomDropdownComponent],
  templateUrl: './talent-pool.component.html',
  styleUrl: './talent-pool.component.scss'
})
export class TalentPoolComponent implements OnInit, OnChanges {
  @Input() availableJobPosts: any[] = [];
  @Input() selectedJobId: string = '';

  candidates: CandidateProfile[] = [];
  selectedOrgJobIds: string[] = [];
  searchQuery: string = '';
  selectedSkill: string = '';
  poolSource: 'global' | 'org' | 'applied' | 'notified' = 'global';

  notifiedCandidateIds: Set<string> = new Set<string>();
  addedPipelineCandidateIds: Set<string> = new Set<string>();
  notifiedCandidatesList: CandidateProfile[] = [];

  isLoading: boolean = false;
  selectedCandidateForDetails: CandidateProfile | null = null;
  selectedCandidateForImport: CandidateProfile | null = null;
  importJobId: string = '';
  importStage: string = 'Application Review';
  importMode: 'alert' | 'direct' = 'alert';
  emailSubject: string = '';
  emailBody: string = '';
  isImporting: boolean = false;

  openCandidateDetailsModal(candidate: CandidateProfile): void {
    this.selectedCandidateForDetails = candidate;
  }

  closeCandidateDetailsModal(): void {
    this.selectedCandidateForDetails = null;
  }

  isCandidateNotified(candidate: CandidateProfile | null): boolean {
    if (!candidate) return false;
    if (candidate.id && this.notifiedCandidateIds.has(candidate.id)) return true;
    if (candidate.user_email && this.notifiedCandidateIds.has(candidate.user_email)) return true;
    const candAny = candidate as any;
    if (candAny.notified || candAny.application_stage === 'Form Requested' || candAny.stage === 'Form Requested') return true;
    return false;
  }

  getSelectedJobTitle(): string {
    const activeJobId = this.importJobId || this.selectedJobId;
    const job = this.availableJobPosts.find(j => j.id === activeJobId);
    return job ? (job.job_title || job.title) : '';
  }

  feedback: { type: 'success' | 'error'; message: string } | null = null;

  stages = [
    'Application Review',
    'Phone Screening',
    'Technical Assessment',
    'Interview',
    'Final Decision',
    'Offer Sent'
  ];

  constructor(
    private candidateService: CandidateService,
    private applicantService: ApplicantManagementService,
    private jobPostService: JobpostManagerService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.initActiveJobSelection();
    this.ensureJobPostsLoaded();
    this.fetchTalentPool();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedJobId'] || changes['availableJobPosts']) {
      this.initActiveJobSelection();
    }
  }

  private ensureJobPostsLoaded(): void {
    if (!this.availableJobPosts || this.availableJobPosts.length === 0) {
      const userData = localStorage.getItem('USER');
      if (userData) {
        try {
          const u = JSON.parse(userData);
          const userId = u.id || u.user_id;
          if (userId) {
            this.jobPostService.getJobPosts(userId).subscribe({
              next: (res: any) => {
                const rawPosts = Array.isArray(res) ? res : (res?.data || []);
                this.availableJobPosts = rawPosts.map((jp: any) => ({
                  ...jp,
                  id: jp.id,
                  job_title: jp.job_title || jp.title || jp.template_data?.job?.title || 'Job Posting',
                  company_name: jp.company_name || jp.company || jp.template_data?.company?.name || u.company_name || 'Organization',
                  department: jp.department || jp.template_data?.job?.department || ''
                }));
                this.initActiveJobSelection();
              }
            });
          }
        } catch (e) {}
      }
    }
  }

  private initActiveJobSelection(): void {
    const routeJobId = this.route.snapshot.paramMap.get('jobId');
    if (!this.selectedJobId && routeJobId) {
      this.selectedJobId = routeJobId;
    }
    if (this.selectedJobId) {
      this.importJobId = this.selectedJobId;
    } else if (this.availableJobPosts.length > 0 && !this.importJobId) {
      this.importJobId = this.availableJobPosts[0].id;
    }
  }

  toggleOrgJobFilter(jobId: string): void {
    const idx = this.selectedOrgJobIds.indexOf(jobId);
    if (idx >= 0) {
      this.selectedOrgJobIds.splice(idx, 1);
    } else {
      this.selectedOrgJobIds.push(jobId);
    }
    this.onFilterChange();
  }

  isOrgJobSelected(jobId: string): boolean {
    return this.selectedOrgJobIds.includes(jobId);
  }

  selectAllOrgJobs(): void {
    this.selectedOrgJobIds = this.availableJobPosts.map(j => j.id).filter(id => !!id);
    this.onFilterChange();
  }

  clearOrgJobFilters(): void {
    this.selectedOrgJobIds = [];
    this.onFilterChange();
  }

  fetchTalentPool(): void {
    this.isLoading = true;
    const jobpostIdsParam = this.selectedOrgJobIds.length > 0 ? this.selectedOrgJobIds.join(',') : undefined;

    this.candidateService.browseTalentPool({
      query: this.searchQuery,
      skill: this.selectedSkill,
      jobpost_id: this.selectedJobId,
      jobpost_ids: jobpostIdsParam,
      source: this.poolSource
    }).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        if (res.success && res.candidates) {
          let list: CandidateProfile[] = res.candidates;

          for (const c of list) {
            const candAny = c as any;
            if (candAny.notified || candAny.application_stage === 'Form Requested' || candAny.stage === 'Form Requested') {
              if (c.id) this.notifiedCandidateIds.add(c.id);
              if (c.user_email) this.notifiedCandidateIds.add(c.user_email);

              const existingIdx = this.notifiedCandidatesList.findIndex(item =>
                (c.id && item.id === c.id) || (c.user_email && item.user_email === c.user_email)
              );
              if (existingIdx === -1) {
                this.notifiedCandidatesList.push(c);
              }
            }
          }

          if (this.poolSource === 'global' || this.poolSource === 'org') {
            list = list.filter(c => !(c.id && this.addedPipelineCandidateIds.has(c.id)) && !(c.user_email && this.addedPipelineCandidateIds.has(c.user_email)));
          } else if (this.poolSource === 'notified') {
            const mergedMap = new Map<string, CandidateProfile>();
            for (const c of this.notifiedCandidatesList) {
              const key = c.id || c.user_email || '';
              if (key) mergedMap.set(key, c);
            }
            for (const c of list) {
              const key = c.id || c.user_email || '';
              if (key) mergedMap.set(key, c);
            }
            list = Array.from(mergedMap.values());
          }
          this.candidates = list;
        }
      },
      error: (err: any) => {
        this.isLoading = false;
        console.error('Failed to load talent pool:', err);
      }
    });
  }

  onFilterChange(): void {
    this.fetchTalentPool();
  }

  runOneClickMatch(): void {
    if (!this.selectedJobId) {
      this.feedback = {
        type: 'error',
        message: 'Please select a Target Job Post to run the Candidate Match Engine against.'
      };
      return;
    }

    this.isLoading = true;
    this.feedback = {
      type: 'success',
      message: `Running Candidate Matching against ${this.poolSource === 'global' ? 'Global Talent Pool' : 'Organization Applicants'}...`
    };

    this.candidateService.browseTalentPool({
      query: this.searchQuery,
      skill: this.selectedSkill,
      jobpost_id: this.selectedJobId,
      source: this.poolSource
    }).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        if (res.success && res.candidates) {
          this.candidates = res.candidates;
          this.feedback = {
            type: 'success',
            message: `Candidate Matching Completed! Ranked ${this.candidates.length} candidates for selected job post.`
          };
        }
      },
      error: (err: any) => {
        this.isLoading = false;
        this.feedback = { type: 'error', message: 'Failed to run Candidate Match Engine.' };
        console.error(err);
      }
    });

    setTimeout(() => {
      if (this.feedback?.type === 'success') {
        this.feedback = null;
      }
    }, 4500);
  }

  get jobRankOptions(): string[] {
    const list = ['-- Match Rank Against All Jobs --'];
    if (this.availableJobPosts && this.availableJobPosts.length > 0) {
      for (const job of this.availableJobPosts) {
        const title = job.job_title || job.title || 'Job Post';
        list.push(`Rank for: ${title}`);
      }
    }
    return list;
  }

  get selectedJobRankTitle(): string {
    if (!this.selectedJobId) return '';
    const job = this.availableJobPosts.find(j => j.id === this.selectedJobId);
    return job ? `Rank for: ${job.job_title || job.title}` : '';
  }

  onJobRankSelect(val: string): void {
    if (!val || val === '-- Match Rank Against All Jobs --') {
      this.selectedJobId = '';
    } else {
      const match = this.availableJobPosts.find(j => `Rank for: ${j.job_title || j.title}` === val);
      this.selectedJobId = match ? match.id : '';
    }
    this.onFilterChange();
  }

  openImportModal(candidate: CandidateProfile, mode: 'alert' | 'direct' = 'alert'): void {
    this.selectedCandidateForImport = candidate;
    this.importMode = mode;

    const routeJobId = this.route.snapshot.paramMap.get('jobId');
    const activeJobId = this.selectedJobId || routeJobId;

    if (activeJobId) {
      this.importJobId = activeJobId;
    } else if (this.availableJobPosts.length > 0) {
      this.importJobId = this.availableJobPosts[0].id;
    }

    this.updateAlertEmailTemplate();
    this.feedback = null;
  }

  getSelectedJobCompanyName(): string {
    const activeJobId = this.importJobId || this.selectedJobId;
    if (this.availableJobPosts && this.availableJobPosts.length > 0) {
      const job = this.availableJobPosts.find(j => j.id === activeJobId);
      if (job) {
        const name = job.company_name || job.company || job.org_name || job.organization_name || job.template_data?.company?.name;
        if (name && name !== 'Organization') return name;
      }
      for (const j of this.availableJobPosts) {
        const name = j.company_name || j.company || j.org_name || j.organization_name || j.template_data?.company?.name;
        if (name && name !== 'Organization') return name;
      }
    }
    const userData = localStorage.getItem('USER');
    if (userData) {
      try {
        const u = JSON.parse(userData);
        if (u?.company_name || u?.org_name) return u.company_name || u.org_name;
      } catch (e) {}
    }
    return 'Organization';
  }

  updateAlertEmailTemplate(): void {
    if (!this.selectedCandidateForImport) return;
    const candidateName = this.selectedCandidateForImport.full_name || 'Candidate';
    const selectedJob = this.availableJobPosts.find(j => j.id === this.importJobId);
    const jobTitle = selectedJob ? (selectedJob.job_title || selectedJob.title) : 'Position';
    const companyName = this.getSelectedJobCompanyName();
    const companySlug = encodeURIComponent(companyName !== 'Organization' ? companyName : 'company');
    const applyUrl = `${window.location.origin}/apply/${companySlug}/${this.importJobId}/`;

    this.emailSubject = `Application Form Request: ${jobTitle} - ${companyName}`;
    this.emailBody = `Dear ${candidateName},\n\nOur talent acquisition team at ${companyName} reviewed your background and would like to invite you to complete the application form for the ${jobTitle} position.\n\nPlease follow the link below to access and complete the application form:\n\n${applyUrl}\n\nWe look forward to receiving your completed form!\n\nBest regards,\nTalent Acquisition Team\n${companyName}`;
  }

  closeImportModal(): void {
    this.selectedCandidateForImport = null;
    this.feedback = null;
  }

  executeAddCandidateToJob(): void {
    if (!this.selectedCandidateForImport?.id || !this.importJobId) {
      this.feedback = { type: 'error', message: 'Please select a target job post.' };
      return;
    }

    this.isImporting = true;
    this.feedback = null;

    const targetStage = this.importMode === 'alert' ? 'Form Requested' : this.importStage;

    this.candidateService.addCandidateToJob(
      this.selectedCandidateForImport.id,
      this.importJobId,
      targetStage
    ).subscribe({
      next: (res: any) => {
        const candId = this.selectedCandidateForImport?.id;
        const candEmail = this.selectedCandidateForImport?.user_email;

        if (candId) this.addedPipelineCandidateIds.add(candId);
        if (candEmail) this.addedPipelineCandidateIds.add(candEmail);

        if (this.importMode === 'alert') {
          if (candId) this.notifiedCandidateIds.add(candId);
          if (candEmail) this.notifiedCandidateIds.add(candEmail);

          if (this.selectedCandidateForImport) {
            const notifiedCandObj: CandidateProfile = {
              ...this.selectedCandidateForImport,
              notified: true,
              application_stage: 'Form Requested'
            } as any;

            const existingIdx = this.notifiedCandidatesList.findIndex(c =>
              (candId && c.id === candId) || (candEmail && c.user_email === candEmail)
            );
            if (existingIdx >= 0) {
              this.notifiedCandidatesList[existingIdx] = notifiedCandObj;
            } else {
              this.notifiedCandidatesList.push(notifiedCandObj);
            }
          }

          if (candEmail) {
            this.applicantService.sendCandidateEmail({
              candidate_email: candEmail,
              candidate_name: this.selectedCandidateForImport?.full_name,
              subject: this.emailSubject,
              body: this.emailBody,
              template_id: 'form_invitation',
              jobpost_id: this.importJobId
            }).subscribe({
              next: () => {},
              error: () => {}
            });
          }
        }

        // Exclude candidate from current pool list so they don't show up again
        if (candId) {
          this.candidates = this.candidates.filter(c => c.id !== candId);
        }

        this.isImporting = false;
        this.feedback = {
          type: 'success',
          message: this.importMode === 'alert'
            ? `Application invitation sent to candidate! ${this.selectedCandidateForImport?.full_name} added to pipeline.`
            : `Candidate ${this.selectedCandidateForImport?.full_name} added directly to pipeline!`
        };
        setTimeout(() => {
          this.closeImportModal();
        }, 2200);
      },
      error: (err: any) => {
        this.isImporting = false;
        console.error('Error importing candidate:', err);
        this.feedback = {
          type: 'error',
          message: err?.error?.detail || 'Failed to process candidate pipeline update.'
        };
      }
    });
  }
}
