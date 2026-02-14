import { Component, HostListener, OnInit, OnDestroy, Inject, PLATFORM_ID, NgZone } from '@angular/core';
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
  private isNavigating: boolean = false;
  private autoSaveTimeout: any;
  private timeUpTriggered: boolean = false;
  private timerExpired: boolean = false;
  private navigationTimeout: any;
  private visibilityUpdateLock: boolean = false;
  private lastVisibilityUpdate: number = 0;
  private isDestroyed: boolean = false;
  private saveProgressLock: boolean = false;
  private timerKey: string = '';
  private beepAudio: HTMLAudioElement | null = null;
  private warningAudio: HTMLAudioElement | null = null;
  private continuousBeepInterval: any = null;
  public tabLostFocusCount: number = 0;
  public readonly MAX_TAB_SWITCH_WARNINGS = 10;
  private tabSwitchWarningShown: boolean = false;
  private isBeeping: boolean = false;
  private violationPopupDismissed: boolean = false;
  private initialTabWarningShown: boolean = false;
  
  autoSubmitPuzzles$ = new Subject<void>();

  // Track unsaved changes - only true during active test
  get hasUnsavedChanges(): boolean {
    return this.currentView === 'form' && 
           this.sectionStarted[this.currentSection] && 
           this.timer > 0 && 
           !this.isDestroyed;
  }

  testData: TestData | undefined;
  currentView: 'instructions' | 'form' | 'thankyou' = 'instructions';
  showPopup = false;
  showViolationPopup = false;
  isLoading = false;
  errorMessage: string | null = null;
  userForm: FormGroup;
  timer: number = 0;
  currentSection: number = 0;
  showWarning: boolean = false;
  showTabSwitchWarning: boolean = false;
  timeUp: boolean = false;
  testResponses: TestResponse[] = [];
  testScore: number = 0;
  testPercentage: number = 0;
  loading: boolean = true;
  isTabActive: boolean = true;
  sectionStarted: boolean[] = [];
  tabSwitchMessage: string = '';
  violationMessage: string = '';

  constructor(
    @Inject(PLATFORM_ID) private platformId: any,
    private fb: FormBuilder,
    public testService: JobtestApiService,
    private route: ActivatedRoute,
    public formattingService: FormattingService,
    private timerService: TimerService,
    private testSyncService: TestSyncService,
    private ngZone: NgZone
  ) {
    this.userForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
    });

    this.testId = this.route.snapshot.paramMap.get('testId');
    if (this.testId) {
      this.timerKey = `${this.TIMER_KEY_PREFIX}${this.testId}`;
    }
    this.initializeTest();
    this.initializeAudio();
  }

  private initializeAudio(): void {
    if (isPlatformBrowser(this.platformId)) {
      try {
        // Create beep sound - using your 1-second beep file
        this.beepAudio = new Audio();
        this.beepAudio.src = 'https://rsvjrkpldassdydasbfa.supabase.co/storage/v1/object/public/documents/others/freesound_community-beep-warning-6387.mp3'; // Your 1-second beep
        this.beepAudio.volume = 0.3;
        this.beepAudio.loop = false; // We'll handle looping manually
        
        this.warningAudio = new Audio();
        this.warningAudio.src = 'https://rsvjrkpldassdydasbfa.supabase.co/storage/v1/object/public/documents/others/freesound_community-beep-warning-6387.mp3';
        this.warningAudio.volume = 0.5;
      } catch (error) {
        console.warn('Audio initialization failed:', error);
      }
    }
  }

  private startContinuousBeep(): void {
    if (this.isBeeping || this.isDestroyed || !isPlatformBrowser(this.platformId)) return;
    
    this.isBeeping = true;
    console.log('Starting continuous beep - tab lost focus');
    
    // Play beep immediately
    this.playSingleBeep();
    
    // Then continue beeping every second until stopped
    this.continuousBeepInterval = setInterval(() => {
      if (this.isTabActive || this.isDestroyed || this.timerExpired) {
        // Stop if tab regained focus or component destroyed or timer expired
        this.stopContinuousBeep();
        return;
      }
      this.playSingleBeep();
    }, 1000); // Beep every second
  }

  private playSingleBeep(): void {
    if (!isPlatformBrowser(this.platformId) || this.isDestroyed) return;
    
    try {
      if (this.beepAudio) {
        // Create a new audio instance each time to allow overlapping beeps
        const beep = new Audio();
        beep.src = 'https://rsvjrkpldassdydasbfa.supabase.co/storage/v1/object/public/documents/others/freesound_community-beep-warning-6387.mp3';
        beep.volume = 0.3;
        beep.play().catch(e => console.warn('Beep failed:', e));
      } else {
        // Fallback beep using Web Audio API
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        gainNode.gain.value = 0.1;
        
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.1);
      }
    } catch (error) {
      console.warn('Could not play beep:', error);
    }
  }

  private stopContinuousBeep(): void {
    if (this.continuousBeepInterval) {
      clearInterval(this.continuousBeepInterval);
      this.continuousBeepInterval = null;
    }
    this.isBeeping = false;
    console.log('Stopped continuous beep');
  }

  private playWarningSound(): void {
    if (!isPlatformBrowser(this.platformId) || this.isDestroyed) return;
    
    try {
      if (this.warningAudio) {
        const warning = new Audio();
        warning.src = 'https://rsvjrkpldassdydasbfa.supabase.co/storage/v1/object/public/documents/others/freesound_community-beep-warning-6387.mp3';
        warning.volume = 0.5;
        warning.play().catch(e => console.warn('Warning sound failed:', e));
      }
    } catch (error) {
      console.warn('Could not play warning:', error);
    }
  }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.setupVisibilityTracking();
      this.setupWindowBlurFocusTracking();
      this.checkForExistingTestProgress();
    }
  }

  ngOnDestroy(): void {
    this.isDestroyed = true;
    this.destroy$.next();
    this.destroy$.complete();
    this.cleanupTimers();
    this.stopContinuousBeep(); // Stop beeping when component destroys

    // Clear all timeouts
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
      this.autoSaveTimeout = null;
    }

    if (this.navigationTimeout) {
      clearTimeout(this.navigationTimeout);
      this.navigationTimeout = null;
    }

    // Clean up audio
    if (this.beepAudio) {
      this.beepAudio.pause();
      this.beepAudio = null;
    }
    if (this.warningAudio) {
      this.warningAudio.pause();
      this.warningAudio = null;
    }

    // Only save progress if test is not complete and component not destroyed
    if (this.currentView !== 'thankyou' && !this.isDestroyed) {
      try {
        this.saveTestProgress();
      } catch (error) {
        console.error('Error saving progress on destroy:', error);
      }
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

  @HostListener('window:blur', ['$event'])
  onWindowBlur(event: FocusEvent): void {
    if (this.currentView === 'form' && this.sectionStarted[this.currentSection] && !this.timerExpired) {
      this.tabLostFocusCount++;
      
      // Show violation popup if not dismissed
      if (!this.violationPopupDismissed) {
        this.showViolationPopup = true;
        this.violationMessage = 'VIOLATION: Opening new tabs or leaving the browser during the test is strictly prohibited. This behavior is being recorded and may result in test invalidation.';
      }
      
      if (this.tabLostFocusCount <= this.MAX_TAB_SWITCH_WARNINGS) {
        this.playWarningSound();
        this.showTabSwitchWarning = true;
        this.tabSwitchMessage = `Warning: You've switched tabs/window ${this.tabLostFocusCount}/${this.MAX_TAB_SWITCH_WARNINGS} times. Further switches may be considered cheating.`;
        
        // Auto-hide warning after 3 seconds
        setTimeout(() => {
          this.showTabSwitchWarning = false;
        }, 3000);
      } else if (!this.tabSwitchWarningShown) {
        this.tabSwitchWarningShown = true;
        this.playWarningSound();
        this.playWarningSound(); // Double warning for final warning
        this.showTabSwitchWarning = true;
        this.tabSwitchMessage = 'FINAL WARNING: Excessive tab/window switching detected. Your test may be invalidated.';
        
        setTimeout(() => {
          this.showTabSwitchWarning = false;
        }, 4000);
      }
      
      // Save this violation
      this.saveTestProgress();
    }
  }

  dismissViolationPopup(): void {
    this.violationPopupDismissed = true;
    this.showViolationPopup = false;
  }

  private setupWindowBlurFocusTracking(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    window.addEventListener('blur', () => {
      if (this.currentView === 'form' && this.sectionStarted[this.currentSection] && !this.timerExpired) {
        console.log('Window lost focus - starting continuous beep');
        this.startContinuousBeep(); // Start continuous beeping when focus lost
      }
    });

    window.addEventListener('focus', () => {
      if (this.currentView === 'form' && this.sectionStarted[this.currentSection] && !this.timerExpired) {
        console.log('Window gained focus - stopping beep');
        this.stopContinuousBeep(); // Stop beeping when focus regained
      }
    });
  }

  private setupVisibilityTracking(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    document.addEventListener('visibilitychange', () => {
      if (this.isDestroyed) return;

      const wasActive = this.isTabActive;
      this.isTabActive = !document.hidden;

      if (this.currentView === 'form' && this.sectionStarted[this.currentSection] && !this.timerExpired) {
        if (!this.isTabActive && wasActive) {
          // Tab just went inactive
          console.log('Tab hidden - starting continuous beep');
          
          // Show initial warning popup about tab switching (only once per session)
          if (!this.initialTabWarningShown) {
            this.initialTabWarningShown = true;
            this.showViolationPopup = true;
            this.violationMessage = 'WARNING: Opening new tabs or leaving the browser during the test is strictly prohibited. This behavior is being recorded and may result in test invalidation. Please return to the test immediately.';
          }
          
          this.playWarningSound();
          this.startContinuousBeep(); // Start beeping when tab hidden
          this.saveTestProgress();
          
          // Store the time when tab was hidden for accurate recalculation
          sessionStorage.setItem('tab_hidden_time', Date.now().toString());
          sessionStorage.setItem('tab_hidden_timer', this.timer.toString());
          
        } else if (this.isTabActive && !wasActive) {
          // Tab just became active again
          console.log('Tab visible - stopping beep');
          this.stopContinuousBeep(); // Stop beeping when tab visible again
          this.fixTimerRecalculation();
        }
      }
    });
  }

  private fixTimerRecalculation(): void {
    // Prevent rapid successive updates
    const now = Date.now();
    if (now - this.lastVisibilityUpdate < 1000 || this.visibilityUpdateLock) return;
    
    this.lastVisibilityUpdate = now;
    this.visibilityUpdateLock = true;

    try {
      if (!this.testStartTime || !this.testData || this.timerExpired || this.isDestroyed) return;

      const hiddenTime = sessionStorage.getItem('tab_hidden_time');
      const hiddenTimer = sessionStorage.getItem('tab_hidden_timer');
      
      if (hiddenTime && hiddenTimer) {
        const timeHidden = Math.floor((now - parseInt(hiddenTime)) / 1000);
        const expectedRemaining = parseInt(hiddenTimer) - timeHidden;
        
        console.log(`Tab was hidden for ${timeHidden} seconds`);
        console.log(`Timer before hidden: ${hiddenTimer}, Expected remaining: ${expectedRemaining}`);
        
        // Get actual elapsed time from testStartTime as backup
        const elapsedSeconds = Math.floor((now - this.testStartTime) / 1000);
        const sectionDuration = this.testData.sections[this.currentSection].duration * 60;
        const actualRemaining = Math.max(0, sectionDuration - elapsedSeconds);
        
        // Use the more accurate of the two calculations
        let newTimerValue: number;
        
        if (expectedRemaining >= 0 && Math.abs(expectedRemaining - actualRemaining) < 5) {
          newTimerValue = Math.min(expectedRemaining, actualRemaining);
        } else {
          newTimerValue = actualRemaining;
        }
        
        // Ensure we never increase the timer
        if (newTimerValue > this.timer) {
          console.warn(`Prevented timer increase: ${this.timer} -> ${newTimerValue}`);
          newTimerValue = this.timer - timeHidden;
          if (newTimerValue < 0) newTimerValue = 0;
        }
        
        console.log(`Timer recalculated: ${this.timer} -> ${newTimerValue}`);
        this.timer = Math.max(0, Math.min(this.timer, newTimerValue));

        // Clear stored values
        sessionStorage.removeItem('tab_hidden_time');
        sessionStorage.removeItem('tab_hidden_timer');

        // Restart timer with corrected time
        this.cleanupTimers();

        if (this.timer <= 0 && !this.timerExpired) {
          this.timerExpired = true;
          this.handleTimeUp();
        } else if (this.timer > 0) {
          this.startTimer();
        }
      } else {
        // Fallback to old calculation method if no stored values
        const elapsedSeconds = Math.floor((now - this.testStartTime) / 1000);
        const sectionDuration = this.testData.sections[this.currentSection].duration * 60;
        const remaining = Math.max(0, sectionDuration - elapsedSeconds);

        if (remaining < this.timer && Math.abs(this.timer - remaining) > 2) {
          console.log(`Timer recalculated (fallback): ${this.timer} -> ${remaining}`);
          this.timer = remaining;

          this.cleanupTimers();

          if (this.timer <= 0 && !this.timerExpired) {
            this.timerExpired = true;
            this.handleTimeUp();
          } else if (this.timer > 0) {
            this.startTimer();
          }
        }
      }
    } catch (error) {
      console.error('Error fixing timer recalculation:', error);
    } finally {
      setTimeout(() => {
        this.visibilityUpdateLock = false;
      }, 1000);
    }
  }

  private initializeTest(): void {
    if (this.testId) {
      this.loading = true;
      this.testService.jobTest(this.testId).pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: (data) => {
          try {
            this.testData = data.test_data;
            if (this.testData) {
              this.timer = this.testData.sections[0].duration * 60;
              this.sectionStarted = new Array(this.testData.sections.length).fill(false);
              this.testResponses = this.testData.formData.fields.map((field) => ({
                question: field.question,
                answer: '',
              }));
              this.loading = false;
              this.checkForResumePossibility();
            }
          } catch (error) {
            console.error('Error processing test data:', error);
            this.errorMessage = 'Error processing test data. Please refresh.';
            this.loading = false;
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

    try {
      const credentials = sessionStorage.getItem(this.CREDENTIALS_KEY);
      const progress = localStorage.getItem(`${this.PROGRESS_KEY_PREFIX}${this.testId}`);

      if (credentials && progress) {
        const progressData = JSON.parse(progress);
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
    } catch (error) {
      console.error('Error checking resume possibility:', error);
      this.clearTestProgress();
    }
  }

  private resumeTest(progressData: any): void {
    try {
      this.currentView = progressData.currentView;
      this.currentSection = progressData.currentSection;
      this.timer = progressData.timer;
      this.testResponses = progressData.testResponses || [];
      this.sectionStarted = progressData.sectionStarted || new Array(this.testData?.sections.length).fill(false);
      this.tabLostFocusCount = progressData.tabLostFocusCount || 0;
      this.tabSwitchWarningShown = progressData.tabSwitchWarningShown || false;
      this.initialTabWarningShown = progressData.initialTabWarningShown || false;
      this.violationPopupDismissed = progressData.violationPopupDismissed || false;
      this.timerExpired = false;
      this.timeUpTriggered = false;

      if (this.currentView === 'form' && this.sectionStarted[this.currentSection] && this.testData) {
        this.testStartTime = Date.now() - ((this.testData.sections[this.currentSection].duration * 60 - this.timer) * 1000);
        this.startTimer();
      }
    } catch (error) {
      console.error('Error resuming test:', error);
      this.errorMessage = 'Error resuming test. Starting fresh.';
      this.clearTestProgress();
    }
  }

  private checkForExistingTestProgress(): void {
    if (!isPlatformBrowser(this.platformId) || !this.testId) return;

    try {
      const progressKey = `${this.PROGRESS_KEY_PREFIX}${this.testId}`;
      const progress = localStorage.getItem(progressKey);

      if (progress) {
        const progressData = JSON.parse(progress);
        if (progressData.currentView === 'form' && Date.now() - progressData.timestamp < 300000) {
          this.resumeTest(progressData);
        }
      }
    } catch (error) {
      console.error('Error checking existing progress:', error);
    }
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
          try {
            this.isLoading = false;
            this.showPopup = false;
            this.currentView = 'form';

            sessionStorage.setItem(this.CREDENTIALS_KEY, JSON.stringify({
              ...data,
              timestamp: Date.now()
            }));

            this.saveTestProgress();
          } catch (error) {
            console.error('Error processing credentials:', error);
            this.errorMessage = 'Error saving credentials. Please try again.';
            this.isLoading = false;
          }
        },
        error: (error) => {
          this.isLoading = false;
          this.errorMessage = error.error?.detail || 'Invalid credentials. Please try again.';
          console.error('Credential check error:', error);
        },
      });
  }

  beginSection(sectionIndex: number): void {
    if (!this.testData || sectionIndex < 0 || sectionIndex >= this.testData.sections.length) return;

    try {
      this.timerExpired = false;
      this.timeUpTriggered = false;
      this.timeUp = false;
      this.tabLostFocusCount = 0;
      this.tabSwitchWarningShown = false;
      this.initialTabWarningShown = false; // Reset for new section
      this.violationPopupDismissed = false; // Reset for new section
      this.stopContinuousBeep(); // Ensure beeping is stopped when starting new section

      this.sectionStarted[sectionIndex] = true;
      this.timer = this.testData.sections[sectionIndex].duration * 60;
      this.testStartTime = Date.now();
      
      this.startTimer();
      this.saveTestProgress();

      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error('Error beginning section:', error);
      this.errorMessage = 'Error starting section. Please refresh.';
    }
  }

  getSectionQuestionCount(sectionIndex: number): number {
    if (!this.testData || sectionIndex < 0 || sectionIndex >= this.testData.sections.length) {
      return 0;
    }

    try {
      const section = this.testData.sections[sectionIndex];
      return this.testData.formData.fields.filter(field =>
        field.section === section.sectionId ||
        (section.sectionId === 1 && field.section === undefined)
      ).length;
    } catch (error) {
      console.error('Error getting section question count:', error);
      return 0;
    }
  }

  getCurrentSectionFields(): any[] {
    if (!this.testData || !this.testData.formData?.fields || this.currentSection === undefined) {
      return [];
    }

    try {
      const currentSectionId = this.testData.sections[this.currentSection].sectionId;

      return this.testData.formData.fields.filter(field => {
        if (field.section !== undefined && field.section === currentSectionId) {
          return true;
        }
        if (currentSectionId === 1 && field.section === undefined) {
          return true;
        }
        return false;
      });
    } catch (error) {
      console.error('Error getting current section fields:', error);
      return [];
    }
  }

  startTimer(): void {
    if (this.isDestroyed || this.timerExpired) return;

    console.log(`Starting timer for section ${this.currentSection}, initial time: ${this.timer}`);

    this.cleanupTimers();
    this.timeUpTriggered = false;
    this.timeUp = false;
    this.timerExpired = false;
    this.testStartTime = Date.now();

    try {
      const timerKey = `${this.TIMER_KEY_PREFIX}${this.testId}_${this.currentSection}`;
      const expiryTime = Date.now() + (this.timer * 1000);
      localStorage.setItem(`${timerKey}_expiry`, expiryTime.toString());

      // Run timer outside Angular zone to prevent change detection thrashing
      this.ngZone.runOutsideAngular(() => {
        this.timerInterval = setInterval(() => {
          if (this.isDestroyed || this.timerExpired) return;

          this.ngZone.run(() => {
            try {
              if (this.timer > 0) {
                this.timer--;

                if (this.timer % 30 === 0) {
                  this.saveTestProgress();
                }

                if (this.timer === 0 && !this.timerExpired) {
                  console.log(`UI Timer reached 0 for section ${this.currentSection}`);
                  this.timerExpired = true;
                  this.cleanupTimers();
                  this.handleTimeUp();
                }
              }
            } catch (error) {
              console.error('Error in timer interval:', error);
            }
          });
        }, 1000);
      });
    } catch (error) {
      console.error('Error starting timer:', error);
    }
  }

  private handleTimeUp(): void {
    if (this.timeUpTriggered || this.isNavigating || this.timerExpired === false || this.isDestroyed) {
      return;
    }

    console.log(`Time up triggered for section ${this.currentSection}`);
    
    this.timeUpTriggered = true;
    this.isNavigating = true;
    this.timeUp = true;
    this.stopContinuousBeep(); // Stop beeping when time is up

    try {
      this.autoSubmitPuzzles$.next();
      this.cleanupTimers();

      if (this.autoSaveTimeout) {
        clearTimeout(this.autoSaveTimeout);
        this.autoSaveTimeout = null;
      }

      if (this.navigationTimeout) {
        clearTimeout(this.navigationTimeout);
        this.navigationTimeout = null;
      }

      this.saveTestProgress();

      this.navigationTimeout = setTimeout(() => {
        try {
          if (this.isDestroyed) return;

          console.log(`Processing navigation for section ${this.currentSection}`);
          
          if (this.testData && this.testData.sections.length - 1 > this.currentSection) {
            this.currentSection++;
            this.timer = this.testData.sections[this.currentSection].duration * 60;
            this.timeUp = false;
            this.timeUpTriggered = false;
            this.timerExpired = false;
            this.isNavigating = false;
            this.tabLostFocusCount = 0; // Reset tab switch counter for new section
            this.tabSwitchWarningShown = false;
            this.initialTabWarningShown = false; // Reset for new section
            this.violationPopupDismissed = false; // Reset for new section

            this.saveTestProgress();
            window.scrollTo({ top: 0, behavior: 'smooth' });

            console.log(`Successfully navigated to section ${this.currentSection}`);
          } else {
            this.submitTest();
          }
        } catch (error) {
          console.error('Error during time-up navigation:', error);
          this.timeUpTriggered = false;
          this.isNavigating = false;
        } finally {
          this.navigationTimeout = null;
        }
      }, 2000);
    } catch (error) {
      console.error('Error in handleTimeUp:', error);
      this.timeUpTriggered = false;
      this.isNavigating = false;
    }
  }

  private cleanupTimers(): void {
    console.log(`Cleaning up timers for section ${this.currentSection}`);

    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }

    if (this.navigationTimeout) {
      clearTimeout(this.navigationTimeout);
      this.navigationTimeout = null;
    }

    this.stopContinuousBeep(); // Stop beeping when cleaning up timers

    try {
      if (this.testId) {
        const timerKey = `${this.TIMER_KEY_PREFIX}${this.testId}_${this.currentSection}`;
        this.timerService.clearTimer(timerKey);
      }
    } catch (error) {
      console.error('Error clearing timer service:', error);
    }
  }

  getTimerColor(timeLeft: number): string {
    try {
      const totalSectionTime = (this.testData?.sections[this.currentSection]?.duration ?? 0) * 60;
      const percentageLeft = totalSectionTime > 0 ? (timeLeft / totalSectionTime) * 100 : 0;

      if (percentageLeft <= 25) {
        return 'bg-red-50 text-red-600';
      } else if (percentageLeft <= 50) {
        return 'bg-yellow-50 text-yellow-600';
      }
      return 'bg-indigo-50 text-indigo-600';
    } catch (error) {
      console.error('Error getting timer color:', error);
      return 'bg-indigo-50 text-indigo-600';
    }
  }

  formatTimeRemaining(seconds: number): string {
    try {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    } catch (error) {
      console.error('Error formatting time:', error);
      return '0:00';
    }
  }

  getCurrentDateTime(): string {
    try {
      return new Date().toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (error) {
      console.error('Error getting date time:', error);
      return '';
    }
  }

  getTotaltime(): number {
    return this.testData?.sections.reduce((total, section) => total + section.duration, 0) || 0;
  }

  getCurrentSectionTime(): number {
    return this.testData?.sections[this.currentSection]?.duration || 0;
  }

  navigateSection(): void {
    if (this.isNavigating || this.isDestroyed) {
      console.log('Navigation already in progress or component destroyed, skipping');
      return;
    }

    if (!this.testData || this.testData.sections.length - 1 <= this.currentSection) {
      return;
    }

    console.log(`Navigating from section ${this.currentSection} to ${this.currentSection + 1}`);
    this.isNavigating = true;

    try {
      this.cleanupTimers();

      if (this.navigationTimeout) {
        clearTimeout(this.navigationTimeout);
        this.navigationTimeout = null;
      }

      this.saveTestProgress();
      this.currentSection++;
      this.timer = this.testData.sections[this.currentSection].duration * 60;
      this.timeUp = false;
      this.timeUpTriggered = false;
      this.timerExpired = false;
      this.testStartTime = 0;
      this.tabLostFocusCount = 0; // Reset tab switch counter for new section
      this.tabSwitchWarningShown = false;
      this.initialTabWarningShown = false; // Reset for new section
      this.violationPopupDismissed = false; // Reset for new section

      this.saveTestProgress();
      window.scrollTo({ top: 0, behavior: 'smooth' });

      console.log(`Successfully navigated to section ${this.currentSection}`);
    } catch (error) {
      console.error('Error during navigation:', error);
      this.errorMessage = 'Navigation error. Please refresh.';
    } finally {
      this.isNavigating = false;
    }
  }

  showNavigationWarning(): void {
    try {
      if (this.timer > 0 && this.testData && this.testData.sections.length - 1 > this.currentSection) {
        this.showWarning = true;
      } else {
        this.navigateSection();
      }
    } catch (error) {
      console.error('Error showing navigation warning:', error);
    }
  }

  closeWarning(): void {
    this.showWarning = false;
  }

  closeTabSwitchWarning(): void {
    this.showTabSwitchWarning = false;
  }

  confirmNavigation(): void {
    this.navigateSection();
    this.showWarning = false;
    this.scrollToTop();
  }

  onCrosswordCompleted(field: any, event: any): void {
    try {
      const responseIndex = this.testResponses.findIndex(r => r.question === field.question);
      if (responseIndex !== -1) {
        if (event?.score > 0) {
          this.testScore += event.score / 10;
        }
        this.saveTestProgress();
      }
    } catch (error) {
      console.error('Error handling crossword completion:', error);
    }
  }

  onAnswerChange(question: string, answer: string): void {
    try {
      const responseIndex = this.testResponses.findIndex(r => r.question === question);
      if (responseIndex !== -1) {
        this.testResponses[responseIndex].answer = answer;

        if (this.autoSaveTimeout) {
          clearTimeout(this.autoSaveTimeout);
        }
        
        this.autoSaveTimeout = setTimeout(() => {
          if (!this.isDestroyed) {
            this.saveTestProgress();
          }
          this.autoSaveTimeout = null;
        }, 1000);
      }
    } catch (error) {
      console.error('Error handling answer change:', error);
    }
  }

  calculateScore(): number {
    if (!this.testData) return 0;

    try {
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
    } catch (error) {
      console.error('Error calculating score:', error);
      return 0;
    }
  }

  formatResponses(): Array<{
    question: string;
    response: string;
    correct_answer: string;
    section?: number;
  }> {
    if (!this.testData) return [];

    try {
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
    } catch (error) {
      console.error('Error formatting responses:', error);
      return [];
    }
  }

  submitTest(): void {
    if (this.isNavigating || this.isDestroyed) return;

    console.log('Submitting test');
    this.isNavigating = true;
    this.cleanupTimers();
    this.stopContinuousBeep(); // Stop beeping when submitting

    if (this.navigationTimeout) {
      clearTimeout(this.navigationTimeout);
      this.navigationTimeout = null;
    }

    try {
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
          time_taken: Math.floor((Date.now() - res.timestamp) / 1000),
          completed_at: new Date().toISOString(),
          tab_switches: this.tabLostFocusCount // Include tab switch count in submission
        };

        this.testSyncService.saveOfflineTest(reqData).catch(error => {
          console.error('Error saving offline test:', error);
        });

        this.testService.saveTestResponse(reqData).pipe(
          takeUntil(this.destroy$)
        ).subscribe({
          next: () => {
            this.clearTestProgress();
            this.currentView = 'thankyou';
            this.isNavigating = false;
          },
          error: (error) => {
            console.error('Online submission failed, saved for offline:', error);
            this.clearTestProgress();
            this.currentView = 'thankyou';
            this.isNavigating = false;
          },
        });
      } else {
        this.clearTestProgress();
        this.currentView = 'thankyou';
        this.isNavigating = false;
      }
    } catch (error) {
      console.error('Error submitting test:', error);
      this.errorMessage = 'Error submitting test. Please try again.';
      this.isNavigating = false;
    }
  }

  private saveTestProgress(): void {
    // Prevent concurrent save operations
    if (this.saveProgressLock || this.isDestroyed) return;
    
    this.saveProgressLock = true;

    try {
      if (!isPlatformBrowser(this.platformId) || !this.testId) return;

      const progress = {
        currentView: this.currentView,
        currentSection: this.currentSection,
        testResponses: this.testResponses,
        sectionStarted: this.sectionStarted,
        timer: this.timer,
        timestamp: Date.now(),
        testId: this.testId,
        timerExpired: this.timerExpired,
        tabLostFocusCount: this.tabLostFocusCount,
        tabSwitchWarningShown: this.tabSwitchWarningShown,
        initialTabWarningShown: this.initialTabWarningShown,
        violationPopupDismissed: this.violationPopupDismissed
      };

      localStorage.setItem(
        `${this.PROGRESS_KEY_PREFIX}${this.testId}`,
        JSON.stringify(progress)
      );
    } catch (error) {
      console.error('Error saving test progress:', error);
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        this.errorMessage = 'Storage limit reached. Some progress may not be saved.';
      }
    } finally {
      setTimeout(() => {
        this.saveProgressLock = false;
      }, 100);
    }
  }

  private clearTestProgress(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    try {
      sessionStorage.removeItem(this.CREDENTIALS_KEY);

      if (this.testId) {
        localStorage.removeItem(`${this.PROGRESS_KEY_PREFIX}${this.testId}`);

        for (let i = 0; i < 10; i++) {
          const timerKey = `${this.TIMER_KEY_PREFIX}${this.testId}_${i}`;
          try {
            this.timerService.clearTimer(timerKey);
          } catch (error) {
            console.error(`Error clearing timer ${timerKey}:`, error);
          }
          localStorage.removeItem(`timer_${timerKey}`);
          localStorage.removeItem(`${timerKey}_expiry`);
        }
      }
      
      // Clear any stored tab data
      sessionStorage.removeItem('tab_hidden_time');
      sessionStorage.removeItem('tab_hidden_timer');
    } catch (error) {
      console.error('Error clearing test progress:', error);
    }
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    try {
      Object.values(formGroup.controls).forEach(control => {
        control.markAsTouched();
        if (control instanceof FormGroup) {
          this.markFormGroupTouched(control);
        }
      });
    } catch (error) {
      console.error('Error marking form touched:', error);
    }
  }

  emergencySave(): void {
    try {
      this.saveTestProgress();
      alert('Progress saved! You can resume later.');
    } catch (error) {
      console.error('Error in emergency save:', error);
      alert('Error saving progress. Please try again.');
    }
  }

  goToHome(): void {
    // Implement your navigation logic here
  }

  scrollToTop(): void {
    try {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error('Error scrolling to top:', error);
    }
  }
}