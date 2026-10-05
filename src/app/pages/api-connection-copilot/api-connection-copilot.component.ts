import { Component, OnInit, OnChanges, OnDestroy, Input, ChangeDetectorRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

import { CustomDropdownComponent } from '../../components/custom-dropdown/custom-dropdown.component';
import { CandidateDetailsComponent } from '../dashboard/components/candidate-details/candidate-details.component';
import { EmailsComponent } from '../dashboard/components/notifications/emails/emails.component';
import { DataService } from '../../services/data.service';
import { CopilotService } from '../../services/copilot.service';
import { JobpostManagerService } from '../../services/jobpost-manager.service';
import { ApplicantManagementService } from '../../services/applicant-management.service';
import { CandidateService } from '../../services/candidate.service';
import { AlertService } from '../../services/alert.service';
import { FormattingService } from '../../services/formatting.service';
import { OrgService } from '../../services/org.service';
import { environment } from '../../../environment/environment';

export interface PromptTemplate {
  id: string;
  title: string;
  prompt: string;
  icon: string;
  isCustom?: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  candidates?: any[];
  webResults?: any[];
  toolInvoked?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: Date;
  messages: ChatMessage[];
  connectionId?: string;
  sourceConnectionIds?: string[];
  historyStart?: number;
}

@Component({
  selector: 'app-api-connection-copilot',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    CustomDropdownComponent,
    CandidateDetailsComponent,
    EmailsComponent
  ],
  templateUrl: './api-connection-copilot.component.html',
  styleUrls: ['./api-connection-copilot.component.scss']
})
export class ApiConnectionCopilotComponent implements OnInit, OnChanges, OnDestroy {
  @Input() connectionId: string | null = null;
  sourceConnectionIds: string[] = [];
  private subscriptions = new Subscription();
  private pendingChat?: Subscription;
  private contextVersion = 0;
  private initialized = false;
  private workspaceKey = '';
  selectedCandidateForDetails: any = null;
  ready = false;
  workspaceError = '';
  requirementsText = '';
  requirementsDocument: any = null;
  requirementsFile: File | null = null;
  showRequirements = false;
  isSavingRequirements = false;
  requirementsFeedback = '';

  orgId: string = '';
  selectedConnectionId: string = 'all';
  selectedConnectionName: string = 'All Active API Data Pools';
  
  allConnections: any[] = [];
  connectionDropdownOptions: { id: string; label: string }[] = [];

  // Navigation & Sidebar State
  sidebarOpen: boolean = true;
  activeSidebarTab: 'templates' | 'pools' | 'chats' = 'templates';

  // Chat Sessions & History State
  chatSessions: ChatSession[] = [];
  activeSessionId: string = '';
  messages: ChatMessage[] = [];
  userInput: string = '';
  isLoading: boolean = false;
  minMatchScore: number = 50;

  // Web Search Feature Toggle
  enableWebSearch: boolean = false;

  // Custom Prompt Templates Modal
  showCreateTemplateModal: boolean = false;
  newTemplateTitle: string = '';
  newTemplatePrompt: string = '';
  newTemplateIcon: string = 'fa-wand-magic-sparkles text-emerald-600';

  iconOptions = [
    { label: 'Sparkles', value: 'fa-wand-magic-sparkles text-emerald-600' },
    { label: 'Database', value: 'fa-database text-indigo-600' },
    { label: 'Search User', value: 'fa-user-gear text-sky-600' },
    { label: 'Skill Audit', value: 'fa-chart-pie text-purple-600' },
    { label: 'Pipeline', value: 'fa-diagram-project text-amber-600' },
    { label: 'Security Check', value: 'fa-shield-halved text-rose-600' }
  ];

  // Preset Prompts specifically tailored for API Data Pools
  presetPrompts: PromptTemplate[] = [
    {
      id: 'preset_api_1',
      title: 'Top Matches in API Pool',
      prompt: 'Search through the active API Connection Pool and rank top candidates with strong engineering and leadership skills.',
      icon: 'fa-database text-indigo-600',
      isCustom: false
    },
    {
      id: 'preset_api_2',
      title: 'Skill Gap & Data Ingestion Audit',
      prompt: 'Audit key technical skills present in this API Data Pool and highlight top talent categories.',
      icon: 'fa-chart-pie text-purple-600',
      isCustom: false
    },
    {
      id: 'preset_api_3',
      title: 'Senior Leadership Candidates',
      prompt: 'Identify executive, lead, or principal level candidates ingested from connected ATS/CRM pools.',
      icon: 'fa-user-tie text-emerald-600',
      isCustom: false
    },
    {
      id: 'preset_api_4',
      title: 'Cross-Pool Web Verification',
      prompt: 'Verify public profiles and web citations for top ranking candidates in this connected API pool.',
      icon: 'fa-globe text-sky-600',
      isCustom: false
    }
  ];

