import { Component, Input, OnInit } from '@angular/core';
import {
  ColorScheme,
  JobPostData,
} from '../../../../../../models/jobpost.model';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { FormattingService } from '../../../../../../services/formatting.service';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../../../../../services/api.service';
import { DataService } from '../../../../../../services/data.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../../../environment/environment';
import { AuthService } from '../../../../../../services/auth.service';
import { firstValueFrom } from 'rxjs';
import { IndexedDbService } from '../../../../../../services/indexed-db.service';

interface FileUploadProgress {
  fileName: string;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  error?: string;
}

// Add this interface for failed uploads
interface FailedUpload {
  fieldKey: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  error: string;
  timestamp: number;
}

// Add these interfaces
export interface EmailAttachment {
  filename: string;
  message_id?: string;
  attachment_id: string;
  file?: File; // Will be populated after download
}

export interface Email {
  email_id: string;
  job_id?: string;
  sender: string;
  subject: string;
  provider?: string;
  processed?: boolean;
  attachments: EmailAttachment[];
}

@Component({
  selector: 'app-bulk-document-uploads',
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './bulk-document-uploads.component.html',
  styleUrl: './bulk-document-uploads.component.scss',
})
export class BulkDocumentUploadsComponent implements OnInit {
  @Input() jobPostId: string | undefined;
  @Input() jobAppData: JobPostData | undefined;
  form: FormGroup | undefined;

  // Fallback colors
  colorScheme: ColorScheme = {
    primary: '#282157',
    secondary: '#FF4E04',
  };

  formValues: { [key: string]: any } = {};
  uploadedFiles: { [key: string]: File } = {};

  // New properties for multiple file uploads
  fileSelections: { [key: string]: File[] } = {};
  uploadProgress: FileUploadProgress[] = [];

  // Add these properties to the component class
  failedUploads: FailedUpload[] = [];
  showFailedUploads: boolean = false;
  localStorageKey = 'failedUploads_'; // Will be appended with jobPostId

  isMenuOpen: boolean = false;
  isLoading: boolean = false;
  onError: boolean = false;
  showError: boolean = false;
  showPopup: boolean = false;
  popupMessage: string = '';
  popupType: 'success' | 'error' | 'warning' | 'info' = 'success';

  // Sections for tabs
  activeSection = ''; // Default active section
  errors: any = {}; // Validation errors
  showSubmissionMessage = false; // Controls visibility of the success message
  isSubmitting: boolean = false;
  deadlinePassed: boolean = false;
  deadline: any;

  isConnected = false;
  serviceType = ''; // 'gmail' or 'outlook'
  subject = '';

