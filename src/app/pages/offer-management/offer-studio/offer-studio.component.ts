import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TalentManagementService } from '../../../services/talent-management.service';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Location } from '@angular/common';
import { JobpostingsApiService } from '../../../services/jobpostings-api.service';
import { ApplicantManagementService } from '../../../services/applicant-management.service';
import { JobpostManagerService } from '../../../services/jobpost-manager.service';
import { CustomDropdownComponent } from '../../../components/custom-dropdown/custom-dropdown.component';
import { CandidateDetailsComponent } from '../../dashboard/components/candidate-details/candidate-details.component';
import { DataService } from '../../../services/data.service';
import { AuthService } from '../../../services/auth.service';
import { SelectedJobService } from '../../../services/selected-job.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-offer-studio',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, CustomDropdownComponent, CandidateDetailsComponent],
  templateUrl: './offer-studio.component.html',
  styleUrl: './offer-studio.component.scss'
})
export class OfferStudioComponent implements OnInit {
  offers: any[] = [];
  activeTab: 'offers' | 'templates' = 'offers';
  templates: any[] = [];
  selectedOffer: any = null;
  loading = false;
  isCreating = false;
  isSaving = false;
  showNewOfferForm = false;
  showTemplateForm = false;
  isEditingTemplate = false;
  editingTemplateId = '';
  successMsg = '';
  errorMsg = '';
  filterStatus = '';
  jobId: string | null = null;
  jobTitle = '';
  availableJobPosts: Array<{ id: string; label: string }> = [];
  // Workspace shell (aligned)
  sidebarOpen = false;
  showToolsMenu = true;
  userData: any = null;
  jobPostings: any[] = [];
  selectedJobPost: any = null;

  // Grouping, Search & Performance State
  groupBy: 'job' | 'status' | 'department' | 'none' = 'job';
  searchTerm: string = '';
  filterJobId: string = 'all';
  sortOrder: 'newest' | 'expiry' | 'name' = 'newest';
  expandedGroups: Record<string, boolean> = {};

  toggleGroup(groupId: string): void {
    this.expandedGroups[groupId] = !this.isGroupExpanded(groupId);
  }

  isGroupExpanded(groupId: string): boolean {
    return this.expandedGroups[groupId] !== false; // default expanded
  }

  expandAllGroups(): void {
    this.groupedOffers.forEach(g => this.expandedGroups[g.id] = true);
  }

  collapseAllGroups(): void {
    this.groupedOffers.forEach(g => this.expandedGroups[g.id] = false);
  }

  get isAllGroupsExpanded(): boolean {
    if (this.groupedOffers.length === 0) return true;
    return this.groupedOffers.every(g => this.isGroupExpanded(g.id));
  }

  toggleAllGroups(): void {
    if (this.isAllGroupsExpanded) {
      this.collapseAllGroups();
    } else {
      this.expandAllGroups();
    }
  }

  get filteredOffers(): any[] {
    let list = [...this.offers];

    // Filter by Search Term
    if (this.searchTerm && this.searchTerm.trim()) {
      const q = this.searchTerm.toLowerCase().trim();
      list = list.filter(o => 
        (o.candidate_name && o.candidate_name.toLowerCase().includes(q)) ||
        (o.candidate_email && o.candidate_email.toLowerCase().includes(q)) ||
        (o.job_title && o.job_title.toLowerCase().includes(q)) ||
        (o.department && o.department.toLowerCase().includes(q)) ||
        (o.company_name && o.company_name.toLowerCase().includes(q)) ||
        (o.id && o.id.toLowerCase().includes(q))
      );
    }

    // Filter by Job ID
    if (this.filterJobId && this.filterJobId !== 'all') {
      list = list.filter(o => o.jobpost_id === this.filterJobId);
    }

    // Filter by Status
    if (this.filterStatus && this.filterStatus !== '') {
      list = list.filter(o => o.status === this.filterStatus);
    }

    // Sort List
    list.sort((a, b) => {
      if (this.sortOrder === 'newest') {
        const dateA = new Date(a.created_at || 0).getTime();
        const dateB = new Date(b.created_at || 0).getTime();
        return dateB - dateA;
      } else if (this.sortOrder === 'expiry') {
        const dateA = a.expiry_date ? new Date(a.expiry_date).getTime() : 9999999999999;
        const dateB = b.expiry_date ? new Date(b.expiry_date).getTime() : 9999999999999;
        return dateA - dateB;
      } else if (this.sortOrder === 'name') {
        return (a.candidate_name || '').localeCompare(b.candidate_name || '');
      }
      return 0;
    });

    return list;
  }

