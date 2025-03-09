import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../../../services/data.service';

@Component({
  selector: 'app-filters',
  imports: [CommonModule, FormsModule],
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
  }

  updateFilter(field: string, value: string) {
    if (field in this.filters) {
      this.filters[field] = value;
    }
  }

  toggleAdvancedFilters() {
    this.dataService.showFilters = !this.dataService.showFilters;
  }

  formatName(input: string): string {
    if (!input) return input; // Handle empty or null input

    // Replace underscores with spaces and split into words
    const words = input.replace(/_/g, ' ').split(' ');

    // Capitalize the first letter of each word
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
    this.filterChange.emit(this.filters);
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
}
