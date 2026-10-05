import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment';

export interface ChatMessage {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
  candidates?: any[];
  webResults?: any[];
  isSearching?: boolean;
  toolInvoked?: string;
}

export interface CopilotRequest {
  query: string;
  job_id?: string;
  context_job_id?: string;
  enable_web_search?: boolean;
  history?: { role: string; content: string }[];
}

export interface CopilotResponse {
  success: boolean;
  query: string;
  response: string;
  candidates: any[];
  web_search_results: any[];
  total_candidates_scanned: number;
}

@Injectable({
  providedIn: 'root'
})
export class CopilotService {
  private apiUrl = `${environment.apiUrl || 'http://localhost:8000/api'}/copilot`;

  constructor(private http: HttpClient) {}

  chat(payload: CopilotRequest): Observable<CopilotResponse> {
    const token = localStorage.getItem('token') || localStorage.getItem('access_token') || localStorage.getItem('auth_token');
    const headers: { [header: string]: string } = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return this.http.post<CopilotResponse>(`${this.apiUrl}/chat`, payload, { headers });
  }

  chatApiPool(orgId: string, payload: {
    query: string;
    connection_ids?: string[];
    context_connection_id: string;
    min_score?: number;
    limit?: number;
    enable_web_search?: boolean;
    history?: any[];
  }): Observable<CopilotResponse> {
    const token = localStorage.getItem('token') || localStorage.getItem('access_token') || localStorage.getItem('auth_token');
    const headers: { [header: string]: string } = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const apiConnUrl = `${environment.apiUrl || 'http://localhost:8000/api'}/orgs/${orgId}/api-connections/copilot`;
    return this.http.post<CopilotResponse>(apiConnUrl, payload, { headers });
  }
}