  get groupedOffers(): Array<{ id: string; title: string; count: number; metrics: { pending: number; accepted: number; declined: number }; offers: any[] }> {
    const list = this.filteredOffers;
    if (this.groupBy === 'none') {
      return [{
        id: 'all_offers',
        title: 'All Offers',
        count: list.length,
        metrics: this.calculateGroupMetrics(list),
        offers: list
      }];
    }

    const map = new Map<string, { id: string; title: string; offers: any[] }>();

    for (const offer of list) {
      let key = 'unassigned';
      let title = 'Unassigned Position';

      if (this.groupBy === 'job') {
        key = offer.jobpost_id || 'no_job';
        title = offer.job_title || this.getJobLabel(offer.jobpost_id) || 'General Job Post';
      } else if (this.groupBy === 'status') {
        key = (offer.status || 'pending').toLowerCase();
        title = key.toUpperCase() + ' OFFERS';
      } else if (this.groupBy === 'department') {
        key = (offer.department || 'General').trim();
        title = key.charAt(0).toUpperCase() + key.slice(1);
      }

      if (!map.has(key)) {
        map.set(key, { id: key, title, offers: [] });
      }
      map.get(key)!.offers.push(offer);
    }

    const result = Array.from(map.values()).map(g => ({
      id: g.id,
      title: g.title,
      count: g.offers.length,
      metrics: this.calculateGroupMetrics(g.offers),
      offers: g.offers
    }));

    // Sort groups by total offers descending
    result.sort((a, b) => b.count - a.count);
    return result;
  }

  calculateGroupMetrics(offers: any[]): { pending: number; accepted: number; declined: number } {
    let pending = 0, accepted = 0, declined = 0;
    for (const o of offers) {
      if (o.status === 'accepted') accepted++;
      else if (o.status === 'declined') declined++;
      else pending++;
    }
    return { pending, accepted, declined };
  }

  get templateOptions(): Array<{ id: string; label: string }> {
    return [
      { id: '', label: 'Custom (enter below)' },
      ...this.templates.map(t => ({ id: t.id, label: t.name }))
    ];
  }

  get deliveryModeOptions(): Array<{ id: string; label: string }> {
    return [
      { id: 'review', label: 'Under Review (Draft - Do Not Notify Candidate Yet)' },
      { id: 'send', label: 'Ready to Send (Dispatch Email & Notify Candidate)' }
    ];
  }

  onTemplateSelect(templateId: string): void {
    this.newOffer.template_id = templateId;
    if (templateId) {
      const found = this.templates.find(t => t.id === templateId);
      if (found) {
        if (found.subject) this.newOffer.custom_subject = found.subject;
        if (found.body_html) this.newOffer.custom_body_html = found.body_html;
      }
    }
  }

  cancelNewOffer(): void {
    this.showNewOfferForm = false;
    this.isEditingOffer = false;
    this.editingOfferId = '';
    this.newOffer = {
      jobpost_id: this.jobId || '', candidate_id: '', candidate_name: '', candidate_email: '',
      job_title: '', department: '', start_date: '', salary: '', currency: 'USD',
      benefits: '', manager_name: '', expiry_date: '', template_id: '',
      custom_subject: '', custom_body_html: '', delivery_mode: 'review',
      attached_file_url: null, attached_file_name: null
    };
    this.selectedCandidatesForOffer = [];
  }

