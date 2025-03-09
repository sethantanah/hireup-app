import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import {
  FormArrayName,
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ApiService } from '../../../../services/api.service';
import { ColorScheme, JobPostData } from '../../../../models/jobpost.model';
import { FormattingService } from '../../../../services/formatting.service';
import { animate, style, transition, trigger } from '@angular/animations';
import { ActivatedRoute } from '@angular/router';

interface ColorsScheme {
  primary: string;
  secondary: string;
}

@Component({
  selector: 'app-templates-manager',
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './templates-manager.component.html',
  styleUrl: './templates-manager.component.scss',
  animations: [
    trigger('slideDown', [
      transition(':enter', [
        style({ height: 0, opacity: 0 }),
        animate('200ms ease-out', style({ height: '*', opacity: 1 })),
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ height: 0, opacity: 0 })),
      ]),
    ]),
  ],
})
export class TemplatesManagerComponent implements OnInit {
  @Input() jobPostId: string | undefined;
  @Input() jobAppData: JobPostData | undefined;
  @Input() templateId: string = '1';
  @Input() mode: string = 'testing';
  @Input() formOnly: boolean = false;
  form: FormGroup | undefined; // FormGroup for the user-facing form

  // Fallback colors
  colorScheme: ColorScheme = {
    primary: '#282157',
    secondary: '#FF4E04',
  };

