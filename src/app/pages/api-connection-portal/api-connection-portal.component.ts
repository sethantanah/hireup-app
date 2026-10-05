import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { OrgService } from '../../services/org.service';
import { AuthService } from '../../services/auth.service';
import { JobpostManagerService } from '../../services/jobpost-manager.service';
import { JobpostingsApiService } from '../../services/jobpostings-api.service';
import { CandidateService } from '../../services/candidate.service';
import { ApplicantManagementService } from '../../services/applicant-management.service';

import { CustomDropdownComponent } from '../../components/custom-dropdown/custom-dropdown.component';
import { DataService } from '../../services/data.service';
import { CandidateDetailsComponent } from '../dashboard/components/candidate-details/candidate-details.component';
import { ApiConnectionCopilotComponent } from '../api-connection-copilot/api-connection-copilot.component';
import { environment } from '../../../environment/environment';

@Component({
  selector: 'app-api-connection-portal',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, CustomDropdownComponent, CandidateDetailsComponent, ApiConnectionCopilotComponent],
  templateUrl: './api-connection-portal.component.html',
  styleUrls: ['./api-connection-portal.component.css']
})
export class ApiConnectionPortalComponent implements OnInit {
  connId: string | null = null;
  orgId: string | null = null;
  connection: any = null;
  isLoading = true;
  activeTab: 'all' | 'semantic' | 'copilot' = 'all';

  get currentConnectionName(): string {
    if (this.connection?.name) return this.connection.name;
    const match = this.allConnections.find(c => c.id === this.connId);
    return match?.name || 'API Connection Pool';
  }

  // Multi-Pool Selection State
  allConnections: any[] = [];
  selectedConnectionIds: string[] = [];

  // All Tab State
  allCandidates: any[] = [];
  allSearchQuery = '';
  allLimit = 20;
  allPagination = { page: 1, limit: 20, total_records: 0, total_pages: 1 };

  // Semantic Tab State
  semanticCandidates: any[] = [];
  semanticSearchQuery = '';
  semanticMinScore = 50;
  semanticLimit = 20;
  semanticPagination = { page: 1, limit: 20, total_records: 0, total_pages: 1 };

  // AI Copilot Tab State
  copilotQuery = '';
  copilotJobId = '';
  isCopilotLoading = false;
  copilotResponse: any = null;
  copilotCandidates: any[] = [];
  copilotMessages: { role: 'user' | 'assistant'; content: string; candidates?: any[]; timestamp: Date }[] = [];

  // Advanced Frontend Filter State
  showFilterModal = false;
  advancedFilters: any[] = []; // { field: '', operator: '', value: '', join: 'AND' }
  
  connectionSchema = {
    fields: [
      { name: "first_name", type: "string" },
      { name: "last_name", type: "string" },
      { name: "email", type: "email" },
      { name: "phone", type: "string" },
      { name: "linkedin_url", type: "url" },
      { name: "portfolio_url", type: "url" },
      { name: "available_start_date", type: "date" },
      { name: "highest_education", type: "dropdown", options: ["High School", "Bachelors", "Masters", "PhD"] },
      { name: "years_of_experience", type: "number" }
    ]
  };

  get candidates() {
    let list = this.activeTab === 'all' ? this.allCandidates : this.semanticCandidates;
    
    // Evaluate advanced filters
    if (this.advancedFilters.length > 0) {
      list = list.filter(c => {
        let result = true;
        let currentLogical = 'AND'; // default start
        
        for (let i = 0; i < this.advancedFilters.length; i++) {
          const filter = this.advancedFilters[i];
          if (!filter.field || !filter.operator || filter.value === undefined || filter.value === '') continue;
          
          let val = c.original_record?.form_data?.[filter.field];
          if (val === undefined || val === null) val = '';
          
          let conditionMet = false;
          
          if (filter.operator === 'contains') {
            conditionMet = String(val).toLowerCase().includes(String(filter.value).toLowerCase());
          } else if (filter.operator === 'equals' || filter.operator === '==') {
            conditionMet = String(val).toLowerCase() === String(filter.value).toLowerCase();
          } else if (filter.operator === 'starts_with') {
            conditionMet = String(val).toLowerCase().startsWith(String(filter.value).toLowerCase());
          } else if (filter.operator === '!=') {
            conditionMet = String(val).toLowerCase() !== String(filter.value).toLowerCase();
          } else if (filter.operator === '>') {
            conditionMet = Number(val) > Number(filter.value);
          } else if (filter.operator === '<') {
            conditionMet = Number(val) < Number(filter.value);
          } else if (filter.operator === '>=') {
            conditionMet = Number(val) >= Number(filter.value);
          } else if (filter.operator === '<=') {
            conditionMet = Number(val) <= Number(filter.value);
          }
          
          if (i === 0) {
            result = conditionMet;
          } else {
            if (currentLogical === 'AND') result = result && conditionMet;
            else if (currentLogical === 'OR') result = result || conditionMet;
          }
          currentLogical = filter.join || 'AND';
        }
        return result;
      });
    }

    return list;
  }