  // New offer form
  newOffer: any = {
    jobpost_id: '', candidate_id: '', candidate_name: '', candidate_email: '',
    job_title: '', department: '', start_date: '', salary: '', currency: 'USD',
    benefits: '', manager_name: '', expiry_date: '', template_id: '',
    custom_subject: '', custom_body_html: '', delivery_mode: 'review',
    attached_file_url: null, attached_file_name: null
  };
  
  isEditingOffer = false;
  editingOfferId = '';

  showDeleteConfirm = false;
  offerToDelete: string | null = null;

  // Candidate selection
  stageOptions: Array<{ id: string; label: string }> = [];
  selectedStageForCandidates = 'offer';
  selectedStatusForCandidates = 'shortlisted';
  fetchedCandidates: any[] = [];
  candidateSearchTerm = '';
  selectedCandidatesForOffer: any[] = [];
  isLoadingCandidates = false;
  isPipelineExpanded = true;

  newTemplate: any = { name: '', subject: '', body_html: '' };

  readonly statusColors: Record<string, string> = {
    pending: 'text-amber-700 bg-amber-50 border-amber-200',
    accepted: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    declined: 'text-rose-700 bg-rose-50 border-rose-200',
    revoked: 'text-slate-600 bg-slate-100 border-slate-200',
    expired: 'text-orange-700 bg-orange-50 border-orange-200',
  };

  readonly TOKEN_HINTS = ['{{candidate_name}}', '{{job_title}}', '{{company_name}}', '{{start_date}}', '{{salary}}', '{{currency}}', '{{benefits}}', '{{manager_name}}', '{{expiry_date}}'];

  constructor(
    private talentSvc: TalentManagementService,
    private route: ActivatedRoute,
    private location: Location,
    private jobpostingsApi: JobpostingsApiService,
    private applicantSvc: ApplicantManagementService,
    private jobpostManager: JobpostManagerService,
    public dataService: DataService,
    private authService: AuthService,
    private selectedJobService: SelectedJobService
  ) {}

  goBack(): void {
    this.location.back();
  }

  toggleSidebar(): void { this.sidebarOpen = !this.sidebarOpen; }
  logOut(): void { this.authService.logOut(); }
  getInitals(name: string): string { return this.getInitials(name); }
  selectJobFromSidebar(job:any): void { this.selectedJobPost = job; this.jobId = job.id; this.newOffer.jobpost_id = job.id; this.selectedJobService.setSelectedJobId(job.id); this.onJobPostChange(job.id); this.loadAll(); }
  onHeaderJobChange(jobId: string): void {
    if (!jobId) { this.jobId = null; this.selectedJobPost = null; this.selectedJobService.setSelectedJobId(null); this.loadAll(); return; }
    const found = this.jobPostings.find((j:any)=>j.id===jobId) || this.availableJobPosts.find(j=>j.id===jobId);
    const jobObj = found ? { id: found.id, title: (found as any).title || (found as any).label, ...found } : { id: jobId, title: '' };
    this.selectedJobService.setSelectedJobId(jobId);
    this.selectJobFromSidebar(jobObj);
  }
  toggleToolsMenu(): void { this.showToolsMenu = !this.showToolsMenu; }

  getJobLabel(jobId: string): string {
    if (!jobId) return 'No Job Assigned';
    return this.availableJobPosts.find(j => j.id === jobId)?.label || jobId;
  }

  get headerJobOptions(): Array<{ id: string; label: string }> {
    const opts = [...this.availableJobPosts];
    if (this.jobId && !opts.find(o => o.id === this.jobId)) {
      const jp = this.jobPostings.find((j: any) => j.id === this.jobId);
      opts.unshift({ id: this.jobId!, label: jp?.title || this.jobTitle || this.jobId! });
    }
    return opts;
  }

