// table.component.ts
import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, OnInit, OnChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';

export interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  width?: string;
  type?: 'text' | 'number' | 'date' | 'email' | 'array';
  visible?: boolean;
}

export interface FilterConfig {
  field: string;
  operator: 'contains' | 'equals' | 'startsWith' | 'endsWith' | 'greaterThan' | 'lessThan';
  value: any;
}

export interface TableConfig {
  showExport?: boolean;
  showColumnToggle?: boolean;
  showSearch?: boolean;
  striped?: boolean;
  hover?: boolean;
  condensed?: boolean;
  showRowNumbers?: boolean;
}


@Component({
  selector: 'app-table-view',
  imports: [CommonModule, FormsModule],
  templateUrl: './table-view.component.html',
  styleUrl: './table-view.component.scss'
})
export class TableViewComponent implements OnInit, OnChanges {
  @Input() columns: TableColumn[] = [];
  @Input() data: any[] = [];
  @Input() pageSize: number = 10;
  @Input() config: TableConfig = {};
  @Output() rowClick = new EventEmitter<any>();
  @Output() filteredDataChange = new EventEmitter<any[]>();
  @Output() exportRequest = new EventEmitter<{ data: any[], format: 'shortlist' | 'unshortlist' }>();

  Math = Math; // Expose Math to template
  filteredData: any[] = [];
  currentPage: number = 1;
  sortField: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';
  filters: FilterConfig[] = [];
  showFilterPanel: boolean = false;
  showColumnPanel: boolean = false;
  newFilter: FilterConfig = { field: '', operator: 'contains', value: '' };
  globalSearch: string = '';
  selectedRows: Set<any> = new Set();
  allSelected: boolean = false;

  private defaultConfig: TableConfig = {
    showExport: true,
    showColumnToggle: true,
    showSearch: true,
    striped: true,
    hover: true,
    condensed: true,
    showRowNumbers: true
  };

  get tableConfig(): TableConfig {
    return { ...this.defaultConfig, ...this.config };
  }

  ngOnInit() {
    this.applyFilters();
  }

  ngOnChanges() {
    this.applyFilters();
  }

  getColumnLabel(key: string): string {
    const column = this.columns.find(col => col.key === key);
    return column ? column.label : key;
  }

  get visibleColumns(): TableColumn[] {
    return this.columns.filter(col => col.visible !== false);
  }

  toggleColumnVisibility(column: TableColumn) {
    column.visible = !column.visible;
    this.applyFilters();
  }

  onGlobalSearch() {
    this.applyFilters();
  }

  clearGlobalSearch() {
    this.globalSearch = '';
    this.applyFilters();
  }

  sortData(field: string) {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = 'asc';
    }