  logicalJoinOptions = [
    { label: 'AND', value: 'AND' },
    { label: 'OR', value: 'OR' }
  ];

  get schemaFieldOptions(): { label: string; value: string }[] {
    return (this.connectionSchema?.fields || []).map(f => ({
      label: `${f.name} (${f.type})`,
      value: f.name
    }));
  }

  onFilterFieldChange(filter: any): void {
    const ops = this.getOperatorsForField(filter.field);
    filter.operator = ops.length ? ops[0].value : 'contains';
    filter.value = '';
  }

  updateConnectionSchema(): void {
    if (!this.connection?.schema_definition) return;
    try {
      const parsed = typeof this.connection.schema_definition === 'string'
        ? JSON.parse(this.connection.schema_definition)
        : this.connection.schema_definition;
      if (parsed && Array.isArray(parsed.fields) && parsed.fields.length > 0) {
        this.connectionSchema.fields = parsed.fields;
      }
    } catch (e) {}
  }

  openFilterModal() {
    this.updateConnectionSchema();
    this.showFilterModal = true;
    if (this.advancedFilters.length === 0) {
      this.addFilterCondition();
    }
  }
  
  closeFilterModal() {
    this.showFilterModal = false;
  }
  
  addFilterCondition() {
    const firstField = this.connectionSchema.fields[0]?.name || 'first_name';
    this.advancedFilters.push({ field: firstField, operator: 'contains', value: '', join: 'AND' });
  }
  
  removeFilterCondition(index: number) {
    this.advancedFilters.splice(index, 1);
  }
  
  clearFilters() {
    this.advancedFilters = [];
    this.showFilterModal = false;
  }
  
  getOperatorsForField(fieldName: string): {value: string, label: string}[] {
    const field = this.connectionSchema.fields.find(f => f.name === fieldName);
    if (!field) return [];
    if (field.type === 'number' || field.type === 'date') {
      return [
        {value: '==', label: 'Equals (==)'},
        {value: '!=', label: 'Not Equals (!=)'},
        {value: '>', label: 'Greater Than (>)'},
        {value: '<', label: 'Less Than (<)'},
        {value: '>=', label: 'Greater or Equal (>=)'},
        {value: '<=', label: 'Less or Equal (<=)'}
      ];
    } else if (field.type === 'dropdown') {
      return [
        {value: 'equals', label: 'Is'},
        {value: '!=', label: 'Is Not'}
      ];
    } else {
      return [
        {value: 'contains', label: 'Contains'},
        {value: 'equals', label: 'Equals Exact'},
        {value: 'starts_with', label: 'Starts With'},
        {value: '!=', label: 'Does Not Equal'}
      ];
    }
  }

  getFieldOptions(fieldName: string): string[] {
    const field = this.connectionSchema.fields.find(f => f.name === fieldName);
    return field?.options || [];
  }
  
  get pagination() {
    return this.activeTab === 'all' ? this.allPagination : this.semanticPagination;
  }
  
  // Modals state
  selectedCandidateForDetails: any = null;
  showViewModal = false;

  // Sidebar state
  sidebarOpen = false;
  showToolsMenu = false;
  userData: any = null;

  // Import Modal State
  availableJobPosts: any[] = [];
  selectedCandidatesForImport: any[] = [];
  selectedCandidates: Set<string> = new Set();
  
  toggleSelection(candidateId: string) {
    if (this.selectedCandidates.has(candidateId)) {
      this.selectedCandidates.delete(candidateId);
    } else {
      this.selectedCandidates.add(candidateId);
    }
  }

  selectAll() {
    if (this.selectedCandidates.size === this.candidates.length && this.candidates.length > 0) {
      this.selectedCandidates.clear();
    } else {
      this.candidates.forEach(c => this.selectedCandidates.add(c.id));
    }
  }