  formValues: { [key: string]: any } = {};
  uploadedFiles: { [key: string]: File } = {};

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

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private apiService: ApiService,
    public formattingService: FormattingService
  ) {
    this.form = this.fb.group({});
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
      this.form?.addControl(field.key, this.fb.control('', validators));
    });

    // Initialize checkbox value
    this.formValues['agreeToDeclaration'] = false;
  }

  // Build the user-facing form based on the formFields array
  buildForm(): void {
    const formGroup: { [key: string]: any } = {};
    this.jobAppData?.formData.fields.forEach((field) => {
      formGroup[field.key] = new FormControl({
        name: field.key,
        value: '', // Initial value
        validators: field.required ? Validators.required : null, // Validators
      });
    });
    this.form = this.fb.group(formGroup);
  }

  onFileChange(event: Event, key: string): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const fileField = this.jobAppData?.formData.fields.filter(
        (field) => field.key == key
      )[0];

      const matchFileType = input.files
        ? fileField?.acceptedTypes
            ?.toString()
            .split(',')
            .filter((type) => {
              return (
                type == `.${input.files![0].type.split('/')[1]}` ||
                type == `${input.files![0].type.split('/')[1]}`
              );
            })
        : [];

      if (matchFileType?.length === 0) {
        this.showPopup = true;
        this.popupType = 'error';
        this.popupMessage = `You have selected an unsupported file type for ${fileField?.label}`;
        setTimeout(() => (this.showPopup = false), 5000);
        return;
      }
      this.uploadedFiles[key] = input.files[0];
      delete this.errors[key];
    }
  }

  validateField(field: any) {
    let value = this.formValues[field.key];
    if (field.type === 'file') {
      value = this.uploadedFiles[field.key];
    }

    // Reset error for the field
    delete this.errors[field.key];

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

      // case 'date':
      //   if (!this.isValidDate(value)) {
      //     this.errors[field.key] = 'Please enter a valid date.';
      //   }
      //   break;

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

      case 'file':
        if (field.required && !this.uploadedFiles[field.key]) {
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

    const formattedData = this.formatData(
      this.form?.value,
      this.jobAppData!.formData.fields
    );

    // Create a FormData object
    const formData = new FormData();

    // Validate all fields before submission
    this.jobAppData?.formData?.fields.forEach((field: any) => {
      if (field.section === this.activeSection) {
        this.validateField(field);
      }
    });

    if (this.jobPostId) {
      formData.append('jobPostId', this.jobPostId);
      // Proceed with form submission
      this.isLoading = true;
      this.isSubmitting = true;

      if (this.jobAppData!.applySection.declaration.length > 0) {
        formattedData['accept_declaration'] = {
          label: 'Accept Declaration',
          value: this.getCheckboxValue() ? 'Yes' : 'No',
        };
      }

      // Append form values to FormData
      formData.append('form_data', JSON.stringify(formattedData));

      // Append uploaded files to FormData
      Object.keys(this.uploadedFiles).forEach((key) => {
        formData.append('files', this.uploadedFiles[key]);
      });

      if (this.mode === 'testing') {
        this.simulateSubmission();
      } else {
        this.submit(formData);
      }
    }
  }

  submit(formData: any) {
    this.apiService.submitForm(formData).subscribe({
      next: (data) => {
        this.isSubmitting = false;
        this.isLoading = false;
        this.showSubmissionMessage = true; // Show success message
        this.form?.reset();
      },
      error: (error) => {
        console.error('Submission failed:', error);
        this.isSubmitting = false;
        this.isLoading = false;
        this.onError = true;
        this.showPopupMessage(
          'Failed to submit application. Please try again.',
          'error'
        );
      },
    });
  }

  simulateSubmission() {
    // Simulate form submission
    setTimeout(() => {
      this.isSubmitting = false;

      if (Math.random() > 0.5) {
        // Success
        this.showSubmissionMessage = true;
        this.form?.reset();
      } else {
        // Error
        this.showError = true;
        setTimeout(() => (this.showError = false), 3000); // Hide error after 3 seconds
      }
    }, 2000); // Simulate 2-second delay
  }

  showPopupMessage(
    message: string,
    type: 'success' | 'error' | 'warning' | 'info'
  ): void {
    this.popupMessage = message;
    this.popupType = type;
    this.showPopup = true;

    // Hide the popup after 5 seconds
    setTimeout(() => {
      this.showPopup = false;
    }, 10000);
  }

  resetFormData(): void {
    // Clear form values
    Object.keys(this.formValues).forEach((key) => {
      this.formValues[key] = '';
    });

    // Clear uploaded files
    this.uploadedFiles = {};

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

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }

  formatData(
    data: { [key: string]: string },
    fields: any[]
  ): { [key: string]: { value: string; label: string } } {
    const formattedData: { [key: string]: { value: string; label: string } } =
      {};

    fields.forEach((field) => {
      const key = field.key; // Key from the fields array
      const label = field.label.toLowerCase().replace(/ /g, '_'); // Convert label to lowercase with underscores
      const value = data[key] || ''; // Get value from data or default to empty string

      formattedData[label] = {
        value,
        label: field.label, // Original label
      };
    });

    return formattedData;
  }

  transformObject(input: any) {
    // Define a mapping of field names to their corresponding labels
    const labelMapping = {
      full_name: 'Full Name',
      date_of_birth: 'Date of Birth',
      email: 'Email',
      phone_number: 'Phone Number',
      residential_address: 'Residential Address',
      highest_degree: 'Highest Degree',
      field_of_study: 'Field of Study',
      institution_name: 'Institution Name',
      year_of_graduation: 'Year of Graduation',
      occupation: 'Occupation',
      organization: 'Organization',
      years_of_experience: 'Years of Experience',
      personal_motivation: 'Personal Motivation',
      'community-involvement': 'Community Involvement',
      professional_improvement: 'Professional Improvement',
      mentor: 'Mentor',
      time_management: 'Time Management',
      participation_availability: 'Participation Availability',
      availability: 'Availability',
      availability_hours: 'Availability Hours',
      cv: 'CV',
      reference_letter: 'Reference Letter',
      agree_to_declaration: 'Agree to Declaration',
    };

    // Transform the input object
    const transformedObject: any = {};
    for (const key in input) {
      if (labelMapping.hasOwnProperty(key)) {
        transformedObject[key] = {
          label: labelMapping[key as keyof typeof labelMapping],
          value: input[key],
        };
      } else {
        // If the key is not in the mapping, use the key itself as the label
        transformedObject[key] = {
          label: key,
          value: input[key],
        };
      }
    }

    return transformedObject;
  }
}
