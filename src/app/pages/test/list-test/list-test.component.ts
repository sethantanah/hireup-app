import { Component } from '@angular/core';
import { JobtestApiService } from '../../../services/jobtest-api.service';
import { ActivatedRoute, Router } from '@angular/router';
import { JobTest } from '../../../models/test-models';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-list-test',
  imports: [CommonModule],
  templateUrl: './list-test.component.html',
  styleUrl: './list-test.component.scss',
})
export class ListTestComponent {
  jobTests: JobTest[] = [];
  isLoading: boolean = false;
  constructor(
    private apiService: JobtestApiService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    const projectId = this.route.snapshot.paramMap.get('jobId');
    if (projectId) {
      this.loadJobTest(projectId);
    }
  }

  loadJobTest(project_id: string) {
    this.apiService.jobTests(project_id).subscribe({
      next: (data) => {
        this.jobTests = data as JobTest[];
      },
      error: (error) => {
        console.error(error);
      },
    });
  }

  // Method to create a new test
  createTest() {
    this.apiService.clearTest();
    const projectId = this.route.snapshot.paramMap.get('jobId');
    const url = this.router.serializeUrl(
      this.router.createUrlTree(['/jobposts/tests/manager/create', projectId])
    );
    window.open(url, '_blank');
  }

  // Method to edit a test
  editTest(test: JobTest) {
    const projectId = this.route.snapshot.paramMap.get('jobId');
    const url = this.router.serializeUrl(
      this.router.createUrlTree([
        '/jobposts/tests/manager/update',
        projectId,
        test.id,
      ])
    );
    window.open(url, '_blank');
  }

  // Method to delete a test
  deleteTest(test: JobTest) {
    console.log('Delete Test:', test.id);
    // Add logic to delete the test
  }

  navigateTo(page: string, id: string) {
    const route = `/jobposts/${page}/`;
    const url = this.router.serializeUrl(
      this.router.createUrlTree([route, id])
    );
    window.open(url, '_blank');
  }

  // Method to share a test
  shareTest(test: JobTest): void {
    // Extract the base URL of the current site
    const baseUrl = window.location.origin;

    // Append "/jhjdhj/" to the base URL
    const shareUrl = `${baseUrl}/jobposts/tests/take-test/${test.id}/`;

    // Use navigator to open the share popup
    if (navigator.share) {
      navigator
        .share({
          title: test.test_data.sections[0].title, // Assuming the test has a title
          text: `Check out this test: ${test.test_data.sections[0].title}`, // Customize the text
          url: shareUrl, // The URL to share
        })
        .then(() => {
          console.log('Test shared successfully');
        })
        .catch((error) => {
          console.error('Error sharing test:', error);
        });
    } else {
      console.error('Share API is not supported in this browser');
    }
  }

  // Method to view submissions for a test
  viewSubmissions(test: JobTest) {
    console.log('View Submissions for Test:', test.id);
    // Add logic to navigate to a submissions page
  }
}