  importJobId: string = '';
  importStage: string = 'Application Review';
  importMode: 'alert' | 'direct' = 'alert';
  emailSubject: string = '';
  emailBody: string = '';
  isImporting: boolean = false;
  feedback: { type: 'success' | 'error'; message: string } | null = null;
  get stages(): string[] {
    const activeJobId = this.importJobId;
    if (activeJobId && this.availableJobPosts && this.availableJobPosts.length > 0) {
      const job = this.availableJobPosts.find(j => j.id === activeJobId);
      const configured = job?.template_data?.applicationStages || job?.application_stages;
      if (Array.isArray(configured) && configured.length > 0) {
        return configured
          .filter((s: any) => s.is_active && !s.hide_stage)
          .map((s: any) => s.name);
      }
    }
    return this.jobPostService.defaultStages
      .filter(s => s.is_active && !s.hide_stage)
      .map(s => s.name);
  }

  // Convert API Connection to Job Post Wizard State
  showConvertToJobModal = false;
  isConvertingToJob = false;
  convertFeedback: { type: 'success' | 'error'; message: string } | null = null;
  
  convertJobData = {
    title: '',
    department: 'Engineering',
    employmentType: 'Full-time',
    workMode: 'Remote',
    location: 'San Francisco, CA',
    salaryRange: '$120,000 - $160,000 / year',
    description: ''
  };

  convertedFormFieldsPreview: { key: string; label: string; type: string; section: string; required: boolean; options?: string[] }[] = [];

  departmentOptions = [
    'Engineering',
    'Product Management',
    'Design & UX',
    'Data & AI',
    'Sales & Business Development',
    'Marketing',
    'Customer Success',
    'Human Resources & Talent',
    'Finance & Legal',
    'Operations'
  ];

  employmentTypeOptions = [
    'Full-time',
    'Part-time',
    'Contract',
    'Freelance',
    'Internship'
  ];

  workModeOptions = [
    'Remote',
    'Hybrid',
    'On-site'
  ];

  openConvertToJobModal(): void {
    this.updateConnectionSchema();
    this.convertFeedback = null;
    
    const connectionName = this.currentConnectionName;
    this.convertJobData = {
      title: `${connectionName} Hiring Position`,
      department: 'Engineering',
      employmentType: 'Full-time',
      workMode: 'Remote',
      location: 'San Francisco, CA',
      salaryRange: '$120,000 - $160,000 / year',
      description: `We are seeking qualified candidates for our ${connectionName} position. Applicants can submit their profile details, resume, and application form directly through our recruitment portal.`
    };

    this.convertedFormFieldsPreview = this.generateConvertedFormFields();
    this.showConvertToJobModal = true;
  }

  closeConvertToJobModal(): void {
    this.showConvertToJobModal = false;
    this.convertFeedback = null;
    this.isConvertingToJob = false;
  }

  generateConvertedFormFields(): { key: string; label: string; type: string; section: string; required: boolean; options?: string[], instructions: string }[] {
    const fields = this.connectionSchema?.fields || [];
    return fields.map(f => {
      let inputType = 'text';
      if (f.type === 'email') inputType = 'email';
      else if (f.type === 'phone') inputType = 'tel';
      else if (f.type === 'number') inputType = 'number';
      else if (f.type === 'date') inputType = 'date';
      else if (f.type === 'dropdown') inputType = 'select';
      else if (f.type === 'url') inputType = 'url';
      else if (f.type === 'file') inputType = 'file';
      else if (f.type === 'text') inputType = 'textarea';

      const formattedLabel = (f as any).label || f.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

      return {
        key: f.name,
        label: formattedLabel,
        type: inputType,
        section: 'Candidate Profile & Qualifications',
        required: true,
        options: f.options ? [...f.options] : undefined,
        instructions: ''
      };
    });
  }

