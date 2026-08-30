import { Component } from '@angular/core';
import { JobtestApiService } from '../../../services/jobtest-api.service';
import { ActivatedRoute, Router } from '@angular/router';
import { JobTest } from '../../../models/test.model';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-list-test',
  imports: [CommonModule, FormsModule],
  templateUrl: './list-test.component.html',
  styleUrl: './list-test.component.scss',
})
export class ListTestComponent {
  jobTests: JobTest[] = [];
  loading: boolean = false;
  searchQuery: string = '';
  activeTab: string = 'all';

  showShareModal: boolean = false;
  selectedShareTest: JobTest | null = null;
  shareUrl: string = '';
  copiedToast: boolean = false;

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

  get filteredJobTests(): JobTest[] {
    if (!this.searchQuery.trim()) {
      return this.jobTests;
    }
    const query = this.searchQuery.toLowerCase().trim();
    return this.jobTests.filter(test =>
      test.test_data?.testTitle?.toLowerCase().includes(query) ||
      test.test_data?.description?.toLowerCase().includes(query)
    );
  }

  get totalQuestionsCount(): number {
    return this.jobTests.reduce((acc, test) => {
      const fieldCount = test.test_data?.formData?.fields?.length || 0;
      return acc + fieldCount;
    }, 0);
  }

  get averageDuration(): number {
    if (this.jobTests.length === 0) return 0;
    const totalDuration = this.jobTests.reduce((acc, test) => acc + (test.test_data?.testDuration || 0), 0);
    return Math.round(totalDuration / this.jobTests.length);
  }

  loadJobTest(project_id: string) {
    this.loading = true;
    this.apiService.jobTests(project_id).subscribe({
      next: (data) => {
        this.jobTests = data as JobTest[];
        this.loading = false;
      },
      error: (error) => {
        this.loading = false;
        console.error(error);
      },
    });
  }

  createTest() {
    this.apiService.clearTest();
    const projectId = this.route.snapshot.paramMap.get('jobId');
    const url = this.router.serializeUrl(
      this.router.createUrlTree(['/jobposts/tests/manager/create', projectId])
    );
    window.open(url, '_self');
  }

  editTest(test: JobTest) {
    const projectId = this.route.snapshot.paramMap.get('jobId');
    const url = this.router.serializeUrl(
      this.router.createUrlTree([
        '/jobposts/tests/manager/update',
        projectId,
        test.id,
      ])
    );
    window.open(url, '_self');
  }

  showDeleteModal: boolean = false;
  testToDelete: JobTest | null = null;
  isDeleting: boolean = false;

  openDeleteModal(test: JobTest) {
    this.testToDelete = test;
    this.showDeleteModal = true;
  }

  closeDeleteModal() {
    this.showDeleteModal = false;
    this.testToDelete = null;
    this.isDeleting = false;
  }

  confirmDeleteTest() {
    if (!this.testToDelete) return;
    this.isDeleting = true;
    const testId = this.testToDelete.id;

    this.apiService.deleteTest(testId).subscribe({
      next: () => {
        this.jobTests = this.jobTests.filter(t => t.id !== testId);
        this.closeDeleteModal();
      },
      error: (error) => {
        console.error('Error deleting test:', error);
        this.jobTests = this.jobTests.filter(t => t.id !== testId);
        this.closeDeleteModal();
      }
    });
  }

  deleteTest(test: JobTest) {
    this.openDeleteModal(test);
  }

  backToJobDashboard() {
    let userId = '';
    const userData = localStorage.getItem('USER');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        userId = user.id || user.user_id || user.userId || '';
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }

    if (userId) {
      this.router.navigate(['/jobposts', userId]);
    } else {
      window.history.back();
    }
  }

  openShareModal(test: JobTest): void {
    this.selectedShareTest = test;
    const baseUrl = window.location.origin;
    this.shareUrl = `${baseUrl}/jobposts/tests/take-test/${test.id}/`;
    this.showShareModal = true;
    this.copiedToast = false;
  }

  closeShareModal(): void {
    this.showShareModal = false;
    this.selectedShareTest = null;
  }

  copyShareUrl(): void {
    navigator.clipboard.writeText(this.shareUrl).then(() => {
      this.copiedToast = true;
      setTimeout(() => {
        this.copiedToast = false;
      }, 3000);
    });
  }

  shareTest(test: JobTest): void {
    const baseUrl = window.location.origin;
    const shareUrl = `${baseUrl}/jobposts/tests/take-test/${test.id}/`;

    if (navigator.share) {
      navigator
        .share({
          title: test.test_data?.testTitle || 'Candidate Assessment',
          text: `Please complete the assessment: ${test.test_data?.testTitle}`,
          url: shareUrl,
        })
        .catch((error) => console.error('Error sharing test:', error));
    } else {
      this.openShareModal(test);
    }
  }

  viewSubmissions(test: JobTest) {
    const url = this.router.serializeUrl(
      this.router.createUrlTree([
        '/jobposts/tests/submissions',
        test.id,
      ])
    );
    window.open(url, '_blank');
  }
}
