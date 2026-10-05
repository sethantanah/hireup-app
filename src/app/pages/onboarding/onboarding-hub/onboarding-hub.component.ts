import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { TalentManagementService } from '../../../services/talent-management.service';
import { JobpostingsApiService } from '../../../services/jobpostings-api.service';
import { AuthService } from '../../../services/auth.service';
import { CustomDropdownComponent } from '../../../components/custom-dropdown/custom-dropdown.component';
import { SelectedJobService } from '../../../services/selected-job.service';

@Component({
  selector: 'app-onboarding-hub',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, CustomDropdownComponent],
  templateUrl: './onboarding-hub.component.html',
  styleUrl: './onboarding-hub.component.scss'
})
export class OnboardingHubComponent implements OnInit {
  records: any[] = [];
  selectedRecord: any = null;
  loading = false;
  savingTask = false;
  activeTab: 'overview' | 'tasks' | 'documents' = 'overview';
  filterStatus = ''; // '' (All), 'in_progress' (Active), 'completed' (Done)
  searchTerm = '';
  successMsg = '';
  errorMsg = '';
  jobId: string | null = null;
  // Workspace shell
  sidebarOpen = false;
  showToolsMenu = true;
  userData: any = null;
  jobPostings: any[] = [];
  selectedJobPost: any = null;

  // Add Task Modal State
  showAddTaskModal = false;
  newTask: any = {
    title: '',
    description: '',
    category: 'General',
    due_day: 1,
    required: true
  };

  // Edit Journey Details Modal State
  showEditPeopleModal = false;
  peopleData: any = {
    manager_name: '',
    manager_email: '',
    buddy_name: '',
    buddy_email: '',
    start_date: '',
    welcome_message: ''
  };

  categoryIcons: Record<string, string> = {
    'Document Signing': 'fa-file-signature',
    'IT Setup': 'fa-laptop',
    'Training': 'fa-book-open',
    'HR': 'fa-users',
    'General': 'fa-check-circle',
    'Technical': 'fa-code',
  };

  categoryColors: Record<string, string> = {
    'Document Signing': 'text-violet-600 bg-violet-50 border-violet-200',
    'IT Setup': 'text-blue-600 bg-blue-50 border-blue-200',
    'Training': 'text-amber-600 bg-amber-50 border-amber-200',
    'HR': 'text-emerald-600 bg-emerald-50 border-emerald-200',
    'General': 'text-slate-600 bg-slate-50 border-slate-200',
    'Technical': 'text-indigo-600 bg-indigo-50 border-indigo-200',
  };

  constructor(
    private talentSvc: TalentManagementService,
    private route: ActivatedRoute,
    private jobpostingsApi: JobpostingsApiService,
    private authService: AuthService,
    private selectedJobService: SelectedJobService
  ) {}

  ngOnInit(): void {
    try { const u = localStorage.getItem('USER'); if(u) this.userData = JSON.parse(u); } catch {}
    const svcId = this.selectedJobService.selectedJobId;
    if (svcId) this.jobId = svcId;
    this.route.queryParams.subscribe(params => {
      if (params['jobId']) {
        this.selectedJobService.setSelectedJobId(params['jobId']);
      }
    });
    this.selectedJobService.selectedJobId$.subscribe(id => {
      if (id !== this.jobId) {
        this.jobId = id;
        if (id) {
          const found = this.jobPostings.find((j:any)=>j.id===id);
          if (found) this.selectedJobPost = found;
        } else {
          this.selectedJobPost = null;
        }
        this.loadRecords();
      }
    });
    this.loadRecords();
    this.loadSidebarPostings();
  }

  toggleSidebar(): void { this.sidebarOpen = !this.sidebarOpen; }
  logOut(): void { this.authService.logOut(); }
  selectJobFromSidebar(job:any): void { this.selectedJobPost = job; this.jobId = job.id; this.selectedJobService.setSelectedJobId(job.id); this.loadRecords(); }
  onHeaderJobChange(jobId: string): void {
    this.selectedJobService.setSelectedJobId(jobId || null);
    if (!jobId) { this.jobId = null; this.selectedJobPost = null; this.loadRecords(); return; }
    const found = this.jobPostings.find((j:any)=>j.id===jobId);
    if (found) {
      this.selectedJobPost = found; this.jobId = jobId; this.loadRecords();
    } else { this.jobId = jobId; this.loadRecords(); }
  }
  get jobDropdownOptions(): Array<{id:string; label:string}> {
    const opts = this.jobPostings.map((j:any)=>({ id: j.id, label: j.title }));
    if (this.jobId && !opts.find(o=>o.id===this.jobId)) {
      // placeholder until job title loads; keep value visible
      opts.unshift({ id: this.jobId, label: this.selectedJobPost?.title || this.jobId });
    }
    return opts;
  }
  private loadSidebarPostings(): void {
    try { const s = localStorage.getItem('USER'); if(!s) return; const u=JSON.parse(s); if(!u?.id) return; this.jobpostingsApi.getJobPostings(u.id).subscribe({ next:(d:any)=>{ this.jobPostings=(d as any[])||[]; if(this.jobId) this.selectedJobPost=this.jobPostings.find((j:any)=>j.id===this.jobId); }}); } catch {}
  }

  loadRecords(): void {
    this.loading = true;
    const filters: any = { status: this.filterStatus || undefined };
    if (this.jobId) {
      filters.jobpost_id = this.jobId;
    }
    
    this.talentSvc.listOnboardingRecords(filters).subscribe({
      next: (res: any) => {
        this.records = res.records || [];
        this.loading = false;
        if (this.records.length > 0 && !this.selectedRecord) {
          this.selectedRecord = this.records[0];
        }
      },
      error: () => { this.loading = false; }
    });
  }

