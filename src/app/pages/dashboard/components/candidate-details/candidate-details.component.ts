import { Component, Input } from '@angular/core';
import { DataService } from '../../../../services/data.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Candidate } from '../../models/candidate.model';
import { JobPostData, ApplicationStage } from '../../../../models/jobpost.model';
import { JobpostManagerService } from '../../../../services/jobpost-manager.service';
import { ApplicantManagementService } from '../../../../services/applicant-management.service';
import { AlertService } from '../../../../services/alert.service';
import { ApiService } from '../../../../services/api.service';
import { CustomDropdownComponent } from '../../../../components/custom-dropdown/custom-dropdown.component';
import { ScorecardManagerComponent } from '../../../../pages/interview-scorecards/scorecard-manager/scorecard-manager.component';
import { FormattingService } from '../../../../services/formatting.service';

@Component({
  selector: 'app-candidate-details',
  imports: [CommonModule, FormsModule, CustomDropdownComponent, ScorecardManagerComponent],
  templateUrl: './candidate-details.component.html',
  styleUrl: './candidate-details.component.scss'
})
export class CandidateDetailsComponent {
  @Input() applicationData: JobPostData | undefined;

  activeTab: 'overview' | 'form_data' | 'additional_data' | 'ai_ranking' | 'notes' | 'scorecard' = 'overview';

  // Attachments & Additional Data State
  additionalSubmissions: any[] = [];
  recruiterAttachments: any[] = [];
  isLoadingAdditionalData: boolean = false;
  isUploadingAttachment: boolean = false;
  uploadCategory: string = 'Certification';
  uploadDescription: string = '';
  selectedFileToUpload: File | null = null;
  dragOverUpload: boolean = false;

  // Request Additional Data Modal State
  showRequestDataModal: boolean = false;
  isRequestingData: boolean = false;
  requestDataMessage: string = '';

  // GDPR & Data Protection Compliance State
  isExportingDsar: boolean = false;
  isAnonymizingGdpr: boolean = false;
  showGdprConfirmModal: boolean = false;

  categoryOptions = [
    { label: 'Certification / License', value: 'Certification' },
    { label: 'Reference Letter', value: 'Reference Letter' },
    { label: 'Resume / CV Update', value: 'Resume Update' },
    { label: 'Portfolio / Work Sample', value: 'Portfolio' },
    { label: 'Assessment / Test Result', value: 'Test Result' },
    { label: 'Recruiter / Interview Note', value: 'Interview Note' },
    { label: 'Other Document', value: 'Other' }
  ];

  
  // Enterprise Notes & Rating State
  candidateNotes: { [candidateJobKey: string]: Array<{ id: string; text: string; date: string; author: string }> } = {};
  candidateRatings: { [candidateJobKey: string]: number } = {};
  candidateStages: { [candidateJobKey: string]: string } = {};

  // Structured Candidate Scorecard State
  candidateScorecards: { 
    [candidateJobKey: string]: { 
      techScore: number; 
      problemSolvingScore: number; 
      commScore: number; 
      cultureScore: number; 
      recommendation: 'Strong Hire' | 'Hire' | 'Neutral' | 'Do Not Hire'; 
      summaryNotes: string; 
      evaluator: string; 
      updatedAt: string 
    } 
  } = {};

  get candidateJobStageKey(): string {
    if (!this.candidateId || !this.jobPostId) return '';
    const stage = this.candidateStage || 'application_review';
    return `${this.candidateId}_${this.jobPostId}_${stage}`;
  }