  customPrompts: PromptTemplate[] = [];

  get allPrompts(): PromptTemplate[] {
    return [...this.presetPrompts, ...this.customPrompts];
  }

  // Job Posts for Candidate Import/Pipeline Modal
  jobPostings: any[] = [];
  selectedCandidateForImport: any = null;
  importJobId: string = '';
  importStage: string = 'Application Review';
  importMode: 'alert' | 'direct' = 'alert';
  emailSubject: string = '';
  emailBody: string = '';
  isImporting: boolean = false;
  importFeedback: { type: 'success' | 'error'; message: string } | null = null;
  notifiedCandidateEmails: Set<string> = new Set<string>();

  get stages(): string[] {
    if (this.importJobId && this.jobPostings.length > 0) {
      const job = this.jobPostings.find(j => j.id === this.importJobId);
      const configured = job?.template_data?.applicationStages || job?.application_stages;
      if (Array.isArray(configured) && configured.length > 0) {
        return configured
          .filter((s: any) => s.is_active && !s.hide_stage)
          .map((s: any) => s.name || s.stage_name);
      }
    }
    return ['Application Review', 'Screening', 'Interviewing', 'Offer Stage', 'Hired'];
  }

  constructor(
    public dataService: DataService,
    private copilotService: CopilotService,
    private jobpostService: JobpostManagerService,
    private applicantManagementService: ApplicantManagementService,
    private candidateService: CandidateService,
    private alertService: AlertService,
    private formattingService: FormattingService,
    private orgService: OrgService,
    private http: HttpClient,
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
    this.subscriptions.add(this.candidateService.getCandidateById(candidateId).subscribe({
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
    }));
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
    this.initialized = true;
    this.subscriptions.add(this.route.queryParams.subscribe(params => {
      const id = this.connectionId || params['connection_id'] || params['pool_id'] || '';
      if (id !== this.selectedConnectionId) {
        this.selectedConnectionId = id;
        this.refreshWorkspace();
      }
    }));
    this.subscriptions.add(this.orgService.currentOrg$.subscribe(org => {
      if (this.orgId !== (org?.id || '')) {
        this.orgId = org?.id || '';
        this.refreshWorkspace();
      }
    }));
    if (!this.orgService.getCurrentOrgValue()) {
      this.subscriptions.add(this.orgService.loadMyOrganizations().subscribe({
        error: () => this.workspaceError = 'Unable to load your organizations.'
      }));
    }
  }

  ngOnChanges(): void {
    if (this.initialized && this.connectionId !== this.selectedConnectionId) {
      this.selectedConnectionId = this.connectionId || '';
      this.refreshWorkspace();
    }
  }

  ngOnDestroy(): void {
    this.cancelPendingChat();
    this.subscriptions.unsubscribe();
  }

  private cancelPendingChat(): void {
    this.contextVersion++;
    this.pendingChat?.unsubscribe();
    this.isLoading = false;
  }

  private get userKey(): string {
    try { const u = JSON.parse(localStorage.getItem('USER') || '{}'); return u.id || u.email || 'anonymous'; }
    catch { return 'anonymous'; }
  }

  private get headers(): { Authorization: string } {
    return { Authorization: `Bearer ${localStorage.getItem('token') || localStorage.getItem('access_token') || localStorage.getItem('auth_token') || ''}` };
  }

