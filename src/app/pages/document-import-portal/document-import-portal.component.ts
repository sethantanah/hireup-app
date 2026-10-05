import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environment/environment';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { JobpostManagerService } from '../../services/jobpost-manager.service';
import { JobpostingsApiService } from '../../services/jobpostings-api.service';
import { FormattingService } from '../../services/formatting.service';
import { IndexedDbService } from '../../services/indexed-db.service';
import { CustomDropdownComponent } from '../../components/custom-dropdown/custom-dropdown.component';

export interface EmailAttachment {
  filename: string;
  message_id?: string;
  attachment_id: string;
  file?: File;
}

export interface EmailItem {
  email_id: string;
  job_id?: string;
  sender: string;
  subject: string;
  provider?: string;
  processed?: boolean;
  attachments: EmailAttachment[];
}

export interface SchedulerConfig {
  enabled: boolean;
  provider: string;
  poll_interval_minutes: number;
  search_query: string;
  start_time?: string;
  jobpost_id: string;
  default_stage: string;
  last_run?: string | null;
  imported_count?: number;
}

@Component({
  selector: 'app-document-import-portal',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink, CustomDropdownComponent],
  templateUrl: './document-import-portal.component.html',
  styleUrls: ['./document-import-portal.component.scss']
})
export class DocumentImportPortalComponent implements OnInit {
  sidebarOpen: boolean = false;
  activeTab: 'upload' | 'gmail' | 'outlook' | 'custom' | 'scheduler' = 'upload';
  
  // Job Post selection
  jobPosts: any[] = [];
  jobPostDropdownOptions: Array<{ id: string; label: string; job_title: string; department: string; raw: any }> = [];
  selectedJobId: string = '';
  selectedJobPost: any = null;
  loadingJobs: boolean = false;
  userData: any = null;
  showToolsMenu: boolean = false;

  // File Upload State
  selectedFiles: File[] = [];
  isUploading: boolean = false;
  uploadProgress: { fileName: string; progress: number; status: 'uploading' | 'success' | 'error'; error?: string }[] = [];
  failedUploads: { fileName: string; fileSize: number; fileType: string; error: string }[] = [];

  // Gmail / Outlook / Custom State
  isGmailConnected: boolean = false;
  isOutlookConnected: boolean = false;
  connectingMail: boolean = false;
  emailSearchQuery: string = 'resume CV application';
  emailStartDate: string = '';
  emailEndDate: string = '';
  emails: EmailItem[] = [];
  isSearching: boolean = false;
  hasSearched: boolean = false;

  // Custom IMAP Configuration
  imapConfig = {
    host: 'imap.mail.yahoo.com',
    port: 993,
    username: '',
    password: '',
    use_ssl: true
  };

  // Scheduler State
  schedulerConfig: SchedulerConfig = {
    enabled: false,
    provider: 'gmail',
    poll_interval_minutes: 60,
    search_query: 'resume CV application',
    start_time: '',
    jobpost_id: '',
    default_stage: 'application_review',
    last_run: null,
    imported_count: 0
  };
  savingScheduler: boolean = false;
  runningScheduler: boolean = false;

