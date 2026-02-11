import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../../services/api.service';

interface Reference {
  name: string;
  email: string;
  phone: string;
  company: string;
  position: string;
  relationship: string;
}

interface RefereeData {
  full_name: string;
  references: Reference[];
  resume_url: string;
  candidate_id: string;
  extraction_timestamp: string;
}

interface Endorsement {
  created_at: string;
  applicant_id: string;
  file_content: {
    url?: string;
    filename: string;
    content_type?: string;
    mime_type?: string;
    size?: number;
  };
  jobpost_id: string;
  id: string;
  applicant_name: string;
  referee_data: RefereeData;
}

interface CandidateGroup {
  candidateId: string;
  applicantId: string;
  candidateName: string;
  endorsements: Endorsement[];
  referees: string[]; // List of referee names
  isShortlisted: boolean;
}

@Component({
  selector: 'app-job-references',
  imports: [CommonModule],
  templateUrl: './job-references.component.html',
  styleUrl: './job-references.component.scss'
})
export class JobReferencesComponent implements OnInit {
  jobId: string = '';
  originalEndorsements: Endorsement[] = [];
  candidateGroups: CandidateGroup[] = [];
  isLoading: boolean = true;
  errorMessage: string = '';
  selectedEndorsement: Endorsement | null = null;
  selectedDocumentUrl: string = '';
  isDocumentModalOpen: boolean = false;

  constructor(
    private apiService: ApiService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.jobId = params['jobId'];
      this.loadReferences();
    });
  }

  loadReferences(): void {
    this.isLoading = true;
    this.errorMessage = '';
    
    this.apiService.get_references(this.jobId).subscribe({
      next: (data: Endorsement[]) => {
        this.originalEndorsements = data;
        this.groupByCandidate();
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = error.message || 'Failed to load references';
        this.isLoading = false;
      }
    });
  }

  groupByCandidate(): void {
    const groupsMap = new Map<string, CandidateGroup>();
    
    this.originalEndorsements.forEach(endorsement => {
      // Determine candidate ID - use applicant_id if it matches candidate_id from referee_data
      let candidateId = endorsement.applicant_id;
      
      // Check if applicant_id matches candidate_id in referee_data
      if (endorsement.referee_data?.candidate_id && 
          endorsement.applicant_id === endorsement.referee_data.candidate_id) {
        candidateId = endorsement.referee_data.candidate_id;
      }
      
      if (!groupsMap.has(candidateId)) {
        groupsMap.set(candidateId, {
          candidateId: candidateId,
          applicantId: endorsement.applicant_id,
          candidateName: endorsement.applicant_name,
          endorsements: [],
          referees: [],
          isShortlisted: false
        });
      }
      
      const group = groupsMap.get(candidateId)!;
      group.endorsements.push(endorsement);
      
      // Add referee name if not already in list
      const refereeName = endorsement.referee_data?.full_name;
      if (refereeName && !group.referees.includes(refereeName)) {
        group.referees.push(refereeName);
      }
    });
    
    this.candidateGroups = Array.from(groupsMap.values());
  }

  shortlistCandidate(candidateId: string): void {
    const group = this.candidateGroups.find(g => g.candidateId === candidateId);
    if (group) {
      group.isShortlisted = true;
      // Remove from display after shortlisting (optional delay for animation)
      setTimeout(() => {
        this.candidateGroups = this.candidateGroups.filter(g => g.candidateId !== candidateId);
      }, 300);
    }
  }

  viewDocument(endorsement: Endorsement): void {
    this.selectedEndorsement = endorsement;
    this.selectedDocumentUrl = endorsement.file_content.url || '';
    this.isDocumentModalOpen = true;
  }

  downloadDocument(url: string, filename: string): void {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.target = '_blank';
    link.click();
  }

  closeDocumentModal(): void {
    this.isDocumentModalOpen = false;
    this.selectedEndorsement = null;
    this.selectedDocumentUrl = '';
  }

  getFileType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf': return 'PDF Document';
      case 'doc': case 'docx': return 'Word Document';
      case 'txt': return 'Text Document';
      default: return 'Document';
    }
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getFileSize(size?: number): string {
    if (!size) return 'N/A';
    if (size < 1024) return size + ' bytes';
    if (size < 1048576) return (size / 1024).toFixed(1) + ' KB';
    return (size / 1048576).toFixed(1) + ' MB';
  }

  getCandidateReferenceCount(group: CandidateGroup): number {
    // Get unique references across all endorsements
    const allReferences = group.endorsements.flatMap(e => 
      e.referee_data?.references || []
    );
    
    // Create a Set of unique reference names
    const uniqueReferences = new Set(
      allReferences.map(ref => `${ref.name}-${ref.email}`)
    );
    
    return uniqueReferences.size;
  }

  getCandidateDocumentCount(group: CandidateGroup): number {
    return group.endorsements.length;
  }
}