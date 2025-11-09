import { Component, EventEmitter, Output } from '@angular/core';
import { JobpostManagerService } from '../../../../../../services/jobpost-manager.service';
import { FormField, JobPostData } from '../../../../../../models/jobpost.model';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FormattingService } from '../../../../../../services/formatting.service';

@Component({
  selector: 'app-dynamic-form',
  imports: [CommonModule, FormsModule],
  templateUrl: './dynamic-form.component.html',
  styleUrl: './dynamic-form.component.scss',
})
export class DynamicFormComponent {
  sections: string[] = ['General']; // Array of section names
  fields: FormField[] = []; // All fields across sections
  selectedSection: string = this.sections[0];
  showSectionPopup: boolean = false;
  showFieldPopup: boolean = false;
  showDeleteSectionPopup: boolean = false;
  sectionToDelete: string = '';
  newSectionName: string = '';

  // Add these properties
  showUpdateSectionPopup = false;
  updatedSectionName = '';
  sectionToUpdate = '';

  showUpdateFieldPopup = false;
  showMarkdownGuide = false

  newField: FormField = {
    type: 'text',
    label: '',
    key: '',
    required: false,
    section: this.selectedSection,
    min_length: '',
    max_length: '',
    instructions: '',
  };
  fieldTypes = ['text', 'date', 'email', 'tel', 'select', 'textarea', 'file'];

  constructor(
    private jobPostService: JobpostManagerService,
    public formattingService: FormattingService
  ) {
    const applicationData: JobPostData = jobPostService.getApplicationData();
    this.fields = applicationData.formData.fields;
    this.sections = applicationData.sections;
    this.selectedSection = this.sections[0];

    setInterval(() => {
     const applicationData: JobPostData = jobPostService.getApplicationData();
     applicationData.formData.fields = this.fields;
     applicationData.sections = this.sections;
     this.jobPostService.updateApplicationData(applicationData);
    }, 3000);
  }

  // Open the section popup
  openSectionPopup(): void {
    this.newSectionName = '';
    this.showSectionPopup = true;
  }

  // Add a new section
  addSection(): void {
    if (this.newSectionName && !this.sections.includes(this.newSectionName)) {
      this.sections.push(this.newSectionName);
      if (!this.selectedSection) {
        this.selectedSection = this.newSectionName; // Auto-select the first section
      }
    }
    this.showSectionPopup = false;
  }

  // Open the delete section confirmation popup
  openDeleteSectionPopup(sectionName: string): void {
    this.sectionToDelete = sectionName;
    this.showDeleteSectionPopup = true;
  }

  // Delete a section
  deleteSection(): void {
    this.sections = this.sections.filter(
      (section) => section !== this.sectionToDelete
    );
    this.fields = this.fields.filter(
      (field) => field.section !== this.sectionToDelete
    );
    if (this.selectedSection === this.sectionToDelete) {
      this.selectedSection = this.sections[0] || ''; // Select the first section if available
    }
    this.showDeleteSectionPopup = false;
  }

  // Open the field popup
  openFieldPopup(): void {
    this.newField = {
      type: 'text',
      label: '',
      key: '',
      required: false,
      section: this.selectedSection,
      min_length: '',
      max_length: '',
      instructions: '',
    };
    this.showFieldPopup = true;
    this.showUpdateFieldPopup = false;
  }

  openUpdateFieldPopup(field: FormField) {
    this.showUpdateFieldPopup = true;
    this.showFieldPopup = true;
    this.newField = { ...field };
  }

  // Add a new field
  addField(): void {
    this.newField.key = this.generateUniqueId();
    this.fields.push({ ...this.newField });
    this.showFieldPopup = false;
  }

  updateField() {
    const index = this.fields.findIndex((f) => f.key === this.newField.key);
    if (index !== -1) {
      this.fields[index] = { ...this.newField };
    }
    this.showUpdateFieldPopup = false;
    this.newField = this.newField;
  }

  addOption() {
    if (!this.newField.options) {
      this.newField.options = [];
    }
    this.newField.options.push('');
  }

  initializeField() {
    return {
      section: '',
      type: '',
      label: '',
      required: false,
      instructions: '',
      options: [],
      minLength: null,
      maxLength: null,
      minDate: null,
      maxDate: null,
      pattern: null,
      acceptedTypes: '',
      maxSize: null,
    };
  }

  // Delete a field
  deleteField(fieldKey: string): void {
    this.fields = this.fields.filter((field) => field.key !== fieldKey);
  }

  removeOption(index: number) {
    if (this.newField.options) {
      this.newField.options.splice(index, 1);
    }
  }

  addUpdateOption() {
    if (!this.newField.options) {
      this.newField.options = [];
    }
    this.newField.options.push('');
  }

  // Add this method
  openUpdateSectionPopup(section: string) {
    this.showUpdateSectionPopup = true;
    this.sectionToUpdate = section;
    this.updatedSectionName = section;
  }

  closeDialog(event?: any) {
    if (event) {
      // Close only if clicking the backdrop
      if (event.target === event.currentTarget) {
        this.showFieldPopup = false;
      }
    } else {
      this.showFieldPopup = false;
    }
    this.showUpdateSectionPopup = false;
  }

  saveField() {
    this.updateField();
    this.showFieldPopup = false;
    this.showUpdateSectionPopup = false;
  }

  closeUpdateSectionPopUp() {
    this.showUpdateSectionPopup = false;
    this.newField = {
      type: 'text',
      label: '',
      key: '',
      required: false,
      section: this.selectedSection,
      min_length: '',
      max_length: '',
      instructions: '',
    };
  }

  updateSection() {
    const index = this.sections.indexOf(this.sectionToUpdate);
    if (index !== -1) {
      this.sections[index] = this.updatedSectionName;
      // Update any fields associated with this section
      this.fields = this.fields.map((field) => {
        if (field.section === this.sectionToUpdate) {
          return { ...field, section: this.updatedSectionName };
        }
        return field;
      });
    }
    this.selectedSection = this.updatedSectionName;
    this.showUpdateSectionPopup = false;
    this.sectionToUpdate = '';
    this.updatedSectionName = '';
  }

  // Get fields for the selected section
  getFieldsBySection(sectionName: string): FormField[] {
    return this.fields.filter((field) => field.section === sectionName);
  }

  // Generate a unique ID for fields
  private generateUniqueId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  getFieldTypeIcon(type: string): string {
    const icons = {
      text: 'fas fa-font',
      date: 'fas fa-calendar',
      tel: 'fas fa-phone',
      textarea: 'fas fa-paragraph',
      select: 'fas fa-list',
      file: 'fas fa-file-upload',
    };
    return icons[type as keyof typeof icons] || 'fas fa-question';
  }
}
