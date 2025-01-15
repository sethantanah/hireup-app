import { Component } from '@angular/core';
import { CandidateListComponent } from '../components/candidate-list/candidate-list.component';
import { CommonModule } from '@angular/common';
import { CandidateRankingComponent } from '../components/candidate-ranking/candidate-ranking.component';
import { ShortlistedComponent } from '../components/shortlisted/shortlisted.component';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, CandidateListComponent, CandidateRankingComponent, ShortlistedComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent {
  activeSection: string = 'candidates'; // Default active section

  setActiveSection(section: string) {
    this.activeSection = section;
  }
}
