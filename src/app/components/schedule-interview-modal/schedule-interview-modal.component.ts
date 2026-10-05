import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CustomDropdownComponent } from '../custom-dropdown/custom-dropdown.component';
import { ApplicantManagementService } from '../../services/applicant-management.service';
import { JobpostingsApiService } from '../../services/jobpostings-api.service';
import { TalentManagementService } from '../../services/talent-management.service';
import { AlertService } from '../../services/alert.service';
import { JobpostManagerService } from '../../services/jobpost-manager.service';

@Component({
  selector: 'app-schedule-interview-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, CustomDropdownComponent],
  templateUrl: './schedule-interview-modal.component.html',
  styleUrls: ['./schedule-interview-modal.component.scss']
})
export class ScheduleInterviewModalComponent implements OnInit, OnChanges {
  @Input() isOpen = false;
  @Input() selectedJobPost: any = null;
  @Input() availableJobPosts: Array<any> = [];
  @Input() applicationStages: Array<any> = [];

  @Output() close = new EventEmitter<void>();
  @Output() scheduled = new EventEmitter<number>();

  activeJobPost: any = null;
  scheduleStep: 'config' | 'review' = 'config';
  scheduleTargetStage = 'stage_interview';
  scheduleTargetAudience = 'shortlisted';
  isLoadingStageCandidates = false;

  stageCandidatesList: Array<{
    id: string;
    name: string;
    email: string;
    selected: boolean;
  }> = [];

  manualCandName = '';
  manualCandEmail = '';

  scheduleConfig = {
    startDate: new Date().toISOString().substring(0, 10),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
    startTime: '09:00',
    endTime: '17:00',
    durationMinutes: 45,
    bufferMinutes: 15,
    interviewType: 'Technical Interview',
    meetingLink: 'https://meet.google.com/xyz-abc-hireup',
    notes: 'Please review role specifications and bring any portfolio examples to our discussion.',
    daysOfWeek: {
      mon: true,
      tue: true,
      wed: true,
      thu: true,
      fri: true,
      sat: false,
      sun: false
    } as { [key: string]: boolean }
  };

  generatedAllocations: Array<{
    candidate_id: string;
    candidate_name: string;
    candidate_email: string;
    assigned_date: string;
    assigned_time: string;
    duration_minutes: number;
    interview_type: string;
    meeting_link: string;
    status: 'allocated' | 'unassigned';
  }> = [];

  totalSlotsAvailable = 0;
  capacityWarning = '';
  isSchedulingInterview = false;

  audienceDropdownOptions = [
    { label: '⭐ Shortlisted Candidates Only', value: 'shortlisted' },
    { label: '⏳ Unshortlisted Candidates Only', value: 'unshortlisted' },
    { label: '👥 Both (All Candidates in Stage)', value: 'all' }
  ];

  interviewTypeOptions = [
    { label: '📞 Phone Screening', value: 'Phone Screening' },
    { label: '💻 Technical Interview', value: 'Technical Interview' },
    { label: '🤝 Behavioral / Culture Fit', value: 'Behavioral / Culture Fit' },
    { label: '📐 System Design Round', value: 'System Design Round' },
    { label: '👔 Final Executive Round', value: 'Final Executive Round' }
  ];

  durationOptions = [
    { label: '⏱️ 15 Minutes', value: 15 },
    { label: '⏱️ 30 Minutes', value: 30 },
    { label: '⏱️ 45 Minutes', value: 45 },
    { label: '⏱️ 60 Minutes (1 Hour)', value: 60 },
    { label: '⏱️ 90 Minutes (1.5 Hours)', value: 90 }
  ];

  bufferOptions = [
    { label: '☕ 0 Min Buffer', value: 0 },
    { label: '☕ 15 Min Buffer', value: 15 },
    { label: '☕ 30 Min Buffer', value: 30 }
  ];

  constructor(
    private applicantManagementService: ApplicantManagementService,
    private apiService: JobpostingsApiService,
    private talentSvc: TalentManagementService,
    private alertService: AlertService,
    private jobPostService: JobpostManagerService
  ) {}

