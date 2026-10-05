import { Component, OnInit, ChangeDetectorRef, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { of } from 'rxjs';
import { CopilotService, ChatMessage, CopilotRequest } from '../../services/copilot.service';
import { DataService } from '../../services/data.service';
import { JobpostManagerService } from '../../services/jobpost-manager.service';
import { ApplicantManagementService } from '../../services/applicant-management.service';
import { AlertService } from '../../services/alert.service';
import { JobPostData, ApplicationStage } from '../../models/jobpost.model';
import { CandidateService } from '../../services/candidate.service';
import { CandidateDetailsComponent } from '../dashboard/components/candidate-details/candidate-details.component';
import { EmailsComponent } from '../dashboard/components/notifications/emails/emails.component';
import { CustomDropdownComponent } from '../../components/custom-dropdown/custom-dropdown.component';
import { JobpostingsApiService } from '../../services/jobpostings-api.service';
import { FormattingService } from '../../services/formatting.service';
import { SafeHtml } from '@angular/platform-browser';

export interface PromptTemplate {
  id?: string;
  title: string;
  prompt: string;
  icon: string;
  isCustom?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  jobId: string;
  messages: ChatMessage[];
}

@Component({
  selector: 'app-ai-copilot',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    CandidateDetailsComponent,
    EmailsComponent,
    CustomDropdownComponent
  ],
  templateUrl: './ai-copilot.component.html',
  styleUrl: './ai-copilot.component.scss'
})
export class AiCopilotComponent implements OnInit {
  @Input() restrictToConnectionId?: string | null;
  @Input() connectionName?: string | null;

  // Navigation & State
  jobPostings: JobPostData[] = [];
  selectedJobId: string = 'global';
  selectedJobPost: JobPostData | null = null;
  lastActiveJobId: string = '';
  lastActiveJobPost: JobPostData | null = null;
  dismissedRequirementsPromptForJobs: Set<string> = new Set<string>();
  isJobPostingsLoaded: boolean = false;
  selectedStageId: string = '';

  private loadDismissedPromptSet(): Set<string> {
    try {
      const saved = sessionStorage.getItem('dismissed_job_req_prompts');
      if (saved) {
        return new Set<string>(JSON.parse(saved));
      }
    } catch (e) {}
    return new Set<string>();
  }

  private saveDismissedPromptSet(): void {
    try {
      sessionStorage.setItem('dismissed_job_req_prompts', JSON.stringify(Array.from(this.dismissedRequirementsPromptForJobs)));
    } catch (e) {}
  }
  
  // Copilot Controls
  enableWebSearch: boolean = false;
  userInput: string = '';
  isLoading: boolean = false;
  sidebarOpen: boolean = true;
  minMatchScore: number = 50;
  activeSidebarTab: 'templates' | 'chats' = 'templates';
  
  // Form Alert Modal State
  showAlertModal: boolean = false;
  selectedCandidateForForm: any = null;
  formAlertMessage: string = '';
  isSendingFormAlert: boolean = false;
  
  // Pipeline Stage Move Modal State
  showMoveModal: boolean = false;
  selectedCandidateForMove: any = null;
  availableStages: ApplicationStage[] = [];
  targetStageId: string = '';

  // Custom Template Modal State
  showCreateTemplateModal: boolean = false;
  newTemplateTitle: string = '';
  newTemplatePrompt: string = '';
  newTemplateIcon: string = 'fa-layer-group text-emerald-600';
  iconOptions = [
    { value: 'fa-code text-indigo-600', label: 'Code / Technical' },
    { value: 'fa-star text-amber-600', label: 'Star / Ranking' },
    { value: 'fa-globe text-emerald-600', label: 'Globe / Web' },
    { value: 'fa-file-signature text-violet-600', label: 'Form / Document' },
    { value: 'fa-chart-pie text-emerald-600', label: 'Analytics' },
    { value: 'fa-users text-sky-600', label: 'Candidates / Team' }
  ];

  // Chat Messages & Sessions
  messages: ChatMessage[] = [];
  chatSessions: ChatSession[] = [];
  activeSessionId: string = '';

  // Built-in System Presets (No Emojis)
  presetPrompts: PromptTemplate[] = [
    {
      id: 'preset_1',
      title: 'Top Frontend Engineers',
      prompt: 'Find top candidates with Senior Frontend / Angular / React experience and rank them.',
      icon: 'fa-code text-indigo-600',
      isCustom: false
    },
    {
      id: 'preset_2',
      title: 'Job Recommendations',
      prompt: 'Analyze all applicants for the selected job post and recommend the top 3 best fits.',
      icon: 'fa-star text-amber-600',
      isCustom: false
    },
    {
      id: 'preset_3',
      title: 'Web Background Check',
      prompt: 'Perform a web background search on top candidates for public profile & portfolio verification.',
      icon: 'fa-globe text-emerald-600',
      isCustom: false
    },
    {
      id: 'preset_4',
      title: 'Incomplete Form Audit',
      prompt: 'Identify candidates who have pending or incomplete application form fields.',
      icon: 'fa-file-signature text-violet-600',
      isCustom: false
    },
    {
      id: 'preset_5',
      title: 'Skill Gap Analysis',
      prompt: 'Evaluate candidate pool skills against key job requirements and identify gaps.',
      icon: 'fa-chart-pie text-emerald-600',
      isCustom: false
    }
  ];

  customPrompts: PromptTemplate[] = [];

  get allPrompts(): PromptTemplate[] {
    return [...this.presetPrompts, ...this.customPrompts];
  }