  executeConvertToJobPost(): void {
    if (!this.convertJobData.title?.trim()) {
      this.convertFeedback = { type: 'error', message: 'Job Post Title is required.' };
      return;
    }

    // Resolve User ID
    let userId = this.userData?.id;
    if (!userId) {
      try {
        const uStr = localStorage.getItem('USER');
        if (uStr) {
          const u = JSON.parse(uStr);
          userId = u.id || u.user_id;
        }
      } catch (e) {}
    }

    if (!userId) {
      this.convertFeedback = { type: 'error', message: 'User session invalid. Please log in again.' };
      return;
    }

    // Resolve Organization ID
    let orgId = this.orgId;
    if (!orgId) {
      try {
        const activeOrgStr = localStorage.getItem('current_organization') || localStorage.getItem('ACTIVE_ORG');
        if (activeOrgStr) {
          const activeOrg = JSON.parse(activeOrgStr);
          if (activeOrg && activeOrg.id) {
            orgId = activeOrg.id;
          }
        }
      } catch (e) {}
    }

    this.isConvertingToJob = true;
    this.convertFeedback = null;

    // Use JobpostingsApiService to ensure headers, authorization, user_id and organization_id are set properly
    const jobPostPayload = {
      title: this.convertJobData.title.trim(),
      organization_id: orgId,
      department: this.convertJobData.department,
      type: this.convertJobData.employmentType,
      workMode: this.convertJobData.workMode,
      location: this.convertJobData.location,
      salaryRange: this.convertJobData.salaryRange,
      description: this.convertJobData.description
    };

    this.jobpostingsApiService.createUpdateJobPost(userId, jobPostPayload)
      .subscribe({
        next: (res: any) => {
          const newJobId = res.job_post?.id || res.id || res.jobpost_id || res.data?.id;
          if (!newJobId) {
            this.convertFeedback = { type: 'error', message: 'Failed to retrieve created job post ID.' };
            this.isConvertingToJob = false;
            return;
          }

          const companyName = this.userData?.organization_name || this.userData?.company_name || this.userData?.full_name || 'HireUp Company';
          const convertedFields = this.generateConvertedFormFields();
          
          const fullTemplateData = {
            id: newJobId,
            company: {
              name: companyName,
              logoUrl: this.userData?.logo_url || '',
              navLinks: []
            },
            job: {
              title: this.convertJobData.title.trim(),
              description: this.convertJobData.description || '',
              location: this.convertJobData.location || '',
              type: this.convertJobData.employmentType || 'Full-time',
              workMode: this.convertJobData.workMode || 'Remote',
              salaryRange: this.convertJobData.salaryRange || ''
            },
            applySection: {
              title: 'Apply for Position',
              instructions: 'Please fill out the form below to submit your application.',
              buttonText: 'Submit Application',
              declaration: 'I certify that the information provided is accurate and complete.'
            },
            benefits: {
              title: 'Role Benefits',
              items: []
            },
            footer: {
              copyrightText: `© ${new Date().getFullYear()} ${companyName}`,
              links: []
            },
            formData: {
              fields: convertedFields
            },
            submissionMessage: {
              title: 'Application Submitted!',
              message: 'Thank you for your application. We will review your submission and get back to you soon.',
              actionText: 'Back to Careers',
              actionLink: '/careers'
            },
            colorScheme: {
              primary: '#10b981',
              secondary: '#047857',
              accent: '#f59e0b',
              background: '#ffffff',
              text: '#1f2937'
            },
            sectionVisibility: {
              showCompanyDetails: true,
              showJobDescription: true,
              showSalaryRange: true,
              showDeadline: true,
              showRequirements: true,
              showBenefits: true,
              showContactSection: true
            },
            applicationStages: this.jobPostService.defaultStages.map(s => ({
              ...s,
              jobpost_id: newJobId
            })),
            emailTemplates: [],
            sections: ['General'],
            additionalSections: ['General'],
            deadline: '',
            templateId: '1',
            lastUpdated: Date.now(),
            version: '1.0.0',
            // Also preserve jobInfo & customFormSchema for backwards compatibility
            jobInfo: {
              title: this.convertJobData.title,
              description: this.convertJobData.description,
              type: this.convertJobData.employmentType,
              workMode: this.convertJobData.workMode,
              location: this.convertJobData.location,
              salaryRange: this.convertJobData.salaryRange
            },
            customFormSchema: convertedFields
          };

          this.jobPostService.createUpdateJobPostData(newJobId, fullTemplateData)
            .subscribe({
              next: () => {
                this.isConvertingToJob = false;
                this.convertFeedback = { type: 'success', message: 'Job post created successfully! Opening Job Post & Form Editor...' };
                setTimeout(() => {
                  this.closeConvertToJobModal();
                  this.router.navigate(['/jobposts/manager', newJobId]);
                }, 800);
              },
              error: () => {
                this.isConvertingToJob = false;
                this.closeConvertToJobModal();
                this.router.navigate(['/jobposts/manager', newJobId]);
              }
            });
        },
        error: (err: any) => {
          console.error('Error creating job post from connection:', err);
          this.isConvertingToJob = false;
          this.convertFeedback = { type: 'error', message: err?.error || err?.details || err?.message || 'Failed to create job post. Please ensure you are logged in.' };
        }
      });
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private orgService: OrgService,
    private authService: AuthService,
    private jobPostService: JobpostManagerService,
    private jobpostingsApiService: JobpostingsApiService,
    private candidateService: CandidateService,
    private applicantService: ApplicantManagementService,
    public dataService: DataService
  ) {}

