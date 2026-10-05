import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../../../services/data.service';
import { CustomDropdownComponent } from '../../../../components/custom-dropdown/custom-dropdown.component';

export interface FilterRule {
  field: string;
  operator: 'contains' | 'equals' | 'startsWith' | 'endsWith' | 'greaterThan' | 'lessThan' | 'greaterThanOrEqual' | 'lessThanOrEqual';
  value: any;
}

@Component({
  selector: 'app-filters',
  imports: [CommonModule, FormsModule, CustomDropdownComponent],
  templateUrl: './filters.component.html',
  styleUrl: './filters.component.scss',
})
export class FiltersComponent {
  @Output() filterChange = new EventEmitter<any>();
  @Input() filterFields: string[] = [];
  @Input() popupView: boolean = false;
  filters: Record<string, string> = {};

  showPopup = false;
  readonly initialVisibleCount = 3;

  ruleFilters: FilterRule[] = [];
  newRule: FilterRule = { field: '', operator: 'contains', value: '' };

  get fieldOptions(): Array<{ label: string; value: string }> {
    return (this.filterFields || []).map(field => ({
      label: this.formatName(field),
      value: field
    }));
  }

  operatorOptions: Array<{ label: string; value: string }> = [
    { label: 'Contains', value: 'contains' },
    { label: 'Equals', value: 'equals' },
    { label: 'Starts with', value: 'startsWith' },
    { label: 'Ends with', value: 'endsWith' },
    { label: 'Greater than', value: 'greaterThan' },
    { label: 'Less than', value: 'lessThan' },
    { label: 'Greater than or equal', value: 'greaterThanOrEqual' },
    { label: 'Less than or equal', value: 'lessThanOrEqual' }
  ];

  constructor(public dataService: DataService) {}

  ngOnInit() {
    this.initializeFilters();
  }

  private initializeFilters() {
    this.filters = this.filterFields.reduce((acc, field) => {
      acc[field] = '';
      return acc;
    }, {} as Record<string, string>);
  }

  resetFilters() {
    this.initializeFilters();
    this.ruleFilters = [];
    this.onFilterChange();
  }

  updateFilter(field: string, value: string) {
    if (field in this.filters) {
      this.filters[field] = value;
    }
  }

  addRule(): void {
    if (this.newRule.field && this.newRule.value !== '' && this.newRule.value != null) {
      this.ruleFilters.push({ ...this.newRule });
      this.newRule = { field: '', operator: 'contains', value: '' };
      this.onFilterChange();
    }
  }

  removeRule(index: number): void {
    this.ruleFilters.splice(index, 1);
    this.onFilterChange();
  }

  clearAllRules(): void {
    this.ruleFilters = [];
    this.onFilterChange();
  }

  toggleAdvancedFilters() {
    this.dataService.showFilters = !this.dataService.showFilters;
  }

  formatName(input: string): string {
    if (!input) return input;

    const words = input.replace(/_/g, ' ').split(' ');
    const formattedName = words
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');

    return formattedName;
  }

  closeOnBackgroundClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).className === 'popup-overlay') {
      this.toggleAdvancedFilters();
    }
  }

  clearFilter(field: string): void {
    this.filters[field] = '';
    this.onFilterChange();
  }

  onFilterChange() {
    this.filterChange.emit({
      ...this.filters,
      _rules: this.ruleFilters
    });
  }

  get visibleFields() {
    return this.filterFields.slice(0, this.initialVisibleCount);
  }

  get hiddenFields() {
    return this.filterFields.slice(this.initialVisibleCount);
  }

  get hasMoreFilters() {
    return this.filterFields.length > this.initialVisibleCount;
  }

  getActiveFilterCount(): number {
    const textFiltersCount = Object.values(this.filters).filter(val => val && val.trim() !== '').length;
    return textFiltersCount + this.ruleFilters.length;
  }
}
