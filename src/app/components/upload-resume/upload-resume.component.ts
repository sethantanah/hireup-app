import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';


interface FormField {
  type: 'text' | 'date' | 'email' | 'tel' | 'select' | 'file' | 'text-area';
  label: string;
  key: string;
  section: string;
  info: string[];
  required?: boolean;
  options?: string[]; // For select fields
}

interface FormData {
  title: string;
  description: string;
  fields: FormField[];
  submitButtonText: string;
  declaration: string;
  contactInfo: {
    email: string;
    phone: string;
    website: string;
    linkedin: string;
  };
}

interface ColorsScheme {
  primary: string;
  secondary: string;
}

interface SucessMessage {
  title: string;
  message: string
}

@Component({
  selector: 'app-upload-resume',
  imports: [CommonModule, FormsModule],
  templateUrl: './upload-resume.component.html',
  styleUrl: './upload-resume.component.scss'
})
export class UploadResumeComponent implements OnInit {
  @Input() formData: FormData | undefined;
  @Input() submissionMessage: SucessMessage = {
    title: 'Success!',
    message: 'Your application has been submitted successfully.',
  };
  @Input() colorScheme: ColorsScheme | undefined;

  // Fallback colors
  fallbackColors: ColorsScheme = {
    primary: '#282157',
    secondary: '#FF4E04',
  };


  formValues: { [key: string]: any } = {};
  uploadedFiles: { [key: string]: File } = {};

  isLoading: boolean = false;
  onError: boolean = false;
  showPopup: boolean = false;
  popupMessage: string = '';
  popupType: 'success' | 'error' = 'success';

  // Sections for tabs
  sections = ['general', 'personal-motivation', 'upload'];
  activeSection = this.sections[0]; // Default active section
  errors: any = {}; // Validation errors

  showSubmissionMessage = false; // Controls visibility of the success message

  constructor(private apiService: ApiService) {

  }

  ngOnInit(): void {
    // Initialize form values
    this.formData?.fields.forEach(field => {
      this.formValues[field.key] = '';
    });
    // Initialize checkbox value
    this.formValues['agreeToDeclaration'] = false;
  }

  onFileChange(event: Event, key: string): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
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
    const currentIndex = this.sections.indexOf(this.activeSection);
    if (currentIndex < this.sections.length - 1) {
      this.activeSection = this.sections[currentIndex + 1];
    }
  }

  // Navigate to the previous section
  goToPreviousSection() {
    const currentIndex = this.sections.indexOf(this.activeSection);
    if (currentIndex > 0) {
      this.activeSection = this.sections[currentIndex - 1];
    }
  }

  onSubmit(): void {
    this.onError = false;
    this.showPopup = false;
    // Create a FormData object
    const formData = new FormData();

    // Append form values to FormData

    formData.append('form_data', JSON.stringify(this.transformObject(this.formValues)));

    // Append uploaded files to FormData
    Object.keys(this.uploadedFiles).forEach(key => {
      formData.append(key, this.uploadedFiles[key]);
    });

    formData.append("projectId", this.apiService.project_id)


    // Validate all fields before submission
    this.formData?.fields.forEach((field: any) => {
      if (field.section === this.activeSection) {
        this.validateField(field);
      }
    });

    // Check if there are any errors
    if (Object.keys(this.errors).length > 0) {
      this.showPopup = true;
      this.popupType = 'error';
      this.popupMessage = 'Please fix the errors before submitting.';
      setTimeout(() => (this.showPopup = false), 3000);
      return;
    }

    // Proceed with form submission
    this.isLoading = true;
    this.apiService.submitForm(formData).subscribe({
      next: (data) => {
        this.isLoading = false;
        // this.resetFormData();
        this.showSubmissionMessage = true; // Show success message
        // this.showPopupMessage('Application submitted successfully!', 'success');
      },
      error: (error) => {
        console.error('Submission failed:', error);
        this.isLoading = false;
        this.onError = true;
        this.showPopupMessage('Failed to submit application. Please try again.', 'error');
      }

    })
  }

  showPopupMessage(message: string, type: 'success' | 'error'): void {
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
    Object.keys(this.formValues).forEach(key => {
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


  
  transformObject(input: any) {
    // Define a mapping of field names to their corresponding labels
    const labelMapping = {
      full_name: "Full Name",
      date_of_birth: "Date of Birth",
      email: "Email",
      phone_number: "Phone Number",
      residential_address: "Residential Address",
      highest_degree: "Highest Degree",
      field_of_study: "Field of Study",
      institution_name: "Institution Name",
      year_of_graduation: "Year of Graduation",
      occupation: "Occupation",
      organization: "Organization",
      years_of_experience: "Years of Experience",
      personal_motivation: "Personal Motivation",
      "community-involvement": "Community Involvement",
      professional_improvement: "Professional Improvement",
      mentor: "Mentor",
      time_management: "Time Management",
      participation_availability: "Participation Availability",
      availability: "Availability",
      availability_hours: "Availability Hours",
      cv: "CV",
      reference_letter: "Reference Letter",
      agree_to_declaration: "Agree to Declaration",
    };
  
    // Transform the input object
    const transformedObject:any = {};
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