  openCopilotExternalPage(): void {
    const url = this.router.serializeUrl(
      this.router.createUrlTree(['/api-connection-copilot'], {
        queryParams: {
          connection_id: this.connId,
          connection_name: this.currentConnectionName
        }
      })
    );
    window.open(url, '_blank');
  }

  ngOnInit(): void {
    try { 
      const u = localStorage.getItem('USER'); 
      if(u) {
        this.userData = JSON.parse(u); 
        this.fetchJobPosts();
      }
    } catch {}

    this.orgService.currentOrg$.subscribe(org => {
      if (org) {
        this.orgId = org.id;
        this.fetchOrganizationConnections();
        if (this.connId) {
          this.fetchRecords();
        }
      }
    });
    
    this.route.paramMap.subscribe(params => {
      this.connId = params.get('connId');
      if (this.connId && !this.selectedConnectionIds.includes(this.connId)) {
        this.selectedConnectionIds = [this.connId];
      }
      if (this.allConnections.length > 0 && this.connId) {
        this.connection = this.allConnections.find(c => c.id === this.connId) || null;
      }
      if (this.connId && this.orgId) {
        this.fetchRecords();
      }
    });
  }

  fetchOrganizationConnections(): void {
    if (!this.orgId) return;
    const token = encodeURIComponent(localStorage.getItem('token') || '');
    this.http.get<any>(`${environment.apiUrl || 'http://localhost:8000/api'}/orgs/${this.orgId}/api-connections?token=${token}`)
      .subscribe({
        next: (res) => {
          this.allConnections = res.api_connections || [];
          if (this.connId) {
            this.connection = this.allConnections.find(c => c.id === this.connId) || null;
          }
          if (this.connId && !this.selectedConnectionIds.includes(this.connId)) {
            this.selectedConnectionIds = [this.connId];
          }
        },
        error: (err) => console.error('Failed to fetch org connections', err)
      });
  }

  togglePoolSelection(connectionId: string): void {
    const idx = this.selectedConnectionIds.indexOf(connectionId);
    if (idx > -1) {
      this.selectedConnectionIds.splice(idx, 1);
    } else {
      this.selectedConnectionIds.push(connectionId);
    }
  }

  selectAllPools(): void {
    this.selectedConnectionIds = this.allConnections.map(c => c.id);
  }

  deselectAllPools(): void {
    this.selectedConnectionIds = [];
  }

  isPoolSelected(connectionId: string): boolean {
    return this.selectedConnectionIds.includes(connectionId);
  }

  fetchRecords() {
    this.isLoading = true;
    const token = localStorage.getItem('token');
    
    if (this.activeTab === 'semantic') {
      if (!this.semanticSearchQuery || this.semanticSearchQuery.trim().length === 0) {
        this.semanticCandidates = [];
        this.isLoading = false;
        return;
      }
      
      this.semanticPagination.limit = this.semanticLimit;
      const body = {
        query: this.semanticSearchQuery,
        min_score: this.semanticMinScore,
        page: this.semanticPagination.page,
        limit: this.semanticLimit
      };
      
      this.http.post<any>(`${environment.apiUrl || 'http://localhost:8000/api'}/orgs/${this.orgId}/api-connections/${this.connId}/records/search?token=${encodeURIComponent(token || '')}`, body)
        .subscribe({
          next: (res) => {
            this.semanticCandidates = (res.records || []).map((r: any) => this.mapRecordToCandidate(r));
            this.semanticPagination = res.pagination || this.semanticPagination;
            this.isLoading = false;
          },
          error: (err) => {
            console.error(err);
            this.isLoading = false;
          }
        });
    } else {
      this.allPagination.limit = this.allLimit;
      const searchParam = this.allSearchQuery ? `&search=${encodeURIComponent(this.allSearchQuery)}` : '';
      this.http.get<any>(`${environment.apiUrl || 'http://localhost:8000/api'}/orgs/${this.orgId}/api-connections/${this.connId}/records?token=${encodeURIComponent(token || '')}&page=${this.allPagination.page}&limit=${this.allLimit}${searchParam}`)
        .subscribe({
          next: (res) => {
            this.allCandidates = res.records.map((r: any) => this.mapRecordToCandidate(r));
            this.allPagination = res.pagination;
            this.isLoading = false;
          },
          error: (err) => {
            console.error(err);
            this.isLoading = false;
          }
        });
    }
  }

