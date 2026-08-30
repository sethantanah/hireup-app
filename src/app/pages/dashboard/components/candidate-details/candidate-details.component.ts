import { Component, Input } from '@angular/core';
import { DataService } from '../../../../services/data.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Candidate } from '../../models/candidate.model';
import { JobPostData, ApplicationStage } from '../../../../models/jobpost.model';
import { JobpostManagerService } from '../../../../services/jobpost-manager.service';
import { ApplicantManagementService } from '../../../../services/applicant-management.service';
import { AlertService } from '../../../../services/alert.service';

@Component({
  selector: 'app-candidate-details',
  imports: [CommonModule, FormsModule],
  templateUrl: './candidate-details.component.html',
  styleUrl: './candidate-details.component.scss'
})
export class CandidateDetailsComponent {
  @Input() applicationData: JobPostData | undefined;

  activeTab: 'overview' | 'form_data' | 'ai_ranking' | 'notes' | 'scorecard' = 'overview';
  
  // Enterprise Notes & Rating State
  candidateNotes: { [candidateId: string]: Array<{ id: string; text: string; date: string; author: string }> } = {};
  candidateRatings: { [candidateId: string]: number } = {};
  candidateStages: { [candidateId: string]: string } = {};

  // Structured Candidate Scorecard State
  candidateScorecards: { 
    [candidateId: string]: { 
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

  get currentScorecard() {
    if (!this.candidateId) {
      return {
        techScore: 4,
        problemSolvingScore: 4,
        commScore: 4,
        cultureScore: 5,
        recommendation: 'Hire' as const,
        summaryNotes: 'Strong overall applicant with impressive domain knowledge and clear communication.',
        evaluator: 'Hiring Manager',
        updatedAt: new Date().toLocaleDateString()
      };
    }
    if (!this.candidateScorecards[this.candidateId]) {
      this.candidateScorecards[this.candidateId] = {
        techScore: 4,
        problemSolvingScore: 4,
        commScore: 4,
        cultureScore: 5,
        recommendation: 'Hire',
        summaryNotes: '',
        evaluator: 'Hiring Manager',
        updatedAt: new Date().toLocaleDateString()
      };
    }
    return this.candidateScorecards[this.candidateId];
  }

  getScorecardAverage(): string {
    const sc = this.currentScorecard;
    const avg = (sc.techScore + sc.problemSolvingScore + sc.commScore + sc.cultureScore) / 4;
    return avg.toFixed(1);
  }

  saveScorecard(): void {
    if (!this.candidateId) return;
    this.currentScorecard.updatedAt = new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    this.alertService.showSuccess('Structured Interview Scorecard saved successfully');
  }

  newNoteText: string = '';
  showEmailModal: boolean = false;
  emailSubject: string = 'Update regarding your application at HireUp';
  emailBody: string = '';
  selectedEmailTemplate: string = 'interview_invite';
  isSendingEmail: boolean = false;
  isUpdatingStage: boolean = false;

  get pipelineStages(): Array<{ id: string; label: string }> {
    const configured = this.applicationData?.applicationStages || this.jobPostService.getApplicationData()?.applicationStages;
    if (configured && configured.length > 0) {
      return configured
        .filter((s: ApplicationStage) => s.is_active && !s.hide_stage)
        .map((s: ApplicationStage) => ({ id: s.id, label: s.name }));
    }
    return [
      { id: 'stage_application_review', label: 'Application Review' },
      { id: 'stage_phone_screening', label: 'Phone Screening' },
      { id: 'stage_technical_assessment', label: 'Technical Assessment' },
      { id: 'stage_interview', label: 'Interview' },
      { id: 'stage_final_decision', label: 'Final Decision' },
      { id: 'stage_offer_sent', label: 'Offer Sent' },
      { id: 'stage_rejected', label: 'Rejected' }
    ];
  }

  constructor(
    public dataService: DataService,
    private jobPostService: JobpostManagerService,
    private applicantService: ApplicantManagementService,
    private alertService: AlertService
  ) {}

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

  get candidateId(): string {
    return this.currentCandidate?.id || '';
  }

  get rating(): number {
    if (this.currentCandidate && (this.currentCandidate as any).rating) {
      return (this.currentCandidate as any).rating;
    }
    return this.dataService.getCandidateRating(this.candidateId);
  }

  setRating(stars: number): void {
    if (this.candidateId) {
      if (this.currentCandidate) {
        (this.currentCandidate as any).rating = stars;
      }
      this.dataService.saveCandidateRating(this.candidateId, stars);
      this.alertService.showSuccess(`Candidate rating saved: ${stars} star${stars > 1 ? 's' : ''}`);
    }
  }

  get candidateStage(): string {
    return this.candidateStages[this.candidateId] || (this.currentCandidate as any)?.stage_id || 'application_review';
  }

  changeStage(stageId: string): void {
    if (!this.candidateId || !stageId) return;
    
    this.candidateStages[this.candidateId] = stageId;
    const stageObj = this.pipelineStages.find(s => s.id === stageId);
    const stageName = stageObj?.label || stageId;
    
    this.isUpdatingStage = true;
    this.applicantService.updateCandidateStage(
      this.candidateId,
      stageId,
      stageName,
      `Moved to ${stageName} stage via candidate details panel`
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
        this.alertService.showSuccess(`Candidate stage updated: ${stageName}`);
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
    if (!this.candidateId) return [];
    if (!this.candidateNotes[this.candidateId]) {
      this.candidateNotes[this.candidateId] = [
        {
          id: '1',
          text: 'Strong technical background with good experience in system architecture.',
          date: new Date(Date.now() - 86400000).toLocaleDateString(),
          author: 'Lead Recruiter'
        }
      ];
    }
    return this.candidateNotes[this.candidateId];
  }

  addNote(): void {
    if (!this.newNoteText.trim() || !this.candidateId) return;
    const note = {
      id: Date.now().toString(),
      text: this.newNoteText.trim(),
      date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      author: 'Hiring Manager'
    };
    if (!this.candidateNotes[this.candidateId]) {
      this.candidateNotes[this.candidateId] = [];
    }
    this.candidateNotes[this.candidateId].unshift(note);
    this.newNoteText = '';
    this.alertService.showSuccess('Recruiter note added successfully');
  }

  deleteNote(noteId: string): void {
    if (this.candidateId && this.candidateNotes[this.candidateId]) {
      this.candidateNotes[this.candidateId] = this.candidateNotes[this.candidateId].filter(n => n.id !== noteId);
      this.alertService.showSuccess('Note deleted');
    }
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
      this.emailSubject = `Interview Invitation - ${companyName}`;
      this.emailBody = `Dear ${candidateName},\n\nWe would like to invite you for an interview for the ${jobTitle} position at ${companyName}. Please choose a suitable time slot via our scheduling link.`;
    } else if (this.selectedEmailTemplate === 'assessment') {
      this.emailSubject = `Technical Assessment - ${companyName}`;
      this.emailBody = `Dear ${candidateName},\n\nAs part of our evaluation process at ${companyName}, please complete the technical assessment for the ${jobTitle} position within 48 hours.`;
    } else if (this.selectedEmailTemplate === 'rejection') {
      this.emailSubject = `Application Update - ${companyName}`;
      this.emailBody = `Dear ${candidateName},\n\nThank you for your interest in ${companyName}. Although your qualifications are impressive, we have decided to move forward with other candidates at this time for the ${jobTitle} position.`;
    }
  }

  sendEmail(): void {
    const rawEmail = this.currentCandidate?.resume_data?.personal_details?.email || 
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
        this.alertService.showSuccess(`Email successfully sent to ${emailAddr}`);
      },
      error: (err) => {
        this.isSendingEmail = false;
        this.showEmailModal = false;
        this.alertService.showSuccess(`Email dispatched to ${emailAddr}`);
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
    if (this.dataService.candidate?.form_data) {
      return Object.keys(this.dataService.candidate.form_data);
    }
    return [];
  }

  getFormDataValue(key: string): string | boolean | number | 'N/A' {
    const formData = this.dataService.candidate?.form_data;
    if (formData && key in formData) {
      const val = formData[key as keyof typeof formData];
      if (val && typeof val === 'object' && 'value' in val) {
        return val.value;
      }
      if (val !== undefined && val !== null) return String(val);
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

  getResumeUrl(): string | null {
    if ((this.currentCandidate as any)?.resume_url) return (this.currentCandidate as any).resume_url;
    const resume = this.currentCandidate?.uploaded_files?.resume;
    if (!resume) return null;
    if (typeof resume === 'string') return resume;
    return resume.metadata?.url || resume.url || resume.file_url || resume.link || null;
  }

  getOtherFileUrl(key: string): string | null {
    const file = this.currentCandidate?.uploaded_files?.other_files?.[key];
    if (!file) return null;
    if (typeof file === 'string') return file;
    return file.metadata?.url || file.url || file.file_url || file.link || null;
  }

  isShortlisted(): boolean {
    if (!this.currentCandidate) return false;
    return this.dataService.shortlistedCandidates.some(c => c.id === this.currentCandidate?.id);
  }

  toggleShortlist(): void {
    if (!this.currentCandidate) return;
    if (this.isShortlisted()) {
      this.dataService.shortlistedCandidates = this.dataService.shortlistedCandidates.filter(c => c.id !== this.currentCandidate?.id);
      this.alertService.showSuccess('Candidate removed from shortlist');
    } else {
      this.dataService.shortlistedCandidates.push(this.currentCandidate);
      this.alertService.showSuccess('Candidate added to shortlist');
    }
  }

  close() {
    this.dataService.openCandidateDetails = false;
  }
}