  refreshWorkspace(): void {
    this.cancelPendingChat();
    this.ready = false;
    this.workspaceError = '';
    this.chatSessions = [];
    this.messages = [];
    this.activeSessionId = '';
    this.workspaceKey = '';
    this.customPrompts = [];
    this.allConnections = [];
    this.sourceConnectionIds = [];
    this.requirementsText = '';
    this.requirementsDocument = null;
    this.requirementsFile = null;
    this.requirementsFeedback = '';
    this.isSavingRequirements = false;
    this.showRequirements = false;
    this.selectedCandidateForImport = null;
    this.selectedCandidateForDetails = null;
    this.jobPostings = [];
    this.importJobId = '';
    this.isImporting = false;
    this.dataService.openCandidateDetails = false;
    this.userInput = '';
    if (!this.orgId) return;
    const version = this.contextVersion;
    this.subscriptions.add(this.http.get<any>(`${environment.apiUrl}/orgs/${this.orgId}/copilot-pools`, { headers: this.headers }).subscribe({
      next: res => {
        if (version !== this.contextVersion) return;
        this.allConnections = res.api_connections || [];
        this.connectionDropdownOptions = this.allConnections.map(c => ({ id: c.id, label: c.name }));
        if (!this.selectedConnectionId) this.selectedConnectionId = this.allConnections[0]?.id || '';
        const connection = this.allConnections.find(c => c.id === this.selectedConnectionId);
        if (!connection) {
          this.workspaceError = 'This API pool is unavailable in the selected organization. Select an available workspace below.';
          return;
        }
        this.selectedConnectionName = connection.name;
        this.requirementsText = connection.copilot_requirements_text || '';
        this.requirementsDocument = connection.copilot_requirements_document || null;
        this.sourceConnectionIds = [connection.id];
        this.workspaceKey = `api_copilot_v2_${this.userKey}_${this.orgId}_${connection.id}`;
        this.ready = true;
        this.loadCustomTemplates();
        this.loadChatSessions();
        this.cdr.markForCheck();
      },
      error: err => {
        if (version === this.contextVersion) this.workspaceError = err?.error?.detail || 'Unable to load API pools.';
      }
    }));
  }

  onConnectionPoolChange(poolId: string): void {
    if (poolId === this.selectedConnectionId) return;
    this.router.navigate(['/api-connection-copilot'], { queryParams: { connection_id: poolId } });
  }

  selectAllPools(): void { this.onSourcePoolsChange(this.allConnections.map(c => c.id)); }

  onSourcePoolsChange(ids: string[]): void {
    this.cancelPendingChat();
    this.sourceConnectionIds = [...new Set(ids)].filter(id => this.allConnections.some(c => c.id === id));
    // Retain visible history, but do not resend data from previously authorized pools.
    const session = this.chatSessions.find(s => s.id === this.activeSessionId);
    if (session) session.historyStart = this.messages.length;
    this.saveChatSessions();
  }

  openRequirements(): void {
    this.requirementsFile = null;
    this.requirementsFeedback = '';
    this.showRequirements = true;
  }

  onRequirementsFileSelected(event: Event): void {
    this.requirementsFile = (event.target as HTMLInputElement).files?.[0] || null;
  }