  search() {
    if (this.activeTab === 'all') {
      this.allPagination.page = 1;
    } else {
      this.semanticPagination.page = 1;
    }
    this.fetchRecords();
  }
  
  switchTab(tab: 'all' | 'semantic' | 'copilot') {
    this.activeTab = tab;

    if (tab === 'all' && this.allCandidates.length === 0) {
      this.fetchRecords();
    } else if (tab === 'semantic' && this.semanticCandidates.length === 0 && this.semanticSearchQuery.trim().length > 0) {
      this.fetchRecords();
    } else if (tab === 'copilot') {
      if (this.allConnections.length === 0) {
        this.fetchOrganizationConnections();
      }
    }
  }

  sendCopilotQuery(): void {
    if (!this.copilotQuery || !this.copilotQuery.trim()) return;
    
    const userPrompt = this.copilotQuery.trim();
    this.copilotQuery = '';
    this.isCopilotLoading = true;

    this.copilotMessages.push({
      role: 'user',
      content: userPrompt,
      timestamp: new Date()
    });

    const token = encodeURIComponent(localStorage.getItem('token') || '');
    const targetPools = this.selectedConnectionIds.length > 0 ? this.selectedConnectionIds : (this.connId ? [this.connId] : ['all']);
    
    const payload = {
      query: userPrompt,
      connection_ids: targetPools,
      jobpost_id: this.copilotJobId || null,
      min_score: 0,
      enable_web_search: false
    };

    this.http.post<any>(`${environment.apiUrl || 'http://localhost:8000/api'}/orgs/${this.orgId}/api-connections/copilot?token=${token}`, payload)
      .subscribe({
        next: (res) => {
          this.isCopilotLoading = false;
          this.copilotResponse = res;
          this.copilotCandidates = (res.candidates || []).map((c: any) => ({
            id: c.id,
            full_name: c.full_name,
            headline: c.headline,
            user_email: c.user_email || c.email,
            email: c.user_email || c.email,
            phone: c.phone,
            location: c.location,
            website: c.website,
            bio: c.bio,
            match_score: c.match_score,
            match_reason: c.match_reason,
            skills_list: c.skills_list || c.skills || [],
            connection_name: c.connection_name,
            form_data: c.form_data || {},
            resume_data: c.resume_data || {},
            structured_resume: c.structured_resume || {},
            uploaded_files: c.uploaded_files || {}
          }));

          this.copilotMessages.push({
            role: 'assistant',
            content: res.response || 'Completed candidate pool evaluation.',
            candidates: this.copilotCandidates,
            timestamp: new Date()
          });
        },
        error: (err) => {
          this.isCopilotLoading = false;
          this.copilotMessages.push({
            role: 'assistant',
            content: `⚠️ Failed to execute Copilot analysis: ${err?.error?.detail || err.message}`,
            timestamp: new Date()
          });
        }
      });
  }

  mapRecordToCandidate(r: any): any {
    const fd = r.form_data || {};
    const rd = r.resume_data || {};
    const pd = rd.personal_details || {};
    
    return {
      id: r.id,
      match_score: r.match_score,
      full_name: `${fd.first_name || fd.name || 'Unknown'} ${fd.last_name || ''}`.trim(),
      headline: fd.headline || pd.headline || 'Candidate',
      user_email: fd.email || pd.email || '',
      location: fd.location || pd.location || '',
      phone: fd.phone || pd.phone || '',
      website: fd.website || pd.portfolio || '',
      employment_status: fd.employment_status || 'Actively Looking',
      bio: rd.bio || pd.summary || rd.summary || '',
      raw_text: r.raw_text || rd.raw_text || fd.resume_text || r.resume_text || rd.text || r.uploaded_files?.resume?.document_text || '',
      skills_list: Array.isArray(rd.skills_list) ? rd.skills_list : (
         rd.skills && typeof rd.skills === 'object' ? 
         [...(rd.skills.technical_skills || []), ...(rd.skills.soft_skills || []), ...(rd.skills.languages || [])] : []
      ),
      uploaded_files: r.uploaded_files || {},
      structured_resume: rd,
      original_record: r
    };
  }

