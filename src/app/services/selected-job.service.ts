import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SelectedJobService {
  private readonly STORAGE_KEY = 'HIREUP_SELECTED_JOBPOST_ID';
  private readonly LEGACY_KEYS = ['jobpostId', 'selectedJobPostId'];

  private _selectedJobId$ = new BehaviorSubject<string | null>(this.loadInitial());
  selectedJobId$ = this._selectedJobId$.asObservable();

  private loadInitial(): string | null {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored && stored !== 'null' && stored !== 'undefined' && stored !== 'jobpostId') {
        return stored;
      }
      // fallback to legacy keys
      for (const k of this.LEGACY_KEYS) {
        const v = localStorage.getItem(k);
        if (v && v !== 'null' && v !== 'undefined' && v !== 'jobpostId' && v !== 'all') {
          return v;
        }
      }
      // also check query param in URL on load
      const params = new URLSearchParams(window.location.search);
      const qp = params.get('jobId') || params.get('jobpostId');
      if (qp && qp !== 'all') return qp;
    } catch {}
    return null;
  }

  get selectedJobId(): string | null {
    return this._selectedJobId$.value;
  }

  setSelectedJobId(id: string | null): void {
    // normalize: 'all' or empty means no specific job (null) for global context
    // scheduled-interviews will handle 'all' locally as null globally
    let normalized: string | null = id;
    if (id === 'all' || id === '' || id === 'null' || id === 'undefined') normalized = null;
    const current = this._selectedJobId$.value;
    if (current === normalized) return;

    try {
      if (normalized) {
        localStorage.setItem(this.STORAGE_KEY, normalized);
        localStorage.setItem('jobpostId', normalized);
        localStorage.setItem('selectedJobPostId', normalized);
      } else {
        localStorage.removeItem(this.STORAGE_KEY);
        // keep jobpostId for 'all' case? remove to indicate no specific
        localStorage.removeItem('jobpostId');
        localStorage.removeItem('selectedJobPostId');
      }
    } catch {}

    this._selectedJobId$.next(normalized);
  }
}
