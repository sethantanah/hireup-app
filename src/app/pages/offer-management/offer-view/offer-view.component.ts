import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { CandidateService } from '../../../services/candidate.service';

@Component({
  selector: 'app-offer-view',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './offer-view.component.html',
  styleUrl: './offer-view.component.scss'
})
export class OfferViewComponent implements OnInit {
  linkToken: string = '';
  isLoading: boolean = true;
  errorMessage: string | null = null;
  offer: any = null;
  sanitizedBody: SafeHtml | null = null;

  isSigningModalOpen: boolean = false;
  isSigning: boolean = false;
  typedSignature: string = '';
  acceptedTerms: boolean = false;
  signFeedback: { type: 'success' | 'error'; message: string } | null = null;

  showContactModal: boolean = false;
  isSendingContact: boolean = false;
  contactData = {
    subject: '',
    message: ''
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private candidateService: CandidateService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.linkToken = this.route.snapshot.paramMap.get('linkToken') || '';
    if (this.linkToken) {
      this.loadOfferDetails();
    } else {
      this.isLoading = false;
      this.errorMessage = 'Invalid or missing offer link token.';
    }
  }

  loadOfferDetails(): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.candidateService.getOfferByToken(this.linkToken).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        if (res.success && res.offer) {
          this.offer = res.offer;
          this.typedSignature = this.offer.candidate_name || '';
          if (this.offer.rendered_body_html) {
            this.sanitizedBody = this.sanitizer.bypassSecurityTrustHtml(this.offer.rendered_body_html);
          }
        } else {
          this.errorMessage = 'Unable to locate offer details.';
        }
      },
      error: (err: any) => {
        this.isLoading = false;
        this.errorMessage = err?.error?.detail || 'This offer link may have expired or is no longer valid.';
      }
    });
  }

  openSignModal(): void {
    this.signFeedback = null;
    this.isSigningModalOpen = true;
  }

  closeSignModal(): void {
    this.isSigningModalOpen = false;
  }

  submitAcceptance(): void {
    if (!this.typedSignature.trim()) {
      this.signFeedback = { type: 'error', message: 'Please type your full legal name as your electronic signature.' };
      return;
    }
    if (!this.acceptedTerms) {
      this.signFeedback = { type: 'error', message: 'Please confirm that you agree to the terms of this offer.' };
      return;
    }

    this.isSigning = true;
    this.signFeedback = null;

    const payload = {
      offer_id: this.offer.id,
      signature_data: this.typedSignature.trim(),
      ip_address: ''
    };

    this.candidateService.signOffer(payload).subscribe({
      next: (res: any) => {
        this.isSigning = false;
        this.isSigningModalOpen = false;
        this.offer.status = 'accepted';
        this.offer.signed_at = new Date().toISOString();
        this.signFeedback = { type: 'success', message: 'Offer accepted and signed successfully!' };
      },
      error: (err: any) => {
        this.isSigning = false;
        this.signFeedback = { type: 'error', message: err?.error?.detail || 'Failed to submit e-signature. Please try again.' };
      }
    });
  }

  showDeclineModal: boolean = false;
  declineReasonNote: string = '';

  declineOffer(): void {
    this.openDeclineModal();
  }

  openDeclineModal(): void {
    this.declineReasonNote = '';
    this.showDeclineModal = true;
  }

  closeDeclineModal(): void {
    this.showDeclineModal = false;
    this.declineReasonNote = '';
  }

  confirmDeclineOffer(): void {
    if (!this.offer || !this.offer.id) return;
    this.isSigning = true;
    const payload = {
      status: 'declined',
      candidate_email: this.offer.candidate_email || '',
      notes: this.declineReasonNote.trim() || 'Declined via offer link page'
    };
    this.candidateService.respondToOffer(this.offer.id, payload).subscribe({
      next: () => {
        this.isSigning = false;
        this.offer.status = 'declined';
        this.closeDeclineModal();
      },
      error: (err: any) => {
        this.isSigning = false;
        this.signFeedback = { type: 'error', message: err?.error?.detail || 'Failed to update offer status.' };
        this.closeDeclineModal();
      }
    });
  }

  openContactModal(): void {
    this.contactData.subject = `Inquiry regarding Offer: ${this.offer.job_title}`;
    this.contactData.message = '';
    this.showContactModal = true;
  }

  closeContactModal(): void {
    this.showContactModal = false;
  }

  sendContactMessage(): void {
    if (!this.contactData.message.trim()) return;
    this.isSendingContact = true;
    const payload = {
      offer_id: this.offer.id,
      candidate_email: this.offer.candidate_email || 'candidate@example.com',
      candidate_name: this.offer.candidate_name || 'Candidate',
      subject: this.contactData.subject,
      message: this.contactData.message
    };
    this.candidateService.contactCompany(payload).subscribe({
      next: () => {
        this.isSendingContact = false;
        this.showContactModal = false;
        alert('Your message has been sent to the hiring team.');
      },
      error: (err: any) => {
        this.isSendingContact = false;
        alert(err?.error?.detail || 'Failed to send message.');
      }
    });
  }

  printOffer(): void {
    window.print();
  }
}
