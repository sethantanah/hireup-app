import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ApplicationStage, StageMetrics } from '../../../../../../models/jobpost.model';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { JobpostManagerService } from '../../../../../../services/jobpost-manager.service';
import { AlertService } from '../../../../../../services/alert.service';

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

  defaultStages: ApplicationStage[] = [];

  stageTypes = [
    { value: 'standard', label: 'Standard', description: 'Basic progression & document review stage' },
    { value: 'evaluation', label: 'Evaluation', description: 'Assessment, coding challenge or skill test' },
    { value: 'approval', label: 'Approval', description: 'Requires review and approval by team lead' },
    { value: 'notification', label: 'Notification', description: 'Automated candidate notification step' }
  ];

  availableIcons = [
    { value: 'fa-clipboard-check', label: 'Review' },
    { value: 'fa-comments', label: 'Interview' },
    { value: 'fa-laptop-code', label: 'Assessment' },
    { value: 'fa-user-check', label: 'Approval' },
    { value: 'fa-award', label: 'Offer' },
    { value: 'fa-paper-plane', label: 'Notification' }
  ];

  availableColors = [
    { value: 'indigo', label: 'Indigo', bgClass: 'bg-indigo-50 border-indigo-200 text-indigo-700' },
    { value: 'emerald', label: 'Emerald', bgClass: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
    { value: 'amber', label: 'Amber', bgClass: 'bg-amber-50 border-amber-200 text-amber-700' },
    { value: 'purple', label: 'Purple', bgClass: 'bg-purple-50 border-purple-200 text-purple-700' },
    { value: 'rose', label: 'Rose', bgClass: 'bg-rose-50 border-rose-200 text-rose-700' },
    { value: 'cyan', label: 'Cyan', bgClass: 'bg-cyan-50 border-cyan-200 text-cyan-700' }
  ];

  emailTemplatesList = [
    { id: 'template_invite', name: 'Interview Invitation' },
    { id: 'template_assessment', name: 'Technical Assessment Request' },
    { id: 'template_offer', name: 'Official Offer Letter' },
    { id: 'template_update', name: 'Status Update' }
  ];

  constructor(
    private jobPostService: JobpostManagerService,
    private alertService: AlertService,
    private router: Router
  ) {
    this.defaultStages = jobPostService.defaultStages;
  }

  navigateToStage(stage: ApplicationStage): void {
    if (this.jobpostId && stage?.id) {
      this.router.navigate([`/jobposts/applicants/${this.jobpostId}/${stage.id}`]);
    }
  }

  ngOnInit() {
    if (!this.applicationStages || this.applicationStages.length === 0) {
      this.initializeDefaultStages();
    } else {
      this.applicationStages.forEach(stage => {
        if (!stage.metrics) {
          stage.metrics = this.jobPostService.createDefaultMetrics(stage.id, this.jobpostId);
        }
        if (!stage.badge_color) {
          stage.badge_color = this.getDefaultColorForType(stage.stage_type);
        }
      });
    }
  }

  initializeDefaultStages() {
    this.applicationStages = this.defaultStages.map(stage => ({
      ...stage,
      jobpost_id: this.jobpostId,
      badge_color: this.getDefaultColorForType(stage.stage_type),
      metrics: this.jobPostService.createDefaultMetrics(stage.id, this.jobpostId)
    }));
    this.stagesChange.emit(this.applicationStages);
    this.alertService.showSuccess('Pipeline stages reset to enterprise default template');
  }

  addStage() {
    const newStage: ApplicationStage = {
      id: this.generateId(),
      jobpost_id: this.jobpostId,
      name: 'Custom Pipeline Stage',
      description: 'Define custom criteria and actions for this recruitment phase',
      order: this.applicationStages.length + 1,
      is_active: true,
      is_skippable: false,
      stage_type: 'standard',
      required_approvals: 1,
      auto_advance_days: 3,
      badge_color: 'indigo',
      icon: 'fa-clipboard-check',
      metrics: this.jobPostService.createDefaultMetrics(this.generateId(), this.jobpostId)
    };
    this.applicationStages.push(newStage);
    this.updateStageOrders();
    this.stagesChange.emit(this.applicationStages);
    this.alertService.showSuccess('New hiring stage added');
  }

  duplicateStage(index: number) {
    const stageToCopy = this.applicationStages[index];
    const duplicated: ApplicationStage = {
      ...stageToCopy,
      id: this.generateId(),
      name: `${stageToCopy.name} (Copy)`,
      order: index + 2,
      metrics: this.jobPostService.createDefaultMetrics(this.generateId(), this.jobpostId)
    };
    this.applicationStages.splice(index + 1, 0, duplicated);
    this.updateStageOrders();
    this.stagesChange.emit(this.applicationStages);
    this.alertService.showSuccess(`Stage '${stageToCopy.name}' duplicated`);
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
    switch (stage.stage_type) {
      case 'approval':
        stage.required_approvals = stage.required_approvals || 2;
        stage.badge_color = 'amber';
        break;
      case 'notification':
        stage.required_approvals = undefined;
        stage.auto_advance_days = 1;
        stage.badge_color = 'cyan';
        break;
      case 'evaluation':
        stage.required_approvals = 1;
        stage.auto_advance_days = stage.auto_advance_days || 5;
        stage.badge_color = 'purple';
        break;
      default:
        stage.required_approvals = 1;
        stage.auto_advance_days = stage.auto_advance_days || 3;
        stage.badge_color = 'indigo';
    }
    this.onStageChange();
  }

  getDefaultColorForType(stageType: string): string {
    switch (stageType) {
      case 'approval': return 'amber';
      case 'evaluation': return 'purple';
      case 'notification': return 'cyan';
      default: return 'indigo';
    }
  }

  getStageTypeDescription(stageType: string): string {
    const type = this.stageTypes.find(t => t.value === stageType);
    return type?.description || '';
  }

  generateId(): string {
    return 'stage_' + Math.random().toString(36).substring(2, 11);
  }

  trackByFn(index: number, item: ApplicationStage): string {
    return item.id;
  }

  shouldShowApprovals(stage: ApplicationStage): boolean {
    return stage.stage_type === 'approval' || stage.stage_type === 'evaluation';
  }

  shouldShowAutoAdvance(stage: ApplicationStage): boolean {
    return stage.stage_type !== 'notification';
  }

  getStageTypeLabel(stageType: string): string {
    const type = this.stageTypes.find(t => t.value === stageType);
    return type?.label || stageType;
  }

  getActiveStagesCount(): number {
    return this.applicationStages.filter(stage => stage.is_active && !stage.hide_stage).length;
  }

  getSkippableStagesCount(): number {
    return this.applicationStages.filter(stage => stage.is_skippable && !stage.hide_stage).length;
  }

  getTotalEstimatedTime(): number {
    return this.applicationStages
      .filter(stage => stage.is_active && !stage.hide_stage && stage.auto_advance_days)
      .reduce((total, stage) => total + (stage.auto_advance_days || 0), 0);
  }

  getStagesByType(stageType: string): ApplicationStage[] {
    return this.applicationStages.filter(stage => stage.stage_type === stageType && !stage.hide_stage);
  }
}