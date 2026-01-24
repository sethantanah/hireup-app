import { Component, HostListener, OnInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { TestData, TestResponse } from '../../../models/test.model';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { JobtestApiService } from '../../../services/jobtest-api.service';
import { FormattingService } from '../../../services/formatting.service';
import { ActivatedRoute } from '@angular/router';
import { PreventCopyPasteDirective } from '../../../directives/prevent-copy-paste.directive';
import { PreventScreenShotDirective } from '../../../directives/prevent-screen-shot.directive';
import { CanComponentDeactivate } from '../../../can-refresh.guard';
import { CrosswordBuilderComponent } from '../compenents/crossword-builder/crossword-builder.component';
import { CrosswordPuzzleComponent } from '../compenents/crossword-puzzel/crossword-puzzle.component';
import { TimerService } from '../../../services/timer.service';
import { TestSyncService } from '../../../services/test-sync.service';

@Component({
  selector: 'app-take-test',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    PreventCopyPasteDirective,
    PreventScreenShotDirective,
    CrosswordBuilderComponent,
    CrosswordPuzzleComponent
  ],
  templateUrl: './take-test.component.html',
  styleUrl: './take-test.component.scss',
})
export class TakeTestComponent implements CanComponentDeactivate, OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private timerInterval: any;
  private testStartTime: number = 0;
  private testId: string | null = null;
  private readonly TIMER_KEY_PREFIX = 'test_timer_';
  private readonly PROGRESS_KEY_PREFIX = 'test_progress_';
  private readonly CREDENTIALS_KEY = 'applicateCredentials';

  // Track unsaved changes - only true during active test
  get hasUnsavedChanges(): boolean {
    return this.currentView === 'form' && this.sectionStarted[this.currentSection] && this.timer > 0;
  }

  testData: TestData | undefined;
  currentView: 'instructions' | 'form' | 'thankyou' = 'instructions';
  showPopup = false;
  isLoading = false;
  errorMessage: string | null = null;
  userForm: FormGroup;
  timer: number = 0;
  currentSection: number = 0;
  showWarning: boolean = false;
  timeUp: boolean = false;
  testResponses: TestResponse[] = [];
  testScore: number = 0;
  testPercentage: number = 0;
  loading: boolean = true;
  isTabActive: boolean = true;
  sectionStarted: boolean[] = []; // Track which sections have been started

  constructor(
    @Inject(PLATFORM_ID) private platformId: any,
    private fb: FormBuilder,
    public testService: JobtestApiService,
    private route: ActivatedRoute,
    public formattingService: FormattingService,
    private timerService: TimerService,
    private testSyncService: TestSyncService
  ) {
    this.userForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
    });

    this.testId = this.route.snapshot.paramMap.get('testId');
    this.initializeTest();
  }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.setupVisibilityTracking();
      this.checkForExistingTestProgress();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.cleanupTimers();

    // Only clear progress if test is not complete
    if (this.currentView !== 'thankyou') {
      this.saveTestProgress();
    }
  }

  canDeactivate(): boolean {
    if (this.hasUnsavedChanges) {
      return confirm('You have an ongoing test section. Are you sure you want to leave? All progress will be saved.');
    }
    return true;
  }

  @HostListener('window:beforeunload', ['$event'])
  unloadNotification($event: BeforeUnloadEvent): void {
    if (this.hasUnsavedChanges) {
      $event.preventDefault();
      $event.returnValue = 'You have an ongoing test section. Are you sure you want to leave?';
    }
  }

  private initializeTest(): void {
    if (this.testId) {
      this.loading = true;
      this.testService.jobTest(this.testId).pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: (data) => {
          this.testData = data.test_data;
          if (this.testData) {
            // Initialize timer for first section
            this.timer = this.testData.sections[0].duration * 60;

            // Initialize section started status (all false initially)
            this.sectionStarted = new Array(this.testData.sections.length).fill(false);

            // Initialize responses
            this.testResponses = this.testData.formData.fields.map((field) => ({
              question: field.question,
              answer: '',
            }));

            this.loading = false;
            this.checkForResumePossibility();
          }
        },
        error: (error) => {
          this.loading = false;
          this.errorMessage = 'Failed to load test. Please try again.';
          console.error('Test loading error:', error);
        },
      });
    }
  }

  private checkForResumePossibility(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const credentials = sessionStorage.getItem(this.CREDENTIALS_KEY);
    const progress = localStorage.getItem(`${this.PROGRESS_KEY_PREFIX}${this.testId}`);

    if (credentials && progress) {
      const progressData = JSON.parse(progress);
      // Only resume if progress is less than 1 hour old
      if (Date.now() - progressData.timestamp < 3600000) {
        if (confirm('You have an unfinished test. Would you like to resume?')) {
          this.resumeTest(progressData);
        } else {
          this.clearTestProgress();
        }
      } else {
        this.clearTestProgress();
      }
    }
  }

  private resumeTest(progressData: any): void {
    this.currentView = progressData.currentView;
    this.currentSection = progressData.currentSection;
    this.timer = progressData.timer;
    this.testResponses = progressData.testResponses || [];
    this.sectionStarted = progressData.sectionStarted || new Array(this.testData?.sections.length).fill(false);

    if (this.currentView === 'form' && this.sectionStarted[this.currentSection]) {
      this.testStartTime = Date.now() - ((this.testData!.sections[this.currentSection].duration * 60 - this.timer) * 1000);
      this.startTimer();
    }
  }

  private checkForExistingTestProgress(): void {
    if (!isPlatformBrowser(this.platformId) || !this.testId) return;

    const progressKey = `${this.PROGRESS_KEY_PREFIX}${this.testId}`;
    const progress = localStorage.getItem(progressKey);

    if (progress) {
      const progressData = JSON.parse(progress);
      // Auto-resume if test was active and timer hasn't expired
      if (progressData.currentView === 'form' && Date.now() - progressData.timestamp < 300000) { // 5 minutes
        this.resumeTest(progressData);
      }
    }
  }

  private setupVisibilityTracking(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    document.addEventListener('visibilitychange', () => {
      this.isTabActive = !document.hidden;

      if (this.isTabActive && this.currentView === 'form' && this.sectionStarted[this.currentSection]) {
        // Tab became active - update timer based on actual elapsed time
        this.updateTimerFromBackground();
      } else if (!this.isTabActive) {
        // Tab went to background - save progress
        this.saveTestProgress();
      }
    });
  }

  private updateTimerFromBackground(): void {
    if (!this.testStartTime) return;

    const elapsedSeconds = Math.floor((Date.now() - this.testStartTime) / 1000);
    const sectionDuration = this.testData!.sections[this.currentSection].duration * 60;
    const remaining = Math.max(0, sectionDuration - elapsedSeconds);

    this.timer = remaining;

    // Restart timer with corrected time
    this.cleanupTimers();
    this.startTimer();
  }

  startTest(): void {
    this.showPopup = true;
  }

  submitUserDetails(): void {
    if (this.userForm.invalid) {
      this.markFormGroupTouched(this.userForm);
      this.errorMessage = 'Please fill out all fields correctly.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;

    this.testService
      .checkApplicantCredentials(
        this.userForm.get('email')!.value,
        this.userForm.get('name')!.value
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.isLoading = false;
          this.showPopup = false;
          this.currentView = 'form';

          // Store credentials in sessionStorage (clears on browser close)
          sessionStorage.setItem(this.CREDENTIALS_KEY, JSON.stringify({
            ...data,
            timestamp: Date.now()
          }));

          // Don't start timer automatically - wait for "Begin Section" click
          // Just save initial progress
          this.saveTestProgress();
        },
        error: (error) => {
          this.isLoading = false;
          this.errorMessage = error.error?.detail || 'Invalid credentials. Please try again.';
          console.error('Credential check error:', error);
        },
      });
  }

  beginSection(sectionIndex: number): void {
    if (sectionIndex >= 0 && sectionIndex < this.testData!.sections.length) {
      // Mark section as started
      this.sectionStarted[sectionIndex] = true;

      // Set timer for this section
      this.timer = this.testData!.sections[sectionIndex].duration * 60;

      // Start the timer
      this.testStartTime = Date.now();
      this.startTimer();

      // Save progress
      this.saveTestProgress();

      // Scroll to top to show questions
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  getSectionQuestionCount(sectionIndex: number): number {
    if (!this.testData || sectionIndex < 0 || sectionIndex >= this.testData.sections.length) {
      return 0;
    }

    const section = this.testData.sections[sectionIndex];
    return this.testData.formData.fields.filter(field =>
      field.section === section.sectionId ||
      (section.sectionId === 1 && field.section === undefined)
    ).length;
  }


  // In your component class
  getCurrentSectionFields(): any[] {
    if (!this.testData || !this.testData.formData?.fields || this.currentSection === undefined) {
      return [];
    }

    const currentSectionId = this.testData.sections[this.currentSection].sectionId;

    return this.testData.formData.fields.filter(field => {
      // Case 1: Field has section property and matches current section
      if (field.section !== undefined && field.section === currentSectionId) {
        return true;
      }

      // Case 2: Current section is 1 and field has no section property (default to section 1)
      if (currentSectionId === 1 && field.section === undefined) {
        return true;
      }

      return false;
    });
  }
  startTimer(): void {
    // Clear any existing timer
    this.cleanupTimers();

    // Store start time for accurate background time calculation
    this.testStartTime = Date.now();

    // Start timer service for persistence
    const timerKey = `${this.TIMER_KEY_PREFIX}${this.testId}_${this.currentSection}`;
    this.timerService.startTimer(
      timerKey,
      this.timer,
      () => this.handleTimeUp()
    );

    // Update UI timer every second
    this.timerInterval = setInterval(() => {
      if (this.timer > 0) {
        this.timer--;

        // Auto-save progress every 30 seconds
        if (this.timer % 30 === 0) {
          this.saveTestProgress();
        }
      } else {
        this.cleanupTimers();
      }
    }, 1000);
  }

  private handleTimeUp(): void {
    this.cleanupTimers();
    this.timeUp = true;

    setTimeout(() => {
      if (this.testData!.sections.length - 1 > this.currentSection) {
        this.navigateSection();
      } else {
        this.submitTest();
      }
    }, 2500);
  }

  private cleanupTimers(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }

    // Clear timer service entries
    if (this.testId) {
      const timerKey = `${this.TIMER_KEY_PREFIX}${this.testId}_${this.currentSection}`;
      this.timerService.clearTimer(timerKey);
    }
  }

  getTimerColor(timeLeft: number): string {
    const totalSectionTime = (this.testData?.sections[this.currentSection]?.duration ?? 0) * 60;
    const percentageLeft = totalSectionTime > 0 ? (timeLeft / totalSectionTime) * 100 : 0;

    if (percentageLeft <= 25) {
      return 'bg-red-50 text-red-600';
    } else if (percentageLeft <= 50) {
      return 'bg-yellow-50 text-yellow-600';
    }
    return 'bg-indigo-50 text-indigo-600';
  }

  formatTimeRemaining(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  getCurrentDateTime(): string {
    return new Date().toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  getTotaltime(): number {
    return this.testData?.sections.reduce((total, section) => total + section.duration, 0) || 0;
  }

  getCurrentSectionTime(): number {
    return this.testData?.sections[this.currentSection]?.duration || 0;
  }

  navigateSection(): void {
    if (this.testData && this.testData.sections.length - 1 > this.currentSection) {
      // Save current section progress
      this.saveTestProgress();

      // Move to next section
      this.currentSection++;

      // Reset timer for next section (won't start until Begin Section is clicked)
      this.timer = this.testData.sections[this.currentSection].duration * 60;
      this.timeUp = false;

      // Stop any running timers
      this.cleanupTimers();

      // Reset test start time
      this.testStartTime = 0;

      // Update progress
      this.saveTestProgress();

      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  showNavigationWarning(): void {
    if (this.timer > 0 && this.testData!.sections.length - 1 > this.currentSection) {
      this.showWarning = true;
    } else {
      this.navigateSection();
    }
  }

  closeWarning(): void {
    this.showWarning = false;
  }

  confirmNavigation(): void {
    this.navigateSection();
    this.showWarning = false;
    this.scrollToTop();
  }

  onCrosswordCompleted(field: any, event: any): void {
    // Update the response for this field
    const responseIndex = this.testResponses.findIndex(r => r.question === field.question);
    if (responseIndex !== -1) {
      if (event.score > 0) {
        this.testScore += event.score / 10;
      }
      this.saveTestProgress(); // Auto-save on crossword completion
    }
  }

  onAnswerChange(question: string, answer: string): void {
    const responseIndex = this.testResponses.findIndex(r => r.question === question);
    if (responseIndex !== -1) {
      this.testResponses[responseIndex].answer = answer;

      // Debounced auto-save
      if (this.autoSaveTimeout) {
        clearTimeout(this.autoSaveTimeout);
      }
      this.autoSaveTimeout = setTimeout(() => {
        this.saveTestProgress();
      }, 1000);
    }
  }

  private autoSaveTimeout: any;

  calculateScore(): number {
    if (!this.testData) return 0;

    let totalScore = 0;
    this.testResponses.forEach((response) => {
      const field = this.testData!.formData.fields.find(
        (f) => f.question === response.question
      );

      if (field && field.type !== 'crossword') {
        const sectionId = field.section ?? 1;
        const section = this.testData!.sections.find(
          (s) => s.sectionId === sectionId
        );

        if (section) {
          let scoring = section.scoring;
          if (scoring.wrong === 0 && scoring.correct === 0) {
            scoring = this.testData!.sections[0].scoring;
          }

          if (response.answer === field.answer) {
            totalScore += scoring.correct;
          } else if (response.answer.trim() !== '') {
            totalScore += scoring.wrong;
          }
        }
      }
    });

    return totalScore;
  }

  formatResponses(): Array<{
    question: string;
    response: string;
    correct_answer: string;
    section?: number;
  }> {
    if (!this.testData) return [];

    return this.testResponses.map((response) => {
      const field = this.testData!.formData.fields.find(
        (f) => f.question === response.question
      );

      return {
        question: response.question,
        response: response.answer,
        correct_answer: field?.answer || '',
        section: field?.section
      };
    });
  }

  submitTest(): void {
    this.cleanupTimers();

    const score = this.calculateScore();
    this.testScore = this.testScore + score;
    this.testPercentage = this.testData ?
      (this.testScore / this.testData.formData.fields.length) * 100 : 0;

    const credentials = sessionStorage.getItem(this.CREDENTIALS_KEY);
    if (credentials && this.testId) {
      const res = JSON.parse(credentials);

      const reqData = {
        applicant_name: res.name,
        applicant_email: res.email,
        applicant_id: res.applicant_id,
        test_response: this.formatResponses(),
        test_score: this.testScore,
        test_id: this.testId,
        time_taken: Math.floor((Date.now() - res.timestamp) / 1000), // Total time in seconds
        completed_at: new Date().toISOString()
      };

      // Save to IndexedDB for offline capability
      this.testSyncService.saveOfflineTest(reqData).then(() => {
        console.log('Test saved for offline sync');
      });

      // Attempt to submit online
      this.testService.saveTestResponse(reqData).pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: () => {
          this.clearTestProgress();
          this.currentView = 'thankyou';
        },
        error: (error) => {
          console.error('Online submission failed, saved for offline:', error);
          // Still show thank you page since we saved offline
          this.clearTestProgress();
          this.currentView = 'thankyou';
        },
      });
    } else {
      this.clearTestProgress();
      this.currentView = 'thankyou';
    }
  }

  private saveTestProgress(): void {
    if (!isPlatformBrowser(this.platformId) || !this.testId) return;

    const progress = {
      currentView: this.currentView,
      currentSection: this.currentSection,
      testResponses: this.testResponses,
      sectionStarted: this.sectionStarted, // Save which sections have been started
      timer: this.timer,
      timestamp: Date.now(),
      testId: this.testId
    };

    localStorage.setItem(
      `${this.PROGRESS_KEY_PREFIX}${this.testId}`,
      JSON.stringify(progress)
    );
  }

  private clearTestProgress(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    // Clear all test-related data
    sessionStorage.removeItem(this.CREDENTIALS_KEY);

    if (this.testId) {
      localStorage.removeItem(`${this.PROGRESS_KEY_PREFIX}${this.testId}`);

      // Clear all timer keys for this test
      for (let i = 0; i < 10; i++) { // Assuming max 10 sections
        const timerKey = `${this.TIMER_KEY_PREFIX}${this.testId}_${i}`;
        this.timerService.clearTimer(timerKey);
        localStorage.removeItem(`timer_${timerKey}`);
      }
    }
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  // Helper method for emergency save (call from template if needed)
  emergencySave(): void {
    this.saveTestProgress();
    alert('Progress saved! You can resume later.');
  }

  goToHome(): void {
    // Implement your navigation logic here
  }

  scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}