  deleteRecord(record: any) {
    if (confirm('Are you sure you want to delete this record?')) {
      const token = localStorage.getItem('token');
      this.http.delete(`${environment.apiUrl || 'http://localhost:8000/api'}/orgs/${this.orgId}/api-connections/${this.connId}/records/${record.id}?token=${encodeURIComponent(token || '')}`)
        .subscribe({
          next: () => {
            this.allCandidates = this.allCandidates.filter(r => r.id !== record.id);
            this.semanticCandidates = this.semanticCandidates.filter(r => r.id !== record.id);
          },
          error: (err) => console.error(err)
        });
    }
  }

  openCandidateDetailsModal(candidate: any) {
    this.selectedCandidateForDetails = candidate;
    this.dataService.candidate = candidate;
    this.dataService.openCandidateDetails = true;
  }

  closeCandidateDetailsModal() {
    this.selectedCandidateForDetails = null;
    this.dataService.openCandidateDetails = false;
  }

  notifiedCandidateIds = new Set<string>();

  isCandidateNotified(candidate: any, targetJobId?: string): boolean {
    if (!candidate) return false;
    const activeJobId = targetJobId || this.importJobId;
    if (!activeJobId) return false;

    const candId = candidate.id;
    const candEmail = candidate.user_email || candidate.email;
    if (candId && this.notifiedCandidateIds.has(`${candId}_${activeJobId}`)) return true;
    if (candEmail && this.notifiedCandidateIds.has(`${candEmail}_${activeJobId}`)) return true;

    const notifiedJobs: string[] = candidate.notified_jobpost_ids || [];
    if (Array.isArray(notifiedJobs) && notifiedJobs.includes(activeJobId)) return true;

    return false;
  }

  fetchJobPosts(): void {
    if (this.userData?.id || this.userData?.user_id) {
      this.jobPostService.getJobPosts(this.userData.id || this.userData.user_id).subscribe({
        next: (res: any) => {
          const rawPosts = Array.isArray(res) ? res : (res?.data || []);
          this.availableJobPosts = rawPosts.map((jp: any) => ({
             ...jp,
             job_title: jp.job_title || jp.title
          }));
        }
      });
    }
  }

  // Target Form Schema & Mapping State
  targetFormInfo: { has_form: boolean; target_form_schema: any[]; record_fields: any[]; suggested_mapping: Record<string, string> } | null = null;
  fieldMapping: Record<string, string> = {};
  isLoadingFormInfo = false;

  openImportModal(candidate?: any, mode: 'alert' | 'direct' = 'alert'): void {
    if (candidate) {
      this.selectedCandidatesForImport = [candidate];
    } else {
      this.selectedCandidatesForImport = this.candidates.filter(c => this.selectedCandidates.has(c.id));
    }
    
    if (this.selectedCandidatesForImport.length === 0) return;
    
    this.importMode = mode;
    if (this.availableJobPosts.length > 0) {
      this.importJobId = this.availableJobPosts[0].id;
    }
    this.updateAlertEmailTemplate();
    this.fetchJobPostFormInfo();
    this.feedback = null;
  }

  closeImportModal(): void {
    this.selectedCandidatesForImport = [];
    this.targetFormInfo = null;
    this.fieldMapping = {};
    this.feedback = null;
  }

  onJobChanged(): void {
    this.updateAlertEmailTemplate();
    this.fetchJobPostFormInfo();
  }

  fetchJobPostFormInfo(): void {
    if (!this.importJobId) {
      this.targetFormInfo = null;
      this.fieldMapping = {};
      return;
    }
    const token = encodeURIComponent(localStorage.getItem('token') || '');
    const recId = this.selectedCandidatesForImport.length ? this.selectedCandidatesForImport[0].id : '';
    this.isLoadingFormInfo = true;
    this.http.get<any>(`${environment.apiUrl || 'http://localhost:8000/api'}/orgs/${this.orgId}/api-connections/${this.connId}/jobpost-form-info?jobpost_id=${this.importJobId}&record_id=${recId}&token=${token}`)
      .subscribe({
        next: (res) => {
          this.isLoadingFormInfo = false;
          this.targetFormInfo = res;
          this.fieldMapping = { ...(res.suggested_mapping || {}) };
        },
        error: () => {
          this.isLoadingFormInfo = false;
          this.targetFormInfo = null;
        }
      });
  }

