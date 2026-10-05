import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../environment/environment';

export interface Organization {
  id: string;
  name: string;
  slug?: string;
  logo_url?: string;
  owner_email?: string;
  role?: string;
  joined_at?: string;
}

export interface EmailSettings {
  provider: 'smtp' | 'mailersend' | 'resend' | 'default';
  from_email: string;
  from_name: string;
  smtp_host?: string;
  smtp_port?: number;
  smtp_user?: string;
  smtp_pass?: string;
  smtp_pass_masked?: string;
  use_tls?: boolean;
  use_ssl?: boolean;
  api_key?: string;
  api_key_masked?: string;
  updated_at?: string;
}

export interface OrgMember {
  id: string;
  organization_id: string;
  user_id?: string;
  user_email: string;
  user_name?: string;
  role: 'Owner' | 'Admin' | 'Recruiter' | 'Interviewer' | 'Viewer' | string;
  status: string;
  joined_at?: string;
}

export interface OrgInvitation {
  id: string;
  organization_id: string;
  organization_name?: string;
  inviter_email: string;
  invitee_email: string;
  role: string;
  token: string;
  status: string;
  expires_at?: string;
  created_at?: string;
}

export interface ApiConnection {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  schema_definition: any;
  api_key?: string;
  created_at?: string;
  updated_at?: string;
}

@Injectable({
  providedIn: 'root'
})
export class OrgService {
  private apiUrl = `${environment.apiUrl || 'http://localhost:8000/api'}/orgs`;

  private myOrganizationsSubject = new BehaviorSubject<Organization[]>([]);
  public myOrganizations$ = this.myOrganizationsSubject.asObservable();

  private currentOrgSubject = new BehaviorSubject<Organization | null>(null);
  public currentOrg$ = this.currentOrgSubject.asObservable();

  constructor(private http: HttpClient) {
    this.initCurrentOrg();
  }

  private getToken(): string {
    return localStorage.getItem('access_token') || localStorage.getItem('token') || '';
  }