    this.filteredData.sort((a, b) => {
      const aValue = this.getNestedValue(a, field);
      const bValue = this.getNestedValue(b, field);

      if (aValue == null) return this.sortDirection === 'asc' ? -1 : 1;
      if (bValue == null) return this.sortDirection === 'asc' ? 1 : -1;

      if (aValue < bValue) return this.sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }

  addFilter() {
    if (this.newFilter.field && this.newFilter.value !== '' && this.newFilter.value != null) {
      this.filters.push({ ...this.newFilter });
      this.applyFilters();
      this.newFilter = { field: '', operator: 'contains', value: '' };
    }
  }

  removeFilter(index: number) {
    this.filters.splice(index, 1);
    this.applyFilters();
  }

  applyFilters() {
    if (!this.data) {
      this.filteredData = [];
      this.emitFilteredData();
      return;
    }

    let filtered = [...this.data];

    // Apply advanced filters
    if (this.filters.length > 0) {
      filtered = filtered.filter(item => {
        return this.filters.every(filter => {
          const itemValue = this.getNestedValue(item, filter.field);
          if (itemValue == null) return false;

          const itemValueStr = itemValue.toString().toLowerCase();
          const filterValueStr = filter.value.toString().toLowerCase();

          switch (filter.operator) {
            case 'contains': return itemValueStr.includes(filterValueStr);
            case 'equals': return itemValueStr === filterValueStr;
            case 'startsWith': return itemValueStr.startsWith(filterValueStr);
            case 'endsWith': return itemValueStr.endsWith(filterValueStr);
            case 'greaterThan':
              const numValue = Number(itemValue);
              const numFilter = Number(filter.value);
              return !isNaN(numValue) && !isNaN(numFilter) && numValue > numFilter;
            case 'lessThan':
              const numValue2 = Number(itemValue);
              const numFilter2 = Number(filter.value);
              return !isNaN(numValue2) && !isNaN(numFilter2) && numValue2 < numFilter2;
            default: return true;
          }
        });
      });
    }

    // Apply global search
    if (this.globalSearch.trim()) {
      const searchTerm = this.globalSearch.toLowerCase().trim();
      filtered = filtered.filter(item => {
        return this.columns.some(col => {
          let value = this.getNestedValue(item, col.key);
          if (Array.isArray(value)) {
            if (value.every((item: any) => typeof item === 'object')) {
              value = value.map((item: any) => JSON.stringify(item, (key, value) => {
                return typeof value === "function" ? undefined : value;
              })).join(' ').replaceAll(/[\{\}"]/g, ' ');
            }
          }

          if (typeof value === 'object') {
            value = value.map((item: any) => JSON.stringify(item, (key, value) => {
              return typeof value === "function" ? undefined : value;
            })).join(' ').replaceAll(/[\{\}"]/g, ' ');
          }

          return value && value.toString().toLowerCase().includes(searchTerm);
        });
      });
    }

    this.filteredData = filtered;
    this.currentPage = 1;
    this.emitFilteredData();
    this.selectedRows.clear();
  }

  clearAllFilters() {
    this.filters = [];
    this.globalSearch = '';
    this.applyFilters();
    this.selectedRows.clear();
  }

  toggleRowSelection(row: any) {
    if (this.selectedRows.has(row)) {
      this.selectedRows.delete(row);
    } else {
      this.selectedRows.add(row);
    }
    this.updateSelectAllState();
  }

  toggleSelectAll() {
    if (this.allSelected) {
      this.selectedRows.clear();
    } else {
      this.paginatedData.forEach(row => this.selectedRows.add(row));
    }
    this.allSelected = !this.allSelected;
  }

  private updateSelectAllState() {
    this.allSelected = this.paginatedData.length > 0 &&
      this.paginatedData.every(row => this.selectedRows.has(row));
  }

  exportData(format: 'shortlist' | 'unshortlist') {
    const dataToExport = this.selectedRows.size > 0 ?
      Array.from(this.selectedRows) : this.filteredData;

    this.exportRequest.emit({ data: dataToExport, format });
  }

  get paginatedData() {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    return this.filteredData.slice(startIndex, startIndex + this.pageSize);
  }

  get totalPages() {
    return Math.ceil(this.filteredData.length / this.pageSize);
  }

  get pageNumbers(): number[] {
    const total = this.totalPages;
    const current = this.currentPage;
    const pages = [];

    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i);
    } else {
      pages.push(1);
      if (current > 3) pages.push(-1);
      for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
        pages.push(i);
      }
      if (current < total - 2) pages.push(-1);
      if (total > 1) pages.push(total);
    }

    return pages;
  }

  changePage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  getNestedValue(obj: any, path: string): any {
    if (!obj || !path) return null;
    return path.split('.').reduce((current, key) => {
      if (current && typeof current === 'object') {
        if (key in current) return current[key];
        if (Array.isArray(current)) {
          const index = parseInt(key);
          if (!isNaN(index) && index >= 0 && index < current.length) return current[index];
        }
      }
      return null;
    }, obj);
  }

  formatDisplayValue(value: any): string {
    if (value == null) return '-';
    if (Array.isArray(value)) {
      if (value.every((item: any) => typeof item === 'object')) {
        return value.map((item: any) => JSON.stringify(item, (key, value) => {
          return typeof value === "function" ? undefined : value;
        })).join(' ').replaceAll(/[\{\}"]/g, ' ');
      }

      return value.slice(0, 2).join(', ') + (value.length > 2 ? '...' : '');

    }
    if (typeof value === 'object') return '[Object66]';
    return value.toString();
  }

  private emitFilteredData() {
    this.filteredDataChange.emit(this.filteredData);
  }

  onRowClick(row: any, event: MouseEvent) {
    if ((event.target as HTMLElement).closest('.row-checkbox')) return;
    this.rowClick.emit(row);
  }
}