  get currentOrgId(): string {
    const userStr = localStorage.getItem('USER');
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        return u.organization_id || u.org_id || u.id || 'default_org';
      } catch (e) {}
    }
    return 'default_org';
  }

  // Job Requirements Context Modal State
  showJobRequirementsModal: boolean = false;
  requirementsText: string = '';
  selectedRequirementsFile: File | null = null;
  isSavingRequirements: boolean = false;
  isRequirementsMandatory: boolean = false;
  requirementsFeedback: { type: 'success' | 'error'; message: string } | null = null;

  constructor(
    public dataService: DataService,
    private copilotService: CopilotService,
    private jobpostService: JobpostManagerService,
    private jobpostingsApiService: JobpostingsApiService,
    private applicantManagementService: ApplicantManagementService,
    private candidateService: CandidateService,
    private alertService: AlertService,
    private formattingService: FormattingService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  renderMarkdown(text: string, candidates?: any[]): SafeHtml {
    if (!text) return '';
    const formatted = this.formatCopilotResponseText(text, candidates);
    return this.formattingService.parseMarkdown(formatted);
  }

  formatCopilotResponseText(text: string, candidates?: any[], userPrompt?: string): string {
    if (!text) return '';
    const lowerPrompt = (userPrompt || '').toLowerCase();
    const rawRequested = lowerPrompt.includes('raw json') || lowerPrompt.includes('raw response') || lowerPrompt.includes('show id') || lowerPrompt.includes('show uuids') || lowerPrompt.includes('export json');

    let processed = text;

    // Build candidate ID -> Name lookup map
    const idToNameMap = new Map<string, string>();
    if (Array.isArray(candidates)) {
      candidates.forEach((c: any) => {
        const cid = c.id || c.candidate_id || c._id;
        const cname = c.full_name || c.name || c.applicant_name || c.email || 'Candidate Profile';
        if (cid) {
          idToNameMap.set(String(cid).toLowerCase(), cname);
        }
      });
    }

    if (!rawRequested) {
      // 1. Remove or convert raw JSON code blocks (```json ... ```) into formatted text with candidate links
      processed = processed.replace(/```(?:json)?\s*([\s\S]*?)\s*```/gi, (match, jsonString) => {
        try {
          const parsed = JSON.parse(jsonString.trim());
          if (Array.isArray(parsed)) {
            return parsed.map((item: any) => {
              if (typeof item === 'object' && item !== null) {
                const itemCid = item.id || item.candidate_id || item.user_id;
                const itemName = item.name || item.full_name || item.candidate_name || (itemCid ? idToNameMap.get(String(itemCid).toLowerCase()) : null) || 'Candidate Profile';
                if (itemCid) {
                  return `• **[${itemName}](candidate:${itemCid})**${item.role || item.job_title ? ` - ${item.role || item.job_title}` : ''}${item.match_score ? ` (${item.match_score}% Match)` : ''}`;
                }
              }
              return String(item);
            }).join('\n');
          } else if (typeof parsed === 'object' && parsed !== null) {
            const itemCid = parsed.id || parsed.candidate_id || parsed.user_id;
            const itemName = parsed.name || parsed.full_name || parsed.candidate_name || (itemCid ? idToNameMap.get(String(itemCid).toLowerCase()) : null) || 'Candidate Profile';
            if (itemCid) {
              return `• **[${itemName}](candidate:${itemCid})**${parsed.role || parsed.job_title ? ` - ${parsed.role || parsed.job_title}` : ''}${parsed.match_score ? ` (${parsed.match_score}% Match)` : ''}`;
            }
          }
        } catch (e) {}
        return match;
      });

      // 2. Replace standalone raw UUIDs or candidate ID strings with candidate links if name is known
      idToNameMap.forEach((name, cid) => {
        if (cid.length >= 8) {
          const escapedCid = cid.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
          const regex = new RegExp(`(?<!\\(candidate:)(?<!data-candidate-id=")\\b${escapedCid}\\b`, 'gi');
          processed = processed.replace(regex, `[${name}](candidate:${cid})`);
        }
      });

      // 3. Replace patterns like candidate_id: "xyz" or ID: "xyz" when name is known
      processed = processed.replace(/\b(?:candidate_id|user_id|id)\s*[:=]\s*["']?([a-f0-9-]{8,36})["']?/gi, (match, capturedId) => {
        const knownName = idToNameMap.get(capturedId.toLowerCase());
        if (knownName) {
          return `**[${knownName}](candidate:${capturedId})**`;
        }
        return match;
      });
    }

    return processed;
  }

  openCandidateDetailsById(candidateId: string, candidateName?: string): void {
    if (!candidateId) return;

    // 1. Search candidate object from current messages candidates list
    let found: any = null;
    for (const msg of this.messages) {
      if (msg.candidates && Array.isArray(msg.candidates)) {
        found = msg.candidates.find((c: any) => String(c.id || c.candidate_id || c._id).toLowerCase() === candidateId.toLowerCase());
        if (found) break;
      }
    }

    if (found) {
      this.openCandidateDetailsModal(found);
      return;
    }

    // 2. Fetch candidate from candidateService backend API
    this.candidateService.getCandidateById(candidateId).subscribe({
      next: (res: any) => {
        const candObj = res?.candidate || res?.data || res;
        if (candObj && (candObj.id || candObj.full_name || candObj.user_email)) {
          this.openCandidateDetailsModal(candObj);
        } else {
          this.openCandidateDetailsModal({
            id: candidateId,
            full_name: candidateName || 'Candidate Profile',
            user_email: ''
          });
        }
      },
      error: () => {
        this.openCandidateDetailsModal({
          id: candidateId,
          full_name: candidateName || 'Candidate Profile',
          user_email: ''
        });
      }
    });
  }

  onChatContentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const link = target.closest('a');
    if (link) {
      const href = link.getAttribute('href') || '';
      const candIdAttr = link.getAttribute('data-candidate-id');

      if (candIdAttr) {
        event.preventDefault();
        event.stopPropagation();
        this.openCandidateDetailsById(candIdAttr, link.innerText);
        return;
      }

      if (
        href.startsWith('candidate:') ||
        href.startsWith('candidate-id:') ||
        href.startsWith('candidate://') ||
        href.startsWith('#candidate-')
      ) {
        event.preventDefault();
        event.stopPropagation();
        const candidateId = href.replace(/^(candidate:|candidate-id:|candidate:\/\/|#candidate-)/, '').trim();
        this.openCandidateDetailsById(candidateId, link.innerText);
        return;
      }
    }
  }

  ngOnInit(): void {
    this.dismissedRequirementsPromptForJobs = this.loadDismissedPromptSet();
    this.loadJobPostings();
    this.loadCustomTemplates();

    // Read route query parameters (jobId, stageId, connection_id, pool_id)
    this.route.queryParams.subscribe(params => {
      if (params['connection_id'] || params['pool_id']) {
        this.restrictToConnectionId = params['connection_id'] || params['pool_id'];
      }
      if (params['connection_name'] || params['pool_name']) {
        this.connectionName = params['connection_name'] || params['pool_name'];
      }
      if (params['jobId']) {
        this.selectedJobId = params['jobId'];
      } else {
        const storedJobId = this.dataService.getJobId();
        if (storedJobId && storedJobId !== 'jobpostId') {
          this.selectedJobId = storedJobId;
        }
      }
      if (params['stageId']) {
        this.selectedStageId = params['stageId'];
      }
      if (this.isJobPostingsLoaded) {
        this.updateSelectedJobPost();
      }
    });

    this.loadChatSessions();
  }

  loadJobPostings(): void {
    const userStr = localStorage.getItem('USER');
    if (!userStr) return;
    try {
      const user = JSON.parse(userStr);
      const userId = user.id || user.user_id;
      if (userId) {
        this.jobpostService.getJobPosts(userId).subscribe({
          next: (res: any) => {
            const raw = Array.isArray(res) ? res : (res?.data || []);
            this.jobPostings = raw;
            this.isJobPostingsLoaded = true;
            this.updateSelectedJobPost();
          },
          error: (err: any) => {
            console.error('Failed to load job postings in Copilot:', err);
            this.isJobPostingsLoaded = true;
          }
        });
      }
    } catch (e) {
      console.error(e);
      this.isJobPostingsLoaded = true;
    }
  }

  updateSelectedJobPost(): void {
    if (this.selectedJobId && this.selectedJobId !== 'global') {
      this.selectedJobPost = this.jobPostings.find(j => j.id === this.selectedJobId) || null;
      if (this.selectedJobPost) {
        this.lastActiveJobId = this.selectedJobId;
        this.lastActiveJobPost = this.selectedJobPost;
      }
      const stages = this.selectedJobPost?.applicationStages || (this.selectedJobPost as any)?.application_stages;
      if (stages && stages.length > 0) {
        this.availableStages = stages;
      } else {
        this.availableStages = (this.jobpostService as any)?.defaultStages || [];
      }

      // Auto-check if requirements exist for selected job post ONLY if job postings have loaded
      if (this.isJobPostingsLoaded) {
        const jp = (this.selectedJobPost || this.jobPostings.find(j => j.id === this.selectedJobId)) as any;
        const reqText = jp?.requirements_text || jp?.requirements || jp?.description || jp?.job_description || jp?.template_data?.job?.description || jp?.template_data?.description || '';
        
        if (!reqText || !reqText.trim()) {
          if (!this.dismissedRequirementsPromptForJobs.has(this.selectedJobId)) {
            this.isRequirementsMandatory = true;
            setTimeout(() => {
              if (this.isRequirementsMandatory && !this.showJobRequirementsModal) {
                this.openJobRequirementsModal();
              }
            }, 300);
          } else {
            this.isRequirementsMandatory = false;
          }
        } else {
          this.isRequirementsMandatory = false;
          this.dismissedRequirementsPromptForJobs.add(this.selectedJobId);
          this.saveDismissedPromptSet();
        }
      }
    } else {
      this.selectedJobPost = null;
      this.availableStages = (this.jobpostService as any)?.defaultStages || [];
      this.isRequirementsMandatory = false;

      if (!this.lastActiveJobPost && this.jobPostings.length > 0) {
        this.lastActiveJobPost = this.jobPostings[0];
        this.lastActiveJobId = this.jobPostings[0].id || '';
      }
    }
    this.cdr.markForCheck();
  }

  onJobPostChange(jobId: string): void {
    this.selectedJobId = jobId;
    if (jobId !== 'global') {
      this.dataService.saveJobId(jobId);
    }
    this.updateSelectedJobPost();
  }

  toggleWebSearch(): void {
    this.enableWebSearch = !this.enableWebSearch;
    this.alertService.showSuccess(
      this.enableWebSearch 
        ? 'Web Search & Background Check Mode ENABLED' 
        : 'Web Search Mode Disabled'
    );
  }

  get jobDropdownOptions(): any[] {
    const opts = [
      { id: 'global', label: 'Global Talent Pool (All Jobs)' }
    ];
    this.jobPostings.forEach(j => {
      opts.push({ id: j.id || '', label: `${this.getJobTitle(j)}` });
    });
    return opts;
  }

  getJobTitle(job: JobPostData | any): string {
    if (!job) return 'Untitled Position';
    return job.title || job.job?.title || 'Untitled Position';
  }

  addInitialGreeting(): void {
    if (this.restrictToConnectionId) {
      const connTitle = this.connectionName ? `"${this.connectionName}"` : 'the API Connection Data Pool';
      this.messages = [
        {
          id: 'msg_welcome',
          role: 'assistant',
          content: `Hello! I am your **API Connection Data Pool AI Copilot**.

I am strictly scoped to search, evaluate, and rank candidate profiles directly from ${connTitle}.

**Key Capabilities:**
• Natural language candidate search restricted exclusively to API Connection records
• AI match scoring and transparent qualification evaluation summaries
• Run **Web Background Checks** for candidates in this data pool
• Alert candidates via email form invitations or migrate them into active hiring pipelines`,
          timestamp: new Date()
        }
      ];
      return;
    }

    let scopeDesc = '';
    if (this.selectedJobPost) {
      scopeDesc = `**"${this.getJobTitle(this.selectedJobPost)}"**`;
    } else {
      const activeContext = this.lastActiveJobPost || (this.jobPostings[0] || null);
      if (activeContext) {
        scopeDesc = `the **Global Talent Pool** (evaluated against mandatory **"${this.getJobTitle(activeContext)}"** requirements)`;
      } else {
        scopeDesc = 'the **Global Talent Pool**';
      }
    }
    this.messages = [
      {
        id: 'msg_welcome',
        role: 'assistant',
        content: `Hello! I am your **HireUp AI Talent Copilot**.

I have full access to search, evaluate, and rank candidate profiles for ${scopeDesc}.

**Key Capabilities:**
• Search talent pool by skills, experience, or custom queries
• Rank candidates with match scores and detailed evaluation summaries
• Run **Web Background Checks** dynamically when requested
• Alert candidates to fill out missing application forms
• Directly email or move candidates into hiring pipeline stages

Select a prompt shortcut on the left or type your query below to get started.`,
        timestamp: new Date()
      }
    ];
  }

  // Load prompt text into user input area without auto-sending
  loadPromptToInput(promptText: string): void {
    this.userInput = promptText;
    this.alertService.showSuccess('Prompt loaded into chat input. Edit or click Send to submit.');
    setTimeout(() => {
      const inputEl = document.getElementById('copilotChatInput');
      if (inputEl) {
        inputEl.focus();
      }
    }, 100);
  }

  // Custom Prompt Template Management
  openCreateTemplateModal(): void {
    this.showCreateTemplateModal = true;
    this.newTemplateTitle = '';
    this.newTemplatePrompt = '';
    this.newTemplateIcon = 'fa-layer-group text-emerald-600';
  }

  closeCreateTemplateModal(): void {
    this.showCreateTemplateModal = false;
  }

  loadCustomTemplates(): void {
    const key = `COPILOT_TEMPLATES_${this.currentOrgId}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        this.customPrompts = JSON.parse(stored);
      } catch (e) {}
    }
  }

  saveCustomTemplates(): void {
    const key = `COPILOT_TEMPLATES_${this.currentOrgId}`;
    localStorage.setItem(key, JSON.stringify(this.customPrompts));
  }

  createCustomTemplate(): void {
    if (!this.newTemplateTitle.trim() || !this.newTemplatePrompt.trim()) {
      this.alertService.showError('Please provide both title and prompt text.');
      return;
    }
    const newT: PromptTemplate = {
      id: `custom_${Date.now()}`,
      title: this.newTemplateTitle.trim(),
      prompt: this.newTemplatePrompt.trim(),
      icon: this.newTemplateIcon || 'fa-layer-group text-emerald-600',
      isCustom: true
    };
    this.customPrompts.push(newT);
    this.saveCustomTemplates();
    this.alertService.showSuccess('Custom prompt template saved!');
    this.closeCreateTemplateModal();
  }

  deleteCustomTemplate(id: string | undefined, event: MouseEvent): void {
    event.stopPropagation();
    if (!id) return;
    this.customPrompts = this.customPrompts.filter(t => t.id !== id);
    this.saveCustomTemplates();
    this.alertService.showSuccess('Custom template deleted.');
  }

  // Chat Session History Management
  loadChatSessions(): void {
    const key = `COPILOT_SESSIONS_${this.currentOrgId}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        this.chatSessions = JSON.parse(stored);
      } catch (e) {}
    }
    if (this.chatSessions.length === 0) {
      this.createNewSession();
    } else {
      this.switchSession(this.chatSessions[0].id);
    }
  }

  saveChatSessions(): void {
    const key = `COPILOT_SESSIONS_${this.currentOrgId}`;
    localStorage.setItem(key, JSON.stringify(this.chatSessions));
  }

  createNewSession(): void {
    const newId = `session_${Date.now()}`;
    const newSession: ChatSession = {
      id: newId,
      title: `Chat ${this.chatSessions.length + 1}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      jobId: this.selectedJobId,
      messages: []
    };
    this.chatSessions.unshift(newSession);
    this.activeSessionId = newId;
    this.messages = [];
    this.addInitialGreeting();
    this.saveChatSessions();
    this.alertService.showSuccess('Started new AI chat session.');
  }

  switchSession(sessionId: string): void {
    const target = this.chatSessions.find(s => s.id === sessionId);
    if (target) {
      this.activeSessionId = target.id;
      this.messages = target.messages || [];
      if (this.messages.length === 0) {
        this.addInitialGreeting();
      }
      this.scrollToBottom();
      this.cdr.markForCheck();
    }
  }

  deleteSession(sessionId: string, event: MouseEvent): void {
    event.stopPropagation();
    this.chatSessions = this.chatSessions.filter(s => s.id !== sessionId);
    this.saveChatSessions();
    if (this.activeSessionId === sessionId) {
      if (this.chatSessions.length > 0) {
        this.switchSession(this.chatSessions[0].id);
      } else {
        this.createNewSession();
      }
    }
    this.alertService.showSuccess('Chat session deleted.');
  }

  persistCurrentSession(): void {
    const current = this.chatSessions.find(s => s.id === this.activeSessionId);
    if (current) {
      current.messages = this.messages;
      current.updatedAt = new Date();
      const firstUserMsg = this.messages.find(m => m.role === 'user');
      if (firstUserMsg && (current.title.startsWith('Chat ') || current.title.startsWith('Chat Session'))) {
        current.title = firstUserMsg.content.substring(0, 26) + (firstUserMsg.content.length > 26 ? '...' : '');
      }
      this.saveChatSessions();
    }
  }

  sendPrompt(promptText: string): void {
    if (!promptText || !promptText.trim() || this.isLoading) return;

    const query = promptText.trim();
    this.userInput = '';

    // Detect if Web Search / Background Check tool is requested by query
    const lowerQ = query.toLowerCase();
    const isWebToolRequested = this.enableWebSearch || 
      lowerQ.includes('background check') || 
      lowerQ.includes('web search') || 
      lowerQ.includes('google') || 
      lowerQ.includes('linkedin') || 
      lowerQ.includes('online presence') || 
      lowerQ.includes('verify') || 
      lowerQ.includes('search web') || 
      lowerQ.includes('check background');

    // Append User Message
    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date()
    };
    this.messages.push(userMsg);

    // Set Loading State
    this.isLoading = true;
    this.scrollToBottom();

    // Prepare API history
    const historyPayload = this.messages
      .filter(m => m.id !== 'msg_welcome')
      .map(m => ({ role: m.role, content: m.content }));

    const contextJobId = (this.selectedJobId && this.selectedJobId !== 'global')
      ? this.selectedJobId
      : (this.lastActiveJobId || (this.jobPostings[0]?.id || ''));

    let chatObservable$;
    if (this.restrictToConnectionId) {
      const userStr = localStorage.getItem('user_data') || localStorage.getItem('user') || '{}';
      let orgId = '';
      try {
        const u = JSON.parse(userStr);
        orgId = u.org_id || u.organization_id || u.organizationId || '';
      } catch (e) {}

      chatObservable$ = this.copilotService.chatApiPool(orgId, {
        query: query,
        connection_ids: [this.restrictToConnectionId],
        context_connection_id: this.restrictToConnectionId,
        enable_web_search: isWebToolRequested,
        history: historyPayload
      });
    } else {
      const payload: CopilotRequest = {
        query: query,
        job_id: this.selectedJobId === 'global' ? 'global' : this.selectedJobId,
        context_job_id: contextJobId,
        enable_web_search: isWebToolRequested,
        history: historyPayload
      };
      chatObservable$ = this.copilotService.chat(payload);
    }

    chatObservable$.subscribe({
      next: (res) => {
        this.isLoading = false;
        const rawContent = res.response || 'I analyzed your request and compiled the candidate results below.';
        const formattedContent = this.formatCopilotResponseText(rawContent, res.candidates || [], query);
        const assistantMsg: ChatMessage = {
          id: `ai_${Date.now()}`,
          role: 'assistant',
          content: formattedContent,
          timestamp: new Date(),
          candidates: res.candidates || [],
          webResults: res.web_search_results || [],
          toolInvoked: isWebToolRequested ? 'Web Search & Background Check Tool' : undefined
        };
        this.messages.push(assistantMsg);
        this.persistCurrentSession();
        this.scrollToBottom();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.isLoading = false;
        console.error('AI Copilot chat error:', err);
        this.alertService.showError('AI Copilot experienced an error processing your query.');
        const errorMsg: ChatMessage = {
          id: `err_${Date.now()}`,
          role: 'assistant',
          content: 'Apologies, I encountered an issue accessing candidate records. Please check your backend connection and try again.',
          timestamp: new Date()
        };
        this.messages.push(errorMsg);
        this.persistCurrentSession();
        this.scrollToBottom();
        this.cdr.markForCheck();
      }
    });
  }

  clearChat(): void {
    this.addInitialGreeting();
    this.alertService.showSuccess('Chat session reset.');
  }

  returnToPipeline(): void {
    const targetJobId = this.selectedJobId !== 'global' ? this.selectedJobId : this.dataService.getJobId();
    const targetStageId = this.selectedStageId || '0';
    if (targetJobId && targetJobId !== 'jobpostId') {
      this.router.navigate(['/jobposts/applicants', targetJobId, targetStageId]);
    } else {
      this.router.navigate(['/dashboard']);
    }
  }

  openJobRequirementsModal(): void {
    if (!this.selectedJobId || this.selectedJobId === 'global') {
      this.alertService.showWarning('Please select a specific job posting from the header dropdown first.');
      return;
    }
    const currentJob = (this.selectedJobPost || this.jobPostings.find(j => j.id === this.selectedJobId)) as any;
    this.requirementsText = currentJob?.requirements_text || currentJob?.requirements || currentJob?.description || currentJob?.job_description || currentJob?.template_data?.job?.description || currentJob?.template_data?.description || '';
    this.selectedRequirementsFile = null;
    this.requirementsFeedback = null;
    this.showJobRequirementsModal = true;
    this.cdr.detectChanges();
  }

  closeJobRequirementsModal(): void {
    const currentJob = (this.selectedJobPost || this.jobPostings.find(j => j.id === this.selectedJobId)) as any;
    const hasReq = !!(currentJob?.requirements_text?.trim() || currentJob?.requirements?.trim() || currentJob?.description?.trim() || currentJob?.job_description?.trim() || currentJob?.template_data?.job?.description?.trim() || this.requirementsText.trim() || this.selectedRequirementsFile);

    if (this.isRequirementsMandatory && !hasReq) {
      this.alertService.showWarning('Job requirements are required for AI Copilot to work effectively on this job post.');
      this.requirementsFeedback = {
        type: 'error',
        message: 'Job requirements are required for AI Copilot to analyze candidates. Please paste requirements text or upload a document.'
      };
      this.cdr.detectChanges();
      return;
    }

    if (this.selectedJobId) {
      this.dismissedRequirementsPromptForJobs.add(this.selectedJobId);
      this.saveDismissedPromptSet();
    }
    this.showJobRequirementsModal = false;
    this.selectedRequirementsFile = null;
    this.requirementsFeedback = null;
    this.isRequirementsMandatory = false;
    this.cdr.detectChanges();
  }

  onRequirementsFileSelected(event: any): void {
    const files = event.target?.files;
    if (files && files.length > 0) {
      this.selectedRequirementsFile = files[0];
      this.cdr.detectChanges();
    }
  }

  saveJobRequirements(): void {
    if (!this.selectedJobId || this.selectedJobId === 'global') return;
    if (!this.requirementsText.trim() && !this.selectedRequirementsFile) {
      this.requirementsFeedback = { type: 'error', message: 'Please enter requirements text or choose a document file to upload.' };
      this.cdr.detectChanges();
      return;
    }

    this.isSavingRequirements = true;
    this.requirementsFeedback = null;
    this.cdr.detectChanges();

    this.jobpostingsApiService.updateJobRequirements(
      this.selectedJobId,
      this.requirementsText,
      this.selectedRequirementsFile || undefined
    ).subscribe({
      next: (res: any) => {
        this.isSavingRequirements = false;
        this.isRequirementsMandatory = false;
        if (this.selectedJobId) {
          this.dismissedRequirementsPromptForJobs.add(this.selectedJobId);
          this.saveDismissedPromptSet();
        }
        this.requirementsFeedback = { type: 'success', message: 'Job requirements & document context updated successfully!' };
        
        // Update local job post records across state & key variants
        const savedText = res?.requirements_text || res?.data?.requirements_text || res?.requirements || this.requirementsText;
        this.requirementsText = savedText;

        const currentJob = this.jobPostings.find(j => j.id === this.selectedJobId);
        if (currentJob) {
          (currentJob as any).requirements_text = savedText;
          (currentJob as any).requirements = savedText;
          (currentJob as any).description = savedText;
          (currentJob as any).job_description = savedText;
          if (res?.extracted_skills) {
            (currentJob as any).extracted_skills = res.extracted_skills;
          }
        }
        if (this.selectedJobPost) {
          (this.selectedJobPost as any).requirements_text = savedText;
          (this.selectedJobPost as any).requirements = savedText;
          (this.selectedJobPost as any).description = savedText;
          (this.selectedJobPost as any).job_description = savedText;
        }
        if (this.lastActiveJobPost && (this.lastActiveJobPost as any).id === this.selectedJobId) {
          (this.lastActiveJobPost as any).requirements_text = savedText;
          (this.lastActiveJobPost as any).requirements = savedText;
          (this.lastActiveJobPost as any).description = savedText;
        }

        this.alertService.showSuccess('Job requirements saved & linked to post. AI matching updated!');
        this.cdr.detectChanges();
        setTimeout(() => {
          this.showJobRequirementsModal = false;
          this.selectedRequirementsFile = null;
          this.requirementsFeedback = null;
          this.cdr.detectChanges();
        }, 1000);
      },
      error: (err: any) => {
        this.isSavingRequirements = false;
        console.error('Failed updating job requirements:', err);
        const errDetail = err?.error?.detail || err?.error?.message || (typeof err?.error === 'string' ? err.error : null) || 'Failed to update job requirements.';
        this.requirementsFeedback = { type: 'error', message: errDetail };
        this.cdr.detectChanges();
      }
    });
  }
  selectedCandidateForDetails: any = null;
  selectedCandidateForImport: any = null;
  importJobId: string = '';
  importStage: string = 'Application Review';
  importMode: 'alert' | 'direct' = 'alert';
  emailSubject: string = '';
  emailBody: string = '';
  isImporting: boolean = false;
  notifiedCandidateIds: Set<string> = new Set<string>();
  importFeedback: { type: 'success' | 'error'; message: string } | null = null;

  openCandidateDetailsModal(candidate: any): void {
    const formatted = this.formatCandidateForDetails(candidate);
    this.selectedCandidateForDetails = null;
    this.dataService.candidate = formatted;
    this.dataService.openCandidateDetails = true;

    const cid = candidate.id || formatted.id || candidate.user_email || candidate.email;
    if (cid) {
      this.candidateService.getCandidateById(cid).subscribe({
        next: (res: any) => {
          if (res && res.candidate) {
            const merged = this.formatCandidateForDetails({
              ...formatted,
              ...res.candidate,
              resume_url: res.candidate.resume_url || formatted.resume_url,
              uploaded_files: res.candidate.uploaded_files || formatted.uploaded_files,
              resume_data: res.candidate.resume_data || res.candidate.structured_resume || formatted.resume_data,
              structured_resume: res.candidate.structured_resume || res.candidate.resume_data || formatted.structured_resume
            });
            this.dataService.candidate = merged;
            this.cdr.detectChanges();
          }
        },
        error: (err: any) => {
          console.warn('Fetched candidate detail fallback:', err);
        }
      });
    }

    this.cdr.detectChanges();
  }

  closeCandidateDetailsModal(): void {
    this.selectedCandidateForDetails = null;
    this.dataService.openCandidateDetails = false;
    this.cdr.detectChanges();
  }

  openImportModal(candidate: any, mode: 'alert' | 'direct' = 'alert'): void {
    const formatted = this.formatCandidateForDetails(candidate);
    this.selectedCandidateForImport = formatted;
    this.importMode = mode;
    this.importJobId = (this.selectedJobId && this.selectedJobId !== 'global') ? this.selectedJobId : (this.jobPostings[0]?.id || '');
    this.updateAlertEmailTemplate();
    this.importFeedback = null;
    this.cdr.detectChanges();
  }

  closeImportModal(): void {
    this.selectedCandidateForImport = null;
    this.importFeedback = null;
    this.cdr.detectChanges();
  }

  getSelectedJobTitle(): string {
    const activeId = (this.selectedJobId && this.selectedJobId !== 'global') ? this.selectedJobId : this.importJobId;
    const job = this.jobPostings.find(j => j.id === activeId) || (this.selectedJobPost?.id === activeId ? this.selectedJobPost : null) || this.selectedJobPost;
    if (job) {
      const title = (job as any).job_title || (job as any).title || (job as any).template_data?.job?.title || (job as any).template_data?.title || (job as any).name;
      if (title) return title;
    }
    if (this.selectedJobPost) {
      const title = (this.selectedJobPost as any).job_title || (this.selectedJobPost as any).title || (this.selectedJobPost as any).template_data?.job?.title;
      if (title) return title;
    }
    return 'Active Job Post';
  }

  getSelectedJobCompanyName(): string {
    const activeId = (this.selectedJobId && this.selectedJobId !== 'global') ? this.selectedJobId : this.importJobId;
    const job = this.jobPostings.find(j => j.id === activeId) || (this.selectedJobPost?.id === activeId ? this.selectedJobPost : null) || this.selectedJobPost;
    if (job) {
      const name = (job as any).company_name || (job as any).company || (job as any).org_name || (job as any).template_data?.company?.name;
      if (name && name !== 'Organization') return name;
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
    const selectedJob = this.jobPostings.find(j => j.id === this.importJobId);
    const jobTitle = selectedJob ? ((selectedJob as any).job_title || (selectedJob as any).title || selectedJob.title || 'Position') : 'Position';
    const companyName = this.getSelectedJobCompanyName();
    const companySlug = encodeURIComponent(companyName !== 'Organization' ? companyName : 'company');
    const applyUrl = `${window.location.origin}/apply/${companySlug}/${this.importJobId}/`;

    this.emailSubject = `Application Form Request: ${jobTitle} - ${companyName}`;
    this.emailBody = `Dear ${candidateName},\n\nOur talent acquisition team at ${companyName} reviewed your background and would like to invite you to complete the application form for the ${jobTitle} position.\n\nPlease follow the link below to access and complete the application form:\n\n${applyUrl}\n\nWe look forward to receiving your completed form!\n\nBest regards,\nTalent Acquisition Team\n${companyName}`;
  }

  isCandidateNotified(candidate: any): boolean {
    if (!candidate) return false;
    const candId = candidate.id;
    const candEmail = candidate.email || candidate.user_email;
    const activeJobId = this.importJobId || this.selectedJobId;
    if (candId && this.notifiedCandidateIds.has(`${candId}_${activeJobId}`)) return true;
    if (candEmail && this.notifiedCandidateIds.has(`${candEmail}_${activeJobId}`)) return true;
    return false;
  }

  executeAddCandidateToJob(): void {
    if (!this.selectedCandidateForImport?.id || !this.importJobId) {
      this.importFeedback = { type: 'error', message: 'Please select a target job post.' };
      return;
    }

    this.isImporting = true;
    this.importFeedback = null;
    const targetStage = this.importMode === 'alert' ? 'Form Requested' : this.importStage;

    this.candidateService.addCandidateToJob(
      this.selectedCandidateForImport.id,
      this.importJobId,
      targetStage
    ).subscribe({
      next: (res: any) => {
        const candId = this.selectedCandidateForImport?.id;
        const candEmail = this.selectedCandidateForImport?.email || this.selectedCandidateForImport?.user_email;

        if (this.importMode === 'alert') {
          if (candId && this.importJobId) this.notifiedCandidateIds.add(`${candId}_${this.importJobId}`);
          if (candEmail && this.importJobId) this.notifiedCandidateIds.add(`${candEmail}_${this.importJobId}`);

          if (candEmail) {
            this.applicantManagementService.sendCandidateEmail({
              candidate_email: candEmail,
              candidate_name: this.selectedCandidateForImport?.full_name,
              subject: this.emailSubject,
              body: this.emailBody,
              template_id: 'form_invitation',
              jobpost_id: this.importJobId
            }).subscribe({ next: () => {}, error: () => {} });
          }
        }

        this.isImporting = false;
        this.importFeedback = {
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
        this.importFeedback = {
          type: 'error',
          message: err?.error?.detail || 'Failed to process candidate pipeline update.'
        };
      }
    });
  }

  get stages(): string[] {
    const activeJobId = this.importJobId || this.selectedJobId;
    if (activeJobId && this.jobPostings && this.jobPostings.length > 0) {
      const job = this.jobPostings.find(j => j.id === activeJobId);
      const configured = (job as any)?.template_data?.applicationStages || (job as any)?.application_stages;
      if (Array.isArray(configured) && configured.length > 0) {
        return configured
          .filter((s: any) => s.is_active && !s.hide_stage)
          .map((s: any) => s.name);
      }
    }
    return ['Application Review', 'Phone Screening', 'Technical Assessment', 'Interview', 'Final Decision', 'Offer Sent'];
  }

  viewCandidateDetails(candidate: any): void {
    this.openCandidateDetailsModal(candidate);
  }

  emailCandidate(candidate: any): void {
    if (!candidate) return;
    const formatted = this.formatCandidateForDetails(candidate);
    this.openImportModal(formatted, 'alert');
  }

  openAlertFormModal(candidate: any): void {
    this.openImportModal(candidate, 'alert');
  }

  closeAlertFormModal(): void {
    this.closeImportModal();
  }

  sendFormAlert(): void {
    this.executeAddCandidateToJob();
  }

  openMovePipelineModal(candidate: any): void {
    this.openImportModal(candidate, 'direct');
  }

  closeMovePipelineModal(): void {
    this.closeImportModal();
  }

  confirmMovePipeline(): void {
    this.executeAddCandidateToJob();
  }

  private formatCandidateForDetails(candidate: any): any {
    if (!candidate) return null;
    const name = candidate.full_name || candidate.name || 'Applicant';
    const email = candidate.email || candidate.user_email || candidate.candidate_email || '';
    const skills = candidate.skills || candidate.skills_list || [];
    const structRes = (typeof candidate.structured_resume === 'object' && candidate.structured_resume) ? candidate.structured_resume : {};
    const resData = (typeof candidate.resume_data === 'object' && candidate.resume_data) ? candidate.resume_data : {};
    const resumeUrl = candidate.resume_url || candidate.file_url || candidate.cv_url || candidate.uploaded_files?.resume || '';

    const pd = structRes.personal_details || resData.personal_details || {};
    const workExp = candidate.work_experience || structRes.work_experience || resData.work_experience || [];
    const edu = candidate.education || structRes.education || resData.education || [];
    const refs = candidate.references || structRes.references || resData.references || [];
    const projs = candidate.projects || structRes.projects || resData.projects || [];
    const certs = candidate.certifications || structRes.certifications || resData.certifications || [];

    const mergedResumeData = {
      ...resData,
      ...structRes,
      personal_details: {
        full_name: name,
        email: email,
        phone_number: candidate.phone || candidate.phone_number || pd.phone_number || pd.phone || '',
        address: candidate.location || candidate.address || pd.address || pd.location || '',
        linkedin: candidate.linkedin || pd.linkedin || '',
        github: candidate.github || pd.github || '',
        portfolio: candidate.website || candidate.portfolio || pd.portfolio || pd.website || ''
      },
      skills: {
        technical_skills: Array.isArray(skills) && skills.length > 0 ? skills : (resData.skills?.technical_skills || structRes.skills?.technical_skills || []),
        soft_skills: resData.skills?.soft_skills || structRes.skills?.soft_skills || [],
        languages: resData.skills?.languages || structRes.skills?.languages || []
      },
      work_experience: workExp,
      education: edu,
      references: refs,
      projects: projs,
      certifications: certs
    };

    return {
      ...candidate,
      id: candidate.id || '',
      full_name: name,
      email: email,
      user_email: email,
      headline: candidate.headline || candidate.job_title || candidate.role || 'Candidate Profile',
      employment_status: candidate.employment_status || 'Actively Looking',
      stage: candidate.stage || candidate.application_stage || 'application_review',
      status: candidate.status || 'pending',
      skills_list: Array.isArray(skills) ? skills : [],
      match_score: candidate.match_score || 85,
      bio: candidate.bio || candidate.summary || candidate.match_reason || '',
      location: candidate.location || candidate.address || pd.address || '',
      phone: candidate.phone || candidate.phone_number || pd.phone_number || '',
      website: candidate.website || candidate.portfolio_url || pd.portfolio || '',
      linkedin: candidate.linkedin || pd.linkedin || '',
      github: candidate.github || pd.github || '',
      resume_url: resumeUrl,
      uploaded_files: candidate.uploaded_files || (resumeUrl ? { resume: resumeUrl } : {}),
      form_data: candidate.form_data || {},
      resume_data: mergedResumeData,
      structured_resume: mergedResumeData,
      education: edu,
      work_experience: workExp,
      references: refs,
      projects: projs,
      certifications: certs
    };
  }

  getInitials(name: string): string {
    if (!name) return 'AI';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      const container = document.getElementById('chatScrollContainer');
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }, 100);
  }
}
