import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { JobpostingsApiService } from '../../../services/jobpostings-api.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-manager',
  imports: [CommonModule, FormsModule],
  templateUrl: './manager.component.html',
  styleUrl: './manager.component.scss',
})
export class ManagerComponent {
  isLoading: boolean = false;
  jobPostings: any[] = [];

  selectedProject: any = null;
  selectedJobForEdit: any = null;
  selectedJobForDelete: any = null;

  showAddPopup = false;
  showEditPopup = false;
  showDeletePopup = false;

  newJobTitle = '';
  editJobTitle = '';
  constructor(
    private router: Router,
    private apiService: JobpostingsApiService
  ) {
    this.loadData();
  }

  loadData() {
    this.apiService
      .jobpostings('943ee467-f686-4703-acd1-ce50ecb676ac')
      .subscribe({
        next: (data) => {
          this.jobPostings = data as any[];
          if (this.jobPostings.length > 0) {
            this.selectProject(this.jobPostings[0]);
          }
        },
        error: (error) => {
          console.error(error);
        },
      });
  }

  // Select a project
  selectProject(job: any) {
    this.selectedProject = job;
  }

  // Open add popup
  openAddPopup() {
    this.showAddPopup = true;
  }

  // Close add popup
  closeAddPopup() {
    this.showAddPopup = false;
    this.newJobTitle = '';
  }

  // Add a job posting
  addJobPosting() {
    if (this.newJobTitle) {
      const newJob = {
        id: Math.random().toString(36).substr(2, 9),
        project_name: this.newJobTitle,
        recieved_documents: 0,
        sent_emails: 0,
        failed_emails: 0,
        short_listed: 0,
        ranked_documents: 0,
        final_shortliting: 0,
      };
      this.jobPostings.push(newJob);
      this.closeAddPopup();
    }
  }

  // Open edit popup
  openEditPopup(job: any) {
    this.selectedJobForEdit = job;
    this.editJobTitle = job.project_name;
    this.showEditPopup = true;
  }

  // Close edit popup
  closeEditPopup() {
    this.showEditPopup = false;
    this.editJobTitle = '';
  }

  // Edit a job posting
  editJobPosting() {
    if (this.editJobTitle && this.selectedJobForEdit) {
      this.selectedJobForEdit.project_name = this.editJobTitle;
      this.closeEditPopup();
    }
  }

  // Open delete popup
  openDeletePopup(job: any) {
    this.selectedJobForDelete = job;
    this.showDeletePopup = true;
  }

  // Close delete popup
  closeDeletePopup() {
    this.showDeletePopup = false;
  }

  // Delete a job posting
  deleteJobPosting() {
    if (this.selectedJobForDelete) {
      this.jobPostings = this.jobPostings.filter(
        (job) => job.id !== this.selectedJobForDelete.id
      );
      if (this.selectedProject?.id === this.selectedJobForDelete.id) {
        this.selectedProject = null; // Deselect if the deleted project was selected
      }
      this.closeDeletePopup();
    }
  }

  openDetails(job: any) {}

  navigateTo(page: string, id: string) {
    const route = `/jobposts/${page}/`;
    const url = this.router.serializeUrl(
      this.router.createUrlTree([route, id])
    );
    window.open(url, '_blank');
  }
}
