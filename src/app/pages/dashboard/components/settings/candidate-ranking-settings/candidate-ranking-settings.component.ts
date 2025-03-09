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
  @Input() applicationData!: JobPostData;
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
    const result = this.parseFields(this.applicationData.formData);
    if (result.hasNonFileFields) {
      this.documentTypes.push('Form Data');
    }

    if (result.fileFields) {
      result.fileFields.forEach((field: any) => {
        this.documentTypes.push(field.label);
      });
    }

    console.log(this.applicationData.rankingSettings)

    if (this.applicationData.rankingSettings) {
      this.savedRequirements = this.applicationData.rankingSettings;
      this.populateForm(this.applicationData.rankingSettings);
    }
  }


  populateForm(data: any) {
    Object.values(data).forEach((requirement: any) => {
      const requirementGroup = this.fb.group({
        document_type: [requirement.document_type],
        criteria: [requirement.criteria],
        evaluation_metrics: this.fb.array([])
      });

      const metricsArray = requirementGroup.get('evaluation_metrics') as FormArray;
      requirement.evaluation_metrics.forEach((metric: any) => {
        metricsArray.push(this.fb.group({
          score: [metric.score],
          weight: [metric.weight]
        }));
      });

      this.requirements.push(requirementGroup);
    });
  }


  parseFields(data: any) {
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

  get requirements() {
    return this.requirementsForm.get('requirements') as FormArray;
  }

  addRequirement() {
    const requirementGroup = this.fb.group({
      document_type: [''],
      criteria: [''],
      evaluation_metrics: this.fb.array([]),
    });
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
    formValue.requirements.forEach((requirement: Requirement) => {
      this.savedRequirements[requirement.document_type] = requirement;
    });

    if (this.applicationData) {
      this.applicationData.rankingSettings = this.savedRequirements;
      this.saveChanges.emit(this.applicationData);
    }
  }
}