  // Add these properties to the component class
  dataSources = [
    { id: 'uploadqueue', name: 'Upload Queue', icon: 'fas fa-upload' },
    { id: 'filesystem', name: 'File System', icon: 'fas fa-folder' },
    { id: 'gmail', name: 'Gmail', icon: 'fas fa-envelope' },
    { id: 'outlook', name: 'Outlook', icon: 'fas fa-envelope-open' },
  ];
  activeTab = 'filesystem';
  isGmailConnected = false;
  isOutlookConnected = false;
  emailSearchQuery = '';
  emails: Email[] = [];
  emailsAll: Email[] = [];
  isSearching = false;
  hasSearched = false;
  downloadingAttachments = false;
  connectingMail: boolean = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private apiService: ApiService,
    public formattingService: FormattingService,
    public dataService: DataService,
    private http: HttpClient,
    private authService: AuthService,
    private indexedDbService: IndexedDbService
  ) {
    this.form = this.fb.group({});

    const jobpostId = this.route.snapshot.paramMap.get('jobId') || 'jobId';
    this.indexedDbService.getEmailsByJobId(jobpostId).subscribe({
      next: (emails) => {
        this.emailsAll = [...emails];
        this.emails = [...emails];
      },
      error: (err) => console.error('Error fetching emails:', err),
    });
  }

  ngOnInit(): void {
    this.activeSection = this.jobAppData?.sections[0] || 'General';

    // Check deadline
    if (this.jobAppData?.deadline) {
      this.deadline = new Date(this.jobAppData.deadline);
      this.deadlinePassed = this.deadline < new Date();
    }

    if (this.jobAppData?.colorScheme) {
      document.documentElement.style.setProperty(
        '--primary-color',
        this.jobAppData?.colorScheme.primary
      );
      document.documentElement.style.setProperty(
        '--secondary-color',
        this.jobAppData?.colorScheme.secondary
      );
    }

    // Initialize form values
    this.jobAppData?.formData.fields.forEach((field: any) => {
      const validators = field.required ? [Validators.required] : [];

      // For file fields, we don't add them to the form controls
      if (field.type !== 'file') {
        this.form?.addControl(field.key, this.fb.control('', validators));
      }

      // Initialize file selections array for each file field
      if (field.type === 'file') {
        this.fileSelections[field.key] = [];
      }
    });

    // Initialize checkbox value
    this.form?.addControl('agreeToDeclaration', this.fb.control(false));
    this.formValues['agreeToDeclaration'] = false;

    // Load failed uploads from localStorage
    this.loadFailedUploads();
    this.authService.handleAuthCallback();
  }

  // Handle multiple file selection
  onMultipleFilesSelected(event: Event, key: string): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const fileField = this.jobAppData?.formData.fields.find(
        (field) => field.key === key
      );

      // Convert FileList to array
      const filesArray = Array.from(input.files);

      this.fileSelections[key] = [...this.fileSelections[key], ...filesArray];
      delete this.errors[key];

      // Reset the input so the same file can be selected again if needed
      input.value = '';
    }
  }

  // Remove a file from the selection
  removeFile(key: string, index: number): void {
    if (this.fileSelections[key] && this.fileSelections[key].length > index) {
      // Remove a file from the selection
      this.fileSelections[key].splice(index, 1);
    }
  }

  validateField(field: any) {
    let value = this.formValues[field.key];

    // Reset error for the field
    delete this.errors[field.key];

    // For file fields, check the fileSelections array
    if (field.type === 'file') {
      if (
        field.required &&
        (!this.fileSelections[field.key] ||
          this.fileSelections[field.key].length === 0)
      ) {
        this.errors[field.key] = `${field.label} is required.`;
      }
      return;
    }

    // Check if the field is required and empty
    if (field.required && !value) {
      this.errors[field.key] = `${field.label} is required.`;
      return;
    }

    if (field.type === 'checkbox' && !value) {
      this.errors[field.key] = `${field.label} is required.`;
      return;
    }

    // Validate based on field type
    switch (field.type) {
      case 'email':
        if (!this.isValidEmail(value)) {
          this.errors[field.key] = 'Please enter a valid email address.';
        }
        break;
      case 'tel':
        if (!this.isValidPhoneNumber(value)) {
          this.errors[field.key] = 'Please enter a valid phone number.';
        }
        break;
      case 'text-area':
        if (field.required && !value.trim()) {
          this.errors[field.key] = `${field.label} is required.`;
        }
        break;
      case 'select':
        if (field.required && !value) {
          this.errors[field.key] = `${field.label} is required.`;
        }
        break;
      default:
        break;
    }
  }

  // Check if the email is valid
  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Check if the phone number is valid
  isValidPhoneNumber(phone: string): boolean {
    const phoneRegex = /^\d{10}$/; // Example: 10-digit phone number
    return phoneRegex.test(phone);
  }

  // Check if the form is valid
  isFormValid(): boolean {
    return Object.keys(this.errors).length === 0;
  }

  // Navigate to the next section
  goToNextSection() {
    const currentIndex = this.jobAppData!.sections.indexOf(this.activeSection);
    if (currentIndex < this.jobAppData!.sections.length - 1) {
      this.activeSection = this.jobAppData!.sections[currentIndex + 1];
    }
  }

  // Navigate to the previous section
  goToPreviousSection() {
    const currentIndex = this.jobAppData!.sections.indexOf(this.activeSection);
    if (currentIndex > 0) {
      this.activeSection = this.jobAppData!.sections[currentIndex - 1];
    }
  }

  // Mark all form controls as touched to display validation errors
  markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach((control) => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  getCheckboxValue = (): boolean => {
    const checkbox = document.getElementById(
      'acceptDeclaration'
    ) as HTMLInputElement | null;
    return checkbox?.checked ?? false;
  };

  onSubmit(): void {
    this.onError = false;
    this.showPopup = false;

    if (this.form && this.form.invalid) {
      this.markFormGroupTouched(this.form);
      return;
    }

    // Check if declaration is accepted
    if (
      this.jobAppData!.applySection.declaration.length > 0 &&
      this.getCheckboxValue() == false
    ) {
      this.showPopup = true;
      this.popupType = 'error';
      this.popupMessage = 'You must accept the declaration to submit.';
      setTimeout(() => (this.showPopup = false), 3000);
      return;
    }

    // Validate all fields before submission
    this.jobAppData?.formData?.fields.forEach((field: any) => {
      if (field.section === this.activeSection) {
        this.validateField(field);
      }
    });

    // Check if there are any validation errors
    // if (Object.keys(this.errors).length > 0) {
    //   this.showPopupMessage(
    //     'Please fix the errors before submitting.',
    //     'error'
    //   );
    //   return;
    // }

    // Check if there are any files to upload
    const hasFiles = Object.values(this.fileSelections).some(
      (files) => files.length > 0
    );
    if (!hasFiles) {
      this.showPopupMessage(
        'Please select at least one file to upload.',
        'error'
      );
      return;
    }

    // Format form data
    const formattedData = this.formatData(
      this.form?.value,
      this.jobAppData!.formData.fields
    );

    if (this.jobAppData!.applySection.declaration.length > 0) {
      formattedData['accept_declaration'] = {
        label: 'Accept Declaration',
        value: this.getCheckboxValue() ? 'Yes' : 'No',
      };
    }

    // Start submission process
    this.isSubmitting = true;
    this.isLoading = true;

    // Reset upload progress
    this.uploadProgress = [];

    // Upload each file individually
    this.uploadAllFiles(formattedData);
  }

  // Upload all files sequentially
  uploadAllFiles(formattedData: any): void {
    // Prepare an array of all files to upload
    const allFiles: { key: string; file: File }[] = [];

    Object.keys(this.fileSelections).forEach((key) => {
      this.fileSelections[key].forEach((file) => {
        allFiles.push({ key, file });
      });
    });

    // If no files to upload, show error
    if (allFiles.length === 0) {
      this.isSubmitting = false;
      this.isLoading = false;
      this.showPopupMessage('No files selected for upload.', 'error');
      return;
    }

    // Initialize progress tracking for each file
    allFiles.forEach(({ file }) => {
      this.uploadProgress.push({
        fileName: file.name,
        progress: 0,
        status: 'uploading',
      });
    });

    // Upload files one by one
    this.uploadFileSequentially(allFiles, 0, formattedData);
  }

  // Upload files one at a time
  uploadFileSequentially(
    files: { key: string; file: File }[],
    index: number,
    formattedData: any
  ): void {
    if (index >= files.length) {
      // All files uploaded
      this.isSubmitting = false;
      this.isLoading = false;
      this.showSubmissionMessage = true;
      this.form?.reset();

      this.fileSelections = {};

      // Initialize form values
      this.jobAppData?.formData.fields.forEach((field: any) => {
        // Initialize file selections array for each file field
        if (field.type === 'file') {
          this.fileSelections[field.key] = [];
        }
      });

      // Object.keys(this.fileSelections).forEach((key) => {
      //   this.fileSelections[key] = [];
      // });

      this.showPopupMessage(`Files uploaded successfully!`, 'success', 20000);

      return;
    }

    const { key, file } = files[index];
    const progressIndex = index;

    // Create FormData for this file
    const formData = new FormData();

    if (this.jobPostId) {
      formData.append('jobPostId', this.jobPostId);
      formData.append('fieldKey', key);
      formData.append('form_data', JSON.stringify(formattedData));
      formData.append('file', file);

      // Upload the file
      this.apiService.uploadSingleFile(formData).subscribe({
        next: (event: any) => {
          // Handle progress events if your API supports it
          if (event.type === 'progress' && event.loaded && event.total) {
            const percentDone = Math.round((100 * event.loaded) / event.total);
            this.uploadProgress[progressIndex].progress = percentDone;
          } else if (event.type === 'complete') {
            // File upload completed
            this.uploadProgress[progressIndex].status = 'success';
            this.uploadProgress[progressIndex].progress = 100;

            // Check if this file was in the failed uploads list and remove it if found
            this.removeFromFailedUploadsIfExists(key, file);

            this.emails.forEach((email) => {
              console.log(email.email_id, key);
              if (email.email_id === key) {
                email.processed = true;
                this.indexedDbService.updateEmail(email).subscribe({
                  next: () => console.log('Email updated successfully!'),
                  error: (err) => console.error('Error updating email:', err),
                });
              }
            });

            // Move to the next file
            setTimeout(() => {
              this.uploadFileSequentially(files, index + 1, formattedData);
            }, 500);
          }
        },
        error: (error) => {
          console.error(`Error uploading file ${file.name}:`, error);
          this.uploadProgress[progressIndex].status = 'error';
          this.uploadProgress[progressIndex].error =
            error.message || 'Upload failed';

          // Add to failed uploads
          this.addFailedUpload(key, file, error.message || 'Upload failed');

          // Continue with next file despite error
          setTimeout(() => {
            this.uploadFileSequentially(files, index + 1, formattedData);
          }, 500);
        },
      });
    } else {
      // No job post ID, mark as error
      this.uploadProgress[progressIndex].status = 'error';
      this.uploadProgress[progressIndex].error = 'Missing job post ID';

      // Move to next file
      setTimeout(() => {
        this.uploadFileSequentially(files, index + 1, formattedData);
      }, 500);
    }
  }

  // Retry a failed upload
  async retryFailedUpload(index: number): Promise<void> {
    if (index < 0 || index >= this.failedUploads.length) {
      return;
    }

    const failedUpload = this.failedUploads[index];

    // We need to get the actual file from the user since we can't store File objects in localStorage
    try {
      // Create a file input element
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.style.display = 'none';
      fileInput.accept = failedUpload.fileType;
      document.body.appendChild(fileInput);

      // Prompt user to select the file again
      fileInput.click();

      // Wait for file selection
      await new Promise<void>((resolve) => {
        fileInput.onchange = () => {
          if (fileInput.files && fileInput.files.length > 0) {
            const file = fileInput.files[0];

            // Check if this is likely the same file
            if (
              file.name === failedUpload.fileName &&
              Math.abs(file.size - failedUpload.fileSize) < 1024
            ) {
              // Allow 1KB difference

              // Add file to the appropriate field's selection
              if (!this.fileSelections[failedUpload.fieldKey]) {
                this.fileSelections[failedUpload.fieldKey] = [];
              }
              this.fileSelections[failedUpload.fieldKey].push(file);

              // Remove from failed uploads
              this.removeFailedUpload(index);

              this.showPopupMessage(
                `File "${file.name}" added for upload`,
                'success'
              );
            } else {
              this.showPopupMessage(
                `Selected file doesn't match the failed upload. Please select "${failedUpload.fileName}"`,
                'error'
              );
            }
          }

          // Clean up
          document.body.removeChild(fileInput);
          resolve();
        };
      });
    } catch (error) {
      console.error('Error retrying upload:', error);
      this.showPopupMessage('Failed to retry upload', 'error');
    }
  }

  showPopupMessage(
    message: string,
    type: 'success' | 'error' | 'warning' | 'info',
    duration: number = 10000
  ): void {
    this.popupMessage = message;
    this.popupType = type;
    this.showPopup = true;
    // Hide the popup after 5 seconds
    setTimeout(() => {
      this.showPopup = false;
    }, duration);
  }

  resetFormData(): void {
    // Clear form values
    Object.keys(this.formValues).forEach((key) => {
      this.formValues[key] = '';
    });

    // Clear uploaded files
    this.fileSelections = {};
    this.uploadProgress = [];

    // Reset the checkbox
    this.formValues['agreeToDeclaration'] = false;

    // Reset the form state
    this.isLoading = false;
    this.onError = false;
  }

  // Close the success message
  closeSubmissionMessage() {
    this.showSubmissionMessage = false;
  }

  setCurrentSection(section: string) {
    this.activeSection = section;
  }

  formatData(
    data: { [key: string]: string },
    fields: any[]
  ): { [key: string]: { value: string; label: string } } {
    const formattedData: { [key: string]: { value: string; label: string } } =
      {};

    fields.forEach((field) => {
      // Skip file fields as they'll be handled separately
      if (field.type !== 'file') {
        const key = field.key; // Key from the fields array
        const label = field.label.toLowerCase().replace(/ /g, '_'); // Convert label to lowercase with underscores
        const value = data[key] || ''; // Get value from data or default to empty string
        formattedData[label] = {
          value,
          label: field.label, // Original label
        };
      }
    });

    return formattedData;
  }

  // Load failed uploads from localStorage
  loadFailedUploads(): void {
    if (this.jobPostId) {
      const storageKey = this.localStorageKey + this.jobPostId;
      const storedData = localStorage.getItem(storageKey);
      if (storedData) {
        try {
          this.failedUploads = JSON.parse(storedData);
        } catch (e) {
          console.error('Error parsing failed uploads from localStorage', e);
          this.failedUploads = [];
        }
      }
    }
  }

  // Save failed uploads to localStorage
  saveFailedUploads(): void {
    if (this.jobPostId) {
      const storageKey = this.localStorageKey + this.jobPostId;
      localStorage.setItem(storageKey, JSON.stringify(this.failedUploads));
    }
  }

  // Add a failed upload to the list
  addFailedUpload(fieldKey: string, file: File, error: string): void {
    const failedUpload: FailedUpload = {
      fieldKey,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      error,
      timestamp: Date.now(),
    };

    // Check if this file is already in the failed uploads list
    const existingIndex = this.failedUploads.findIndex(
      (f) => f.fieldKey === fieldKey && f.fileName === file.name
    );

    if (existingIndex >= 0) {
      // Update existing entry
      this.failedUploads[existingIndex] = failedUpload;
    } else {
      // Add new entry
      this.failedUploads.push(failedUpload);
    }

    this.saveFailedUploads();
  }

  // Remove a failed upload from the list
  removeFailedUpload(index: number): void {
    if (index >= 0 && index < this.failedUploads.length) {
      this.failedUploads.splice(index, 1);
      this.saveFailedUploads();
    }
  }

  // Clear all failed uploads
  clearAllFailedUploads(): void {
    if (this.failedUploads.length > 0) {
      // Ask for confirmation
      if (
        confirm(
          `Are you sure you want to clear all ${this.failedUploads.length} failed uploads?`
        )
      ) {
        this.failedUploads = [];
        this.saveFailedUploads();
        this.showPopupMessage('All failed uploads have been cleared', 'info');
      }
    }
  }

  /**
   * Checks if a file that was previously in the failed uploads list has been successfully uploaded
   * and removes it from the failed uploads list
   * @param fieldKey The field key associated with the file
   * @param file The file that was successfully uploaded
   */
  removeFromFailedUploadsIfExists(fieldKey: string, file: File): void {
    if (!this.failedUploads.length) return;

    // Find any matching failed uploads by filename and approximate size
    const matchingIndices: number[] = [];

    this.failedUploads.forEach((failedUpload, index) => {
      // Check if this is likely the same file (same name and similar size)
      if (
        failedUpload.fieldKey === fieldKey &&
        failedUpload.fileName === file.name &&
        Math.abs(failedUpload.fileSize - file.size) < 1024
      ) {
        // Allow 1KB difference
        matchingIndices.push(index);
      }
    });

    // Remove matches from highest index to lowest to avoid index shifting issues
    if (matchingIndices.length > 0) {
      matchingIndices.sort((a, b) => b - a); // Sort in descending order

      for (const index of matchingIndices) {
        this.failedUploads.splice(index, 1);
      }

      // Save the updated list to localStorage
      this.saveFailedUploads();

      // Show a notification if we removed any files
      if (matchingIndices.length === 1) {
        this.showPopupMessage(
          `"${file.name}" removed from failed uploads list`,
          'success'
        );
      } else if (matchingIndices.length > 1) {
        this.showPopupMessage(
          `${matchingIndices.length} matching files removed from failed uploads list`,
          'success'
        );
      }
    }
  }

  // Toggle the failed uploads view
  toggleFailedUploads(): void {
    this.showFailedUploads = !this.showFailedUploads;
  }

  // Tab navigation
  setActiveTab(tabId: string): void {
    this.activeTab = tabId;
    // Reset email search when switching tabs
    if(tabId !== 'uploadqueue' && tabId !== 'filesystem')
    this.emails = this.emailsAll.filter((email) => email.provider == tabId);
    this.hasSearched = false;
  }

  // Connect to Gmail
  connectGoogle(): void {
    // This would typically involve OAuth authentication
    // For demo purposes, we'll simulate a successful connection
    this.connectingMail = true;
    this.authService.googleLogin().subscribe({
      next: (res) => {
        this.isGmailConnected = true;
        this.connectingMail = false;
        this.showPopupMessage('Connected to Gmail successfully', 'success');
      },
      error: (err) => {
        this.isGmailConnected = false;
        this.connectingMail = false;
        this.showPopupMessage('Connected to Gmail failed', 'error');
      },
    });
  }

  // Connect to Outlook
  connectOutlook(): void {
    // This would typically involve OAuth authentication
    // For demo purposes, we'll simulate a successful connection
    this.isOutlookConnected = true;
    this.showPopupMessage('Connected to Outlook successfully', 'success');
  }

  // Search emails
  searchEmails(provider: 'gmail' | 'outlook'): void {
    if (!this.emailSearchQuery.trim()) {
      this.showPopupMessage('Please enter a search term', 'error');
      return;
    }

    this.isSearching = true;
    this.hasSearched = true;
    const jobpostId = this.route.snapshot.paramMap.get('jobId') || 'jobId';

    // TODO 2
    this.apiService
      .getEmailAttachments(provider, this.emailSearchQuery)
      .subscribe({
        next: (res) => {
          // this.emails = res;
          // this.emailsAll.push(...res);
          // this.emails.forEach((email) => {
          //   email.provider = provider;
          //   email.jobId = jobpostId;
          // });

          // Add the search results to the emails array without duplicates
          this.addEmailsWithoutDuplicates(res, provider);

          this.isSearching = false;
          if (this.emails.length > 0) {
            this.showPopupMessage(
              `Found ${this.emails.length} emails with attachments`,
              'success'
            );
          } else {
            this.showPopupMessage(
              'No emails found matching your search',
              'info'
            );
          }
        },
        error: (error) => {
          console.log(error, error.status);
          this.isSearching = false;
          this.isGmailConnected = false;
          this.showPopupMessage('Fialed to load attachments', 'error');
        },
      });
  }

  // Check if there are any attachments across all emails
  hasAttachments(): boolean {
    return this.emails.some((email) => email.attachments.length > 0);
  }

  // Download attachments from a single email
  async downloadAttachments(email: Email): Promise<void> {
    if (!email.attachments.length) return;
    this.showPopupMessage('File download started, please wait...', 'info');

    try {
      this.downloadingAttachments = true;

      for (const attachment of email.attachments) {
        await this.downloadAttachment(attachment);
      }

      // Add the downloaded files to the file selection for the first file field
      if (this.jobAppData && this.jobAppData.formData.fields) {
        const fileField = this.jobAppData.formData.fields.find(
          (f) => f.type === 'file'
        );

        if (fileField) {
          const fieldKey = fileField.key;

          if (!this.fileSelections[fieldKey]) {
            this.fileSelections[fieldKey] = [];
          }

          // Add all downloaded files to the selection
          for (const attachment of email.attachments) {
            if (attachment.file) {
              this.addFileWithDuplicateCheck(fieldKey, attachment.file);
              // this.fileSelections[fieldKey].push(attachment.file);
            }
          }

          this.showPopupMessage(
            `${email.attachments.length} files added to upload queue`,
            'success'
          );
        }
      }

      this.downloadingAttachments = false;
    } catch (error) {
      console.error('Error downloading attachments:', error);
      this.showPopupMessage('Failed to download attachments', 'error');
      this.downloadingAttachments = false;
    }
  }

  // Download all attachments from all emails
  async downloadAllAttachments(): Promise<void> {
    try {
      this.downloadingAttachments = true;
      let downloadCount = 0;

      for (const email of this.emails) {
        for (const attachment of email.attachments) {
          await this.downloadAttachment(attachment);
          downloadCount++;
        }
      }

      // Add the downloaded files to the file selection for the first file field
      if (this.jobAppData && this.jobAppData.formData.fields) {
        const fileField = this.jobAppData.formData.fields.find(
          (f) => f.type === 'file'
        );

        if (fileField) {
          const fieldKey = fileField.key;

          if (!this.fileSelections[fieldKey]) {
            this.fileSelections[fieldKey] = [];
          }

          // Add all downloaded files to the selection
          for (const email of this.emails) {
            for (const attachment of email.attachments) {
              if (attachment.file) {
                this.addFileWithDuplicateCheck(fieldKey, attachment.file);
                // this.fileSelections[fieldKey].push(attachment.file);
              }
            }
          }

          this.showPopupMessage(
            `${downloadCount} files added for upload`,
            'success'
          );
        }
      }

      this.downloadingAttachments = false;
    } catch (error) {
      console.error('Error downloading all attachments:', error);
      this.showPopupMessage('Failed to download all attachments', 'error');
      this.downloadingAttachments = false;
    }
  }

  // Download a single attachment
  async downloadAttachment(attachment: EmailAttachment): Promise<void> {
    return new Promise((resolve, reject) => {
      this.apiService.downloadFileAttachment(attachment).subscribe({
        next: (response) => {
          try {
            // Determine file type
            const fileType = attachment.filename.endsWith('.pdf')
              ? 'application/pdf'
              : attachment.filename.endsWith('.docx')
              ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
              : 'application/octet-stream';

            // Convert response to File object
            const file = new File([response], attachment.filename, {
              type: fileType,
            });

            // Store file in the attachment object
            attachment.file = file;

            // Trigger browser download
            const url = window.URL.createObjectURL(response);
            const a = document.createElement('a');
            a.href = url;
            a.download = attachment.filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);

            resolve();
          } catch (error) {
            reject(error);
          }
        },
      });
    });
  }

  async downloadFile(attachment: EmailAttachment): Promise<File> {
    try {
      const response = await firstValueFrom(
        this.apiService.downloadFileAttachment(attachment)
      );

      // Determine file type
      const fileType = attachment.filename.endsWith('.pdf')
        ? 'application/pdf'
        : attachment.filename.endsWith('.docx')
        ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        : 'application/octet-stream';

      // Convert response to a Blob and then a File
      const file = new File([response], attachment.filename, {
        type: fileType,
      });

      // Store file in the attachment object
      attachment.file = file;

      return file;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`File download failed: ${errorMessage}`);
    }
  }

  // Upload attachments from a single email
  async uploadAttachments(email: Email): Promise<void> {
    if (
      (!email.attachments || email.attachments.length === 0) ||
      email.processed === true
    ) {
      return;
    }

    this.showPopupMessage(
      `Preparing to upload ${email.attachments.length} attachments...`,
      'info'
    );

    const files: File[] = [];

    // Download all attachments first
    for (const attachment of email.attachments) {
      let file = undefined;
      if (attachment.file) {
        file = attachment.file;
      } else {
        file = await this.downloadFile(attachment);

        this.indexedDbService.updateEmail(email).subscribe({
          next: () => console.log('Email updated successfully!'),
          error: (err) => console.error('Error updating email:', err),
        });
      }

      if (file) {
        files.push(file);
      }
    }

    if (files.length === 0) {
      this.showPopupMessage('No files were downloaded for upload', 'error');
      return;
    }

    // Find the first file field in the form
    const fileField = this.jobAppData?.formData?.fields?.find(
      (field: any) => field.type === 'file'
    );

    if (!fileField) {
      this.showPopupMessage('No file upload field found in the form', 'error');
      return;
    }

    // Add files to the fileSelections
    if (!this.fileSelections[email.email_id ?? fileField.key]) {
      this.fileSelections[email.email_id ?? fileField.key] = [];
    }

    // Add each file to the selections
    for (const file of files) {
      this.addFileWithDuplicateCheck(email.email_id ?? fileField.key, file);
    }

    this.showPopupMessage(
      `${files.length} files added to upload queue`,
      'success'
    );
  }

  // Upload all attachments from all emails
  async uploadAllAttachments(): Promise<void> {
    const allEmails = this.emails.filter(
      (email) =>
        (email.attachments &&
        email.attachments.length > 0) &&
        email.processed === false
    );

    if (allEmails.length === 0) {
      this.showPopupMessage('No attachments found to upload', 'info');
      return;
    }

    this.showPopupMessage(
      `Preparing to upload attachments from ${allEmails.length} emails...`,
      'info'
    );

    const files: File[] = [];

    // Download all attachments from all emails
    for (const email of allEmails) {
      for (const attachment of email.attachments) {
        let file = undefined;
        if (attachment.file) {
          file = attachment.file;
        } else {
          file = await this.downloadFile(attachment);
          this.indexedDbService.updateEmail(email).subscribe({
            next: () => console.log('Email updated successfully!'),
            error: (err) => console.error('Error updating email:', err),
          });
        }

        if (file) {
          files.push(file);
          const fileField = this.jobAppData?.formData?.fields?.find(
            (field: any) => field.type === 'file'
          );

          // Add files to the fileSelections
          if (!this.fileSelections[email.job_id ?? fileField!.key]) {
            this.fileSelections[email.job_id ?? fileField!.key] = [];
          }
          this.addFileWithDuplicateCheck(email.job_id ?? fileField!.key, file);
        }
      }
    }

    if (files.length === 0) {
      this.showPopupMessage('No files were downloaded for upload', 'error');
      return;
    }

    // Find the first file field in the form
    // const fileField = this.jobAppData?.formData?.fields?.find(
    //   (field: any) => field.type === 'file'
    // );

    // if (!fileField) {
    //   this.showPopupMessage('No file upload field found in the form', 'error');
    //   return;
    // }

    // Add files to the fileSelections
    // if (!this.fileSelections[email.email_id ?? fileField.key]) {
    //   this.fileSelections[fileField.key] = [];
    // }

    // Add each file to the selections
    // for (const file of files) {
    //   this.addFileWithDuplicateCheck(fileField.key, file);
    // }

    this.showPopupMessage(
      `${files.length} files added to upload queue`,
      'success'
    );
  }

  // View a file attachment
  async viewFile(attachment: EmailAttachment, email: Email): Promise<void> {
    this.showPopupMessage(
      `Preparing to view ${attachment.filename}...`,
      'info'
    );

    try {
      // Download the file if needed
      let file = undefined;

      if (attachment.file) {
        file = attachment.file;
      } else {
        file = await this.downloadFile(attachment);
        this.indexedDbService.updateEmail(email).subscribe({
          next: () => console.log('Email updated successfully!'),
          error: (err) => console.error('Error updating email:', err),
        });
      }

      if (!file) {
        this.showPopupMessage(
          `Failed to download ${attachment.filename} for viewing`,
          'error'
        );
        return;
      }

      // Create a URL for the file
      const fileURL = URL.createObjectURL(file);

      // Determine how to open the file based on its type
      const fileType = this.getFileType(attachment.filename);

      if (fileType.startsWith('image/')) {
        // For images, we can show them in a modal or new window
        this.openImageViewer(fileURL, attachment.filename);
      } else if (fileType === 'application/pdf') {
        // For PDFs, open in a new tab
        window.open(fileURL, '_blank');
      } else {
        // For other file types, trigger a download
        this.triggerDownload(fileURL, attachment.filename);
      }
    } catch (error) {
      console.error('Error viewing file:', error);
      this.showPopupMessage(`Error viewing ${attachment.filename}`, 'error');
    }
  }

  // Open image viewer (modal)
  openImageViewer(fileURL: string, filename: string): void {
    // Create a modal element
    const modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.zIndex = '9999';

    // Create close button
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.style.position = 'absolute';
    closeBtn.style.top = '20px';
    closeBtn.style.right = '20px';
    closeBtn.style.fontSize = '30px';
    closeBtn.style.color = 'white';
    closeBtn.style.background = 'none';
    closeBtn.style.border = 'none';
    closeBtn.style.cursor = 'pointer';

    // Create image element
    const img = document.createElement('img');
    img.src = fileURL;
    img.style.maxWidth = '90%';
    img.style.maxHeight = '90%';
    img.style.objectFit = 'contain';

    // Create filename caption
    const caption = document.createElement('div');
    caption.textContent = filename;
    caption.style.position = 'absolute';
    caption.style.bottom = '20px';
    caption.style.left = '0';
    caption.style.width = '100%';
    caption.style.textAlign = 'center';
    caption.style.color = 'white';
    caption.style.padding = '10px';

    // Add elements to modal
    modal.appendChild(closeBtn);
    modal.appendChild(img);
    modal.appendChild(caption);

    // Add modal to document
    document.body.appendChild(modal);

    // Close modal when close button is clicked
    closeBtn.addEventListener('click', () => {
      document.body.removeChild(modal);
      URL.revokeObjectURL(fileURL); // Clean up the URL object
    });

    // Close modal when clicking outside the image
    modal.addEventListener('click', (event) => {
      if (event.target === modal) {
        document.body.removeChild(modal);
        URL.revokeObjectURL(fileURL); // Clean up the URL object
      }
    });
  }

  // Trigger file download
  triggerDownload(fileURL: string, filename: string): void {
    const a = document.createElement('a');
    a.href = fileURL;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();

    // Clean up
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(fileURL);
    }, 100);
  }

  // Get file type based on extension
  getFileType(filename: string): string {
    const extension = filename.split('.').pop()?.toLowerCase() || '';

    switch (extension) {
      case 'pdf':
        return 'application/pdf';
      case 'doc':
        return 'application/msword';
      case 'docx':
        return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      case 'xls':
        return 'application/vnd.ms-excel';
      case 'xlsx':
        return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'gif':
        return 'image/gif';
      case 'svg':
        return 'image/svg+xml';
      case 'txt':
        return 'text/plain';
      case 'csv':
        return 'text/csv';
      case 'html':
        return 'text/html';
      case 'ppt':
        return 'application/vnd.ms-powerpoint';
      case 'pptx':
        return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
      case 'zip':
        return 'application/zip';
      case 'rar':
        return 'application/x-rar-compressed';
      case 'mp3':
        return 'audio/mpeg';
      case 'mp4':
        return 'video/mp4';
      case 'wav':
        return 'audio/wav';
      case 'avi':
        return 'video/x-msvideo';
      case 'mov':
        return 'video/quicktime';
      default:
        return 'application/octet-stream';
    }
  }

  // Add emails to the emailsAll array without duplicates
  addEmailsWithoutDuplicates(newEmails: Email[], provider: string): void {
    if (!this.emailsAll) {
      this.emailsAll = [];
    }

    // Add provider information to each email
    const jobpostId = this.route.snapshot.paramMap.get('jobId') || 'jobId';
    newEmails.forEach((email) => {
      email.provider = provider;
      email.job_id = jobpostId;
      email.processed = false;
    });

    // Filter out duplicates before adding to the array
    const uniqueNewEmails = newEmails.filter((newEmail) => {
      // Check if this email already exists in emailsAll
      // We're using a combination of sender and subject as a unique identifier
      // You might want to use a more reliable ID if available from the API
      return !this.emailsAll.some(
        (existingEmail) => existingEmail.email_id === newEmail.email_id
      );
    });

    // Add only unique emails to the array
    if (uniqueNewEmails.length > 0) {
      this.emailsAll.push(...uniqueNewEmails);

      // Log how many duplicates were found
      const duplicatesCount = newEmails.length - uniqueNewEmails.length;
      if (duplicatesCount > 0) {
        console.log(`Filtered out ${duplicatesCount} duplicate emails`);
      }
    }

    this.emails = this.emailsAll;
    this.emails.forEach((email) => {
      try {
        this.indexedDbService.addEmail(email).subscribe({
          next: () => console.log('Email stored successfully!'),
          error: (err) => console.error('Duplicate email detected:', err),
        });
      } catch (error) {}
    });
  }

  // Helper method to add files to fileSelections with duplicate checking
  addFileWithDuplicateCheck(fieldKey: string, file: File): void {
    // Initialize the array if it doesn't exist
    if (!this.fileSelections[fieldKey]) {
      this.fileSelections[fieldKey] = [];
    }

    // Check if a file with the same name already exists
    const existingIndex = this.fileSelections[fieldKey].findIndex(
      (existingFile) => existingFile.name === file.name
    );

    if (existingIndex >= 0) {
      // Replace the existing file with the new one
      this.fileSelections[fieldKey][existingIndex] = file;
      console.log(`Replaced existing file: ${file.name}`);
    } else {
      // Add the new file
      this.fileSelections[fieldKey].push(file);
      console.log(`Added new file: ${file.name}`);
    }
  }

  getfileSelections(): { key: string; index: number; file: File }[]{
    return Object.entries(this.fileSelections).flatMap(([key, files]) =>
      files.map((file, index) => ({ key, index, file }))
  );
  }

  removeFileFromFlattenedList(flatIndex: number): void {
    const flattenedFiles = this.getfileSelections();
    if (flatIndex >= 0 && flatIndex < flattenedFiles.length) {
        const { key, index } = flattenedFiles[flatIndex]; // Get original key and index
        this.removeFile(key, index);
    }
}

  // Close the popup
  close() {
    this.dataService.openDocumentsUpload = false;
  }
}