  ngOnInit(): void {
    try { const u = localStorage.getItem('USER'); if(u) this.userData = JSON.parse(u); } catch {}
    // persist centralized job context
    this.route.queryParams.subscribe(params => {
      if (params['jobId']) {
        this.selectedJobService.setSelectedJobId(params['jobId']);
      }
    });
    this.selectedJobService.selectedJobId$.subscribe(id => {
      if (id !== this.jobId) {
        this.jobId = id;
        if (id) {
          this.newOffer.jobpost_id = id;
          this.onJobPostChange(id);
        }
        this.loadAll();
        if (id) {
          const found = this.jobPostings.find((j:any)=>j.id===id) || this.availableJobPosts.find(j=>j.id===id);
          if (found) this.selectedJobPost = found;
        } else {
          this.selectedJobPost = null;
        }
      }
    });
    // initialize from service if no query param
    const svcId = this.selectedJobService.selectedJobId;
    if (svcId && !this.jobId) {
      this.jobId = svcId;
      this.newOffer.jobpost_id = svcId;
      this.onJobPostChange(svcId);
    }
    this.initComponent();
    this.loadSidebarPostings();
  }

  private loadSidebarPostings(): void {
    try { const s = localStorage.getItem('USER'); if(!s) return; const u=JSON.parse(s); if(!u?.id) return; this.jobpostingsApi.getJobPostings(u.id).subscribe({ next:(d:any)=>{ this.jobPostings=(d as any[])||[]; if(this.jobId){ this.selectedJobPost=this.jobPostings.find((j:any)=>j.id===this.jobId)||this.jobPostings[0]; } }}); } catch {}
  }

