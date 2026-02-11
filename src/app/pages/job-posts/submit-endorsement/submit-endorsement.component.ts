import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../../services/api.service';

@Component({
  selector: 'app-submit-endorsement',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './submit-endorsement.component.html',
  styleUrl: './submit-endorsement.component.scss'
})
export class SubmitEndorsementComponent implements OnInit {
  @ViewChild('fileInput') fileInput!: ElementRef;
  endorsementForm: FormGroup;
  jobId: string = '';
  applicationId: string = '';
  isLoading: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';

  constructor(
    private apiService: ApiService,
    private route: ActivatedRoute,
    private fb: FormBuilder
  ) {
    this.endorsementForm = this.fb.group({
      file: [null, [Validators.required]]
    });
  }

  ngOnInit(): void {
    // Get jobId and applicationId from route parameters
    this.route.params.subscribe(params => {
      this.jobId = params['jobId'];
      this.applicationId = params['applicationId'];
      console.log(`Loaded Job ID: ${this.jobId}, Application ID: ${this.applicationId}`);
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.endorsementForm.patchValue({
        file: file
      });
      this.endorsementForm.get('file')?.updateValueAndValidity();
    }
  }

  onSubmit(): void {
    if (this.endorsementForm.invalid) {
      this.markFormGroupTouched(this.endorsementForm);
      return;
    }

    if (!this.jobId || !this.applicationId) {
      this.errorMessage = 'Missing job ID or application ID';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const formData = new FormData();
    const file = this.endorsementForm.get('file')?.value;
    
    // Add job ID and application ID to form data
    formData.append('jobpost_id', this.jobId);
    formData.append('applicant_id', this.applicationId);
    
    // Add file as a list (if single file, put it in an array format)
    // The API expects files as a list, so we append it in a way that can be treated as a list
    formData.append('files', file);

    this.apiService.submit_endorsement(formData).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.successMessage = 'Endorsement submitted successfully!';
        this.endorsementForm.reset();
        
        // Clear success message after 5 seconds
        setTimeout(() => {
          this.successMessage = '';
        }, 5000);
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.message || 'Failed to submit endorsement. Please try again.';
      }
    });
  }

  // Helper method to mark all form controls as touched
  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
    });
  }

  // Helper method to clear file selection
  clearFile(): void {
    this.endorsementForm.patchValue({
      file: null
    });
  }

  get fileName(): string {
    const file = this.endorsementForm.get('file')?.value;
    return file ? file.name : 'No file chosen';
  }
}