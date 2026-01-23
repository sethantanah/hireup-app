import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { ApplicationStage, StageMetrics } from '../../../../../../models/jobpost.model';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { JobpostManagerService } from '../../../../../../services/jobpost-manager.service';

@Component({
  selector: 'app-application-stages',
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './application-stages.component.html',
  styleUrl: './application-stages.component.scss'
})
export class ApplicationStagesComponent implements OnInit {
  @Input() applicationStages: ApplicationStage[] = [];
  @Input() jobpostId: string = '';
  @Output() stagesChange = new EventEmitter<ApplicationStage[]>();

  defaultStages: ApplicationStage[] = []

  stageTypes = [
    { value: 'standard', label: 'Standard', description: 'Basic progression stage' },
    { value: 'evaluation', label: 'Evaluation', description: 'Assessment or testing stage' },
    { value: 'approval', label: 'Approval', description: 'Requires team approval' },
    { value: 'notification', label: 'Notification', description: 'Communication stage' }
  ];

  constructor(
    private jobPostService: JobpostManagerService
  ) {
    this.defaultStages = jobPostService.defaultStages;
  }

  ngOnInit() {
    if (!this.applicationStages || this.applicationStages.length === 0) {
      this.initializeDefaultStages();
    } else {
      // Ensure all stages have proper metrics initialized
      this.applicationStages.forEach(stage => {
        if (!stage.metrics) {
          stage.metrics = this.jobPostService.createDefaultMetrics(stage.id, this.jobpostId);
        }
      });
    }
  }


  initializeDefaultStages() {
    this.applicationStages = this.defaultStages.map(stage => ({
      ...stage,
      jobpost_id: this.jobpostId,
      metrics: this.jobPostService.createDefaultMetrics(stage.id, this.jobpostId)
    }));
    this.stagesChange.emit(this.applicationStages);
  }

  addStage() {
    const newStage: ApplicationStage = {
      id: this.generateId(),
      jobpost_id: this.jobpostId,
      name: 'New Stage',
      description: 'Stage description',
      order: this.applicationStages.length + 1,
      is_active: true,
      is_skippable: false,
      stage_type: 'standard',
      required_approvals: 1,
      auto_advance_days: 3,
      email_template_id: undefined,
      metrics: this.jobPostService.createDefaultMetrics(this.generateId(), this.jobpostId)
    };
    this.applicationStages.push(newStage);
    this.updateStageOrders();
    this.stagesChange.emit(this.applicationStages);
  }

  deleteStage(index: number) {
    const appStage = this.applicationStages[index];
    appStage.hide_stage = !appStage.hide_stage;
    appStage.is_active = !appStage.is_active;
    
    this.applicationStages[index] = appStage;
    this.updateStageOrders();
    this.stagesChange.emit(this.applicationStages);
  }

  moveStageUp(index: number) {
    if (index > 0) {
      [this.applicationStages[index], this.applicationStages[index - 1]] =
        [this.applicationStages[index - 1], this.applicationStages[index]];
      this.updateStageOrders();
      this.stagesChange.emit(this.applicationStages);
    }
  }

  moveStageDown(index: number) {
    if (index < this.applicationStages.length - 1) {
      [this.applicationStages[index], this.applicationStages[index + 1]] =
        [this.applicationStages[index + 1], this.applicationStages[index]];
      this.updateStageOrders();
      this.stagesChange.emit(this.applicationStages);
    }
  }

  updateStageOrders() {
    this.applicationStages.forEach((stage, index) => {
      stage.order = index + 1;
    });
  }

  onStageChange() {
    this.stagesChange.emit(this.applicationStages);
  }

  toggleStageActive(stage: ApplicationStage) {
    stage.is_active = !stage.is_active;
    this.onStageChange();
  }

  toggleStageSkippable(stage: ApplicationStage) {
    stage.is_skippable = !stage.is_skippable;
    this.onStageChange();
  }

  onStageTypeChange(stage: ApplicationStage) {
    // Set default values based on stage type
    switch (stage.stage_type) {
      case 'approval':
        stage.required_approvals = stage.required_approvals || 2;
        break;
      case 'notification':
        stage.required_approvals = undefined;
        stage.auto_advance_days = 1;
        break;
      case 'evaluation':
        stage.required_approvals = 1;
        stage.auto_advance_days = stage.auto_advance_days || 5;
        break;
      default:
        stage.required_approvals = 1;
        stage.auto_advance_days = stage.auto_advance_days || 3;
    }
    this.onStageChange();
  }

  getStageTypeDescription(stageType: string): string {
    const type = this.stageTypes.find(t => t.value === stageType);
    return type?.description || '';
  }

  generateId(): string {
    return 'stage_' + Math.random().toString(36).substr(2, 9);
  }

  trackByFn(index: number, item: ApplicationStage): string {
    return item.id;
  }

  // Helper methods for template
  shouldShowApprovals(stage: ApplicationStage): boolean {
    return stage.stage_type === 'approval' || stage.stage_type === 'evaluation';
  }

  shouldShowAutoAdvance(stage: ApplicationStage): boolean {
    return stage.stage_type !== 'notification';
  }



  // Add these methods to the component class:

  getStageTypeLabel(stageType: string): string {
    const type = this.stageTypes.find(t => t.value === stageType);
    return type?.label || stageType;
  }

  getActiveStagesCount(): number {
    return this.applicationStages.filter(stage => stage.is_active).length;
  }

  getSkippableStagesCount(): number {
    return this.applicationStages.filter(stage => stage.is_skippable).length;
  }

  getTotalEstimatedTime(): number {
    return this.applicationStages
      .filter(stage => stage.is_active && stage.auto_advance_days)
      .reduce((total, stage) => total + (stage.auto_advance_days || 0), 0);
  }

  getStagesByType(stageType: string): ApplicationStage[] {
    return this.applicationStages.filter(stage => stage.stage_type === stageType);
  }
}