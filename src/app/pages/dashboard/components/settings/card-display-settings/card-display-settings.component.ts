import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface FieldSettings {
  key: string;
  label: string;
  visible: boolean;
  section: string;
}

import { Pipe, PipeTransform } from '@angular/core';
import { FormField, JobPostData } from '../../../../../models/jobpost.model';
import { JobpostManagerService } from '../../../../../services/jobpost-manager.service';

@Pipe({
  name: 'filterBySection',
})
export class FilterBySectionPipe implements PipeTransform {
  transform(items: any[], section: string): any[] {
    return items.filter((item) => item.section === section);
  }
}

@Component({
  selector: 'app-card-display-settings',
  imports: [CommonModule, FormsModule, FilterBySectionPipe],
  templateUrl: './card-display-settings.component.html',
  styleUrl: './card-display-settings.component.scss',
})
export class CardDisplaySettingsComponent implements OnInit {
  @Input() applicationData!: JobPostData;
  @Output() saveChanges = new EventEmitter<any>();

  formFields: FormField[] = [];
  fieldSettings: FieldSettings[] = [];
  sections: string[] = [];

  constructor(private jobPostService: JobpostManagerService) {}

  ngOnInit() {
    this.formFields = this.applicationData.formData.fields;
    this.initializeSettings();
  }

  private initializeSettings() {
    this.sections = [...new Set(this.formFields.map((field) => field.section))];
    this.fieldSettings = this.formFields.map((field) => ({
      key: field.key,
      label: field.label,
      visible:
        this.applicationData.cardSettings?.includes(
          field.label.toLowerCase().replace(/ /g, '_')
        ) ?? false,
      section: field.section,
    }));
  }

  saveSettings() {
    const selectedFields = this.fieldSettings
      .filter((field) => field.visible)
      .map((field) => field.label.toLowerCase().replace(/ /g, '_'));

    this.applicationData.cardSettings = selectedFields;
    this.saveChanges.emit(this.applicationData);
  }
}
