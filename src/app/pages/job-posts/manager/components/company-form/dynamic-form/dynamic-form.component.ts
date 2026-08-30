import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
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
export class DynamicFormComponent implements OnInit, OnDestroy {
  @Input() formType: string = "Application Form";
  @Output() formChange = new EventEmitter<JobPostData>();

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
  showMarkdownGuide = false;
  private syncTimer: any;

  newField: FormField = {
    type: 'text',
    label: '',
    key: '',
    required: false,
    section: this.selectedSection,
    min_length: '',
    max_length: '',
    instructions: '',
    allowMultiSelect: false,
    allowOther: false,
    options: [],
  };
  fieldTypes = ['text', 'date', 'email', 'tel', 'select', 'checkbox', 'textarea', 'file'];

  constructor(
    private jobPostService: JobpostManagerService,
    public formattingService: FormattingService
  ) {}

  ngOnInit(): void {
    const applicationData: JobPostData = this.jobPostService.getApplicationData();

    if (this.formType === "Application Form") {
      this.fields = applicationData.formData?.fields || [];
      this.sections = applicationData.sections && applicationData.sections.length > 0 ? applicationData.sections : ['General'];
      this.selectedSection = this.sections[0] || 'General';
    } else {
      if (applicationData.requestForDataForm) {
        this.fields = applicationData.requestForDataForm.fields || [];
        this.sections = applicationData.additionalSections || ["Personal Details"];
        this.selectedSection = this.sections[0] || "Personal Details";
      } else {
        applicationData.requestForDataForm = { fields: [] };
        this.fields = applicationData.requestForDataForm.fields;
        this.sections = applicationData.additionalSections || ["Personal Details"];
        this.selectedSection = this.sections[0] || "Personal Details";
      }
    }

    this.syncTimer = setInterval(() => {
      this.syncData();
    }, 2000);
  }

  ngOnDestroy(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }
    this.syncData();
  }

  syncData(): void {
    const applicationData: JobPostData = this.jobPostService.getApplicationData();
    if (this.formType === "Application Form") {
      if (!applicationData.formData) {
        applicationData.formData = { fields: [] };
      }
      applicationData.formData.fields = [...this.fields];
      applicationData.sections = [...this.sections];
    } else {
      if (!applicationData.requestForDataForm) {
        applicationData.requestForDataForm = { fields: [] };
      }
      applicationData.requestForDataForm.fields = [...this.fields];
      applicationData.additionalSections = [...this.sections];
    }

    this.jobPostService.updateApplicationData(applicationData);
    this.formChange.emit(applicationData);
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
      this.syncData();
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
    this.syncData();
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
      allowMultiSelect: false,
      allowOther: false,
      options: [],
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
    this.syncData();
  }

  updateField() {
    const index = this.fields.findIndex((f) => f.key === this.newField.key);
    if (index !== -1) {
      this.fields[index] = { ...this.newField };
    }
    this.showUpdateFieldPopup = false;
    this.showFieldPopup = false;
    this.syncData();
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
    this.syncData();
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

  hasDelimiters(text?: string): boolean {
    return !!text && (text.includes(',') || text.includes(';'));
  }

  splitOption(index: number): void {
    if (!this.newField.options || index < 0 || index >= this.newField.options.length) {
      return;
    }
    const raw = this.newField.options[index];
    if (!raw) return;

    const items = raw
      .split(/[,;]/)
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    if (items.length > 0) {
      this.newField.options.splice(index, 1, ...items);
    }
  }

  splitAllDelimitedOptions(): void {
    if (!this.newField.options) return;
    const newOptions: string[] = [];
    this.newField.options.forEach((opt) => {
      if (opt && (opt.includes(',') || opt.includes(';'))) {
        const splitItems = opt
          .split(/[,;]/)
          .map((i) => i.trim())
          .filter((i) => i.length > 0);
        newOptions.push(...splitItems);
      } else if (opt && opt.trim().length > 0) {
        newOptions.push(opt.trim());
      }
    });
    this.newField.options = newOptions;
  }

  handleOptionPaste(event: ClipboardEvent, index: number): void {
    const pastedText = event.clipboardData?.getData('text');
    if (pastedText && (pastedText.includes(',') || pastedText.includes(';'))) {
      event.preventDefault();
      const splitItems = pastedText
        .split(/[,;]/)
        .map((i) => i.trim())
        .filter((i) => i.length > 0);

      if (!this.newField.options) {
        this.newField.options = [];
      }
      if (splitItems.length > 0) {
        if (this.newField.options[index] === '' || !this.newField.options[index]) {
          this.newField.options.splice(index, 1, ...splitItems);
        } else {
          this.newField.options.splice(index + 1, 0, ...splitItems);
        }
      }
    }
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
    this.syncData();
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
      select: 'fas fa-list-ul',
      checkbox: 'fas fa-check-square',
      file: 'fas fa-file-upload',
      email: 'fas fa-envelope',
    };
    return icons[type as keyof typeof icons] || 'fas fa-align-left';
  }
}
