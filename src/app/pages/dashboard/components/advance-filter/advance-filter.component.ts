import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-advance-filter',
  imports: [CommonModule, FormsModule],
  templateUrl: './advance-filter.component.html',
  styleUrl: './advance-filter.component.scss'
})
export class AdvanceFilterComponent {
  @Output() advanceFilterChange = new EventEmitter<any>();
  filters = {
    search: '',
    educationDegree: '',
    projects: '',
    skills: ''
  };

  isFiltersOpen = true;


  newSkill: string = ''; // Input for new skill
  selectedSkills: string[] = []; // List of selected skills

  // Add a skill to the list
  addSkill() {
    if (this.newSkill.trim() && !this.selectedSkills.includes(this.newSkill.trim())) {
      this.selectedSkills.push(this.newSkill.trim());
      this.newSkill = ''; // Clear input
    }
  }

  // Remove a skill from the list
  removeSkill(skill: string) {
    this.selectedSkills = this.selectedSkills.filter((s) => s !== skill);
  }


  onFilterChange() {
    this.advanceFilterChange.emit(this.filters);
  }



  openFormFilters() {
    // Add your form filters opening logic here
  }

  clearFilters() {
    this.filters = {
      search: '',
      skills: '',
      educationDegree: '',
      projects: ''
    };
    this.onFilterChange();
  }
}
