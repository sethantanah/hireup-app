import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { JobpostingsApiService } from '../../../services/jobpostings-api.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-job-post-dashboad',
  imports: [CommonModule, FormsModule],
  templateUrl: './job-post-dashboad.component.html',
  styleUrl: './job-post-dashboad.component.scss',
})
export class JobPostDashboadComponent {
  loading: boolean = false;
  isRefreshing: boolean = false;
  jobPostings: any[] = [];

  selectedJobPost: any = null;
  selectedJobForEdit: any = null;
  selectedJobForDelete: any = null;

  showAddPopup = false;
  showEditPopup = false;
  showDeletePopup = false;

  newJobTitle = '';
  editJobTitle = '';

  isCreatingJobpost: boolean = false;
  isDeleting: boolean = false;

  sharePopover: boolean = false;
  showAlertPopup: boolean = false;
  popupAlertMessage: string = '';
  alertPopupType: string = '';

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private apiService: JobpostingsApiService
  ) {
    this.loadData();
  }

  loadData() {
    const userId = this.route.snapshot.paramMap.get('userId');
    this.loading = true;
    this.apiService.jobpostings(userId ?? '').subscribe({
      next: (data) => {
        this.jobPostings = data as any[];
        if (this.jobPostings.length > 0) {
          this.selectProject(this.jobPostings[0]);
        }
        this.loading = false;
      },
      error: (error) => {
        this.loading = false;
        console.error(error);
      },
    });
  }

  refresh() {
    const userId = this.route.snapshot.paramMap.get('userId');
    this.isRefreshing = true;

    // Simulate an async operation
    this.apiService.jobpostings(userId ?? '').subscribe({
      next: (data) => {
        this.jobPostings = data as any[];
        if (this.jobPostings.length > 0) {
          this.selectProject(this.jobPostings[0]);
        }
        this.isRefreshing = false;
      },
      error: (error) => {
        this.isRefreshing = false;
        console.error(error);
      },
    });
  }

  // Select a project
  selectProject(job: any) {
    this.selectedJobPost = job;
  }

  // Open add popup
  openAddPopup() {
    this.showAddPopup = true;
  }

  // Close add popup
  closeAddPopup() {
    this.showAddPopup = false;
    this.newJobTitle = '';
    this.isCreatingJobpost = false;
  }

  // Add a job posting
  addJobPosting() {
    if (this.newJobTitle) {
      const newJob = {
        id: '',
        title: this.newJobTitle,
      };

      const userId = this.route.snapshot.paramMap.get('userId');
      this.isCreatingJobpost = true;
      this.apiService.createUpdateJobPost(userId!, newJob).subscribe({
        next: (data) => {
          localStorage.removeItem('applicationData');
          this.selectedJobPost = data.data;
          this.jobPostings.push(data.data);
          this.closeAddPopup();
        },
        error: (error) => {
          this.isCreatingJobpost = false;
          console.error('Error creating job posting', error);
        },
      });
    }
  }

  // Open edit popup
  openEditPopup(jobTitle: string, jobId: string) {
    this.showEditPopup = true;
    this.newJobTitle = jobTitle;
    this.selectedJobPost = this.jobPostings.find((job) => job.id === jobId);
  }

  // Close edit popup
  closeEditPopup() {
    this.isCreatingJobpost = false;
    this.showEditPopup = false;
    this.newJobTitle = '';
  }

  // Edit a job posting
  editJobPosting() {
    if (this.newJobTitle && this.selectedJobPost) {
      const editedJob = {
        id: this.selectedJobPost.id,
        title: this.newJobTitle,
      };

      const userId = this.route.snapshot.paramMap.get('userId');
      this.isCreatingJobpost = true;
      this.apiService.createUpdateJobPost(userId!, editedJob).subscribe({
        next: (data) => {
          this.jobPostings.forEach((job) => {
            if (job.id === this.selectedJobPost.id) {
              job.title = this.newJobTitle;
            }
          });
          this.closeEditPopup();
        },
        error: (error) => {
          this.isCreatingJobpost = false;
          console.error('Error creating job posting', error);
        },
      });
    }
  }

  // Open delete popup
  openDeletePopup(job: any) {
    this.selectedJobPost = job;
    this.showDeletePopup = true;
  }

  // Close delete popup
  closeDeletePopup() {
    this.showDeletePopup = false;
  }

  // Delete a job posting
  deleteJobPosting() {
    if (this.selectedJobPost) {
      this.isDeleting = true;
      this.apiService.deleteJobPosting(this.selectedJobPost.id).subscribe({
        next: (data) => {
          this.jobPostings = this.jobPostings.filter(
            (job) => job.id !== this.selectedJobPost.id
          );
          this.selectedJobPost = null; // Deselect if the deleted project was selected
          this.closeDeletePopup();
          this.isDeleting = false;
        },
        error: (error) => {
          this.isDeleting = false;
          console.error('Error deleting job posting', error);
        },
      });
    }
  }

  openSharePopover() {
    this.sharePopover = true;
  }

  closeSharePopover() {
    this.sharePopover = false;
  }

  publishJob(jobId: string) {}

  shareJob(jobId: any) {
    // Extract the base URL of the current site
    const baseUrl = window.location.origin;
    // Append "/jhjdhj/" to the base URL
    const shareUrl = `${baseUrl}/apply/${this.selectedJobPost.title}/${this.selectedJobPost.id}/`;

    // Use navigator to open the share popup
    if (navigator.share) {
      navigator
        .share({
          title: this.selectedJobPost.title, // Assuming the test has a title
          text: `Job post: ${this.selectedJobPost.title}`, // Customize the text
          url: shareUrl, // The URL to share
        })
        .then(() => {})
        .catch((error) => {
          console.error('Error sharing test:', error);
        });
    } else {
      console.error('Share API is not supported in this browser');
    }

    navigator.clipboard.writeText(shareUrl);
  }

  copyUrl() {
    const baseUrl = window.location.origin;
    const shareUrl = `${baseUrl}/apply/${this.selectedJobPost.title}/${this.selectedJobPost.id}/`;
    navigator.clipboard.writeText(shareUrl);
    this.openAlertPopup('URL copied to clipboard', 'success');
  }

  getEmbedCode(jobId: string) {}

  embedJobForm(jobId: string) {
    const baseUrl = window.location.origin;
    const shareUrl = `${baseUrl}/apply/${this.selectedJobPost.title}/${this.selectedJobPost.id}/form`;
    const iframe = `<iframe src="${shareUrl}" width="100%" height="100%" frameborder="0"></iframe>`;
    navigator.clipboard.writeText(iframe);
    this.openAlertPopup('Embed code copied to clipboard', 'success');
  }

  openDetails(job: any) {}


  openAlertPopup(message: string, type: string) {
    this.popupAlertMessage = message; 
    this.alertPopupType = type;
    this.showAlertPopup = true;
    setTimeout(() => {
      this.showAlertPopup = false;
    }, 3000);
  }

  navigateTo(page: string, id: string) {
    localStorage.setItem('jobpostId', id);
    const route = `/jobposts/${page}/`;
    const url = this.router.serializeUrl(
      this.router.createUrlTree([route, id])
    );
    window.open(url, '_blank');
  }
}