  get filteredRecords(): any[] {
    let list = [...this.records];
    if (this.filterStatus) {
      list = list.filter(r => r.status === this.filterStatus);
    }
    if (this.searchTerm && this.searchTerm.trim()) {
      const q = this.searchTerm.toLowerCase().trim();
      list = list.filter(r => 
        (r.candidate_name && r.candidate_name.toLowerCase().includes(q)) ||
        (r.candidate_email && r.candidate_email.toLowerCase().includes(q)) ||
        (r.job_title && r.job_title.toLowerCase().includes(q)) ||
        (r.department && r.department.toLowerCase().includes(q))
      );
    }
    return list;
  }

  selectRecord(r: any): void {
    this.selectedRecord = r;
    this.activeTab = 'overview';
  }

  get tasks(): any[] { return this.selectedRecord?.tasks || []; }
  get completedCount(): number { return this.tasks.filter(t => t.status === 'completed').length; }
  get progress(): number { return this.tasks.length ? Math.round((this.completedCount / this.tasks.length) * 100) : 0; }

  tasksByCategory(cat: string): any[] {
    return this.tasks.filter(t => t.category === cat);
  }

  completedCountByCategory(cat: string): number {
    return this.tasksByCategory(cat).filter(t => t.status === 'completed').length;
  }

  get uniqueCategories(): string[] {
    return [...new Set(this.tasks.map(t => t.category))];
  }

  completeTask(task: any): void {
    if (task.status === 'completed') return;
    this.savingTask = true;
    const userData = JSON.parse(localStorage.getItem('USER') || '{}');
    this.talentSvc.completeOnboardingTask(this.selectedRecord.id, {
      task_id: task.id,
      completed_by: userData?.full_name || userData?.email || 'Recruiter',
    }).subscribe({
      next: (res: any) => {
        this.selectedRecord = res.record;
        this.savingTask = false;
        this.successMsg = `Task "${task.title}" marked complete!`;
        setTimeout(() => this.successMsg = '', 3000);
        this.loadRecords();
      },
      error: () => { this.savingTask = false; this.errorMsg = 'Failed to complete task.'; }
    });
  }

  // Add Task Modal
  openAddTaskModal(): void {
    this.newTask = {
      title: '',
      description: '',
      category: 'General',
      due_day: 1,
      required: true
    };
    this.showAddTaskModal = true;
  }

  saveNewTask(): void {
    if (!this.newTask.title.trim() || !this.selectedRecord) return;
    const taskItem = {
      id: 'task_' + Date.now(),
      title: this.newTask.title.trim(),
      description: this.newTask.description.trim(),
      category: this.newTask.category,
      due_day: this.newTask.due_day || 1,
      required: this.newTask.required,
      status: 'pending'
    };

    const updatedTasks = [...(this.selectedRecord.tasks || []), taskItem];
    this.talentSvc.updateOnboardingRecord(this.selectedRecord.id, { tasks: updatedTasks }).subscribe({
      next: (res: any) => {
        this.selectedRecord = res.record;
        this.showAddTaskModal = false;
        this.successMsg = 'New onboarding task added successfully!';
        setTimeout(() => this.successMsg = '', 3000);
      },
      error: () => { this.errorMsg = 'Failed to add task.'; }
    });
  }

  // Edit Journey Details Modal
  openEditPeopleModal(): void {
    if (!this.selectedRecord) return;
    this.peopleData = {
      manager_name: this.selectedRecord.manager_name || '',
      manager_email: this.selectedRecord.manager_email || '',
      buddy_name: this.selectedRecord.buddy_name || '',
      buddy_email: this.selectedRecord.buddy_email || '',
      start_date: this.selectedRecord.start_date || '',
      welcome_message: this.selectedRecord.welcome_message || ''
    };
    this.showEditPeopleModal = true;
  }

  savePeopleData(): void {
    if (!this.selectedRecord) return;
    this.talentSvc.updateOnboardingRecord(this.selectedRecord.id, this.peopleData).subscribe({
      next: (res: any) => {
        this.selectedRecord = res.record;
        this.showEditPeopleModal = false;
        this.successMsg = 'Employee journey details updated!';
        setTimeout(() => this.successMsg = '', 3000);
        this.loadRecords();
      },
      error: () => { this.errorMsg = 'Failed to update details.'; }
    });
  }

  toggleJourneyStatus(): void {
    if (!this.selectedRecord) return;
    const newStatus = this.selectedRecord.status === 'completed' ? 'in_progress' : 'completed';
    this.talentSvc.updateOnboardingRecord(this.selectedRecord.id, { status: newStatus }).subscribe({
      next: (res: any) => {
        this.selectedRecord = res.record;
        this.successMsg = `Journey status set to ${newStatus === 'completed' ? 'Done' : 'Active'}`;
        setTimeout(() => this.successMsg = '', 3000);
        this.loadRecords();
      },
      error: () => { this.errorMsg = 'Failed to update journey status.'; }
    });
  }

  getStatusClass(status: string): string {
    const m: Record<string, string> = {
      'in_progress': 'text-amber-700 bg-amber-50 border-amber-200',
      'completed': 'text-emerald-700 bg-emerald-50 border-emerald-200',
      'not_started': 'text-slate-600 bg-slate-50 border-slate-200',
    };
    return m[status] || m['not_started'];
  }

  getInitials(name: string): string {
    return (name || 'NN').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }
}