  getSelectedJobTitle(): string {
    const job = this.availableJobPosts.find(j => j.id === this.importJobId);
    return job ? (job.job_title || job.title) : '';
  }

  getSelectedJobCompanyName(): string {
    const job = this.availableJobPosts.find(j => j.id === this.importJobId);
    if (job) {
      const name = job.company_name || job.company || job.org_name || job.organization_name;
      if (name && name !== 'Organization') return name;
    }
    return this.userData?.company_name || this.userData?.org_name || 'Organization';
  }

  updateAlertEmailTemplate(): void {
    if (!this.selectedCandidatesForImport || this.selectedCandidatesForImport.length === 0) return;
    const name = this.selectedCandidatesForImport.length === 1 ? (this.selectedCandidatesForImport[0].full_name || 'Candidate') : 'Candidate';
    const jobTitle = this.getSelectedJobTitle() || 'Position';
    const companyName = this.getSelectedJobCompanyName();
    const companySlug = encodeURIComponent(companyName !== 'Organization' ? companyName : 'company');
    const applyUrl = `${window.location.origin}/apply/${companySlug}/${this.importJobId}/`;

    this.emailSubject = `Application Form Request: ${jobTitle} - ${companyName}`;
    this.emailBody = `Dear ${name},\n\nOur talent acquisition team at ${companyName} reviewed your background and would like to invite you to complete the application form for the ${jobTitle} position.\n\nPlease follow the link below to access and complete the application form:\n\n${applyUrl}\n\nWe look forward to receiving your completed form!\n\nBest regards,\nTalent Acquisition Team\n${companyName}`;
  }

  executeAddCandidateToJob(): void {
    if (!this.selectedCandidatesForImport || this.selectedCandidatesForImport.length === 0 || !this.importJobId) {
      this.feedback = { type: 'error', message: 'Please select a target job post.' };
      return;
    }
    
    this.isImporting = true;
    this.feedback = null;
    const targetStage = this.importMode === 'alert' ? 'Form Requested' : this.importStage;
    const token = encodeURIComponent(localStorage.getItem('token') || '');
    
    const requests = this.selectedCandidatesForImport.map(candidate => {
      const apiPayload = {
         api_record_id: candidate.id,
         jobpost_id: this.importJobId,
         stage: targetStage,
         field_mapping: this.fieldMapping
      };
      return this.http.post(`${environment.apiUrl || 'http://localhost:8000/api'}/orgs/${this.orgId}/api-connections/${this.connId}/migrate-record?token=${token}`, apiPayload);
    });

    forkJoin(requests).subscribe({
      next: (res: any) => {
        this.isImporting = false;

        if (this.importMode === 'alert') {
          for (const candidate of this.selectedCandidatesForImport) {
            const candId = candidate.id;
            const candEmail = candidate.user_email || candidate.email;
            if (candId && this.importJobId) this.notifiedCandidateIds.add(`${candId}_${this.importJobId}`);
            if (candEmail && this.importJobId) this.notifiedCandidateIds.add(`${candEmail}_${this.importJobId}`);

            if (candEmail) {
              this.applicantService.sendCandidateEmail({
                candidate_email: candEmail,
                candidate_name: candidate.full_name,
                subject: this.emailSubject,
                body: this.emailBody,
                template_id: 'form_invitation',
                jobpost_id: this.importJobId
              }).subscribe();
            }
          }
        }

        this.feedback = {
          type: 'success',
          message: this.importMode === 'alert'
            ? `Application invitation sent to ${this.selectedCandidatesForImport.length} candidate(s)!`
            : `${this.selectedCandidatesForImport.length} candidate(s) added directly to pipeline!`
        };
        // Clear selection on success
        this.selectedCandidates.clear();
        setTimeout(() => {
          this.closeImportModal();
        }, 2000);
      },
      error: (err: any) => {
        this.isImporting = false;
        this.feedback = { type: 'error', message: err?.error?.detail || 'Failed to migrate candidate(s) to pipeline.' };
      }
    });
  }

  // Sidebar functions
  toggleSidebar(): void { this.sidebarOpen = !this.sidebarOpen; }
  logOut(): void { this.authService.logOut(); }
  getInitials(name:string): string { return (name||'').split(' ').map((n:string)=>n[0]).join('').toUpperCase().slice(0,2); }
}
