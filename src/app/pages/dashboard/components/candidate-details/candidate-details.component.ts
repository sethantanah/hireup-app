import { Component } from '@angular/core';
import { DataService } from '../../../../services/data.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-candidate-details',
  imports: [CommonModule],
  templateUrl: './candidate-details.component.html',
  styleUrl: './candidate-details.component.scss'
})
export class CandidateDetailsComponent {
  isVisible: boolean = false; // Control popover visibility

  constructor(public dataService: DataService) {

  }

  getFormDataKeys(): string[] {
    if (this.dataService.candidate?.form_data) {
      return Object.keys(this.dataService.candidate.form_data);
    }
    return [];
  }

  getFormDataValue(key: string): string | boolean | 'N/A' {
    const formData = this.dataService.candidate?.form_data;
    if (formData && key in formData) {
      return formData[key as keyof typeof formData];
    }
    return 'N/A';
  }

  formatKey(key: string): string {
    // Split the key by underscores
    const words = key.split('_');
  
    // Capitalize the first letter of each word
    const formattedWords = words.map(word => word.charAt(0).toUpperCase() + word.slice(1));
  
    // Join the words with spaces
    return formattedWords.join(' ');
  }

  // Close the popover
  close() {
    this.dataService.openCandidateDetails = false;
  }
}
