import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../../../services/data.service';

@Component({
  selector: 'app-filters',
  imports: [CommonModule, FormsModule],
  templateUrl: './filters.component.html',
  styleUrl: './filters.component.scss'
})
export class FiltersComponent {
  @Output() filterChange = new EventEmitter<any>();

  filters = {
    search: '',
    availability: '',
    yearsOfExperience: 0,
    education: '',
    dateOfBirth: '', // Advanced filter
    highestDegree: '', // Advanced filter
    fieldOfStudy: '', // Advanced filter
    institutionName: '', // Advanced filter
    yearOfGraduation: '', // Advanced filter
    skills: [] as string[],
    certifications: [] as string[],
  };

  constructor(public dataService: DataService){

  }

  toggleAdvancedFilters() {
    this.dataService.showFilters = !this.dataService.showFilters;
  }

  onFilterChange() {
    this.filterChange.emit(this.filters);
  }

}
