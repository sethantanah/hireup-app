import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrgService, Organization, EmailSettings, OrgMember, OrgInvitation } from '../../services/org.service';
import { AlertService } from '../../services/alert.service';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { OrgSwitcherComponent } from '../../components/org-switcher/org-switcher.component';
import { environment } from '../../../environment/environment';

@Component({
  selector: 'app-organization-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, OrgSwitcherComponent],
  templateUrl: './organization-settings.component.html',
  styleUrl: './organization-settings.component.scss'
})
export class OrganizationSettingsComponent implements OnInit {
  activeTab: 'email' | 'team' | 'profile' | 'monitoring' | 'api_connections' = 'team';

  currentOrg: Organization | null = null;
  loading = false;

  // Monitoring State
  systemFailures: any[] = [];
  loadingFailures = false;
  retryingFailureId: string | null = null;
  resolvingFailureId: string | null = null;
  isDownloadingLogs = false;
  // Workspace shell
  sidebarOpen = false;
  showToolsMenu = true;
  userData: any = null;

  // Email Server Settings State
  emailSettings: EmailSettings = {
    provider: 'default',
    from_email: '',
    from_name: ''
  };
  isSavingEmail = false;

  providerOptions = [
    { id: 'default', label: 'System Default (Gmail / Default Server)' },
    { id: 'smtp', label: 'Custom SMTP Server (Host, Port, SSL/TLS)' },
    { id: 'mailersend', label: 'MailerSend API' },
    { id: 'resend', label: 'Resend API' }
  ];

  // Test Email Modal state
  showTestEmailModal = false;
  testTargetEmail = '';
  isSendingTest = false;

  // Team Members & Invitations State
  members: OrgMember[] = [];
  invitations: OrgInvitation[] = [];

  roleOptions = [
    { id: 'Admin', label: 'Admin (Full Access & Settings)' },
    { id: 'Recruiter', label: 'Recruiter (Jobs, Candidates, Offers)' },
    { id: 'Interviewer', label: 'Interviewer (Evaluations & Scorecards)' },
    { id: 'Viewer', label: 'Viewer (Read-Only)' }
  ];

  // Invite Modal state
  showInviteModal = false;
  inviteEmail = '';
  inviteRole = 'Recruiter';
  isSendingInvite = false;

  // API Connections State
  apiConnections: any[] = [];
  selectedApiConnId: string | null = null;
  showApiConnModal = false;
  isEditingApiConn = false;
  editingApiConnId = '';
  apiConnForm = {
    name: '',
    description: '',
    schema_definition: '{\n  "fields": [\n    {"name": "first_name", "type": "string", "required": true},\n    {"name": "last_name", "type": "string", "required": true},\n    {"name": "email", "type": "email", "required": true},\n    {"name": "phone", "type": "string"},\n    {"name": "resume", "type": "file", "allowed_extensions": [".pdf", ".docx"], "required": true},\n    {"name": "cover_letter", "type": "file", "allowed_extensions": [".pdf", ".docx"]},\n    {"name": "linkedin_url", "type": "url"},\n    {"name": "portfolio_url", "type": "url"},\n    {"name": "available_start_date", "type": "date"},\n    {"name": "highest_education", "type": "dropdown", "options": ["High School", "Bachelors", "Masters", "PhD"]},\n    {"name": "years_of_experience", "type": "number"}\n  ]\n}'
  };
  isSavingApiConn = false;
  showApiKeyModal = false;
  generatedApiKey = '';
  showDeleteConfirmModal = false;
  apiConnToDelete: string | null = null;
  
  showRegenerateConfirmModal = false;
  apiConnToRegenerate: string | null = null;
  isRegeneratingApiKey = false;
  expandedEndpoints: { [key: string]: boolean } = {};

  // Playground state
  showPlaygroundModal = false;
  playgroundConn: any = null;
  playgroundEndpoint = '';
  playgroundMethod = 'POST';
  playgroundApiKey = '';
  playgroundBody = '';
  playgroundResponse: any = null;
  playgroundLoading = false;
  playgroundViewMode: 'json' | 'form' = 'json';
  playgroundFormFields: { key: string; value: any; type: string; options?: string[]; required?: boolean }[] = [];
  playgroundFiles: { field_name: string; file_name: string; base64_content: string }[] = [];
  lastTestRecordId: string | null = null;
  lastTestJobpostId: string | null = null;
  savingAndTesting = false;
  playgroundApiKeyError = false;

  // Schema Validator & Editor State
  apiConnSchemaValidationError: string | null = null;
  showSchemaEditorModal = false;
  schemaEditorConn: any = null;
  schemaEditorJson = '';
  schemaEditorValidationError: string | null = null;
  isSavingSchemaEditor = false;
  copiedSchemaKeys: { [key: string]: boolean } = {};