  private getAuthHeaders(): HttpHeaders {
    const token = this.getToken();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  private initCurrentOrg(): void {
    const saved = localStorage.getItem('current_organization');
    if (saved) {
      try {
        this.currentOrgSubject.next(JSON.parse(saved));
      } catch (e) {}
    }
  }

  setCurrentOrg(org: Organization): void {
    localStorage.setItem('current_organization', JSON.stringify(org));
    localStorage.setItem('ACTIVE_ORG', JSON.stringify(org));
    this.currentOrgSubject.next(org);
  }

  getCurrentOrgValue(): Organization | null {
    return this.currentOrgSubject.value;
  }

  loadMyOrganizations(): Observable<{ organizations: Organization[] }> {
    const token = this.getToken();
    return this.http.get<{ organizations: Organization[] }>(`${this.apiUrl}/my-orgs?token=${encodeURIComponent(token)}`, {
      headers: this.getAuthHeaders()
    }).pipe(
      tap(res => {
        const orgs = res.organizations || [];
        this.myOrganizationsSubject.next(orgs);
        
        // If current org is not set or not in list, pick first
        const current = this.currentOrgSubject.value;
        if (!current || !orgs.find(o => o.id === current.id)) {
          if (orgs.length > 0) {
            this.setCurrentOrg(orgs[0]);
          }
        }
      })
    );
  }

  createOrganization(name: string, logo_url?: string): Observable<any> {
    const token = this.getToken();
    return this.http.post<any>(`${this.apiUrl}/create?token=${encodeURIComponent(token)}`, { name, logo_url }, {
      headers: this.getAuthHeaders()
    }).pipe(
      tap(res => {
        if (res.organization) {
          const currentList = this.myOrganizationsSubject.value;
          const updated = [...currentList, res.organization];
          this.myOrganizationsSubject.next(updated);
          this.setCurrentOrg(res.organization);
        }
      })
    );
  }

  getOrganizationDetails(orgId: string): Observable<any> {
    const token = this.getToken();
    return this.http.get<any>(`${this.apiUrl}/${orgId}?token=${encodeURIComponent(token)}`, {
      headers: this.getAuthHeaders()
    });
  }

  getEmailSettings(orgId: string): Observable<{ email_settings: EmailSettings }> {
    const token = this.getToken();
    return this.http.get<{ email_settings: EmailSettings }>(`${this.apiUrl}/${orgId}/email-settings?token=${encodeURIComponent(token)}`, {
      headers: this.getAuthHeaders()
    });
  }

  updateEmailSettings(orgId: string, settings: EmailSettings): Observable<any> {
    const token = this.getToken();
    return this.http.put<any>(`${this.apiUrl}/${orgId}/email-settings?token=${encodeURIComponent(token)}`, settings, {
      headers: this.getAuthHeaders()
    });
  }

  testEmailSettings(orgId: string, targetEmail: string, settings?: EmailSettings): Observable<any> {
    const token = this.getToken();
    return this.http.post<any>(`${this.apiUrl}/${orgId}/email-settings/test?token=${encodeURIComponent(token)}`, {
      target_email: targetEmail,
      settings: settings
    }, {
      headers: this.getAuthHeaders()
    });
  }

  getMembers(orgId: string): Observable<{ members: OrgMember[] }> {
    const token = this.getToken();
    return this.http.get<{ members: OrgMember[] }>(`${this.apiUrl}/${orgId}/members?token=${encodeURIComponent(token)}`, {
      headers: this.getAuthHeaders()
    });
  }

  updateMemberRole(orgId: string, memberId: string, role: string): Observable<any> {
    const token = this.getToken();
    return this.http.put<any>(`${this.apiUrl}/${orgId}/members/${memberId}/role?token=${encodeURIComponent(token)}`, { role }, {
      headers: this.getAuthHeaders()
    });
  }

  removeMember(orgId: string, memberId: string): Observable<any> {
    const token = this.getToken();
    return this.http.delete<any>(`${this.apiUrl}/${orgId}/members/${memberId}?token=${encodeURIComponent(token)}`, {
      headers: this.getAuthHeaders()
    });
  }

  getInvitations(orgId: string): Observable<{ invitations: OrgInvitation[] }> {
    const token = this.getToken();
    return this.http.get<{ invitations: OrgInvitation[] }>(`${this.apiUrl}/${orgId}/invitations?token=${encodeURIComponent(token)}`, {
      headers: this.getAuthHeaders()
    });
  }

  inviteMember(orgId: string, invitee_email: string, role: string): Observable<any> {
    const token = this.getToken();
    return this.http.post<any>(`${this.apiUrl}/${orgId}/invitations?token=${encodeURIComponent(token)}`, {
      invitee_email,
      role
    }, {
      headers: this.getAuthHeaders()
    });
  }

  revokeInvitation(orgId: string, invitationId: string): Observable<any> {
    const token = this.getToken();
    return this.http.delete<any>(`${this.apiUrl}/${orgId}/invitations/${invitationId}?token=${encodeURIComponent(token)}`, {
      headers: this.getAuthHeaders()
    });
  }

  resendInvitation(orgId: string, invitationId: string): Observable<any> {
    const token = this.getToken();
    return this.http.post<any>(`${this.apiUrl}/${orgId}/invitations/${invitationId}/resend?token=${encodeURIComponent(token)}`, {}, {
      headers: this.getAuthHeaders()
    });
  }

  acceptInvitation(inviteToken: string): Observable<any> {
    const token = this.getToken();
    return this.http.post<any>(`${this.apiUrl}/invitations/accept?token=${encodeURIComponent(token)}`, {
      token: inviteToken
    }, {
      headers: this.getAuthHeaders()
    });
  }

  // --- API Connections ---
  getApiConnections(orgId: string): Observable<{ api_connections: ApiConnection[] }> {
    const token = this.getToken();
    return this.http.get<{ api_connections: ApiConnection[] }>(`${environment.apiUrl || 'http://localhost:8000/api'}/orgs/${orgId}/api-connections?token=${encodeURIComponent(token)}`, {
      headers: this.getAuthHeaders()
    });
  }

  createApiConnection(orgId: string, name: string, description: string, schema_definition: any): Observable<{ message: string, api_connection: ApiConnection }> {
    const token = this.getToken();
    return this.http.post<{ message: string, api_connection: ApiConnection }>(`${environment.apiUrl || 'http://localhost:8000/api'}/orgs/${orgId}/api-connections?token=${encodeURIComponent(token)}`, {
      name,
      description,
      schema_definition
    }, {
      headers: this.getAuthHeaders()
    });
  }

  updateApiConnection(orgId: string, connId: string, name: string, description: string, schema_definition: any): Observable<any> {
    const token = this.getToken();
    return this.http.put<any>(`${environment.apiUrl || 'http://localhost:8000/api'}/orgs/${orgId}/api-connections/${connId}?token=${encodeURIComponent(token)}`, {
      name,
      description,
      schema_definition
    }, {
      headers: this.getAuthHeaders()
    });
  }

  deleteApiConnection(orgId: string, connId: string): Observable<any> {
    const token = this.getToken();
    return this.http.delete<any>(`${environment.apiUrl || 'http://localhost:8000/api'}/orgs/${orgId}/api-connections/${connId}?token=${encodeURIComponent(token)}`, {
      headers: this.getAuthHeaders()
    });
  }

  regenerateApiKey(orgId: string, connId: string): Observable<{ api_key: string }> {
    const token = this.getToken();
    return this.http.post<{ api_key: string }>(`${environment.apiUrl || 'http://localhost:8000/api'}/orgs/${orgId}/api-connections/${connId}/regenerate-key?token=${encodeURIComponent(token)}`, {}, {
      headers: this.getAuthHeaders()
    });
  }

  // --- Monitoring & Log Management ---
  getSystemFailures(statusFilter?: string): Observable<{ status: boolean, failures: any[] }> {
    const token = this.getToken();
    let url = `${environment.apiUrl || 'http://localhost:8000/api'}/monitoring/failures?token=${encodeURIComponent(token)}`;
    if (statusFilter) {
      url += `&status=${statusFilter}`;
    }
    return this.http.get<{ status: boolean, failures: any[] }>(url, {
      headers: this.getAuthHeaders()
    });
  }

  retrySystemFailure(failureId: string): Observable<any> {
    const token = this.getToken();
    return this.http.post<any>(`${environment.apiUrl || 'http://localhost:8000/api'}/monitoring/retry/${failureId}?token=${encodeURIComponent(token)}`, {}, {
      headers: this.getAuthHeaders()
    });
  }

  resolveSystemFailure(failureId: string): Observable<any> {
    const token = this.getToken();
    return this.http.delete<any>(`${environment.apiUrl || 'http://localhost:8000/api'}/monitoring/failures/${failureId}?token=${encodeURIComponent(token)}`, {
      headers: this.getAuthHeaders()
    });
  }

  downloadSystemLogs(): Observable<Blob> {
    const token = this.getToken();
    return this.http.get(`${environment.apiUrl || 'http://localhost:8000/api'}/monitoring/logs/download?token=${encodeURIComponent(token)}`, {
      headers: this.getAuthHeaders(),
      responseType: 'blob'
    });
  }
}
