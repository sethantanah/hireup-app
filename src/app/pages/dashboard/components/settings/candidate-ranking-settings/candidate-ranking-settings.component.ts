import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
} from '@angular/forms';
import { JobPostData } from '../../../../../models/jobpost.model';

export interface EvaluationMetric {
  score: string;
  weight: number;
}

export interface Requirement {
  evaluation_type?: string;
  document_type: string;
  criteria: string;
  evaluation_metrics: EvaluationMetric[];
}

@Component({
  selector: 'app-candidate-ranking-settings',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './candidate-ranking-settings.component.html',
  styleUrl: './candidate-ranking-settings.component.scss',
})
export class CandidateRankingSettingsComponent implements OnInit {
  @Input() applicationData?: JobPostData;
  @Input() title: string = "Candidate Ranking Settings"
  @Input() subtitle: string = "Configure how candidates are ranked"
  @Input() evaluationType: string = "ranking"
  @Output() saveChanges = new EventEmitter<any>();

  requirementsForm: FormGroup;
  documentTypes: string[] = [];
  savedRequirements: { [key: string]: Requirement } = {};

  constructor(private fb: FormBuilder) {
    this.requirementsForm = this.fb.group({
      requirements: this.fb.array([]),
    });
  }

  ngOnInit(): void {
    const defaultTypes = ['Form Data', 'Resume / CV', 'Cover Letter'];
    this.documentTypes = [...defaultTypes];

    if (this.applicationData?.formData) {
      const result = this.parseFields(this.applicationData.formData);
      if (result.fileFields) {
        result.fileFields.forEach((field: any) => {
          if (field.label && !this.documentTypes.includes(field.label)) {
            this.documentTypes.push(field.label);
          }
        });
      }
    }

    if (this.evaluationType === "ranking") {
      if (this.applicationData?.rankingSettings && Object.keys(this.applicationData.rankingSettings).length > 0) {
        this.savedRequirements = this.applicationData.rankingSettings;
        this.populateForm(this.applicationData.rankingSettings);
      }
    } else {
      if (this.applicationData?.shortListingSettings && Object.keys(this.applicationData.shortListingSettings).length > 0) {
        this.savedRequirements = this.applicationData.shortListingSettings;
        this.populateForm(this.applicationData.shortListingSettings);
      }
    }

    // Add a default requirement if empty
    if (this.requirements.length === 0) {
      this.addRequirement();
    }
  }

  populateForm(data: any) {
    this.requirements.clear();
    Object.values(data).forEach((requirement: any) => {
      const requirementGroup = this.fb.group({
        document_type: [requirement.document_type || 'Form Data'],
        criteria: [requirement.criteria || ''],
        evaluation_metrics: this.fb.array([])
      });

      const metricsArray = requirementGroup.get('evaluation_metrics') as FormArray;
      if (Array.isArray(requirement.evaluation_metrics)) {
        requirement.evaluation_metrics.forEach((metric: any) => {
          metricsArray.push(this.fb.group({
            score: [metric.score || ''],
            weight: [metric.weight ?? 50]
          }));
        });
      }

      this.requirements.push(requirementGroup);
    });
  }

  parseFields(data: any) {
    if (!data || !Array.isArray(data.fields)) {
      return { hasNonFileFields: true, fileFields: [] };
    }
    const nonFileFields = data.fields.some(
      (field: any) => field.type !== 'file'
    );
    const fileFields = data.fields.filter(
      (field: any) => field.type === 'file'
    );

    return {
      hasNonFileFields: nonFileFields,
      fileFields: fileFields,
    };
  }

  onDocumentTypeChange(event: any, index: number) {
    const selectedType = event.target.value;
    const savedData = this.savedRequirements[selectedType];

    if (savedData) {
      const requirementGroup = this.requirements.at(index);
      requirementGroup.patchValue({
        criteria: savedData.criteria,
      });

      // Clear existing metrics
      const metricsArray = requirementGroup.get(
        'evaluation_metrics'
      ) as FormArray;
      metricsArray.clear();

      // Add saved metrics
      if (Array.isArray(savedData.evaluation_metrics)) {
        savedData.evaluation_metrics.forEach((metric) => {
          metricsArray.push(
            this.fb.group({
              score: metric.score,
              weight: metric.weight,
            })
          );
        });
      }
    }
  }

  get requirements() {
    return this.requirementsForm.get('requirements') as FormArray;
  }

  addRequirement() {
    const requirementGroup = this.fb.group({
      document_type: [this.documentTypes[0] || 'Form Data'],
      criteria: [''],
      evaluation_metrics: this.fb.array([]),
    });
    // Add default metric
    const metricsArray = requirementGroup.get('evaluation_metrics') as FormArray;
    metricsArray.push(this.fb.group({
      score: ['General Qualification'],
      weight: [100]
    }));

    this.requirements.push(requirementGroup);
  }

  getEvaluationMetrics(requirementIndex: number) {
    return this.requirements
      .at(requirementIndex)
      .get('evaluation_metrics') as FormArray;
  }

  addEvaluationMetric(requirementIndex: number) {
    const metricGroup = this.fb.group({
      score: [''],
      weight: [50],
    });
    this.getEvaluationMetrics(requirementIndex).push(metricGroup);
  }

  removeRequirement(index: number) {
    this.requirements.removeAt(index);
  }

  removeEvaluationMetric(requirementIndex: number, metricIndex: number) {
    this.getEvaluationMetrics(requirementIndex).removeAt(metricIndex);
  }

  onSubmit() {
    const formValue = this.requirementsForm.value;
    this.savedRequirements = {};
    (formValue.requirements || []).forEach((requirement: Requirement) => {
      requirement.evaluation_type = this.evaluationType;
      const docType = requirement.document_type || 'Form Data';
      requirement.document_type = docType;
      this.savedRequirements[docType] = requirement;
    });

    const appData: any = this.applicationData || {
      templateId: '1',
      formData: { fields: [] }
    };

    if (this.evaluationType === "ranking") {
      appData.rankingSettings = this.savedRequirements;
    } else {
      appData.shortListingSettings = this.savedRequirements;
    }

    this.applicationData = appData;
    this.saveChanges.emit(this.applicationData);
  }
}
