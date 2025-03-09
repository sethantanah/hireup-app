import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AdvanceFilterComponent } from '../advance-filter/advance-filter.component';
import { FiltersComponent } from '../filters/filters.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-candidate-filters',
  imports: [CommonModule, AdvanceFilterComponent, FiltersComponent],
  templateUrl: './candidate-filters.component.html',
  styleUrl: './candidate-filters.component.scss',
})
export class CandidateFiltersComponent {
  @Output() advanceFilterChange = new EventEmitter<any>();
  @Output() filterChange = new EventEmitter<any>();
  @Input() filterFields: string[] = [];
  @Input() popupView: boolean = false;
  @Input() showResumeFilters: boolean = false;
  isExpanded: boolean = false;
  onAdvanceFilterChange(event: any) {
    this.advanceFilterChange.emit(event);
  }
  onFiltersChange(event: any) {
    this.filterChange.emit(event);
  }
}