  saveRequirements(): void {
    if (!this.ready || this.isSavingRequirements) return;
    if (!this.requirementsText.trim() && !this.requirementsFile) {
      this.requirementsFeedback = 'Paste requirements or select a PDF, DOCX, or TXT document.';
      return;
    }
    this.isSavingRequirements = true;
    this.requirementsFeedback = '';
    const key = this.workspaceKey;
    const formData = new FormData();
    formData.append('requirements_text', this.requirementsText);
    if (this.requirementsFile) {
      formData.append('requirements_file', this.requirementsFile, this.requirementsFile.name);
    }
    const token = encodeURIComponent(localStorage.getItem('token') || '');
    this.subscriptions.add(this.http.post<any>(
      `${environment.apiUrl}/orgs/${this.orgId}/api-connections/${this.selectedConnectionId}/copilot-requirements?token=${token}`,
      formData
    ).subscribe({
      next: res => {
        if (key !== this.workspaceKey) return;
        this.isSavingRequirements = false;
        this.requirementsFeedback = 'Requirements saved successfully.';
        if (res?.document) this.requirementsDocument = res.document;
      },
      error: err => {
        if (key !== this.workspaceKey) return;
        this.isSavingRequirements = false;
        this.requirementsFeedback = err?.error?.detail || 'Could not save pool requirements.';
      }
    }));
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
            this.jobPostings = raw.filter((j: any) => j.organization_id === this.orgId);
            if (!this.jobPostings.some(j => j.id === this.importJobId)) {
              this.importJobId = this.jobPostings[0]?.id || '';
            }
            this.updateAlertEmailTemplate();
          },
          error: (err) => console.error('Error fetching job postings:', err)
        });
      }
    } catch {}
  }

  // Session & Storage Management
  private getStorageKey(): string {
    return this.workspaceKey;
  }

  loadChatSessions(): void {
    this.chatSessions = [];
    try {
      const data = localStorage.getItem(this.getStorageKey());
      if (data) {
        const parsed = JSON.parse(data);
        this.chatSessions = (Array.isArray(parsed) ? parsed : []).filter((s: any) => s.connectionId === this.selectedConnectionId).map((s: any) => ({
          ...s,
          createdAt: new Date(s.createdAt),
          messages: s.messages.map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp)
          }))
        }));
      }
    } catch (e) {
      console.warn('Failed to parse saved chat sessions:', e);
    }

    if (this.chatSessions.length > 0) {
      this.switchSession(this.chatSessions[0].id);
    } else {
      this.createNewSession();
    }
  }

  saveChatSessions(): void {
    if (!this.ready || !this.workspaceKey) return;
    try {
      if (this.activeSessionId) {
        const currentSession = this.chatSessions.find(s => s.id === this.activeSessionId);
        if (currentSession) {
          currentSession.messages = [...this.messages];
          currentSession.sourceConnectionIds = [...this.sourceConnectionIds];
        }
      }
      localStorage.setItem(this.getStorageKey(), JSON.stringify(this.chatSessions));
    } catch (e) {
      console.warn('Failed to persist chat sessions:', e);
    }
  }

  createNewSession(): void {
    if (!this.ready) return;
    this.cancelPendingChat();
    const newId = 'session_' + crypto.randomUUID();
    const newSession: ChatSession = {
      id: newId,
      title: `API Pool Copilot - ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      createdAt: new Date(),
      messages: [],
      connectionId: this.selectedConnectionId,
      sourceConnectionIds: [...this.sourceConnectionIds],
      historyStart: 0
    };

    this.chatSessions.unshift(newSession);
    this.activeSessionId = newId;
    this.messages = [];
    this.addInitialGreeting();
    this.saveChatSessions();
  }

  switchSession(sessionId: string): void {
    this.cancelPendingChat();
    if (this.activeSessionId && this.messages.length > 0) {
      const curr = this.chatSessions.find(s => s.id === this.activeSessionId);
      if (curr) {
        curr.messages = [...this.messages];
      }
    }

    this.activeSessionId = sessionId;
    const target = this.chatSessions.find(s => s.id === sessionId);
    if (target) {
      this.messages = [...target.messages];
      const savedSources = target.sourceConnectionIds || [this.selectedConnectionId];
      this.sourceConnectionIds = savedSources.filter(id => this.allConnections.some(c => c.id === id));
      if (savedSources.length !== this.sourceConnectionIds.length) target.historyStart = this.messages.length;
      this.saveChatSessions();
    }
    this.scrollToBottom();
  }

  deleteSession(sessionId: string, event: Event): void {
    event.stopPropagation();
    this.chatSessions = this.chatSessions.filter(s => s.id !== sessionId);
    this.saveChatSessions();
    if (this.activeSessionId === sessionId) {
      if (this.chatSessions.length > 0) {
        this.switchSession(this.chatSessions[0].id);
      } else {
        this.createNewSession();
      }
    } else {
      this.saveChatSessions();
    }
  }

  clearChat(): void {
    this.cancelPendingChat();
    const session = this.chatSessions.find(s => s.id === this.activeSessionId);
    if (session) session.historyStart = 0;
    this.messages = [];
    this.addInitialGreeting();
    this.saveChatSessions();
  }

  addInitialGreeting(): void {
    this.messages.push({
      id: 'msg_welcome', role: 'assistant', timestamp: new Date(),
      content: `Welcome to **${this.selectedConnectionName} Copilot**. Chats and requirements belong to this API pool. Use **Pools AI can access** to choose source records, then ask me to search, compare, rank, or audit them. Web search is optional. Adding someone to a job requires choosing a target pipeline.`
    });
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

  // Sending Prompts to Scoped API Copilot Backend
  sendPrompt(text: string): void {
    if (!text || !text.trim() || this.isLoading || !this.ready) return;
    if (!this.sourceConnectionIds.length) { this.workspaceError = 'Select at least one pool the AI can access.'; return; }
    this.workspaceError = '';
    const version = this.contextVersion;

    const userMsgText = text.trim();
    this.userInput = '';

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: userMsgText,
      timestamp: new Date()
    };
    this.messages.push(userMsg);
    this.scrollToBottom();

    // Auto-update session title from first user message
    const currentSession = this.chatSessions.find(s => s.id === this.activeSessionId);
    if (currentSession && currentSession.title.startsWith('API Pool Copilot -')) {
      currentSession.title = userMsgText.length > 32 ? userMsgText.substring(0, 32) + '...' : userMsgText;
    }

    this.isLoading = true;

    const historyForBackend = this.messages.slice(currentSession?.historyStart || 0)
      .filter(m => m.id !== userMsg.id && m.id !== 'msg_welcome')
      .map(m => ({ role: m.role, content: m.content }));

    this.saveChatSessions();
    this.pendingChat = this.copilotService.chatApiPool(this.orgId, {
      context_connection_id: this.selectedConnectionId,
      connection_ids: [...this.sourceConnectionIds],
      query: userMsgText,
      history: historyForBackend,
      min_score: this.minMatchScore,
      enable_web_search: this.enableWebSearch,
      limit: 10
    }).subscribe({
      next: (res: any) => {
        if (version !== this.contextVersion) return;
        this.isLoading = false;
        const rawContent = res.response || 'Completed evaluation for API Connection Pool candidates.';
        const candidatesList = res.candidates || res.results || [];
        const formattedContent = this.formatCopilotResponseText(rawContent, candidatesList, userMsgText);
        const assistantMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: formattedContent,
          timestamp: new Date(),
          candidates: candidatesList,
          webResults: res.web_search_results || [],
          toolInvoked: res.tool_invoked
        };

        this.messages.push(assistantMsg);
        this.saveChatSessions();
        this.scrollToBottom();
      },
      error: (err: any) => {
        if (version !== this.contextVersion) return;
        this.isLoading = false;
        console.error('API Copilot Error:', err);
        const errorMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `⚠️ **API Data Pool Copilot Error**: ${err?.error?.detail || err?.message || 'Failed to communicate with API Data Pool vector store. Please ensure your backend is running.'}`,
          timestamp: new Date()
        };
        this.messages.push(errorMsg);
        this.saveChatSessions();
        this.scrollToBottom();
      }
    });
  }

  // Custom Templates CRUD
  private getCustomTemplatesStorageKey(): string {
    return `${this.workspaceKey}_templates`;
  }

  loadCustomTemplates(): void {
    try {
      const data = localStorage.getItem(this.getCustomTemplatesStorageKey());
      if (data) {
        this.customPrompts = JSON.parse(data);
      }
    } catch (e) {
      console.warn('Failed to parse custom templates:', e);
    }
  }

  saveCustomTemplates(): void {
    try {
      localStorage.setItem(this.getCustomTemplatesStorageKey(), JSON.stringify(this.customPrompts));
    } catch (e) {
      console.warn('Failed to save custom templates:', e);
    }
  }

  openCreateTemplateModal(): void {
    this.newTemplateTitle = '';
    this.newTemplatePrompt = '';
    this.newTemplateIcon = 'fa-wand-magic-sparkles text-emerald-600';
    this.showCreateTemplateModal = true;
  }

  closeCreateTemplateModal(): void {
    this.showCreateTemplateModal = false;
  }

  createCustomTemplate(): void {
    if (!this.newTemplateTitle.trim() || !this.newTemplatePrompt.trim()) {
      alert('Please enter both a title and prompt text for your template.');
      return;
    }

    const newTemplate: PromptTemplate = {
      id: 'custom_' + Date.now(),
      title: this.newTemplateTitle.trim(),
      prompt: this.newTemplatePrompt.trim(),
      icon: this.newTemplateIcon,
      isCustom: true
    };

    this.customPrompts.push(newTemplate);
    this.saveCustomTemplates();
    this.closeCreateTemplateModal();
  }

  deleteCustomTemplate(templateId: string, event: Event): void {
    event.stopPropagation();
    this.customPrompts = this.customPrompts.filter(t => t.id !== templateId);
    this.saveCustomTemplates();
  }

  // Candidate Details & Actions
  formatCandidateForDetails(candidate: any): any {
    if (!candidate) return null;
    // Normalize API resume values only at the display boundary.
    const unwrap = (value: any): any => {
      if (value && typeof value === 'object' && 'value' in value) return unwrap(value.value);
      if (typeof value === 'string' && /^[\[{]/.test(value.trim())) {
        try { return JSON.parse(value); } catch {}
      }
      return value;
    };
    const object = (value: any): any => {
      const parsed = unwrap(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    };
    const populated = (value: any): boolean => {
      value = unwrap(value);
      return value != null && value !== '' &&
        (Array.isArray(value) ? value.length > 0 :
          typeof value === 'object' ? Object.keys(value).length > 0 : true);
    };
    const first = (...values: any[]): any => unwrap(values.find(populated));
    const list = (...values: any[]): any[] => {
      const value = first(...values);
      return Array.isArray(value) ? value.map(unwrap) : populated(value) ? [value] : [];
    };
    const labels = (...values: any[]): string[] => list(...values)
      .flatMap(value => typeof value === 'string' ? value.split(/[,;\n]/) :
        [value?.name || value?.language || value?.skill || ''])
      .map(value => String(value).trim()).filter(Boolean);
    const original = object(candidate.original_record);
    const structRes = object(first(candidate.structured_resume, original.structured_resume));
    const resData = object(first(candidate.resume_data, original.resume_data));
    const fd = object(first(candidate.form_data, original.form_data));
    const pd = { ...object(resData.personal_details), ...object(structRes.personal_details) };
    const name = first(pd.full_name, pd.name, fd.full_name, fd.name,
      [unwrap(fd.first_name), unwrap(fd.last_name)].filter(Boolean).join(' '),
      candidate.full_name, candidate.name) || 'Applicant';
    const email = first(pd.email, fd.email, fd.email_address, candidate.email,
      candidate.user_email, candidate.candidate_email) || '';
    const skills = labels(resData.skills?.technical_skills, structRes.skills?.technical_skills,
      Array.isArray(resData.skills) ? resData.skills : undefined,
      Array.isArray(structRes.skills) ? structRes.skills : undefined,
      candidate.skills, candidate.skills_list, fd.skills);
    const attachment = first(candidate.uploaded_files?.resume, original.uploaded_files?.resume);
    const resumeUrl = first(candidate.resume_url, candidate.file_url, candidate.cv_url,
      typeof attachment === 'string' ? attachment : first(attachment?.metadata?.url,
        attachment?.url, attachment?.file_url, attachment?.link)) || '';
    const section = (key: string): any[] => list(structRes[key], resData[key], candidate[key], original[key], fd[key]);
    const workExp = section('work_experience').map(entry => {
      const exp = object(entry);
      return { ...exp, job_title: first(exp.job_title, exp.title, exp.position) || '',
        company: first(exp.company, exp.company_name, exp.employer) || '',
        description: first(exp.description, typeof entry === 'string' ? entry : undefined) || '',
        responsibilities: list(exp.responsibilities, exp.achievements) };
    });
    const edu = section('education').map(entry => {
      const item = object(entry);
      return { ...item, institution: first(item.institution, item.school, item.university,
        typeof entry === 'string' ? entry : undefined) || '',
        field_of_study: first(item.field_of_study, item.field, item.major) || '' };
    });
    const refs = section('references').map(entry => {
      const item = object(entry);
      return { ...item, name: first(item.name, typeof entry === 'string' ? entry : undefined) || '',
        contact_info: first(item.contact_info, item.email, item.phone) || '' };
    });
    const projs = section('projects').map(entry => {
      const item = object(entry);
      return { ...item, name: first(item.name, item.title, typeof entry === 'string' ? entry : undefined) || '',
        technologies_used: labels(item.technologies_used, item.technologies) };
    });
    const certs = section('certifications').map(entry => {
      const item = object(entry);
      return { ...item, name: first(item.name, item.title, typeof entry === 'string' ? entry : undefined) || '',
        issuing_organization: first(item.issuing_organization, item.issuer) || '' };
    });
    const mergedResumeData = {
      ...resData,
      ...structRes,
      personal_details: {
        ...pd,
        full_name: name,
        email: email,
        phone_number: first(pd.phone_number, pd.phone, fd.phone_number, fd.phone, candidate.phone, candidate.phone_number) || '',
        address: first(pd.address, pd.location, fd.address, fd.location, candidate.location, candidate.address) || '',
        linkedin: candidate.linkedin || pd.linkedin || '',
        github: candidate.github || pd.github || '',
        portfolio: candidate.website || candidate.portfolio || pd.portfolio || pd.website || ''
      },
      skills: {
        technical_skills: Array.isArray(skills) && skills.length > 0 ? skills : (resData.skills?.technical_skills || structRes.skills?.technical_skills || []),
        soft_skills: labels(resData.skills?.soft_skills, structRes.skills?.soft_skills),
        languages: labels(resData.skills?.languages, structRes.skills?.languages, resData.languages, structRes.languages)
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
      headline: candidate.headline || candidate.job_title || candidate.role || (candidate.connection_name ? `API Pool: ${candidate.connection_name}` : 'Candidate Profile'),
      employment_status: candidate.employment_status || 'Actively Looking',
      stage: candidate.stage || candidate.application_stage || 'application_review',
      status: candidate.status || 'pending',
      skills_list: Array.isArray(skills) ? skills : [],
      match_score: candidate.match_score ?? 85,
      bio: candidate.bio || candidate.summary || candidate.match_reason || '',
      location: candidate.location || candidate.address || pd.address || '',
      phone: candidate.phone || candidate.phone_number || pd.phone_number || '',
      website: candidate.website || candidate.portfolio_url || pd.portfolio || '',
      linkedin: candidate.linkedin || pd.linkedin || '',
      github: candidate.github || pd.github || '',
      resume_url: resumeUrl,
      uploaded_files: candidate.uploaded_files || (resumeUrl ? { resume: resumeUrl } : {}),
      form_data: fd,
      resume_data: mergedResumeData,
      structured_resume: mergedResumeData,
      education: edu,
      work_experience: workExp,
      references: refs,
      projects: projs,
      certifications: certs
    };
  }

  openCandidateDetailsModal(candidate: any): void {
    const formatted = this.formatCandidateForDetails(candidate);
    this.selectedCandidateForDetails = null;
    this.dataService.candidate = formatted;
    this.dataService.openCandidateDetails = true;

    const cid = candidate.id || formatted.id || candidate.user_email || candidate.email;
    if (cid && !candidate.connection_id && !candidate.original_record) {
      this.subscriptions.add(this.candidateService.getCandidateById(cid).subscribe({
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
      }));
    }

    this.cdr.detectChanges();
  }

  viewCandidateDetails(cand: any): void {
    this.openCandidateDetailsModal(cand);
  }

  profileFields(value: any, prefix = ''): { label: string; value: string }[] {
    if (value == null || value === '') return [];
    if (typeof value !== 'object') return [{ label: prefix.replace(/_/g, ' '), value: String(value) }];
    if ('value' in value) return this.profileFields(value.value, value.label || prefix);
    if (Array.isArray(value) && value.every(v => typeof v !== 'object')) {
      return [{ label: prefix.replace(/_/g, ' '), value: value.join(', ') }];
    }
    return Object.entries(value).flatMap(([key, val]) => this.profileFields(val, prefix ? `${prefix} / ${key}` : key));
  }

  emailCandidate(cand: any): void {
    const formatted = this.formatCandidateForDetails(cand);
    this.openImportModal(formatted, 'alert');
  }

  // Add Candidate to Job / Alert Candidate Modal
  openImportModal(cand: any, mode: 'alert' | 'direct' = 'alert'): void {
    const formatted = this.formatCandidateForDetails(cand);
    this.loadJobPostings();
    this.selectedCandidateForImport = formatted;
    this.importMode = mode;
    this.importFeedback = null;
    if (this.jobPostings.length > 0 && !this.importJobId) {
      this.importJobId = this.jobPostings[0].id;
    }
    this.updateAlertEmailTemplate();
    this.cdr.detectChanges();
  }

  closeImportModal(): void {
    this.selectedCandidateForImport = null;
    this.importFeedback = null;
  }

  isCandidateNotified(cand: any): boolean {
    if (!cand) return false;
    const email = cand.email || cand.user_email;
    return email ? this.notifiedCandidateEmails.has(email.toLowerCase()) : false;
  }

  updateAlertEmailTemplate(): void {
    if (!this.selectedCandidateForImport) return;
    const candName = this.selectedCandidateForImport.full_name || 'Candidate';
    const jobTitle = this.getSelectedJobTitle();
    const companyName = this.getSelectedJobCompanyName();
    const applyUrl = `${window.location.origin}/apply/${encodeURIComponent(companyName)}/${this.importJobId}`;

    this.emailSubject = `Application Form Request for ${jobTitle} at ${companyName}`;
    this.emailBody = `Dear ${candName},\n\nWe reviewed your profile ingested via our API data connections and are impressed by your qualifications for the ${jobTitle} position at ${companyName}.\n\nTo move forward in our recruitment process, please click the link below to complete your official application details:\n\n${applyUrl}\n\nBest regards,\n${companyName} Talent Acquisition Team`;
  }

  getSelectedJobTitle(): string {
    if (!this.importJobId) return 'Selected Position';
    const match = this.jobPostings.find(j => j.id === this.importJobId);
    return match ? (match.job_title || match.title) : 'Position';
  }

  getSelectedJobCompanyName(): string {
    if (!this.importJobId) return 'HireUp Enterprise';
    const match = this.jobPostings.find(j => j.id === this.importJobId);
    return match ? (match.company_name || match.company?.name || match.template_data?.company?.name || 'HireUp') : 'HireUp';
  }

  executeAddCandidateToJob(): void {
    if (!this.selectedCandidateForImport || !this.importJobId) {
      this.importFeedback = { type: 'error', message: 'Please select a valid job post.' };
      return;
    }

    this.isImporting = true;
    this.importFeedback = null;

    const record = this.selectedCandidateForImport;
    const jobId = this.importJobId;
    const mode = this.importMode;
    const version = this.contextVersion;
    const email = record.email || record.user_email;
    if (mode === 'alert' && !email) {
      this.isImporting = false;
      this.importFeedback = { type: 'error', message: 'This record has no email address.' };
      return;
    }
    const emailPayload = { candidate_email: email, candidate_name: record.full_name,
      subject: this.emailSubject, body: this.emailBody, jobpost_id: jobId };
    const token = encodeURIComponent(localStorage.getItem('token') || '');
    this.subscriptions.add(this.http.post<any>(`${environment.apiUrl}/orgs/${this.orgId}/api-connections/${record.connection_id}/migrate-record?token=${token}`, {
      api_record_id: record.id,
      jobpost_id: jobId,
      stage: mode === 'alert' ? 'Form Requested' : this.importStage
    }).subscribe({
      next: () => {
        if (mode === 'alert') {
          this.subscriptions.add(this.applicantManagementService.sendCandidateEmail(emailPayload).subscribe({
            next: () => {
              if (version !== this.contextVersion) return;
              this.isImporting = false;
              this.notifiedCandidateEmails.add(email.toLowerCase());
              this.importFeedback = { type: 'success', message: 'Record added to the pipeline and invitation sent.' };
            },
            error: () => {
              if (version !== this.contextVersion) return;
              this.isImporting = false;
              this.importFeedback = { type: 'error', message: 'Record added to the pipeline, but the invitation could not be sent.' };
            }
          }));
        } else if (version === this.contextVersion) {
          this.isImporting = false;
          this.importFeedback = { type: 'success', message: 'Record added to the selected hiring pipeline.' };
        }
      },
      error: err => {
        if (version !== this.contextVersion) return;
        this.isImporting = false;
        this.importFeedback = { type: 'error', message: err?.error?.detail || 'Could not add record to the pipeline.' };
      }
    }));
  }

  getInitials(name: string): string {
    if (!name) return 'AP';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  }

  scrollToBottom(): void {
    setTimeout(() => {
      const container = document.getElementById('apiCopilotScrollContainer');
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }, 100);
  }

  returnToPortal(): void {
    if (this.selectedConnectionId && this.selectedConnectionId !== 'all') {
      this.router.navigate(['/api-connections', this.selectedConnectionId, 'portal']);
    } else {
      this.router.navigate(['/organization-settings']);
    }
  }
}