  constructor(
    private orgService: OrgService,
    private alertService: AlertService,
    private authService: AuthService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['tab']) {
        const allowedTabs = ['team', 'profile', 'email', 'monitoring', 'api_connections'];
        if (allowedTabs.includes(params['tab'])) {
          this.activeTab = params['tab'] as any;
        }
      }
    });
    try { const u = localStorage.getItem('USER'); if(u) this.userData = JSON.parse(u); } catch {}
    this.currentOrg = this.orgService.getCurrentOrgValue();
    this.orgService.currentOrg$.subscribe(org => {
      this.currentOrg = org;
      if (org) {
        this.loadOrgData();
      }
    });

    if (this.currentOrg) {
      this.loadOrgData();
    }
  }

  toggleSidebar(): void { this.sidebarOpen = !this.sidebarOpen; }
  logOut(): void { this.authService.logOut(); }
  getInitials(name:string): string { return (name||'').split(' ').map((n:string)=>n[0]).join('').toUpperCase().slice(0,2); }

  get isAdminOrOwner(): boolean {
    const role = this.currentOrg?.role?.toLowerCase() || '';
    return role === 'owner' || role === 'admin';
  }

  loadOrgData(): void {
    if (!this.currentOrg?.id) return;
    this.loading = true;

    // Load Email Settings
    this.orgService.getEmailSettings(this.currentOrg.id).subscribe({
      next: (res) => {
        if (res.email_settings) {
          this.emailSettings = {
            ...res.email_settings,
            smtp_pass: res.email_settings.smtp_pass_masked || '',
            api_key: res.email_settings.api_key_masked || ''
          };
        }
      },
      error: (err) => console.error('Failed to load email settings:', err)
    });

    // Load Members
    this.orgService.getMembers(this.currentOrg.id).subscribe({
      next: (res) => {
        this.members = res.members || [];
      },
      error: (err) => console.error('Failed to load members:', err)
    });

    // Load Invitations
    this.orgService.getInvitations(this.currentOrg.id).subscribe({
      next: (res) => {
        this.invitations = res.invitations || [];
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load invitations:', err);
        this.loading = false;
      }
    });

    // Load API Connections
    this.loadApiConnections();

    // Load System Failure Logs
    this.loadSystemFailures();
  }

  loadApiConnections(): void {
    if (!this.currentOrg?.id) return;
    this.orgService.getApiConnections(this.currentOrg.id).subscribe({
      next: (res) => {
        this.apiConnections = res.api_connections || [];
        if (this.apiConnections.length > 0 && !this.apiConnections.find((c: any) => c.id === this.selectedApiConnId)) {
          this.selectedApiConnId = this.apiConnections[0].id;
        }
      },
      error: (err) => console.error('Failed to load API connections:', err)
    });
  }

  // --- Email Server Settings Handlers ---
  saveEmailSettings(): void {
    if (!this.currentOrg?.id) return;
    if (!this.isAdminOrOwner) {
      this.alertService.showDanger('Only Organization Owners or Admins can modify server settings.');
      return;
    }

    if (!this.emailSettings.from_email.trim()) {
      this.alertService.showDanger('From Email is required.');
      return;
    }

    this.isSavingEmail = true;
    this.orgService.updateEmailSettings(this.currentOrg.id, this.emailSettings).subscribe({
      next: (res) => {
        this.isSavingEmail = false;
        this.alertService.showSuccess('Email server settings updated successfully!');
      },
      error: (err) => {
        this.isSavingEmail = false;
        this.alertService.showDanger(err?.error?.detail || 'Failed to update email settings.');
      }
    });
  }

  openTestEmailModal(): void {
    let userStr = localStorage.getItem('USER');
    try {
      if (userStr) this.testTargetEmail = JSON.parse(userStr)?.email || '';
    } catch (e) {}
    this.showTestEmailModal = true;
  }

  sendTestEmail(): void {
    if (!this.currentOrg?.id || !this.testTargetEmail.trim()) {
      this.alertService.showDanger('Please provide a recipient email address.');
      return;
    }

    this.isSendingTest = true;
    this.orgService.testEmailSettings(this.currentOrg.id, this.testTargetEmail.trim(), this.emailSettings).subscribe({
      next: (res) => {
        this.isSendingTest = false;
        this.showTestEmailModal = false;
        this.alertService.showSuccess(res?.message || 'Test email dispatched successfully!');
      },
      error: (err) => {
        this.isSendingTest = false;
        this.alertService.showDanger(err?.error?.detail || 'Failed to send test email.');
      }
    });
  }

  // --- Member & Invite Handlers ---
  changeRole(member: OrgMember, newRole: string): void {
    if (!this.currentOrg?.id) return;
    if (!this.isAdminOrOwner) {
      this.alertService.showDanger('Only Admins or Owners can update member roles.');
      return;
    }

    this.orgService.updateMemberRole(this.currentOrg.id, member.id, newRole).subscribe({
      next: () => {
        member.role = newRole;
        this.alertService.showSuccess(`Updated role for ${member.user_email} to ${newRole}`);
      },
      error: (err) => this.alertService.showDanger(err?.error?.detail || 'Failed to update role.')
    });
  }

  removeMember(member: OrgMember): void {
    if (!this.currentOrg?.id) return;
    if (!confirm(`Are you sure you want to remove ${member.user_email} from this organization?`)) return;

    this.orgService.removeMember(this.currentOrg.id, member.id).subscribe({
      next: () => {
        this.members = this.members.filter(m => m.id !== member.id);
        this.alertService.showSuccess(`Member ${member.user_email} removed.`);
      },
      error: (err) => this.alertService.showDanger(err?.error?.detail || 'Failed to remove member.')
    });
  }

  openInviteModal(): void {
    this.inviteEmail = '';
    this.inviteRole = 'Recruiter';
    this.showInviteModal = true;
  }

  resendingInviteId: string | null = null;

  sendInvite(): void {
    if (!this.currentOrg?.id || !this.inviteEmail.trim()) {
      this.alertService.showDanger('Please provide an email address to invite.');
      return;
    }

    this.isSendingInvite = true;
    this.orgService.inviteMember(this.currentOrg.id, this.inviteEmail.trim(), this.inviteRole).subscribe({
      next: (res) => {
        this.isSendingInvite = false;
        this.showInviteModal = false;
        if (res.email_sent === false) {
          this.alertService.showWarning(res.message || `Invitation created, but email could not be sent. You can copy the invite link from the table.`);
        } else {
          this.alertService.showSuccess(res?.message || `Invitation dispatched to ${this.inviteEmail}`);
        }
        if (res.invitation) {
          this.invitations.unshift(res.invitation);
        }
      },
      error: (err) => {
        this.isSendingInvite = false;
        this.alertService.showDanger(err?.error?.detail || 'Failed to send invitation.');
      }
    });
  }

  resendInvitation(invite: OrgInvitation): void {
    if (!this.currentOrg?.id) return;
    this.resendingInviteId = invite.id;
    this.orgService.resendInvitation(this.currentOrg.id, invite.id).subscribe({
      next: (res) => {
        this.resendingInviteId = null;
        if (res.email_sent === false) {
          this.alertService.showWarning(res.message || 'Invitation email could not be sent. You can copy the invite link directly.');
        } else {
          this.alertService.showSuccess(res.message || `Invitation re-sent to ${invite.invitee_email}`);
        }
      },
      error: (err) => {
        this.resendingInviteId = null;
        this.alertService.showDanger(err?.error?.detail || 'Failed to resend invitation.');
      }
    });
  }

  copyInviteLink(invite: OrgInvitation): void {
    const origin = window.location.origin;
    const inviteLink = `${origin}/accept-invitation?token=${invite.token}`;
    navigator.clipboard.writeText(inviteLink).then(() => {
      this.alertService.showSuccess(`Invitation link for ${invite.invitee_email} copied to clipboard!`);
    }).catch(() => {
      this.alertService.showDanger('Failed to copy link to clipboard.');
    });
  }

  revokeInvitation(invite: OrgInvitation): void {
    if (!this.currentOrg?.id) return;
    this.orgService.revokeInvitation(this.currentOrg.id, invite.id).subscribe({
      next: () => {
        this.invitations = this.invitations.filter(i => i.id !== invite.id);
        this.alertService.showSuccess('Invitation revoked.');
      },
      error: (err) => this.alertService.showDanger(err?.error?.detail || 'Failed to revoke invitation.')
    });
  }

  // --- API Connections Handlers ---
  validateSchemaJson(jsonStr: string): { valid: boolean; error: string | null; schemaObj?: any } {
    if (!jsonStr || !jsonStr.trim()) {
      return { valid: false, error: 'Schema JSON cannot be empty.' };
    }
    let parsed: any;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (err: any) {
      return { valid: false, error: `JSON Syntax Error: ${err.message}` };
    }

    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return { valid: false, error: 'Schema root must be a JSON object (e.g. { "fields": [...] }).' };
    }

    if (!parsed.fields || !Array.isArray(parsed.fields)) {
      return { valid: false, error: 'Schema object must contain a top-level "fields" array.' };
    }

    const validTypes = ['string', 'number', 'date', 'email', 'url', 'dropdown', 'file', 'boolean', 'text'];
    for (let i = 0; i < parsed.fields.length; i++) {
      const f = parsed.fields[i];
      if (typeof f !== 'object' || f === null) {
        return { valid: false, error: `Field at index ${i} must be a JSON object.` };
      }
      if (!f.name || typeof f.name !== 'string' || !f.name.trim()) {
        return { valid: false, error: `Field at index ${i} is missing a non-empty "name" property.` };
      }
      if (!f.type || typeof f.type !== 'string' || !validTypes.includes(f.type.toLowerCase())) {
        return { valid: false, error: `Field '${f.name}' has invalid type '${f.type}'. Allowed types: ${validTypes.join(', ')}` };
      }
      if (f.type.toLowerCase() === 'dropdown') {
        if (!f.options || !Array.isArray(f.options) || f.options.length === 0) {
          return { valid: false, error: `Dropdown field '${f.name}' must specify a non-empty 'options' array.` };
        }
      }
    }

    return { valid: true, error: null, schemaObj: parsed };
  }

  formatSchemaDisplay(schema: any): string {
    if (!schema) return '{\n  "fields": []\n}';
    if (typeof schema === 'string') {
      try {
        return JSON.stringify(JSON.parse(schema), null, 2);
      } catch {
        return schema;
      }
    }
    return JSON.stringify(schema, null, 2);
  }

  copySchema(schema: any, key: string = 'default'): void {
    const jsonStr = this.formatSchemaDisplay(schema);
    navigator.clipboard.writeText(jsonStr).then(() => {
      this.alertService.showSuccess('Schema JSON copied to clipboard!');
      this.copiedSchemaKeys[key] = true;
      setTimeout(() => {
        this.copiedSchemaKeys[key] = false;
      }, 2000);
    }).catch(() => {
      this.alertService.showDanger('Failed to copy schema JSON.');
    });
  }

  getSchemaExampleInput(schemaDef: any): string {
    let schema: any = null;
    try {
      schema = typeof schemaDef === 'string' ? JSON.parse(schemaDef) : schemaDef;
    } catch (e) {
      schema = null;
    }

    const formDataExample: any = {};
    const filesExample: any[] = [];

    if (schema && Array.isArray(schema.fields)) {
      schema.fields.forEach((f: any) => {
        if (!f.name) return;
        if (f.type === 'file') {
          const ext = (f.allowed_extensions && f.allowed_extensions[0]) || '.pdf';
          filesExample.push({
            file_name: `${f.name}${ext}`,
            field_name: f.name,
            base64_content: "..."
          });
        } else {
          switch (f.type) {
            case 'number':
              formDataExample[f.name] = 0;
              break;
            case 'date':
              formDataExample[f.name] = 'YYYY-MM-DD';
              break;
            case 'email':
              formDataExample[f.name] = 'user@example.com';
              break;
            case 'url':
              formDataExample[f.name] = 'https://example.com';
              break;
            case 'dropdown':
              formDataExample[f.name] = (f.options && f.options[0]) || 'string';
              break;
            case 'boolean':
              formDataExample[f.name] = true;
              break;
            default:
              formDataExample[f.name] = 'string';
              break;
          }
        }
      });
    }

    const payload: any = {
      jobpost_id: "optional_jobpost_uuid_to_reuse_connection",
      form_data: formDataExample
    };
    if (filesExample.length > 0) {
      payload.uploaded_files = filesExample;
    }

    return JSON.stringify(payload, null, 2);
  }

  getSchemaExampleOutput(schemaDef: any): string {
    let schema: any = null;
    try {
      schema = typeof schemaDef === 'string' ? JSON.parse(schemaDef) : schemaDef;
    } catch (e) {
      schema = null;
    }

    const formDataExample: any = {};
    const filesExample: any[] = [];

    if (schema && Array.isArray(schema.fields)) {
      schema.fields.forEach((f: any) => {
        if (!f.name) return;
        if (f.type === 'file') {
          filesExample.push({
            file_name: `${f.name}.pdf`,
            url: `https://storage.provider.com/files/${f.name}.pdf`
          });
        } else {
          switch (f.type) {
            case 'number':
              formDataExample[f.name] = 0;
              break;
            case 'date':
              formDataExample[f.name] = 'YYYY-MM-DD';
              break;
            case 'email':
              formDataExample[f.name] = 'user@example.com';
              break;
            case 'url':
              formDataExample[f.name] = 'https://example.com';
              break;
            case 'dropdown':
              formDataExample[f.name] = (f.options && f.options[0]) || 'string';
              break;
            case 'boolean':
              formDataExample[f.name] = true;
              break;
            default:
              formDataExample[f.name] = 'string';
              break;
          }
        }
      });
    }

    const output = {
      message: 'Record submitted successfully',
      record_id: 'uuid',
      record: {
        id: 'uuid',
        jobpost_id: 'optional_jobpost_uuid',
        form_data: formDataExample,
        resume_data: {
          summary: 'string',
          skills: ['string'],
          experience: [
            {
              title: 'string',
              company: 'string',
              start_date: 'YYYY-MM',
              end_date: 'YYYY-MM',
              description: 'string'
            }
          ],
          education: [
            {
              degree: 'string',
              institution: 'string',
              graduation_year: 'YYYY'
            }
          ]
        },
        files: filesExample,
        created_at: new Date().toISOString()
      }
    };

    return JSON.stringify(output, null, 2);
  }

  syncSchemaAcrossViews(connId: string, newSchemaObj: any, newName?: string, newDescription?: string): void {
    // Update in apiConnections array
    const target = this.apiConnections.find(c => c.id === connId);
    if (target) {
      target.schema_definition = newSchemaObj;
      if (newName !== undefined) target.name = newName;
      if (newDescription !== undefined) target.description = newDescription;
    }

    // Update in main edit modal if editing this connection
    if (this.editingApiConnId === connId) {
      this.apiConnForm.schema_definition = JSON.stringify(newSchemaObj, null, 2);
      this.onApiConnSchemaChange();
    }

    // Update in playground modal if open for this connection
    if (this.playgroundConn && this.playgroundConn.id === connId) {
      this.playgroundConn.schema_definition = newSchemaObj;
      if (newName !== undefined) this.playgroundConn.name = newName;
      if (newDescription !== undefined) this.playgroundConn.description = newDescription;

      if (newSchemaObj && Array.isArray(newSchemaObj.fields)) {
        this.playgroundFormFields = newSchemaObj.fields
          .filter((f: any) => f.type !== 'file')
          .map((f: any) => ({
            key: f.name,
            value: '',
            type: f.type || 'string',
            options: f.options || [],
            required: f.required || false
          }));

        this.playgroundFiles = newSchemaObj.fields
          .filter((f: any) => f.type === 'file')
          .map((f: any) => ({
            field_name: f.name,
            file_name: `${f.name}_example.pdf`,
            base64_content: 'JVBERi0xLjQKJcOkw7zDtsOfCjIgMCBvYmoKPDwvTGVuZ3RoIDMgMCBSL0ZpbHRlci9GbGF0ZURlY29kZT4+CnN0cmVhbQp4nDPU0N'
          }));

        const generatedFormData: any = {};
        this.playgroundFormFields.forEach(f => {
          generatedFormData[f.key] = f.value;
        });
        const autoBody = {
          jobpost_id: 'jobpost_123',
          form_data: generatedFormData,
          uploaded_files: this.playgroundFiles
        };
        this.playgroundBody = JSON.stringify(autoBody, null, 2);
      }
    }
  }

  onApiConnSchemaChange(): void {
    const res = this.validateSchemaJson(this.apiConnForm.schema_definition);
    this.apiConnSchemaValidationError = res.error;
  }

  openSchemaEditorModal(conn?: any): void {
    const targetConn = conn || this.playgroundConn;
    if (!targetConn) return;

    this.schemaEditorConn = targetConn;
    this.schemaEditorJson = this.formatSchemaDisplay(targetConn.schema_definition);
    this.onSchemaEditorJsonChange();
    this.showSchemaEditorModal = true;
  }

  onSchemaEditorJsonChange(): void {
    const res = this.validateSchemaJson(this.schemaEditorJson);
    this.schemaEditorValidationError = res.error;
  }

  saveSchemaEditor(): void {
    if (!this.currentOrg?.id || !this.schemaEditorConn) return;
    const res = this.validateSchemaJson(this.schemaEditorJson);
    if (!res.valid || !res.schemaObj) {
      this.alertService.showDanger(res.error || 'Invalid JSON schema.');
      return;
    }

    this.isSavingSchemaEditor = true;
    this.orgService.updateApiConnection(
      this.currentOrg.id,
      this.schemaEditorConn.id,
      this.schemaEditorConn.name,
      this.schemaEditorConn.description,
      res.schemaObj
    ).subscribe({
      next: () => {
        this.isSavingSchemaEditor = false;
        this.showSchemaEditorModal = false;
        this.syncSchemaAcrossViews(this.schemaEditorConn.id, res.schemaObj);
        this.alertService.showSuccess('Schema updated successfully across all views.');
      },
      error: (err) => {
        this.isSavingSchemaEditor = false;
        this.alertService.showDanger(err?.error?.detail || 'Failed to update schema.');
      }
    });
  }

  openApiConnModal(conn?: any): void {
    this.isEditingApiConn = !!conn;
    if (conn) {
      this.editingApiConnId = conn.id;
      this.apiConnForm = {
        name: conn.name,
        description: conn.description || '',
        schema_definition: this.formatSchemaDisplay(conn.schema_definition)
      };
    } else {
      this.editingApiConnId = '';
      this.apiConnForm = {
        name: '',
        description: '',
        schema_definition: '{\n  "fields": [\n    {"name": "first_name", "type": "string", "required": true},\n    {"name": "last_name", "type": "string", "required": true},\n    {"name": "email", "type": "email", "required": true},\n    {"name": "phone", "type": "string"},\n    {"name": "resume", "type": "file", "allowed_extensions": [".pdf", ".docx"], "required": true},\n    {"name": "cover_letter", "type": "file", "allowed_extensions": [".pdf", ".docx"]},\n    {"name": "linkedin_url", "type": "url"},\n    {"name": "portfolio_url", "type": "url"},\n    {"name": "available_start_date", "type": "date"},\n    {"name": "highest_education", "type": "dropdown", "options": ["High School", "Bachelors", "Masters", "PhD"]},\n    {"name": "years_of_experience", "type": "number"}\n  ]\n}'
      };
    }
    this.onApiConnSchemaChange();
    this.showApiConnModal = true;
  }

  saveApiConnection(): void {
    if (!this.currentOrg?.id) return;
    if (!this.apiConnForm.name.trim()) {
      this.alertService.showDanger('Connection name is required.');
      return;
    }

    const valRes = this.validateSchemaJson(this.apiConnForm.schema_definition);
    if (!valRes.valid || !valRes.schemaObj) {
      this.alertService.showDanger(valRes.error || 'Invalid JSON schema definition.');
      return;
    }

    this.isSavingApiConn = true;
    if (this.isEditingApiConn) {
      this.orgService.updateApiConnection(
        this.currentOrg.id,
        this.editingApiConnId,
        this.apiConnForm.name,
        this.apiConnForm.description,
        valRes.schemaObj
      ).subscribe({
        next: (res: any) => {
          this.isSavingApiConn = false;
          this.showApiConnModal = false;
          this.syncSchemaAcrossViews(this.editingApiConnId, valRes.schemaObj, this.apiConnForm.name, this.apiConnForm.description);
          if (res?.api_connection) {
            const target = this.apiConnections.find(c => c.id === this.editingApiConnId);
            if (target) {
              Object.assign(target, res.api_connection);
            }
          }
          this.alertService.showSuccess('API Connection updated successfully.');
        },
        error: (err) => {
          this.isSavingApiConn = false;
          this.alertService.showDanger(err?.error?.detail || 'Failed to update API connection.');
        }
      });
    } else {
      this.orgService.createApiConnection(
        this.currentOrg.id,
        this.apiConnForm.name,
        this.apiConnForm.description,
        valRes.schemaObj
      ).subscribe({
        next: (res: any) => {
          this.isSavingApiConn = false;
          this.showApiConnModal = false;
          this.alertService.showSuccess('API Connection created successfully.');
          if (res?.api_connection) {
            this.apiConnections.push(res.api_connection);
            this.selectedApiConnId = res.api_connection.id;
          } else {
            this.loadApiConnections();
          }
          if (res?.api_connection?.api_key) {
            this.generatedApiKey = res.api_connection.api_key;
            this.showApiKeyModal = true;
          }
        },
        error: (err) => {
          this.isSavingApiConn = false;
          this.alertService.showDanger(err?.error?.detail || 'Failed to create API connection.');
        }
      });
    }
  }

  confirmDeleteApiConnection(connId: string): void {
    if (!this.currentOrg?.id) return;
    this.apiConnToDelete = connId;
    this.showDeleteConfirmModal = true;
  }

  executeDeleteApiConnection(): void {
    if (!this.currentOrg?.id || !this.apiConnToDelete) return;
    
    this.orgService.deleteApiConnection(this.currentOrg.id, this.apiConnToDelete).subscribe({
      next: () => {
        this.alertService.showSuccess('API connection deleted successfully.');
        this.showDeleteConfirmModal = false;
        this.apiConnToDelete = null;
        this.loadApiConnections();
      },
      error: (err) => {
        this.alertService.showDanger(err?.error?.detail || 'Failed to delete API connection.');
        this.showDeleteConfirmModal = false;
        this.apiConnToDelete = null;
      }
    });
  }

  confirmRegenerateApiKey(connId: string): void {
    if (!this.currentOrg?.id) return;
    this.apiConnToRegenerate = connId;
    this.showRegenerateConfirmModal = true;
  }

  executeRegenerateApiKey(): void {
    if (!this.currentOrg?.id || !this.apiConnToRegenerate) return;
    
    this.isRegeneratingApiKey = true;
    this.orgService.regenerateApiKey(this.currentOrg.id, this.apiConnToRegenerate).subscribe({
      next: (res) => {
        this.isRegeneratingApiKey = false;
        this.showRegenerateConfirmModal = false;
        this.apiConnToRegenerate = null;
        this.generatedApiKey = res.api_key;
        this.showApiKeyModal = true;
        this.alertService.showSuccess('API key regenerated successfully.');
      },
      error: (err) => {
        this.isRegeneratingApiKey = false;
        this.showRegenerateConfirmModal = false;
        this.apiConnToRegenerate = null;
        this.alertService.showDanger(err?.error?.detail || 'Failed to regenerate API key.');
      }
    });
  }

  copiedApiKey: boolean = false;
  copiedEndpointKeys: { [key: string]: boolean } = {};

  copyApiKey(): void {
    navigator.clipboard.writeText(this.generatedApiKey).then(() => {
      this.alertService.showSuccess('API Key copied to clipboard!');
      this.copiedApiKey = true;
      setTimeout(() => {
        this.copiedApiKey = false;
      }, 2000);
    });
  }

  copyApiEndpoint(endpoint: string, key?: string): void {
    const baseUrl = environment.apiUrl.replace(/\/api$/, '');
    const fullEndpoint = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;
    navigator.clipboard.writeText(fullEndpoint).then(() => {
      this.alertService.showSuccess('API Endpoint URL copied to clipboard!');
      if (key) {
        this.copiedEndpointKeys[key] = true;
        setTimeout(() => {
          this.copiedEndpointKeys[key] = false;
        }, 2000);
      }
    });
  }

  toggleEndpoint(key: string): void {
    this.expandedEndpoints[key] = !this.expandedEndpoints[key];
  }

  openPlayground(conn: any, endpointPath: string, method: string, defaultBody: any = null): void {
    this.playgroundConn = conn;
    const baseUrl = environment.apiUrl.replace(/\/api$/, '');
    this.playgroundEndpoint = `${baseUrl}/api/connections/${conn.id}${endpointPath}`;
    this.playgroundMethod = method;
    this.playgroundResponse = null;
    this.playgroundViewMode = 'json';
    this.lastTestRecordId = null;
    this.lastTestJobpostId = null;
    this.playgroundApiKeyError = false;
    
    // Build initial form fields from schema
    this.playgroundFormFields = [];
    this.playgroundFiles = [];
    let schema: any = null;
    try {
      schema = typeof conn.schema_definition === 'string' 
        ? JSON.parse(conn.schema_definition) 
        : conn.schema_definition;
        
      if (schema && schema.fields && Array.isArray(schema.fields)) {
        this.playgroundFormFields = schema.fields
          .filter((f: any) => f.type !== 'file') // Files handled differently
          .map((f: any) => ({
            key: f.name,
            value: '',
            type: f.type || 'string',
            options: f.options || [],
            required: f.required || false
          }));

        this.playgroundFiles = schema.fields
          .filter((f: any) => f.type === 'file')
          .map((f: any) => ({
            field_name: f.name,
            file_name: `${f.name}_example.pdf`,
            base64_content: 'JVBERi0xLjQKJcOkw7zDtsOfCjIgMCBvYmoKPDwvTGVuZ3RoIDMgMCBSL0ZpbHRlci9GbGF0ZURlY29kZT4+CnN0cmVhbQp4nDPU0N' // Dummy minimal base64
          }));
      }
    } catch(e) {
      console.error('Failed to parse connection schema for playground', e);
    }

    // Set the body and sync form fields depending on endpoint
    if (endpointPath.endsWith('/records') && method === 'POST') {
      if (this.playgroundFormFields.length === 0 && defaultBody?.form_data) {
        this.playgroundFormFields = Object.keys(defaultBody.form_data).map(k => ({ 
          key: k, 
          value: defaultBody.form_data[k],
          type: 'string'
        }));
      }
      // Auto-generate the full JSON body from the schema fields so they match exactly
      const generatedFormData: any = {};
      this.playgroundFormFields.forEach(f => {
        generatedFormData[f.key] = f.value;
      });
      const autoBody = {
        jobpost_id: 'jobpost_123',
        form_data: generatedFormData,
        uploaded_files: this.playgroundFiles
      };
      this.playgroundBody = JSON.stringify(autoBody, null, 2);
    } else {
      this.playgroundViewMode = 'json';
      this.playgroundBody = defaultBody ? JSON.stringify(defaultBody, null, 2) : '';
      if (defaultBody && defaultBody.form_data) {
        this.playgroundFormFields = Object.keys(defaultBody.form_data).map(k => ({ 
          key: k, 
          value: defaultBody.form_data[k],
          type: 'string'
        }));
      } else {
        this.playgroundFormFields = [];
      }
    }

    this.showPlaygroundModal = true;
  }

  onPlaygroundMethodChange(): void {
    if (this.playgroundMethod === 'PUT' && this.playgroundEndpoint?.includes('/records/')) {
      if (!this.playgroundBody) {
        // Build auto schema for PUT
        const generatedFormData: any = {};
        this.playgroundFormFields.forEach(f => {
          generatedFormData[f.key] = f.value;
        });
        const autoBody = {
          jobpost_id: 'jobpost_123',
          form_data: generatedFormData,
          uploaded_files: this.playgroundFiles
        };
        this.playgroundBody = JSON.stringify(autoBody, null, 2);
      }
    } else if (this.playgroundMethod === 'GET' || this.playgroundMethod === 'DELETE') {
      this.playgroundViewMode = 'json';
    }
  }

  setPlaygroundMode(mode: 'json' | 'form'): void {
    if (mode === 'form') {
      this.syncPlaygroundJsonToForm();
    } else if (mode === 'json') {
      this.syncPlaygroundFormToJson();
    }
    this.playgroundViewMode = mode;
  }

  syncPlaygroundJsonToForm(): void {
    if (!this.playgroundBody) return;
    try {
      const currentJson = JSON.parse(this.playgroundBody);
      if (currentJson && currentJson.form_data) {
        const jsonKeys = Object.keys(currentJson.form_data);
        
        // Find existing schema attributes from playgroundConn
        let existingFields: any[] = [];
        try {
          const orig = typeof this.playgroundConn?.schema_definition === 'string'
            ? JSON.parse(this.playgroundConn.schema_definition)
            : this.playgroundConn?.schema_definition;
          if (orig && Array.isArray(orig.fields)) {
            existingFields = orig.fields;
          }
        } catch {}

        jsonKeys.forEach(k => {
          const exists = this.playgroundFormFields.find(f => f.key === k);
          const fObj = existingFields.find((ef: any) => ef.name === k);
          if (!exists) {
            this.playgroundFormFields.push({
              key: k,
              value: currentJson.form_data[k],
              type: fObj?.type || 'string',
              options: fObj?.options || (fObj?.type === 'dropdown' ? [] : undefined),
              required: fObj?.required || false
            });
          } else {
            exists.value = currentJson.form_data[k];
            if (fObj) {
              if (fObj.type) exists.type = fObj.type;
              if (fObj.options) exists.options = fObj.options;
              if (fObj.required !== undefined) exists.required = fObj.required;
            }
          }
        });
      }
      
      if (currentJson && currentJson.uploaded_files && Array.isArray(currentJson.uploaded_files)) {
        this.playgroundFiles = currentJson.uploaded_files;
      }
    } catch(e) {
      // Ignore parse errors, keep current form fields
    }
  }

  syncPlaygroundFormToJson(): void {
    try {
      const currentJson = this.playgroundBody ? JSON.parse(this.playgroundBody) : {};
      if (!currentJson.form_data) currentJson.form_data = {};
      
      currentJson.form_data = {};
      
      this.playgroundFormFields.forEach(f => {
        if (f.key.trim() && f.value !== '' && f.value !== null && f.value !== undefined) {
           currentJson.form_data[f.key.trim()] = f.type === 'number' ? Number(f.value) : f.value;
        }
      });
      
      currentJson.uploaded_files = this.playgroundFiles;
      
      this.playgroundBody = JSON.stringify(currentJson, null, 2);
    } catch(e) {
      // Ignore if body is not valid JSON
    }
  }

  addPlaygroundFormField(): void {
    this.playgroundFormFields.push({ key: 'new_field', value: '', type: 'string' });
  }

  removePlaygroundFormField(index: number): void {
    this.playgroundFormFields.splice(index, 1);
    this.syncPlaygroundFormToJson();
  }

  addPlaygroundFileField(): void {
    this.playgroundFiles.push({ field_name: 'new_file', file_name: 'example.pdf', base64_content: '' });
    this.syncPlaygroundFormToJson();
  }

  removePlaygroundFileField(index: number): void {
    this.playgroundFiles.splice(index, 1);
    this.syncPlaygroundFormToJson();
  }

  onPlaygroundFileChange(event: any, index: number): void {
    const file = event.target.files[0];
    if (file) {
      this.playgroundFiles[index].file_name = file.name;
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const result = e.target.result;
        this.playgroundFiles[index].base64_content = result.split(',')[1];
        this.syncPlaygroundFormToJson();
      };
      reader.readAsDataURL(file);
    }
  }

  private async savePlaygroundSchemaInternal(): Promise<boolean> {
    if (!this.playgroundConn || !this.currentOrg?.id) return false;

    // Sync JSON body to form fields if in JSON mode
    if (this.playgroundViewMode === 'json') {
      this.syncPlaygroundJsonToForm();
    }

    // Preserve existing field metadata from playgroundConn.schema_definition
    let existingFields: any[] = [];
    try {
      const origSchema = typeof this.playgroundConn.schema_definition === 'string'
        ? JSON.parse(this.playgroundConn.schema_definition)
        : this.playgroundConn.schema_definition;
      if (origSchema && Array.isArray(origSchema.fields)) {
        existingFields = origSchema.fields;
      }
    } catch (e) {
      existingFields = [];
    }

    const newSchemaFields: any[] = [];

    // Map non-file form fields
    this.playgroundFormFields.forEach(f => {
      const name = (f.key || '').trim();
      if (!name) return;

      const existing = existingFields.find((ef: any) => ef.name === name);
      if (existing) {
        newSchemaFields.push({
          ...existing,
          name: name,
          type: f.type || existing.type || 'string',
          required: f.required !== undefined ? f.required : (existing.required || false),
          options: (f.type === 'dropdown' || existing.type === 'dropdown') ? (f.options || existing.options) : undefined
        });
      } else {
        newSchemaFields.push({
          name: name,
          type: f.type || 'string',
          required: f.required || false,
          options: f.type === 'dropdown' ? f.options : undefined
        });
      }
    });

    // Map file fields
    this.playgroundFiles.forEach(f => {
      const name = (f.field_name || '').trim();
      if (!name) return;

      const existing = existingFields.find((ef: any) => ef.name === name);
      if (existing) {
        newSchemaFields.push({
          ...existing,
          name: name,
          type: 'file'
        });
      } else {
        newSchemaFields.push({
          name: name,
          type: 'file',
          allowed_extensions: ['.pdf', '.docx']
        });
      }
    });

    const newSchema = { fields: newSchemaFields };
    
    return new Promise<boolean>((resolve) => {
      this.orgService.updateApiConnection(
        this.currentOrg!.id,
        this.playgroundConn.id,
        this.playgroundConn.name,
        this.playgroundConn.description,
        newSchema
      ).subscribe({
        next: () => {
          this.syncSchemaAcrossViews(this.playgroundConn.id, newSchema);
          resolve(true);
        },
        error: (err) => {
          console.error('Failed to save schema from playground:', err);
          resolve(false);
        }
      });
    });
  }

  async savePlaygroundSchemaOnly(): Promise<void> {
    if (!this.currentOrg?.id) {
      this.alertService.showDanger('Organization data not loaded.');
      return;
    }
    
    this.playgroundLoading = true;
    try {
      const success = await this.savePlaygroundSchemaInternal();
      if (success) {
        this.alertService.showSuccess('Schema saved successfully.');
      } else {
        this.alertService.showDanger('Failed to save schema.');
      }
    } finally {
      this.playgroundLoading = false;
    }
  }

  async runPlaygroundRequest(): Promise<void> {
    if (!this.playgroundApiKey) {
      this.playgroundApiKeyError = true;
      this.alertService.showDanger('Please provide your API key to test the connection.');
      setTimeout(() => {
        const el = document.getElementById('playgroundApiKeyInput');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.focus();
        }
      }, 50);
      return;
    }
    this.playgroundApiKeyError = false;
    
    if (!this.currentOrg?.id) {
      this.alertService.showDanger('Organization data not loaded.');
      return;
    }

    this.playgroundLoading = true;
    this.savingAndTesting = true;
    this.playgroundResponse = null;

    try {
      // 1. Save Schema Changes (if POST/PUT and not semantic search)
      if (['POST', 'PUT'].includes(this.playgroundMethod) && this.playgroundEndpoint.includes('/records')) {
        await this.savePlaygroundSchemaInternal();
      }

      // 2. Delete Last Test Record if testing again
      if (this.lastTestRecordId && this.playgroundMethod === 'POST' && this.playgroundEndpoint.includes('/records')) {
        try {
          const baseUrl = environment.apiUrl.replace(/\/api$/, '');
          await fetch(`${baseUrl}/api/connections/${this.playgroundConn.id}/records/${this.lastTestRecordId}`, {
            method: 'DELETE',
            headers: { 'X-API-Key': this.playgroundApiKey }
          });
        } catch (e) {
          // Ignore delete errors
        }
        this.lastTestRecordId = null;
      }

      // 2b. Delete last test job post if testing the vectorized job-post endpoint again
      const isJobpostCreate = this.playgroundMethod === 'POST'
        && this.playgroundEndpoint.endsWith('/jobposts');
      if (this.lastTestJobpostId && isJobpostCreate) {
        try {
          const baseUrl = environment.apiUrl.replace(/\/api$/, '');
          await fetch(`${baseUrl}/api/connections/${this.playgroundConn.id}/jobposts/${this.lastTestJobpostId}`, {
            method: 'DELETE',
            headers: { 'X-API-Key': this.playgroundApiKey }
          });
        } catch (e) {
          // Ignore delete errors
        }
        this.lastTestJobpostId = null;
      }

      // 3. Run Test Request
      const options: RequestInit = {
        method: this.playgroundMethod,
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.playgroundApiKey
        }
      };

      if (['POST', 'PUT', 'PATCH'].includes(this.playgroundMethod) && this.playgroundBody) {
        options.body = this.playgroundBody;
      }

      const res = await fetch(this.playgroundEndpoint, options);
      const data = await res.json().catch(() => null);
      
      this.playgroundResponse = {
        status: res.status,
        statusText: res.statusText,
        data: data || 'No JSON response'
      };

      if ((res.status === 200 || res.status === 201) && data?.record_id) {
        this.lastTestRecordId = data.record_id;
      }

      if ((res.status === 200 || res.status === 201) && data?.jobpost_id
        && this.playgroundMethod === 'POST' && this.playgroundEndpoint.endsWith('/jobposts')) {
        this.lastTestJobpostId = data.jobpost_id;
      }

    } catch (err: any) {
      this.playgroundResponse = {
        status: 0,
        statusText: 'Network Error',
        data: err.message
      };
    } finally {
      this.playgroundLoading = false;
      this.savingAndTesting = false;
    }
  }

  // --- Failure Monitoring & Logs ---
  loadSystemFailures(): void {
    this.loadingFailures = true;
    this.orgService.getSystemFailures().subscribe({
      next: (res) => {
        this.systemFailures = res.failures || [];
        this.loadingFailures = false;
      },
      error: (err) => {
        console.error('Failed to load system failures:', err);
        this.loadingFailures = false;
      }
    });
  }

  retryFailure(failureId: string): void {
    this.retryingFailureId = failureId;
    this.orgService.retrySystemFailure(failureId).subscribe({
      next: (res) => {
        this.retryingFailureId = null;
        this.alertService.showSuccess(res.message || 'Retry sequence triggered successfully.');
        this.loadSystemFailures();
      },
      error: (err) => {
        this.retryingFailureId = null;
        this.alertService.showDanger(err?.error?.detail || 'Failed to retry event.');
      }
    });
  }

  resolveFailure(failureId: string): void {
    this.resolvingFailureId = failureId;
    this.orgService.resolveSystemFailure(failureId).subscribe({
      next: () => {
        this.resolvingFailureId = null;
        this.systemFailures = this.systemFailures.filter(f => f.id !== failureId);
        this.alertService.showSuccess('Failure record resolved and removed.');
      },
      error: (err) => {
        this.resolvingFailureId = null;
        this.alertService.showDanger(err?.error?.detail || 'Failed to resolve failure record.');
      }
    });
  }

  downloadLogs(): void {
    this.isDownloadingLogs = true;
    this.orgService.downloadSystemLogs().subscribe({
      next: (blob: Blob) => {
        this.isDownloadingLogs = false;
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `system_application_${new Date().toISOString().slice(0, 10)}.log`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        this.alertService.showSuccess('System log file downloaded successfully.');
      },
      error: (err) => {
        this.isDownloadingLogs = false;
        this.alertService.showDanger('Failed to download system log file.');
      }
    });
  }
}