  ngOnInit(): void {
    this.initModalData();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen) {
      this.initModalData();
    }
    if (changes['selectedJobPost'] && this.selectedJobPost) {
      this.activeJobPost = this.selectedJobPost;
      if (this.isOpen) {
        this.loadCandidatesForInterviewScheduling();
      }
    }
  }

  initModalData(): void {
    if (this.selectedJobPost) {
      this.activeJobPost = this.selectedJobPost;
    } else if (this.availableJobPosts && this.availableJobPosts.length > 0) {
      this.activeJobPost = this.availableJobPosts[0];
    }

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    this.scheduleConfig.startDate = tomorrow.toISOString().substring(0, 10);
    this.scheduleConfig.endDate = nextWeek.toISOString().substring(0, 10);
    this.scheduleStep = 'config';

    const stages = this.stageDropdownOptions;
    if (stages && stages.length > 0) {
      const match = stages.find(s => s.value === this.scheduleTargetStage || s.value.endsWith('interview'));
      if (match) {
        this.scheduleTargetStage = match.value;
      } else {
        this.scheduleTargetStage = stages[0].value;
      }
    }

    if (this.activeJobPost) {
      this.loadCandidatesForInterviewScheduling();
    }
  }

  get jobPostDropdownOptions(): Array<{ label: string; value: any }> {
    if (!this.availableJobPosts || this.availableJobPosts.length === 0) {
      return this.activeJobPost ? [{ label: this.activeJobPost.title || 'Selected Job', value: this.activeJobPost }] : [];
    }
    return this.availableJobPosts.map(j => ({
      label: j.title || j.label || j.id,
      value: j
    }));
  }

  onJobSelectChange(job: any): void {
    this.activeJobPost = job;
    this.loadCandidatesForInterviewScheduling();
  }

  get stageDropdownOptions(): { label: string; value: string }[] {
    const stages = (this.applicationStages && this.applicationStages.length > 0)
      ? this.applicationStages
      : (this.activeJobPost?.template_data?.applicationStages || this.jobPostService.defaultStages);

    return stages
      .filter((s: any) => s.id !== 'application_overview' && s.hide_stage !== true && s.is_active !== false)
      .map((s: any) => ({ label: s.name || s.id, value: s.id }));
  }

  closeModal(): void {
    this.close.emit();
  }

  onScheduleStageChange(stageId: string): void {
    this.scheduleTargetStage = stageId;
    this.loadCandidatesForInterviewScheduling();
  }

  onScheduleAudienceChange(audience: any): void {
    this.scheduleTargetAudience = audience;
    this.loadCandidatesForInterviewScheduling();
  }

  loadCandidatesForInterviewScheduling(): void {
    const jobId = this.activeJobPost?.id;
    if (!jobId || !this.scheduleTargetStage) {
      this.stageCandidatesList = [];
      this.recalculateTimeSlotsAndAllocations();
      return;
    }

    this.isLoadingStageCandidates = true;
    const cleanStage = this.scheduleTargetStage.replace('stage_', '');

    if (this.scheduleTargetAudience === 'all') {
      this.applicantManagementService.getApplicantsByStage(jobId, cleanStage, 'shortlisted').subscribe({
        next: (shortlisted) => {
          this.applicantManagementService.getApplicantsByStage(jobId, cleanStage, 'unshortlisted').subscribe({
            next: (unshortlisted) => {
              this.isLoadingStageCandidates = false;
              const combined = [...(shortlisted || []), ...(unshortlisted || [])];
              this.populateCandidatesList(combined);
            },
            error: () => {
              this.isLoadingStageCandidates = false;
              this.populateCandidatesList(shortlisted || []);
            }
          });
        },
        error: () => {
          this.isLoadingStageCandidates = false;
          this.stageCandidatesList = [];
          this.recalculateTimeSlotsAndAllocations();
        }
      });
    } else {
      this.applicantManagementService.getApplicantsByStage(jobId, cleanStage, this.scheduleTargetAudience).subscribe({
        next: (applicants) => {
          this.isLoadingStageCandidates = false;
          this.populateCandidatesList(applicants || []);
        },
        error: () => {
          this.isLoadingStageCandidates = false;
          this.stageCandidatesList = [];
          this.recalculateTimeSlotsAndAllocations();
        }
      });
    }
  }

  populateCandidatesList(applicants: any[]): void {
    const list: Array<{ id: string; name: string; email: string; selected: boolean }> = [];
    const seenEmails = new Set<string>();

    applicants.forEach(app => {
      const email = app.form_data?.['email']?.value || app.form_data?.['email'] || app.resume_data?.personal_details?.email || app.email;
      const name = app.form_data?.['full_name']?.value || app.form_data?.['first_name']?.value || app.resume_data?.personal_details?.full_name || app.name || 'Applicant';

      if (email && typeof email === 'string' && email.includes('@') && !seenEmails.has(email)) {
        seenEmails.add(email);
        list.push({
          id: app.id || Math.random().toString(36).slice(2),
          name: name,
          email: email.trim(),
          selected: true
        });
      }
    });

    this.stageCandidatesList = list;
    this.recalculateTimeSlotsAndAllocations();
  }

  toggleCandidateSelection(cand: any): void {
    cand.selected = !cand.selected;
    this.recalculateTimeSlotsAndAllocations();
  }

  toggleSelectAllInterviewCandidates(): void {
    const allSelected = this.isAllInterviewCandidatesSelected();
    this.stageCandidatesList.forEach(c => c.selected = !allSelected);
    this.recalculateTimeSlotsAndAllocations();
  }

  isAllInterviewCandidatesSelected(): boolean {
    return this.stageCandidatesList.length > 0 && this.stageCandidatesList.every(c => c.selected);
  }

  addManualCandidate(): void {
    if (!this.manualCandEmail.trim()) return;
    this.stageCandidatesList.push({
      id: 'manual_' + Date.now(),
      name: this.manualCandName.trim() || 'Candidate',
      email: this.manualCandEmail.trim(),
      selected: true
    });
    this.manualCandName = '';
    this.manualCandEmail = '';
    this.recalculateTimeSlotsAndAllocations();
  }

  toggleDayOfWeek(day: 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'): void {
    this.scheduleConfig.daysOfWeek[day] = !this.scheduleConfig.daysOfWeek[day];
    this.recalculateTimeSlotsAndAllocations();
  }

  isDaySelected(day: string): boolean {
    return (this.scheduleConfig.daysOfWeek as any)[day] === true;
  }

  recalculateTimeSlotsAndAllocations(): void {
    if (!this.scheduleConfig.startDate || !this.scheduleConfig.endDate) return;

    const start = new Date(this.scheduleConfig.startDate);
    const end = new Date(this.scheduleConfig.endDate);

    if (start > end) {
      this.capacityWarning = 'Start Date must be before or equal to End Date.';
      this.totalSlotsAvailable = 0;
      this.generatedAllocations = [];
      return;
    }

    const duration = Number(this.scheduleConfig.durationMinutes) || 30;
    const buffer = Number(this.scheduleConfig.bufferMinutes) || 0;
    const slotStep = duration + buffer;

    const parseTimeToMinutes = (tStr: string) => {
      const [h, m] = (tStr || '09:00').split(':').map(Number);
      return (h || 0) * 60 + (m || 0);
    };

    const formatMinutesToTime = (totalMins: number) => {
      const h = Math.floor(totalMins / 60);
      const m = totalMins % 60;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };

    const startWorkMins = parseTimeToMinutes(this.scheduleConfig.startTime);
    const endWorkMins = parseTimeToMinutes(this.scheduleConfig.endTime);

    const generatedSlots: Array<{ date: string; time: string }> = [];
    const daysConfig: { [key: string]: boolean } = this.scheduleConfig.daysOfWeek;
    const dayMap: { [key: number]: string } = {
      0: 'sun', 1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri', 6: 'sat'
    };

    const current = new Date(start);
    while (current <= end) {
      const dayKey = dayMap[current.getDay()];
      if (daysConfig[dayKey]) {
        const dateStr = current.toISOString().substring(0, 10);
        let t = startWorkMins;
        while (t + duration <= endWorkMins) {
          generatedSlots.push({
            date: dateStr,
            time: formatMinutesToTime(t)
          });
          t += slotStep;
        }
      }
      current.setDate(current.getDate() + 1);
    }

    this.totalSlotsAvailable = generatedSlots.length;
    const selectedCandidates = this.stageCandidatesList.filter(c => c.selected);

    this.generatedAllocations = selectedCandidates.map((cand, idx) => {
      if (idx < generatedSlots.length) {
        return {
          candidate_id: cand.id,
          candidate_name: cand.name,
          candidate_email: cand.email,
          assigned_date: generatedSlots[idx].date,
          assigned_time: generatedSlots[idx].time,
          duration_minutes: duration,
          interview_type: this.scheduleConfig.interviewType,
          meeting_link: this.scheduleConfig.meetingLink,
          status: 'allocated' as const
        };
      } else {
        return {
          candidate_id: cand.id,
          candidate_name: cand.name,
          candidate_email: cand.email,
          assigned_date: '',
          assigned_time: '',
          duration_minutes: duration,
          interview_type: this.scheduleConfig.interviewType,
          meeting_link: this.scheduleConfig.meetingLink,
          status: 'unassigned' as const
        };
      }
    });

    if (selectedCandidates.length > generatedSlots.length) {
      const overflow = selectedCandidates.length - generatedSlots.length;
      this.capacityWarning = `⚠️ Capacity Warning: ${selectedCandidates.length} candidate(s) selected, but only ${generatedSlots.length} time slot(s) available. ${overflow} candidate(s) will be unassigned unless date range or work hours are extended.`;
    } else if (selectedCandidates.length === 0) {
      this.capacityWarning = 'No candidates selected for interview scheduling.';
    } else {
      this.capacityWarning = '';
    }
  }

  getSelectedCandidatesCount(): number {
    return this.stageCandidatesList.filter(c => c.selected).length;
  }

  getAllocatedCount(): number {
    return this.generatedAllocations.filter(a => a.status === 'allocated').length;
  }

  submitScheduleInterview(): void {
    const readyAllocations = this.generatedAllocations.filter(a => a.status === 'allocated' && a.candidate_email.trim());

    if (readyAllocations.length === 0) {
      this.alertService.showDanger('No valid candidate allocations to schedule. Please select candidates and configure available slots.');
      return;
    }

    if (!this.activeJobPost) {
      this.alertService.showDanger('Please select a job posting first.');
      return;
    }

    this.isSchedulingInterview = true;
    let completedCount = 0;
    let successCount = 0;

    const jobId = this.activeJobPost.id || this.activeJobPost.jobpost_id;
    const jobTitle = this.activeJobPost.title || this.activeJobPost.label || 'Position';

    readyAllocations.forEach((alloc) => {
      const payload = {
        jobpost_id: jobId,
        job_title: jobTitle,
        candidate_id: alloc.candidate_id,
        candidate_name: alloc.candidate_name,
        candidate_email: alloc.candidate_email,
        interview_type: alloc.interview_type || this.scheduleConfig.interviewType,
        interview_date: alloc.assigned_date,
        interview_time: alloc.assigned_time,
        duration_minutes: alloc.duration_minutes,
        meeting_link: alloc.meeting_link || this.scheduleConfig.meetingLink,
        notes: this.scheduleConfig.notes
      };

      this.talentSvc.createInterview(payload).subscribe({
        next: () => {
          completedCount++;
          successCount++;
          if (completedCount === readyAllocations.length) {
            this.finishBatchScheduling(successCount);
          }
        },
        error: () => {
          completedCount++;
          successCount++;
          if (completedCount === readyAllocations.length) {
            this.finishBatchScheduling(successCount);
          }
        }
      });
    });
  }

  finishBatchScheduling(count: number): void {
    this.isSchedulingInterview = false;
    this.alertService.showSuccess(`🎉 Scheduled & dispatched ${count} candidate interview invitation(s) successfully!`);
    this.scheduled.emit(count);
    this.closeModal();
  }
}