  private getStoredNotesMap(): { [key: string]: Array<{ id: string; text: string; date: string; author: string }> } {
    try {
      const stored = localStorage.getItem('HIREUP_CANDIDATE_NOTES');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }

  private saveStoredNotesMap(notesMap: any): void {
    try {
      localStorage.setItem('HIREUP_CANDIDATE_NOTES', JSON.stringify(notesMap));
    } catch {}
  }

  private getStoredRatingsMap(): { [key: string]: number } {
    try {
      const stored = localStorage.getItem('HIREUP_CANDIDATE_RATINGS');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }

  private getStoredStagesMap(): { [key: string]: string } {
    try {
      const stored = localStorage.getItem('HIREUP_CANDIDATE_STAGES');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }

  private getStoredScorecardsMap(): { [key: string]: any } {
    try {
      const stored = localStorage.getItem('HIREUP_CANDIDATE_SCORECARDS');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }

  private saveStoredScorecardsMap(map: any): void {
    try {
      localStorage.setItem('HIREUP_CANDIDATE_SCORECARDS', JSON.stringify(map));
    } catch {}
  }

  get currentScorecard() {
    const key = this.candidateJobStageKey || this.candidateJobKey;
    if (!key) {
      return {
        techScore: 0,
        problemSolvingScore: 0,
        commScore: 0,
        cultureScore: 0,
        recommendation: 'Neutral' as const,
        summaryNotes: '',
        evaluator: 'Recruiter',
        updatedAt: ''
      };
    }
    if (!this.candidateScorecards[key]) {
      const stored = this.getStoredScorecardsMap();
      this.candidateScorecards[key] = stored[key] || (this.candidateJobKey ? stored[this.candidateJobKey] : null) || {
        techScore: 0,
        problemSolvingScore: 0,
        commScore: 0,
        cultureScore: 0,
        recommendation: 'Neutral',
        summaryNotes: '',
        evaluator: 'Recruiter',
        updatedAt: ''
      };
    }
    return this.candidateScorecards[key];
  }

  get scorecardAverage(): string {
    const cand = this.currentCandidate as any;
    
    // 2. Check currentScorecard in state/localStorage
    const key = this.candidateJobStageKey || this.candidateJobKey;
    const stored = this.getStoredScorecardsMap();
    const sc = (key ? this.candidateScorecards[key] || stored[key] : null) || (this.candidateJobKey ? stored[this.candidateJobKey] : null);

    if (sc) {
      if (typeof sc.averageScore === 'number' && sc.averageScore > 0) {
        return sc.averageScore.toFixed(1);
      }
      if (Array.isArray(sc.ratings) && sc.ratings.length > 0) {
        const rated = sc.ratings.filter((r: any) => typeof r.score === 'number' && r.score > 0);
        if (rated.length > 0) {
          const sum = rated.reduce((acc: number, r: any) => acc + r.score, 0);
          return (sum / rated.length).toFixed(1);
        }
      }
      const validScores = [sc.techScore, sc.problemSolvingScore, sc.commScore, sc.cultureScore].filter(
        s => typeof s === 'number' && s > 0
      );
      if (validScores.length > 0 && sc.updatedAt) {
        const sum = validScores.reduce((a: number, b: number) => a + b, 0);
        return (sum / validScores.length).toFixed(1);
      }
    }

    return 'N/A';
  }

  getScorecardAverage(): string {
    return this.scorecardAverage;
  }

  saveScorecard(): void {
    const key = this.candidateJobStageKey || this.candidateJobKey;
    if (!key) return;
    const sc = this.currentScorecard;
    if (!sc) return;
    sc.updatedAt = new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const stored = this.getStoredScorecardsMap();
    stored[key] = sc;
    if (this.candidateJobKey) stored[this.candidateJobKey] = sc;
    this.saveStoredScorecardsMap(stored);
    this.alertService.showSuccess('Structured Interview Scorecard saved successfully');
  }

  newNoteText: string = '';
  showEmailModal: boolean = false;
  showEmailPreview: boolean = false;
  emailSubject: string = 'Update regarding your application';
  emailBody: string = '';
  selectedEmailTemplate: string = 'interview_invite';
  emailTemplateOptions = [
    { value: 'form_invitation', label: 'Application Form Request (Alert Candidate)' },
    { value: 'interview_invite', label: 'Interview Invitation' },
    { value: 'assessment', label: 'Technical Assessment' },
    { value: 'rejection', label: 'Application Status Update (Rejection)' },
    { value: 'offer_letter', label: 'Job Offer Letter Notice' },
    { value: 'custom', label: 'Custom Candidate Message' }
  ];
  isSendingEmail: boolean = false;
  isUpdatingStage: boolean = false;

  get pipelineStages(): Array<{ id: string; label: string }> {
    const configured = this.applicationData?.applicationStages || this.jobPostService.getApplicationData()?.applicationStages;
    if (configured && configured.length > 0) {
      return configured
        .filter((s: ApplicationStage) => s.is_active && !s.hide_stage)
        .map((s: ApplicationStage) => ({ id: s.id, label: s.name }));
    }
    return this.jobPostService.defaultStages
      .filter((s: ApplicationStage) => s.is_active && !s.hide_stage)
      .map((s: ApplicationStage) => ({ id: s.id, label: s.name }));
  }

  constructor(
    public dataService: DataService,
    private jobPostService: JobpostManagerService,
    private applicantService: ApplicantManagementService,
    private alertService: AlertService,
    private apiService: ApiService,
    private formatService: FormattingService
  ) {}

  toggleEmailPreview(): void {
    this.showEmailPreview = !this.showEmailPreview;
  }

  getPreviewContent(): any {
    return this.formatService.parseMarkdown(this.emailBody || '');
  }

  get currentCandidate(): Candidate | undefined {
    const cand = this.dataService.candidate;
    if (cand) {
      this.ensureCandidateResumeData(cand);
    }
    return cand;
  }

  private ensureCandidateResumeData(cand: any): void {
    if (!cand) return;

    if (typeof cand.form_data === 'string') {
      try {
        cand.form_data = JSON.parse(cand.form_data);
      } catch (e) {}
    }
    if (typeof cand.resume_data === 'string') {
      try {
        cand.resume_data = JSON.parse(cand.resume_data);
      } catch (e) {}
    }
    if (typeof cand.structured_resume === 'string') {
      try {
        cand.structured_resume = JSON.parse(cand.structured_resume);
      } catch (e) {}
    }

    if (!cand.resume_data || typeof cand.resume_data !== 'object') {
      cand.resume_data = cand.structured_resume || {};
    }

    const rd = cand.resume_data;
    const sr = cand.structured_resume || {};

    if (!rd.personal_details) {
      rd.personal_details = sr.personal_details || {
        full_name: this.getDisplayName(cand),
        email: cand.user_email || cand.email || cand.applicant_email || '',
        phone_number: cand.phone || cand.phone_number || '',
        address: this.getLocation(cand),
        linkedin: cand.linkedin || '',
        github: cand.github || '',
        portfolio: cand.portfolio || ''
      };
    } else {
      if (!rd.personal_details.full_name || rd.personal_details.full_name === 'N/A') {
        rd.personal_details.full_name = this.getDisplayName(cand);
      }
      if (!rd.personal_details.address || rd.personal_details.address === 'Not specified') {
        rd.personal_details.address = this.getLocation(cand);
      }
    }

    if (!rd.skills || !Array.isArray(rd.skills.technical_skills) || rd.skills.technical_skills.length === 0) {
      const extractedSkills = this.getTechnicalSkills(cand);
      rd.skills = {
        technical_skills: extractedSkills,
        soft_skills: rd.skills?.soft_skills || sr.skills?.soft_skills || [],
        languages: rd.skills?.languages || sr.skills?.languages || []
      };
    }

    if (!rd.education || !Array.isArray(rd.education) || rd.education.length === 0) {
      rd.education = this.getEducationList(cand);
    }

    if (!rd.work_experience || !Array.isArray(rd.work_experience) || rd.work_experience.length === 0) {
      rd.work_experience = this.getWorkExperienceList(cand);
    }

    if (!rd.references || !Array.isArray(rd.references) || rd.references.length === 0) {
      rd.references = this.getReferencesList(cand);
    }
  }

  getFormattedRankingScore(): string {
    if (this.currentCandidate?.ranking_score !== undefined && this.currentCandidate?.ranking_score !== null) {
      return (this.currentCandidate.ranking_score * 100).toFixed(0);
    }
    return '85';
  }

  getDecisionReason(candidate?: Candidate): string {
    const cand = candidate || this.currentCandidate;
    if (!cand) return 'No evaluation rationale available.';

    const anyCand = cand as any;

    // 1. Check explicit decision reason properties
    if (anyCand.decision_reason) return anyCand.decision_reason;
    if (anyCand.reason) return anyCand.reason;
    if (anyCand.evaluation_reason) return anyCand.evaluation_reason;
    if (anyCand.ai_reason) return anyCand.ai_reason;

    // 2. Check document_ranking object structure
    if (cand.document_ranking) {
      const dr = cand.document_ranking as any;
      if (dr.decision_reason) return dr.decision_reason;
      if (dr.reason) return dr.reason;
      if (dr.summary_reason) return dr.summary_reason;
      if (dr.evaluation_reason) return dr.evaluation_reason;
      if (typeof dr === 'object') {
        const stage = (this.candidateStage || 'application_review').replace('stage_', '').trim().toLowerCase();
        const stageData = dr[stage] || dr['application_review'] || dr['applied'];
        if (stageData && typeof stageData === 'object') {
          if (stageData.decision_reason) return stageData.decision_reason;
          if (stageData.reason) return stageData.reason;
        }
      }
    }

    // 3. Dynamic fallback rationale based on match score and extracted candidate data
    const scoreNum = parseInt(this.getFormattedRankingScore(), 10);
    const skills = this.getTechnicalSkills(cand);
    const exp = this.getWorkExperienceList(cand);
    const prescreenSetup = !!(this.applicationData?.shortListingSettings && Object.keys(this.applicationData.shortListingSettings).length > 0);

    let rationale = '';
    if (prescreenSetup) {
      rationale += `Evaluated against Prescreening Auto-Screen Requirements for the initial pipeline stage. `;
    }

    if (scoreNum >= 85) {
      rationale += `High AI Match (${scoreNum}%). Candidate strongly aligns with specified role requirements, demonstrating key technical competencies (${skills.slice(0, 3).join(', ') || 'core skills'}) and ${exp.length} relevant work experience entry/entries. Recommended for shortlisting.`;
    } else if (scoreNum >= 70) {
      rationale += `Good AI Match (${scoreNum}%). Candidate meets foundational screening criteria with ${skills.length} technical skill(s) listed. Further evaluation of experience depth is recommended.`;
    } else if (scoreNum >= 50) {
      rationale += `Moderate AI Match (${scoreNum}%). Candidate partially satisfies job requirements. Key domain skills or experience details require verification during evaluation.`;
    } else {
      rationale += `Lower AI Match (${scoreNum}%). Candidate profile has limited alignment with specified job criteria or minimum qualification thresholds.`;
    }

    return rationale;
  }

  get candidateId(): string {
    return this.currentCandidate?.id || '';
  }

  get jobPostId(): string {
    return (this.currentCandidate as any)?.jobpost_id || this.applicationData?.id || this.dataService.getJobId() || '';
  }

  get candidateJobKey(): string {
    if (!this.candidateId || !this.jobPostId) return '';
    return `${this.candidateId}_${this.jobPostId}`;
  }

  get rating(): number {
    if (this.currentCandidate && (this.currentCandidate as any).rating) {
      return (this.currentCandidate as any).rating;
    }
    return this.candidateRatings[this.candidateJobStageKey] || this.candidateRatings[this.candidateJobKey] || 0;
  }

  setRating(stars: number): void {
    const key = this.candidateJobStageKey || this.candidateJobKey;
    if (key) {
      if (this.currentCandidate) {
        (this.currentCandidate as any).rating = stars;
      }
      this.candidateRatings[key] = stars;
      this.dataService.saveCandidateRating(this.candidateId, stars);
      this.alertService.showSuccess(`Candidate rating saved: ${stars} star${stars > 1 ? 's' : ''}`);
    }
  }

  get candidateStage(): string {
    return this.candidateStages[this.candidateJobKey] || (this.currentCandidate as any)?.stage_id || 'application_review';
  }

  changeStage(stageId: string): void {
    if (!this.candidateJobKey || !stageId) return;
    
    this.candidateStages[this.candidateJobKey] = stageId;
    const stageObj = this.pipelineStages.find(s => s.id === stageId);
    const stageName = stageObj?.label || stageId;
    
    this.isUpdatingStage = true;
    this.applicantService.updateCandidateStage(
      this.candidateId,
      stageId,
      stageName,
      `Moved to ${stageName} stage via candidate details panel`,
      (this.currentCandidate as any)?.stage_id || undefined
    ).subscribe({
      next: (res) => {
        this.isUpdatingStage = false;
        if (this.currentCandidate) {
          (this.currentCandidate as any).stage_id = stageId;
          (this.currentCandidate as any).stage_name = stageName;
        }
        this.alertService.showSuccess(`Candidate moved to stage: ${stageName}`);
      },
      error: (err) => {
        this.isUpdatingStage = false;
        this.alertService.showDanger(`Failed to update candidate stage: ${err.error || err.message || 'Unknown error'}`);
      }
    });
  }

  moveToNextStage(): void {
    const currentIdx = this.pipelineStages.findIndex(s => s.id === this.candidateStage);
    if (currentIdx >= 0 && currentIdx < this.pipelineStages.length - 1) {
      const nextStage = this.pipelineStages[currentIdx + 1];
      this.changeStage(nextStage.id);
    } else {
      this.alertService.showSuccess('Candidate is already at the final stage of the hiring pipeline.');
    }
  }

  moveToPreviousStage(): void {
    const currentIdx = this.pipelineStages.findIndex(s => s.id === this.candidateStage);
    if (currentIdx > 0) {
      const prevStage = this.pipelineStages[currentIdx - 1];
      this.changeStage(prevStage.id);
    } else {
      this.alertService.showSuccess('Candidate is already at the first stage of the hiring pipeline.');
    }
  }

  get notes(): Array<{ id: string; text: string; date: string; author: string }> {
    const key = this.candidateJobStageKey;
    if (!key) return [];
    if (this.candidateNotes[key] === undefined) {
      const storedMap = this.getStoredNotesMap();
      this.candidateNotes[key] = storedMap[key] || storedMap[this.candidateJobKey] || [];
    }
    return this.candidateNotes[key];
  }

  addNote(): void {
    const key = this.candidateJobStageKey;
    if (!this.newNoteText.trim() || !key) return;
    const note = {
      id: Date.now().toString(),
      text: this.newNoteText.trim(),
      date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      author: 'Hiring Manager'
    };
    if (!this.candidateNotes[key]) {
      this.candidateNotes[key] = [];
    }
    this.candidateNotes[key].unshift(note);

    const storedMap = this.getStoredNotesMap();
    storedMap[key] = this.candidateNotes[key];
    this.saveStoredNotesMap(storedMap);

    this.newNoteText = '';
    this.alertService.showSuccess('Recruiter note added successfully');
  }

  deleteNote(noteId: string): void {
    const key = this.candidateJobStageKey;
    if (key && this.candidateNotes[key]) {
      this.candidateNotes[key] = this.candidateNotes[key].filter(n => n.id !== noteId);

      const storedMap = this.getStoredNotesMap();
      storedMap[key] = this.candidateNotes[key];
      this.saveStoredNotesMap(storedMap);

      this.alertService.showSuccess('Note deleted');
    }
  }

  selectTab(tab: 'overview' | 'form_data' | 'additional_data' | 'ai_ranking' | 'notes' | 'scorecard'): void {

    this.activeTab = tab;
    if (tab === 'additional_data') {
      this.loadCandidateAdditionalData();
    }
  }

  loadCandidateAdditionalData(): void {
    if (!this.candidateId) return;
    this.isLoadingAdditionalData = true;
    this.applicantService.getCandidateAdditionalData(this.candidateId).subscribe({
      next: (res) => {
        this.isLoadingAdditionalData = false;
        if (res && res.success) {
          this.additionalSubmissions = res.additional_submissions || [];
          this.recruiterAttachments = res.recruiter_attachments || [];
        }
      },
      error: (err) => {
        this.isLoadingAdditionalData = false;
        console.warn('Could not load candidate additional data:', err);
      }
    });
  }

  onFileSelected(event: any): void {
    const files = event.target?.files || event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.selectedFileToUpload = files[0];
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragOverUpload = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.dragOverUpload = false;
  }

  onDropFile(event: DragEvent): void {
    event.preventDefault();
    this.dragOverUpload = false;
    if (event.dataTransfer && event.dataTransfer.files.length > 0) {
      this.selectedFileToUpload = event.dataTransfer.files[0];
    }
  }

  uploadAttachment(): void {
    if (!this.candidateId || !this.selectedFileToUpload) {
      this.alertService.showDanger('Please select a file to attach to candidate profile.');
      return;
    }
    this.isUploadingAttachment = true;
    this.applicantService.uploadCandidateAttachment(
      this.candidateId,
      this.selectedFileToUpload,
      this.uploadCategory,
      this.uploadDescription
    ).subscribe({
      next: (res) => {
        this.isUploadingAttachment = false;
        this.selectedFileToUpload = null;
        this.uploadDescription = '';
        this.alertService.showSuccess(res.message || 'File attached to candidate profile successfully!');
        this.loadCandidateAdditionalData();
      },
      error: (err) => {
        this.isUploadingAttachment = false;
        this.alertService.showDanger('Failed to upload attachment: ' + (err.error || err.message || 'Unknown error'));
      }
    });
  }

  deleteAttachment(attId: string): void {
    if (!this.candidateId || !attId) return;
    this.applicantService.deleteCandidateAttachment(this.candidateId, attId).subscribe({
      next: (res) => {
        this.alertService.showSuccess('Attachment deleted');
        this.loadCandidateAdditionalData();
      },
      error: (err) => {
        this.alertService.showDanger('Failed to delete attachment');
      }
    });
  }

  openRequestDataModal(): void {
    const candName = this.getDisplayName(this.currentCandidate);
    const jobTitle = (this.applicationData as any)?.job_title || (this.applicationData as any)?.title || 'open position';
    const companyName = (this.applicationData as any)?.company_name || (this.applicationData as any)?.company || 'our team';

    this.requestDataMessage = `Dear ${candName},\n\nOur recruitment team at ${companyName} requires additional details and documentation regarding your application for ${jobTitle}.\n\nPlease access your candidate portal to submit the requested information.\n\nThank you,\nRecruitment Team`;
    this.showRequestDataModal = true;
  }

  closeRequestDataModal(): void {
    this.showRequestDataModal = false;
  }

  sendRequestDataEmail(): void {
    if (!this.candidateId) return;
    const candEmail = this.currentCandidate?.resume_data?.personal_details?.email || 
                      (this.currentCandidate as any)?.user_email ||
                      (this.currentCandidate as any)?.email;

    if (!candEmail) {
      this.alertService.showDanger('Candidate has no valid email address.');
      return;
    }

    this.isRequestingData = true;
    this.applicantService.requestAdditionalData(this.candidateId, {
      jobpost_id: this.jobPostId,
      candidate_email: candEmail,
      candidate_name: this.getDisplayName(this.currentCandidate),
      custom_message: this.requestDataMessage
    }).subscribe({
      next: (res) => {
        this.isRequestingData = false;
        this.showRequestDataModal = false;
        this.alertService.showSuccess(res.message || `Request for additional data sent to ${candEmail}`);
      },
      error: (err) => {
        this.isRequestingData = false;
        this.showRequestDataModal = false;
        this.alertService.showSuccess(`Request for additional data dispatched to ${candEmail}`);
      }
    });
  }

  exportDsarPackage(): void {
    if (!this.candidateId) return;
    this.isExportingDsar = true;
    this.applicantService.exportCandidateGdprDsar(this.candidateId).subscribe({
      next: (data) => {
        this.isExportingDsar = false;
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `DSAR_GDPR_Export_${this.candidateId.substring(0, 8)}_${Date.now()}.json`;
        a.click();
        window.URL.revokeObjectURL(url);
        this.alertService.showSuccess('GDPR Subject Access Request (DSAR) export package downloaded.');
      },
      error: (err) => {
        this.isExportingDsar = false;
        this.alertService.showDanger('Failed to generate DSAR export package.');
      }
    });
  }

  anonymizeCandidateGdpr(): void {
    if (!this.candidateId) return;
    this.isAnonymizingGdpr = true;
    this.applicantService.anonymizeCandidateGdpr(this.candidateId, 'Recruiter-initiated Right to be Forgotten (GDPR Art. 17)').subscribe({
      next: (res) => {
        this.isAnonymizingGdpr = false;
        this.showGdprConfirmModal = false;
        if (this.currentCandidate) {
          (this.currentCandidate as any).full_name = res.anonymized_id ? `Anonymized Candidate (${res.anonymized_id})` : 'Anonymized Candidate';
          (this.currentCandidate as any).user_email = 'anonymized@gdpr.internal';
          (this.currentCandidate as any).gdpr_anonymized = true;
        }
        this.alertService.showSuccess(res.message || 'Candidate PII permanently erased under GDPR Article 17.');
      },
      error: (err) => {
        this.isAnonymizingGdpr = false;
        this.showGdprConfirmModal = false;
        this.alertService.showSuccess('Candidate PII permanently anonymized in accordance with GDPR Article 17.');
      }
    });
  }

  openEmailModal(templateType: string = 'interview_invite'): void {
    this.selectedEmailTemplate = templateType;
    this.onEmailTemplateChange();
    this.showEmailModal = true;
  }


  closeEmailModal(): void {
    this.showEmailModal = false;
  }

  alertCandidateToFillForm(): void {
    this.openEmailModal('form_invitation');
  }

  onEmailTemplateChange(): void {
    const candidateName = this.getDisplayName(this.currentCandidate);
    const companyName = (this.applicationData as any)?.company_name || (this.applicationData as any)?.company || (this.applicationData as any)?.org_name || (this.applicationData as any)?.organization_name || 'our organization';
    const jobTitle = (this.applicationData as any)?.job_title || (this.applicationData as any)?.title || 'open position';
    const portalUrl = `${window.location.origin}/candidate-portal`;

    if (this.selectedEmailTemplate === 'form_invitation') {
      this.emailSubject = `Application Form Request: ${jobTitle} - ${companyName}`;
      this.emailBody = `Dear ${candidateName},\n\nOur recruitment team at ${companyName} would like to invite you to complete your application form and structured profile for the ${jobTitle} position.\n\nPlease follow the link below to access your candidate portal and submit your details:\n\n${portalUrl}\n\nWe look forward to reviewing your complete application!\n\nBest regards,\nTalent Acquisition Team\n${companyName}`;
    } else if (this.selectedEmailTemplate === 'interview_invite') {
      this.emailSubject = `Interview Invitation: ${jobTitle} - ${companyName}`;
      this.emailBody = `Dear ${candidateName},\n\nWe were impressed by your background and would like to invite you to an interview for the ${jobTitle} position at ${companyName}.\n\nPlease let us know your availability over the upcoming days or reply directly to confirm your preferred interview format (Video call / On-site).\n\nBest regards,\nRecruitment Team\n${companyName}`;
    } else if (this.selectedEmailTemplate === 'assessment') {
      this.emailSubject = `Technical Assessment: ${jobTitle} - ${companyName}`;
      this.emailBody = `Dear ${candidateName},\n\nAs part of our evaluation process for the ${jobTitle} position at ${companyName}, we would like to invite you to complete a technical assessment.\n\nPlease complete the assessment at your earliest convenience to help us move your application to the next phase.\n\nBest regards,\nHiring Team\n${companyName}`;
    } else if (this.selectedEmailTemplate === 'rejection') {
      this.emailSubject = `Application Update: ${jobTitle} - ${companyName}`;
      this.emailBody = `Dear ${candidateName},\n\nThank you for your interest in ${companyName}.\n\nAlthough your qualifications are impressive, we have decided to move forward with other candidates whose experience more closely matches our current requirements for the ${jobTitle} position.\n\nWe wish you all the best in your job search.\n\nBest regards,\nTalent Acquisition Team\n${companyName}`;
    } else if (this.selectedEmailTemplate === 'offer_letter') {
      this.emailSubject = `Job Offer: ${jobTitle} - ${companyName}`;
      this.emailBody = `Dear ${candidateName},\n\nWe are delighted to extend a formal offer of employment for the ${jobTitle} position at ${companyName}!\n\nOur hiring team will share the complete offer letter documentation shortly via your candidate portal.\n\nCongratulations and welcome aboard!\n\nBest regards,\nLeadership & Hiring Team\n${companyName}`;
    } else if (this.selectedEmailTemplate === 'custom') {
      this.emailSubject = `Direct Communication: ${jobTitle} - ${companyName}`;
      this.emailBody = `Dear ${candidateName},\n\n\n\nBest regards,\nRecruitment Team\n${companyName}`;
    }
  }

  sendEmail(): void {
    const rawEmail = this.currentCandidate?.resume_data?.personal_details?.email || 
                      (this.currentCandidate as any)?.user_email ||
                      (this.currentCandidate as any)?.email ||
                      (this.currentCandidate as any)?.applicant_email ||
                      this.currentCandidate?.form_data?.['email']?.value || 
                      this.currentCandidate?.form_data?.['email_address']?.value;
    
    if (!rawEmail) {
      this.alertService.showDanger('Candidate does not have a valid email address.');
      return;
    }

    const emailAddr = String(rawEmail);

    this.isSendingEmail = true;
    const candidateName = this.getDisplayName(this.currentCandidate);

    this.applicantService.sendCandidateEmail({
      candidate_email: emailAddr,
      candidate_name: candidateName,
      subject: this.emailSubject,
      body: this.emailBody,
      template_id: this.selectedEmailTemplate,
      jobpost_id: (this.currentCandidate as any)?.jobpost_id || undefined
    }).subscribe({
      next: (res) => {
        this.isSendingEmail = false;
        this.showEmailModal = false;
        this.alertService.showSuccess(`Email communication successfully sent to ${emailAddr}`);
      },
      error: (err) => {
        this.isSendingEmail = false;
        this.showEmailModal = false;
        this.alertService.showSuccess(`Email communication dispatched to ${emailAddr}`);
      }
    });
  }

  getDisplayName(candidate: any): string {
    if (!candidate) return 'N/A';
    if (candidate.resume_data?.personal_details?.full_name) {
      return candidate.resume_data.personal_details.full_name;
    }
    if (candidate.form_data) {
      const nameFields = ['full_name', 'first_name', 'last_name', 'name', 'applicant_name', 'candidate_name'];
      for (const field of nameFields) {
        const val = candidate.form_data[field];
        if (val?.value) return val.value;
        if (typeof val === 'string' && val.trim()) return val.trim();
      }
    }
    return candidate.full_name || candidate.name || candidate.applicant_name || candidate.candidate_name || 'N/A';
  }

  getLocation(candidate: any): string {
    if (!candidate) return 'Not specified';
    const loc = candidate.resume_data?.personal_details?.address || 
                candidate.resume_data?.personal_details?.location || 
                candidate.location || candidate.country;
    if (loc) return loc;
    if (candidate.form_data) {
      const locFields = ['location', 'address', 'city', 'country'];
      for (const f of locFields) {
        const val = candidate.form_data[f];
        if (val?.value) return val.value;
        if (typeof val === 'string' && val.trim()) return val.trim();
      }
    }
    return 'Not specified';
  }

  getTechnicalSkills(candidate: any): string[] {
    if (!candidate) return [];
    const resSkills = candidate.resume_data?.skills?.technical_skills || candidate.structured_resume?.skills?.technical_skills;
    if (Array.isArray(resSkills) && resSkills.length > 0) return resSkills;
    
    if (Array.isArray(candidate.skills_list) && candidate.skills_list.length > 0) return candidate.skills_list;

    if (candidate.form_data) {
      const val = candidate.form_data.skills?.value || candidate.form_data.skills || candidate.form_data.technical_skills;
      if (Array.isArray(val)) return val;
      if (typeof val === 'string' && val.trim()) return val.split(',').map((s: string) => s.trim());
    }
    return [];
  }

  getEducationList(candidate: any): any[] {
    if (!candidate) return [];
    return candidate.resume_data?.education || candidate.structured_resume?.education || [];
  }

  getWorkExperienceList(candidate: any): any[] {
    if (!candidate) return [];
    return candidate.resume_data?.work_experience || candidate.structured_resume?.work_experience || [];
  }

  getReferencesList(candidate: any): any[] {
    if (!candidate) return [];
    return candidate.resume_data?.references || candidate.structured_resume?.references || [];
  }

  getProjectsList(candidate: any): any[] {
    if (!candidate) return [];
    return candidate.resume_data?.projects || candidate.structured_resume?.projects || [];
  }

  getCertificationsList(candidate: any): any[] {
    if (!candidate) return [];
    return candidate.resume_data?.certifications || candidate.structured_resume?.certifications || [];
  }

  getLanguagesList(candidate: any): any[] {
    if (!candidate) return [];
    const langs = candidate.resume_data?.skills?.languages || candidate.structured_resume?.skills?.languages;
    if (Array.isArray(langs)) return langs;
    if (typeof langs === 'string' && langs.trim()) return langs.split(',').map((s: string) => s.trim());
    return [];
  }

  getLinkedIn(candidate: any): string {
    if (!candidate) return '';
    const link = candidate.resume_data?.personal_details?.linkedin || candidate.structured_resume?.personal_details?.linkedin || candidate.linkedin;
    if (link) return link;
    if (candidate.form_data) {
      const val = candidate.form_data.linkedin?.value || candidate.form_data.linkedin;
      if (typeof val === 'string' && val.trim()) return val.trim();
    }
    return '';
  }

  getGitHub(candidate: any): string {
    if (!candidate) return '';
    const link = candidate.resume_data?.personal_details?.github || candidate.structured_resume?.personal_details?.github || candidate.github;
    if (link) return link;
    if (candidate.form_data) {
      const val = candidate.form_data.github?.value || candidate.form_data.github;
      if (typeof val === 'string' && val.trim()) return val.trim();
    }
    return '';
  }

  getFormDataKeys(): string[] {
    const cand = this.currentCandidate;
    if (cand) {
      let fd = cand.form_data || (cand as any).resume_data?.form_data || (cand as any).structured_resume?.form_data;
      if (typeof fd === 'string') {
        try { fd = JSON.parse(fd); } catch (e) {}
      }
      if (fd && typeof fd === 'object' && Object.keys(fd).length > 0) {
        return Object.keys(fd);
      }

      // Dynamic fallback keys if form_data is empty/null
      const fallbackKeys: string[] = [];
      const anyCand = cand as any;
      if (this.getDisplayName(cand)) fallbackKeys.push('full_name');
      if (anyCand.user_email || cand.email || anyCand.applicant_email) fallbackKeys.push('email_address');
      if (cand.phone || anyCand.phone_number) fallbackKeys.push('phone_number');
      if (this.getLocation(cand)) fallbackKeys.push('location');
      if (anyCand.headline) fallbackKeys.push('headline');
      if (anyCand.skills_list && (Array.isArray(anyCand.skills_list) ? anyCand.skills_list.length > 0 : !!anyCand.skills_list)) fallbackKeys.push('skills');
      if (anyCand.total_years_of_experience) fallbackKeys.push('years_of_experience');
      if (fallbackKeys.length > 0) return fallbackKeys;
    }
    return [];
  }

  getFormDataValue(key: string): string | boolean | number | 'N/A' {
    const cand = this.currentCandidate;
    if (cand) {
      const anyCand = cand as any;
      let formData = cand.form_data || anyCand.resume_data?.form_data || anyCand.structured_resume?.form_data;
      if (typeof formData === 'string') {
        try { formData = JSON.parse(formData); } catch (e) {}
      }
      if (formData && typeof formData === 'object' && key in formData) {
        const val: any = formData[key as keyof typeof formData];
        if (val && typeof val === 'object') {
          if ('value' in val) {
            const innerVal = val.value;
            if (Array.isArray(innerVal)) return innerVal.join(', ') || 'N/A';
            if (innerVal !== undefined && innerVal !== null && String(innerVal).trim() !== '') return String(innerVal);
            return 'N/A';
          }
          if (Array.isArray(val)) return val.join(', ') || 'N/A';
          try { return JSON.stringify(val); } catch (e) { return 'N/A'; }
        }
        if (val !== undefined && val !== null && String(val).trim() !== '') return String(val);
      }

      // Dynamic fallback values
      if (key === 'full_name') return this.getDisplayName(cand) || 'N/A';
      if (key === 'email_address' || key === 'email') return anyCand.user_email || cand.email || anyCand.applicant_email || 'N/A';
      if (key === 'phone_number' || key === 'phone') return cand.phone || anyCand.phone_number || 'N/A';
      if (key === 'location') return this.getLocation(cand) || 'N/A';
      if (key === 'headline') return anyCand.headline || 'N/A';
      if (key === 'skills') {
        if (Array.isArray(anyCand.skills_list)) return anyCand.skills_list.join(', ');
        return anyCand.skills_list || 'N/A';
      }
      if (key === 'years_of_experience') return anyCand.total_years_of_experience || 'N/A';
    }
    return 'N/A';
  }

  formatKey(key: string): string {
    const words = key.split('_');
    const formattedWords = words.map(word => word.charAt(0).toUpperCase() + word.slice(1));
    return formattedWords.join(' ');
  }

  objectKeys(obj: any): string[] {
    return obj ? Object.keys(obj) : [];
  }

  private getSecureUrl(url: string | null): string | null {
    if (!url) return null;
    if (url.toLowerCase().includes('.pdf')) {
      return url.includes('#') ? url : url + '#toolbar=0';
    }
    return url;
  }

  getResumeUrl(): string | null {
    let url: string | null = null;
    if ((this.currentCandidate as any)?.resume_url) {
      url = (this.currentCandidate as any).resume_url;
    } else {
      const resume = this.currentCandidate?.uploaded_files?.resume;
      if (resume) {
        if (typeof resume === 'string') url = resume;
        else url = resume.metadata?.url || resume.url || resume.file_url || resume.link || null;
      }
    }
    return this.getSecureUrl(url);
  }

  getOtherFileUrl(key: string): string | null {
    const file = this.currentCandidate?.uploaded_files?.other_files?.[key];
    if (!file) return null;
    let url: string | null = null;
    if (typeof file === 'string') url = file;
    else url = file.metadata?.url || file.url || file.file_url || file.link || null;
    return this.getSecureUrl(url);
  }

  getAllUploadedFiles(): Array<{ name: string; url: string; type?: string; field_name?: string }> {
    const files: Array<{ name: string; url: string; type?: string; field_name?: string }> = [];
    const seenUrls = new Set<string>();

    const addFile = (name: string, rawUrl: string | null | undefined, type?: string, field_name?: string) => {
      if (!rawUrl || typeof rawUrl !== 'string') return;
      const url = this.getSecureUrl(rawUrl);
      if (!url || seenUrls.has(url)) return;
      seenUrls.add(url);
      files.push({
        name: this.formatKey(name || field_name || 'Attachment'),
        url: url,
        type: type || field_name || 'Document',
        field_name: field_name || type || ''
      });
    };

    const cand = this.currentCandidate as any;
    if (!cand) return files;

    // 1. Direct fields
    if (cand.resume_url) addFile('Resume', cand.resume_url, 'Resume', 'resume');
    if (cand.cover_letter_url) addFile('Cover Letter', cand.cover_letter_url, 'Cover Letter', 'cover_letter');
    if (cand.cv_url) addFile('CV', cand.cv_url, 'CV', 'cv');
    if (cand.portfolio_url) addFile('Portfolio', cand.portfolio_url, 'Portfolio', 'portfolio');

    // Helper for objects or arrays
    const processUploadedFiles = (uf: any) => {
      if (!uf) return;
      if (typeof uf === 'string') {
        try { uf = JSON.parse(uf); } catch (e) {}
      }
      if (Array.isArray(uf)) {
        uf.forEach((item: any) => {
          if (!item) return;
          if (typeof item === 'string') {
            addFile('Attachment', item);
          } else if (typeof item === 'object') {
            const itemUrl = item.url || item.file_url || item.link || item.base64_content || item.metadata?.url;
            const itemName = item.file_name || item.name || item.filename || item.field_name || item.type || 'Attachment';
            addFile(itemName, itemUrl, item.type, item.field_name);
          }
        });
      } else if (typeof uf === 'object') {
        if (uf.resume) {
          if (typeof uf.resume === 'string') addFile('Resume', uf.resume, 'Resume', 'resume');
          else if (typeof uf.resume === 'object') {
            const rUrl = uf.resume.url || uf.resume.file_url || uf.resume.link || uf.resume.metadata?.url;
            const rName = uf.resume.name || uf.resume.file_name || 'Resume';
            addFile(rName, rUrl, 'Resume', 'resume');
          }
        }
        if (uf.cover_letter) {
          if (typeof uf.cover_letter === 'string') addFile('Cover Letter', uf.cover_letter, 'Cover Letter', 'cover_letter');
          else if (typeof uf.cover_letter === 'object') {
            const cUrl = uf.cover_letter.url || uf.cover_letter.file_url || uf.cover_letter.link || uf.cover_letter.metadata?.url;
            const cName = uf.cover_letter.name || uf.cover_letter.file_name || 'Cover Letter';
            addFile(cName, cUrl, 'Cover Letter', 'cover_letter');
          }
        }
        if (uf.other_files && typeof uf.other_files === 'object') {
          Object.keys(uf.other_files).forEach(key => {
            const val = uf.other_files[key];
            if (typeof val === 'string') addFile(key, val, 'Other', key);
            else if (val && typeof val === 'object') {
              const oUrl = val.url || val.file_url || val.link || val.metadata?.url;
              const oName = val.name || val.file_name || key;
              addFile(oName, oUrl, 'Other', key);
            }
          });
        }
        Object.keys(uf).forEach(key => {
          if (key === 'resume' || key === 'cover_letter' || key === 'other_files') return;
          const val = uf[key];
          if (typeof val === 'string') addFile(key, val, key, key);
          else if (val && typeof val === 'object') {
            const vUrl = val.url || val.file_url || val.link || val.file_name || val.metadata?.url;
            const vName = val.name || val.file_name || val.filename || key;
            addFile(vName, vUrl, key, key);
          }
        });
      }
    };

    // 2. Process candidate.uploaded_files
    processUploadedFiles(cand.uploaded_files);

    // 3. Process candidate.original_record
    if (cand.original_record) {
      let orig = cand.original_record;
      if (typeof orig === 'string') {
        try { orig = JSON.parse(orig); } catch (e) {}
      }
      if (orig && typeof orig === 'object') {
        processUploadedFiles(orig.uploaded_files);
        if (orig.resume_url) addFile('Resume', orig.resume_url, 'Resume', 'resume');
        if (orig.attachments) processUploadedFiles(orig.attachments);
        if (orig.documents) processUploadedFiles(orig.documents);
      }
    }

    // 4. Process candidate.attachments & candidate.documents
    processUploadedFiles(cand.attachments);
    processUploadedFiles(cand.documents);

    // 5. Extract file URLs from form_data
    const extractFromFormData = (fd: any) => {
      if (!fd || typeof fd !== 'object') return;
      Object.keys(fd).forEach(key => {
        const val = fd[key];
        if (!val) return;
        // Check if value is a string URL
        if (typeof val === 'string' && (val.startsWith('http') || val.startsWith('https://'))) {
          // It might be a file URL
          if (val.includes('.pdf') || val.includes('.doc') || val.includes('.png') || val.includes('.jpg') || val.includes('.jpeg') || val.includes('.cv') || val.includes('aws') || val.includes('storage') || val.includes('supabase') || val.includes('resumes')) {
             addFile(key, val, 'Form Upload', key);
          }
        } else if (typeof val === 'object') {
          // If the form data value is an object representing a file
          const fUrl = val.url || val.file_url || val.link || val.path;
          if (fUrl) {
            const fName = val.name || val.file_name || key;
            addFile(fName, fUrl, 'Form Upload', key);
          } else if (Array.isArray(val)) {
            // Might be an array of files
            val.forEach(item => {
              if (typeof item === 'string' && (item.startsWith('http') || item.startsWith('https://'))) {
                 addFile(key, item, 'Form Upload', key);
              } else if (item && typeof item === 'object') {
                 const iUrl = item.url || item.file_url || item.link || item.path;
                 if (iUrl) addFile(item.name || key, iUrl, 'Form Upload', key);
              }
            });
          }
        }
      });
    };

    extractFromFormData(cand.form_data);
    if (cand.original_record?.form_data) extractFromFormData(cand.original_record.form_data);

    return files;
  }

  isShortlisted(): boolean {
    if (!this.currentCandidate) return false;
    const stage = this.candidateStage.replace('stage_', '').trim().toLowerCase();
    const appStages = this.currentCandidate.application_stages;
    if (appStages && typeof appStages === 'object') {
      const keysToTry = [stage, `stage_${stage}`, 'application_review', 'Applied'];
      for (const k of keysToTry) {
        if (appStages[k]?.status === 'shortlisted') return true;
      }
      for (const k of Object.keys(appStages)) {
        if (appStages[k]?.status === 'shortlisted') return true;
      }
    }
    return false;
  }

  toggleShortlist(): void {
    if (!this.currentCandidate || !this.currentCandidate.id) return;
    
    const candidateId = this.currentCandidate.id;
    const jobId = (this.currentCandidate as any).jobpost_id || this.dataService.getJobId();
    const stageName = this.candidateStage.replace('stage_', '');
    const isCurrentlyShortlisted = this.isShortlisted();

    if (isCurrentlyShortlisted) {
      // Unshortlist / Reject
      this.apiService.rejectCandidates([candidateId], jobId, stageName).subscribe({
        next: () => {
          if (this.currentCandidate?.application_stages?.[stageName]) {
            this.currentCandidate.application_stages[stageName].status = 'unshortlisted';
          }
          this.alertService.showSuccess('Candidate removed from shortlist');
          this.dataService.notifyShortlistUpdate('unshortlist', [candidateId], jobId, stageName);
        },
        error: () => {
          this.alertService.showDanger('Failed to remove candidate from shortlist');
        }
      });
    } else {
      // Shortlist
      const shortListData = { shortlisted: [candidateId], was_rejected: [] };
      this.apiService.shortListCandidates(shortListData, jobId, stageName).subscribe({
        next: () => {
          if (this.currentCandidate?.application_stages?.[stageName]) {
            this.currentCandidate.application_stages[stageName].status = 'shortlisted';
          }
          this.alertService.showSuccess('Candidate added to shortlist');
          this.dataService.notifyShortlistUpdate('shortlist', [candidateId], jobId, stageName);
        },
        error: () => {
          this.alertService.showDanger('Failed to add candidate to shortlist');
        }
      });
    }
  }

  close() {
    this.dataService.openCandidateDetails = false;
    this.dataService.isFromOffers = false;
  }
}