  // Toast / Popup Feedback
  showPopup: boolean = false;
  popupMessage: string = '';
  popupType: 'success' | 'error' | 'warning' | 'info' = 'info';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private apiService: ApiService,
    private authService: AuthService,
    private jobPostService: JobpostManagerService,
    private jobpostingsApi: JobpostingsApiService,
    public formattingService: FormattingService,
    private indexedDbService: IndexedDbService
  ) {}

  ngOnInit(): void {
    const rawUserData = localStorage.getItem('userData') || localStorage.getItem('USER');
    if (rawUserData) {
      try {
        this.userData = JSON.parse(rawUserData);
      } catch (e) {
        this.userData = null;
      }
    }
    
    this.loadJobPosts();
    this.loadSchedulerConfig();
    this.authService.handleAuthCallback();

    // Check query params for jobId
    this.route.queryParams.subscribe(params => {
      if (params['jobId']) {
        this.selectedJobId = params['jobId'];
        this.syncSelectedJob();
      }
    });
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  getInitials(name: string): string {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  logOut(): void {
    this.authService.logOut();
    this.router.navigate(['/login']);
  }

  loadJobPosts(): void {
    this.loadingJobs = true;
    const userId = this.userData?.id || this.userData?.user_id || '';
    
    let orgId = '';
    try {
      const activeOrgStr = localStorage.getItem('current_organization') || localStorage.getItem('ACTIVE_ORG');
      if (activeOrgStr) {
        const parsed = JSON.parse(activeOrgStr);
        orgId = parsed?.id || '';
      }
    } catch {}

    const req1$ = this.jobPostService.getJobPosts(userId).pipe(catchError(() => of([])));
    const req2$ = userId ? this.jobpostingsApi.getJobPostings(userId, orgId).pipe(catchError(() => of([]))) : of([]);

    forkJoin([req1$, req2$]).subscribe({
      next: ([res1, res2]: [any, any]) => {
        this.loadingJobs = false;
        const list1 = Array.isArray(res1) ? res1 : (res1?.data || res1?.job_posts || res1?.documents || res1?.jobs || []);
        const list2 = Array.isArray(res2) ? res2 : (res2?.data || res2?.job_posts || res2?.documents || res2?.jobs || []);
        
        const combined = [...list1, ...list2];
        const seenIds = new Set<string>();
        const uniquePosts: any[] = [];

        combined.forEach(j => {
          if (!j) return;
          const id = String(j.id || j.job_id || j.jobpost_id || j._id || j.job_data?.id || '');
          if (id && !seenIds.has(id)) {
            seenIds.add(id);
            uniquePosts.push(j);
          }
        });

        this.jobPosts = uniquePosts;
        
        this.jobPostDropdownOptions = uniquePosts.map((j: any) => {
          const id = String(j.id || j.job_id || j.jobpost_id || j._id || '');
          const title = j.title || j.job_title || j.jobTitle || j.name || j.position_name || j.job?.title || j.job_data?.title || j.data?.title || 'Untitled Job Position';
          const dept = j.department || j.dept || j.category || j.job?.department || j.data?.department || '';
          const label = dept ? `${title} (${dept})` : title;
          return {
            id: id,
            label: label,
            job_title: title,
            department: dept || 'General',
            raw: j
          };
        });

        if (this.selectedJobId) {
          const exists = this.jobPostDropdownOptions.find(o => String(o.id) === String(this.selectedJobId));
          if (!exists && this.jobPostDropdownOptions.length > 0) {
            this.selectedJobId = this.jobPostDropdownOptions[0].id;
          }
        } else if (this.jobPostDropdownOptions.length > 0) {
          this.selectedJobId = this.jobPostDropdownOptions[0].id;
        }

        this.syncSelectedJob();
      },
      error: () => {
        this.loadingJobs = false;
      }
    });
  }

  onJobSelectChange(newJobId: any): void {
    if (typeof newJobId === 'string') {
      this.selectedJobId = newJobId;
    } else if (newJobId?.id) {
      this.selectedJobId = newJobId.id;
    } else if (newJobId?.value) {
      this.selectedJobId = newJobId.value;
    }
    this.syncSelectedJob();
    if (this.selectedJobId) {
      this.schedulerConfig.jobpost_id = this.selectedJobId;
    }
  }

  syncSelectedJob(): void {
    if (!this.selectedJobId) return;

    if (this.jobPostDropdownOptions.length > 0) {
      const matchOpt = this.jobPostDropdownOptions.find(o => String(o.id) === String(this.selectedJobId));
      if (matchOpt) {
        this.selectedJobPost = matchOpt.raw || matchOpt;
        this.selectedJobPost.title = matchOpt.job_title;
        this.selectedJobPost.department = matchOpt.department;
      } else {
        this.selectedJobPost = this.jobPosts.find(j => String(j.id || j.job_id || j.jobpost_id || j._id) === String(this.selectedJobId)) || { id: this.selectedJobId, title: 'Selected Job Position' };
        if (!this.jobPostDropdownOptions.find(o => String(o.id) === String(this.selectedJobId))) {
          const title = this.selectedJobPost.title || this.selectedJobPost.job_title || 'Selected Job Position';
          this.jobPostDropdownOptions.unshift({
            id: String(this.selectedJobId),
            label: title,
            job_title: title,
            department: 'General',
            raw: this.selectedJobPost
          });
        }
      }
    }
  }

  setActiveTab(tab: 'upload' | 'gmail' | 'outlook' | 'custom' | 'scheduler'): void {
    this.activeTab = tab;
    this.emails = [];
    this.hasSearched = false;
  }

  // --- FILE UPLOAD LOGIC ---

  onFileSelected(event: any): void {
    const files = event.target.files;
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        this.selectedFiles.push(files[i]);
      }
    }
    event.target.value = '';
  }

  removeFileFromQueue(index: number): void {
    if (index >= 0 && index < this.selectedFiles.length) {
      this.selectedFiles.splice(index, 1);
    }
  }

  clearFileQueue(): void {
    this.selectedFiles = [];
    this.uploadProgress = [];
  }

  startBulkUpload(): void {
    if (!this.selectedJobId) {
      this.showToast('Please select a target Job Post before starting document upload.', 'warning');
      return;
    }
    if (this.selectedFiles.length === 0) {
      this.showToast('No document files selected for upload queue.', 'warning');
      return;
    }

    this.isUploading = true;
    this.uploadProgress = this.selectedFiles.map(f => ({
      fileName: f.name,
      progress: 0,
      status: 'uploading'
    }));

    this.uploadFilesSequentially(0);
  }

  private uploadFilesSequentially(index: number): void {
    if (index >= this.selectedFiles.length) {
      this.isUploading = false;
      const successCount = this.uploadProgress.filter(p => p.status === 'success').length;
      const failCount = this.uploadProgress.filter(p => p.status === 'error').length;

      if (failCount === 0) {
        this.showToast(`Successfully processed and parsed ${successCount} document(s) into candidate profiles!`, 'success');
      } else {
        this.showToast(`Completed with warnings: ${successCount} document(s) uploaded, ${failCount} failed. Check error drawer below.`, 'warning');
      }
      this.selectedFiles = [];
      return;
    }

    const file = this.selectedFiles[index];
    const formData = new FormData();
    formData.append('jobPostId', this.selectedJobId);
    formData.append('fieldKey', 'resume');
    formData.append('file', file);
    formData.append('form_data', JSON.stringify({
      email: { value: '', label: 'Email' },
      full_name: { value: file.name.replace(/\.[^/.]+$/, ''), label: 'Full Name' }
    }));

    this.apiService.uploadSingleFile(formData).subscribe({
      next: (event: any) => {
        if (event.type === 'complete') {
          this.uploadProgress[index].status = 'success';
          this.uploadProgress[index].progress = 100;
          setTimeout(() => this.uploadFilesSequentially(index + 1), 300);
        }
      },
      error: (err: any) => {
        const errorDetail = err?.error?.detail || err?.error?.message || err?.message || 'File parsing or upload failed.';
        console.error(`Upload error for ${file.name}:`, err);
        this.uploadProgress[index].status = 'error';
        this.uploadProgress[index].error = errorDetail;
        this.failedUploads.push({
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          error: errorDetail
        });
        setTimeout(() => this.uploadFilesSequentially(index + 1), 300);
      }
    });
  }

  // --- GMAIL, OUTLOOK & IMAP INTEGRATION ---

  connectGoogle(): void {
    this.connectingMail = true;
    this.authService.googleLogin().subscribe({
      next: () => {
        this.isGmailConnected = true;
        this.connectingMail = false;
        this.showToast('Gmail account connected and authorized successfully!', 'success');
      },
      error: (err: any) => {
        this.isGmailConnected = false;
        this.connectingMail = false;
        const errReason = err?.error?.detail || err?.error?.message || err?.message || 'Authorization popup closed or access denied.';
        this.showToast(`Gmail Connection Error: ${errReason}`, 'error');
      }
    });
  }

  connectOutlook(): void {
    this.connectingMail = true;
    const token = localStorage.getItem('token');

    this.http.get<any>(`${environment.apiUrl}/connect-outlook/auth-url`, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (res: any) => {
        const authUrl = res?.url;
        if (!authUrl) {
          this.connectingMail = false;
          this.showToast('Failed to retrieve Microsoft Outlook authorization URL.', 'error');
          return;
        }

        const width = 600;
        const height = 700;
        const left = (window.innerWidth - width) / 2;
        const top = (window.innerHeight - height) / 2;

        const popup = window.open(
          authUrl,
          'Microsoft Outlook Authorization',
          `width=${width},height=${height},top=${top},left=${left},scrollbars=yes`
        );

        const checkPopup = setInterval(() => {
          if (!popup || popup.closed) {
            clearInterval(checkPopup);
            this.connectingMail = false;
            this.isOutlookConnected = true;
            this.showToast('Microsoft Outlook account connected successfully!', 'success');
          }
        }, 1000);
      },
      error: (err: any) => {
        this.connectingMail = false;
        const detailMsg = err?.error?.detail || err?.message || 'Failed to initiate Outlook authorization.';
        this.showToast(`Outlook Connection Error: ${detailMsg}`, 'error');
      }
    });
  }

  searchEmails(provider: 'gmail' | 'outlook' | 'custom'): void {
    this.isSearching = true;
    this.hasSearched = true;

    this.apiService.getEmailAttachments(provider, this.emailSearchQuery || '', this.emailStartDate, this.emailEndDate, this.imapConfig).subscribe({
      next: (res: any) => {
        this.isSearching = false;
        this.emails = Array.isArray(res) ? res : [];
        if (this.emails.length > 0) {
          this.showToast(`Found ${this.emails.length} email message(s) containing candidate attachments.`, 'success');
        } else {
          this.showToast(`No candidate emails found matching query criteria.`, 'info');
        }
      },
      error: (err: any) => {
        this.isSearching = false;
        console.error('Email search error:', err);
        const detailMsg = err?.error?.detail || err?.error?.message || err?.message || `Unable to fetch ${provider} emails. Verify account connection.`;
        this.showToast(`Email Search Error: ${detailMsg}`, 'error');
      }
    });
  }

  async importEmailAttachments(email: EmailItem): Promise<void> {
    if (!this.selectedJobId) {
      this.showToast('Please select a target Job Post before importing email attachments.', 'warning');
      return;
    }
    if (!email.attachments || email.attachments.length === 0) {
      this.showToast(`Email from ${email.sender} contains no attachments to import.`, 'info');
      return;
    }

    this.showToast(`Downloading & parsing ${email.attachments.length} attachment(s) from ${email.sender}...`, 'info');

    try {
      const provider = this.activeTab === 'outlook' ? 'outlook' : (this.activeTab === 'custom' ? 'imap' : 'gmail');
      for (const attachment of email.attachments) {
        const response = await firstValueFrom(this.apiService.downloadFileAttachment(attachment, provider));
        const fileType = attachment.filename.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream';
        const file = new File([response], attachment.filename, { type: fileType });

        const formData = new FormData();
        formData.append('jobPostId', this.selectedJobId);
        formData.append('fieldKey', 'resume');
        formData.append('file', file);
        formData.append('form_data', JSON.stringify({
          sender: { value: email.sender, label: 'Sender' },
          subject: { value: email.subject, label: 'Subject' }
        }));

        await firstValueFrom(this.apiService.uploadSingleFile(formData));
      }

      email.processed = true;
      this.showToast(`Successfully imported candidate attachments from "${email.subject}" (${email.sender})!`, 'success');
    } catch (err: any) {
      console.error('Failed to import email attachments:', err);
      const detailMsg = err?.error?.detail || err?.error?.message || err?.message || 'Attachment extraction or document parsing failed.';
      this.showToast(`Attachment Import Error: ${detailMsg}`, 'error');
    }
  }

  // --- SCHEDULER LOGIC ---

  private getAuthToken(): string {
    return localStorage.getItem('token') || '';
  }

  loadSchedulerConfig(): void {
    const token = this.getAuthToken();
    this.http.get<any>(`${environment.apiUrl || 'http://localhost:8000/api'}/connect-mail/email-scheduler/config?token=${encodeURIComponent(token)}`)
      .subscribe({
        next: (res: any) => {
          if (res?.status && res?.config) {
            this.schedulerConfig = { ...this.schedulerConfig, ...res.config };
          }
        },
        error: (err: any) => {
          console.error('Failed to load scheduler config:', err);
        }
      });
  }

  saveSchedulerSettings(): void {
    this.savingScheduler = true;
    const token = this.getAuthToken();
    const payload = {
      enabled: this.schedulerConfig.enabled,
      provider: this.schedulerConfig.provider,
      poll_interval_minutes: Number(this.schedulerConfig.poll_interval_minutes),
      search_query: this.schedulerConfig.search_query,
      jobpost_id: this.selectedJobId || this.schedulerConfig.jobpost_id,
      default_stage: this.schedulerConfig.default_stage
    };

    this.http.post<any>(`${environment.apiUrl || 'http://localhost:8000/api'}/connect-mail/email-scheduler/config?token=${encodeURIComponent(token)}`, payload)
      .subscribe({
        next: (res: any) => {
          this.savingScheduler = false;
          this.showToast('Background inbox polling schedule saved successfully!', 'success');
          if (res?.config) {
            this.schedulerConfig = { ...this.schedulerConfig, ...res.config };
          }
        },
        error: (err: any) => {
          this.savingScheduler = false;
          console.error('Failed to save scheduler:', err);
          const detailMsg = err?.error?.detail || err?.error?.message || err?.message || 'Failed to update scheduler configuration.';
          this.showToast(`Scheduler Configuration Error: ${detailMsg}`, 'error');
        }
      });
  }

  runSchedulerNow(): void {
    this.runningScheduler = true;
    const token = this.getAuthToken();
    this.http.post<any>(`${environment.apiUrl || 'http://localhost:8000/api'}/connect-mail/email-scheduler/run-now?token=${encodeURIComponent(token)}`, {})
      .subscribe({
        next: (res: any) => {
          this.runningScheduler = false;
          const msg = res.message || 'Inbox scan executed. Checked connected inbox and ingested new candidate CVs.';
          this.showToast(msg, 'success');
          this.loadSchedulerConfig();
        },
        error: (err: any) => {
          this.runningScheduler = false;
          console.error('Run scheduler error:', err);
          const detailMsg = err?.error?.detail || err?.error?.message || err?.message || 'Inbox scan execution failed. Check connected credentials.';
          this.showToast(`Manual Inbox Scan Error: ${detailMsg}`, 'error');
        }
      });
  }

  // --- HELPERS ---

  showToast(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info'): void {
    this.popupMessage = message;
    this.popupType = type;
    this.showPopup = true;
    setTimeout(() => {
      this.showPopup = false;
    }, 6000);
  }
}