  initComponent(): void {
    if (this.jobId) {
      this.jobpostingsApi.getJobPostingById(this.jobId).subscribe({
        next: (res: any) => {
          this.jobTitle = res?.data?.title || res?.title || '';
          if (this.jobId && this.jobTitle) {
            const exists = this.availableJobPosts.find(j => j.id === this.jobId);
            if (!exists) {
              this.availableJobPosts = [...this.availableJobPosts, { id: this.jobId, label: this.jobTitle }];
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
        if (user && user.id) {
          this.jobpostingsApi.getJobPostings(user.id).subscribe({
            next: (jobs: any[]) => {
              const newJobs = jobs.map(j => ({ id: j.id, label: j.title }));
              const existingIds = new Set(this.availableJobPosts.map(j => j.id));
              const missingJobs = newJobs.filter(j => !existingIds.has(j.id));
              this.availableJobPosts = [...this.availableJobPosts, ...missingJobs];
            }
          });
        }
      }
    } catch (e) {}

    this.loadAll();
  }

  loadAll(): void {
    this.loading = true;
    this.talentSvc.listOffers(this.jobId || undefined).subscribe({
      next: (res: any) => { this.offers = res.offers || []; this.loading = false; },
      error: () => { this.loading = false; }
    });
    this.talentSvc.listOfferTemplates().subscribe({
      next: (res: any) => { this.templates = res.templates || []; }
    });
  }

  onJobPostChange(jobId: string): void {
    this.newOffer.jobpost_id = jobId;
    if (jobId) {
      this.jobpostManager.getJobPostData(jobId).subscribe({
        next: (res: any) => {
          let stages = res?.data?.[0]?.template_data?.applicationStages;
          if (!stages || stages.length === 0) {
            stages = this.jobpostManager.defaultStages;
          }
          this.stageOptions = stages
            .filter((s: any) => !s.hide_stage)
            .map((s: any) => ({
              id: s.id.replace('stage_', ''),
              label: s.name
            }));
          
          if (!this.stageOptions.find(s => s.id === this.selectedStageForCandidates)) {
            this.selectedStageForCandidates = this.stageOptions[0]?.id || 'offer';
          }
          this.fetchCandidates();
        },
        error: () => {
          this.stageOptions = this.jobpostManager.defaultStages
            .filter((s: any) => !s.hide_stage)
            .map((s: any) => ({
              id: s.id.replace('stage_', ''),
              label: s.name
            }));
          this.fetchCandidates();
        }
      });
    } else {
      this.stageOptions = [];
      this.fetchCandidates();
    }
  }

  fetchCandidates(): void {
    if (!this.newOffer.jobpost_id) {
      this.fetchedCandidates = [];
      return;
    }
    this.isLoadingCandidates = true;
    this.applicantSvc.getApplicantsByStage(this.newOffer.jobpost_id, this.selectedStageForCandidates, this.selectedStatusForCandidates).subscribe({
      next: (cands: any) => {
        this.fetchedCandidates = cands || [];
        this.isLoadingCandidates = false;
        // Pre-select if we already had some candidate selected? Or reset.
        this.selectedCandidatesForOffer = [];
      },
      error: () => {
        this.fetchedCandidates = [];
        this.isLoadingCandidates = false;
      }
    });
  }

  toggleCandidateSelection(cand: any): void {
    const idx = this.selectedCandidatesForOffer.findIndex(c => c.id === cand.id);
    if (idx > -1) this.selectedCandidatesForOffer.splice(idx, 1);
    else this.selectedCandidatesForOffer.push(cand);
  }



  selectOffer(o: any): void {
    this.selectedOffer = o;
    this.showNewOfferForm = false;
  }

  selectAllCandidates(): void {
    if (this.selectedCandidatesForOffer.length === this.filteredFetchedCandidates.length) {
      this.selectedCandidatesForOffer = [];
    } else {
      this.selectedCandidatesForOffer = [...this.filteredFetchedCandidates];
    }
  }

  get filteredFetchedCandidates(): any[] {
    if (!this.candidateSearchTerm) return this.fetchedCandidates;
    const term = this.candidateSearchTerm.toLowerCase();
    return this.fetchedCandidates.filter(c => 
      this.getDisplayName(c).toLowerCase().includes(term) ||
      this.getDisplayEmail(c).toLowerCase().includes(term)
    );
  }

  getDisplayName(candidate: any): string {
    const parse = (data: any) => {
      try { return typeof data === 'string' ? JSON.parse(data) : (data || {}); }
      catch { return {}; }
    };
    const form = parse(candidate.form_data);
    const resume = parse(candidate.resume_data);

    const extract = (n: any): string | null => {
      if (!n) return null;
      if (typeof n === 'string') return n;
      if (typeof n === 'object' && !Array.isArray(n)) {
        if (n.full_name) return String(n.full_name);
        if (n.first || n.last) return `${n.first || ''} ${n.last || ''}`.trim();
        if (n.first_name || n.last_name) return `${n.first_name || ''} ${n.last_name || ''}`.trim();
        if (n.name) return String(n.name);
        return null;
      }
      if (Array.isArray(n)) return n.join(' ');
      return String(n);
    };

    let name = extract(form.full_name) ||
               extract(form.name) ||
               extract(form.candidate_name) ||
               extract(form.applicant_name) ||
               (form.first_name || form.last_name ? `${extract(form.first_name) || ''} ${extract(form.last_name) || ''}`.trim() : null) ||
               extract(candidate.full_name) ||
               extract(candidate.name) ||
               extract(candidate.applicant_name) ||
               extract(candidate.candidate_name) ||
               (candidate.firstName || candidate.lastName ? `${extract(candidate.firstName) || ''} ${extract(candidate.lastName) || ''}`.trim() : null) ||
               extract(resume.personal_details?.full_name);

    if (name === '[object Object]') return 'Unknown Candidate';
    return name || 'Unknown Candidate';
  }

  getDisplayEmail(candidate: any): string {
    const parse = (data: any) => {
      try { return typeof data === 'string' ? JSON.parse(data) : (data || {}); }
      catch { return {}; }
    };
    const form = parse(candidate.form_data);
    const resume = parse(candidate.resume_data);

    const extract = (n: any): string | null => {
      if (!n) return null;
      if (typeof n === 'string') return n;
      if (typeof n === 'object' && !Array.isArray(n)) {
        if (n.value) return String(n.value);
        if (n.email) return String(n.email);
        if (n.email_address) return String(n.email_address);
        return null;
      }
      if (Array.isArray(n)) return n.join(' ');
      return String(n);
    };

    let email = extract(form.email) ||
                extract(form.email_address) ||
                extract(candidate.email) ||
                extract(candidate.user_email) ||
                extract(candidate.applicant_email) ||
                extract(resume.personal_details?.email);

    if (email === '[object Object]') return 'No email';
    return email || 'No email';
  }

  viewCandidateDetails(candidate: any, event: Event): void {
    event.stopPropagation();
    this.dataService.candidate = candidate;
    this.dataService.isFromCandidateList = true;
    this.dataService.isFromOffers = true;
    this.dataService.openCandidateDetails = true;
  }

  onFileSelected(event: any): void {
    const file = event.target.files?.[0];
    if (file) {
      this.newOffer.attached_file_name = file.name;
      const reader = new FileReader();
      reader.onload = () => {
        this.newOffer.attached_file_url = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  removeAttachedFile(): void {
    this.newOffer.attached_file_url = null;
    this.newOffer.attached_file_name = null;
  }

  editOffer(offer: any): void {
    this.isEditingOffer = true;
    this.editingOfferId = offer.id;
    this.newOffer = {
      jobpost_id: offer.jobpost_id || '',
      candidate_id: offer.candidate_id || '',
      candidate_name: offer.candidate_name || '',
      candidate_email: offer.candidate_email || '',
      job_title: offer.job_title || '',
      department: offer.department || '',
      start_date: offer.start_date || '',
      salary: offer.salary || '',
      currency: offer.currency || 'USD',
      benefits: offer.benefits || '',
      manager_name: offer.manager_name || '',
      expiry_date: offer.expiry_date || '',
      template_id: offer.template_id || '',
      custom_subject: offer.rendered_subject || '',
      custom_body_html: offer.rendered_body_html || '',
      delivery_mode: offer.delivery_status || 'review',
      attached_file_url: offer.attached_file_url || null,
      attached_file_name: offer.attached_file_name || null
    };
    this.showNewOfferForm = true;
  }

  moveToOnboarding(offer: any): void {
    if (!offer) return;
    this.talentSvc.moveToOnboarding(offer.id).subscribe({
      next: (res: any) => {
        if (this.selectedOffer && this.selectedOffer.id === offer.id) {
          this.selectedOffer.status = 'accepted';
          this.selectedOffer.onboarding_status = 'initiated';
        }
        this.successMsg = res.message || `Candidate ${offer.candidate_name} moved to Onboarding! Welcome email sent.`;
        setTimeout(() => this.successMsg = '', 4000);
        this.loadAll();
      },
      error: () => {
        this.errorMsg = 'Failed to move candidate to onboarding.';
        setTimeout(() => this.errorMsg = '', 4000);
      }
    });
  }

  deleteOffer(offerId: string): void {
    this.offerToDelete = offerId;
    this.showDeleteConfirm = true;
  }

  confirmDelete(): void {
    if (!this.offerToDelete) return;
    this.talentSvc.deleteOffer(this.offerToDelete).subscribe({
      next: () => {
        this.offers = this.offers.filter(o => o.id !== this.offerToDelete);
        this.successMsg = 'Offer deleted successfully.';
        if (this.selectedOffer?.id === this.offerToDelete) {
          this.selectedOffer = null;
        }
        this.showDeleteConfirm = false;
        this.offerToDelete = null;
      },
      error: (e) => { 
        this.errorMsg = 'Failed to delete offer.'; 
        this.showDeleteConfirm = false;
        this.offerToDelete = null;
      }
    });
  }

  cancelDelete(): void {
    this.showDeleteConfirm = false;
    this.offerToDelete = null;
  }

  saveOffer(): void {
    if (this.isEditingOffer) {
      if (!this.newOffer.candidate_email || !this.newOffer.candidate_name) {
        this.errorMsg = 'Provide candidate name and email.';
        return;
      }
      this.isSaving = true;
      this.errorMsg = '';
      this.talentSvc.updateOffer(this.editingOfferId, this.newOffer).subscribe({
        next: (res: any) => {
          const idx = this.offers.findIndex(o => o.id === this.editingOfferId);
          if (idx > -1) this.offers[idx] = res.offer;
          this.successMsg = 'Offer updated successfully!';
          this.isSaving = false;
          this.showNewOfferForm = false;
          this.isEditingOffer = false;
          this.editingOfferId = '';
        },
        error: (e) => { 
          this.errorMsg = 'Failed to update offer.'; 
          this.isSaving = false; 
        }
      });
    } else {
      this.createOffer();
    }
  }

  createOffer(): void {
    if (this.selectedCandidatesForOffer.length === 0 && (!this.newOffer.candidate_email || !this.newOffer.candidate_name)) {
      this.errorMsg = 'Select at least one candidate or provide manual details.'; 
      return;
    }
    this.isSaving = true; 
    this.errorMsg = '';

    const createRequests = [];

    if (this.selectedCandidatesForOffer.length > 0) {
      // Bulk creation
      for (const cand of this.selectedCandidatesForOffer) {
        const offerPayload = {
          ...this.newOffer,
          candidate_id: cand.id,
          candidate_name: this.getDisplayName(cand),
          candidate_email: this.getDisplayEmail(cand)
        };
        createRequests.push(this.talentSvc.createOffer(offerPayload).pipe(catchError(e => of({ error: e }))));
      }
    } else {
      // Single manual creation
      createRequests.push(this.talentSvc.createOffer(this.newOffer).pipe(catchError(e => of({ error: e }))));
    }

    forkJoin(createRequests).subscribe({
      next: (results: any[]) => {
        const successes = results.filter(r => !r.error && r.offer);
        const failures = results.filter(r => r.error);

        if (successes.length > 0) {
          this.offers = [...successes.map(s => s.offer).reverse(), ...this.offers];
          this.successMsg = `Successfully created ${successes.length} offer(s)!`;
          this.showNewOfferForm = false;
          if (successes.length === 1) this.selectOffer(successes[0].offer);
        }
        
        if (failures.length > 0) {
          this.errorMsg = `Failed to create ${failures.length} offer(s).`;
        }
        
        this.isSaving = false;
        setTimeout(() => this.successMsg = '', 4000);
      },
      error: (err: any) => { 
        this.isSaving = false; 
        this.errorMsg = 'An unexpected error occurred during creation.'; 
      }
    });
  }

  updateStatus(offer: any, newStatus: string): void {
    this.talentSvc.updateOfferStatus(offer.id, newStatus).subscribe({
      next: (res: any) => {
        const idx = this.offers.findIndex(o => o.id === offer.id);
        if (idx !== -1) this.offers[idx] = res.offer;
        if (this.selectedOffer?.id === offer.id) this.selectedOffer = res.offer;
        this.successMsg = `Offer marked as ${newStatus}.`;
        setTimeout(() => this.successMsg = '', 3000);
      },
      error: (err: any) => { this.errorMsg = err?.error?.detail || 'Failed to update status.'; }
    });
  }

  cancelTemplateForm(): void {
    this.showTemplateForm = false;
    this.isEditingTemplate = false;
    this.editingTemplateId = '';
    this.newTemplate = { name: '', subject: '', body_html: '' };
  }

  editTemplate(t: any): void {
    this.isEditingTemplate = true;
    this.editingTemplateId = t.id;
    this.newTemplate = {
      name: t.name || '',
      subject: t.subject || '',
      body_html: t.body_html || ''
    };
    this.showTemplateForm = true;
  }

  deleteTemplate(templateId: string): void {
    if (!confirm('Are you sure you want to delete this offer template?')) return;
    this.talentSvc.deleteOfferTemplate(templateId).subscribe({
      next: () => {
        this.templates = this.templates.filter(t => t.id !== templateId);
        this.successMsg = 'Template deleted successfully.';
        setTimeout(() => this.successMsg = '', 3000);
      },
      error: (err: any) => {
        this.errorMsg = err?.error?.detail || 'Failed to delete template.';
      }
    });
  }

  useTemplate(t: any): void {
    this.activeTab = 'offers';
    this.showNewOfferForm = true;
    this.onTemplateSelect(t.id);
  }

  saveTemplate(): void {
    if (!this.newTemplate.name || !this.newTemplate.body_html) {
      this.errorMsg = 'Template name and body are required.'; return;
    }
    this.isSaving = true;

    if (this.isEditingTemplate) {
      this.talentSvc.updateOfferTemplate(this.editingTemplateId, this.newTemplate).subscribe({
        next: (res: any) => {
          const idx = this.templates.findIndex(t => t.id === this.editingTemplateId);
          if (idx > -1) this.templates[idx] = res.template;
          this.isSaving = false;
          this.cancelTemplateForm();
          this.successMsg = 'Template updated successfully!';
          setTimeout(() => this.successMsg = '', 3000);
        },
        error: (err: any) => { this.isSaving = false; this.errorMsg = err?.error?.detail || 'Failed to update template.'; }
      });
    } else {
      this.talentSvc.createOfferTemplate(this.newTemplate).subscribe({
        next: (res: any) => {
          this.templates.push(res.template);
          this.isSaving = false;
          this.cancelTemplateForm();
          this.successMsg = 'Template saved!';
          setTimeout(() => this.successMsg = '', 3000);
        },
        error: (err: any) => { this.isSaving = false; this.errorMsg = err?.error?.detail || 'Failed to save template.'; }
      });
    }
  }

  insertToken(token: string): void {
    this.newOffer.custom_body_html = (this.newOffer.custom_body_html || '') + token;
  }

  copyOfferUrl(offer: any): void {
    const url = `${window.location.origin}/offer/view/${offer.link_token}`;
    navigator.clipboard.writeText(url);
    this.successMsg = 'Offer link copied!';
    setTimeout(() => this.successMsg = '', 2000);
  }

  showSendConfirmModal = false;
  offerToSend: any = null;

  openSendConfirmModal(offer: any): void {
    this.offerToSend = offer;
    this.showSendConfirmModal = true;
  }

  confirmSendOffer(): void {
    if (!this.offerToSend) return;
    this.isSaving = true;
    this.talentSvc.updateOffer(this.offerToSend.id, { delivery_mode: 'send' }).subscribe({
      next: (res: any) => {
        this.isSaving = false;
        this.showSendConfirmModal = false;
        const updated = res.offer || {
          ...this.offerToSend,
          delivery_mode: 'send',
          delivery_status: 'sent',
          notified: true,
          emails_sent: true
        };
        this.selectedOffer = updated;
        const idx = this.offers.findIndex(o => o.id === updated.id);
        if (idx > -1) this.offers[idx] = updated;
        this.successMsg = `Offer letter dispatched and sent to ${updated.candidate_name} (${updated.candidate_email}) successfully!`;
        setTimeout(() => this.successMsg = '', 4000);
      },
      error: (err: any) => {
        this.isSaving = false;
        this.errorMsg = err?.error?.detail || 'Failed to send offer letter to candidate.';
      }
    });
  }

  getInitials(name: string): string {
    return (name || 'NN').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  }
}
