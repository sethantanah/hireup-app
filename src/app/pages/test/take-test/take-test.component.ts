import { Component, HostListener } from '@angular/core';
import { TestData, TestResponse } from '../../../models/test-models';
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

@Component({
  selector: 'app-take-test',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    PreventCopyPasteDirective,
    PreventScreenShotDirective,
  ],
  providers: [],
  templateUrl: './take-test.component.html',
  styleUrl: './take-test.component.scss',
})
export class TakeTestComponent implements CanComponentDeactivate {
  hasUnsavedChanges = true;
  canDeactivate(): boolean {
    if (this.hasUnsavedChanges) {
      return confirm('You have unsaved changes! Do you really want to leave?');
    }
    return true;
  }

  @HostListener('window:beforeunload', ['$event'])
  unloadNotification($event: any): void {
    if (this.hasUnsavedChanges) {
      $event.returnValue = true; // This will trigger the browser's confirmation prompt
    }
  }

  testData: TestData | undefined;

  currentView: 'instructions' | 'form' | 'thankyou' = 'instructions';
  showPopup = false;
  isLoading = false;
  errorMessage: string | null = null;
  userForm: FormGroup;
  timer: number = 0; // Convert duration to seconds
  currentSection: number = 0;
  showWarning: boolean = false;
  timeUp: boolean = false;

  testResponses: TestResponse[] = [];

  testScore: number = 0;
  testPercentage: number = 0;

  constructor(
    private fb: FormBuilder,
    public testService: JobtestApiService,
    private route: ActivatedRoute,
    public formattingService: FormattingService
  ) {
    this.userForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
    });

    const testId = this.route.snapshot.paramMap.get('testId');
    if (testId) {
      this.testService.jobTest(testId).subscribe({
        next: (data) => {
          this.testData = data[0].test_data;
          if (this.testData) {
            this.timer = 0.3 * 60 // this.testData.sections[0].duration * 60;

            this.testResponses = this.testData.formData.fields.map((field) => ({
              question: field.question,
              answer: '',
            }));
          }
        },
        error: (error) => {
          console.error(error);
        },
      });
    }
  }

  // Start the test
  startTest(): void {
    this.showPopup = true;
  }

  // Submit user details
  submitUserDetails(): void {
    if (this.userForm.invalid) {
      this.errorMessage = 'Please fill out all fields correctly.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;


    this.isLoading = false;
    this.errorMessage = null;
    this.showPopup = false;
    this.currentView = 'form';
    this.startTimer();

    // Simulate an API call
    // this.testService
    //   .checkApplicantCredentials(
    //     this.userForm.get('email')!.value,
    //     this.userForm.get('name')!.value
    //   )
    //   .subscribe({
    //     next: (data) => {
    //       this.isLoading = false;
    //       this.errorMessage = null;
    //       this.showPopup = false;
    //       this.currentView = 'form';
    //       this.startTimer();

    //       localStorage.setItem(
    //         'applicateCredentials',
    //         JSON.stringify({
    //           ...data,
    //         })
    //       );
    //     },
    //     error: (error) => {
    //       this.isLoading = false;
    //       this.errorMessage = error.error.detail;
    //       console.error(error);
    //     },
    //   });
  }

  // Start the timer
  startTimer(): void {
    const interval = setInterval(() => {
      this.timer--;
      if (this.timer <= 0) {
        this.timer = 0;
        clearInterval(interval);
        if (this.testData!.sections.length - 1 > this.currentSection) {
          this.timeUp = true;
          const navAlert = setTimeout(() => {
            clearInterval(navAlert);
            this.navigateSection();
          }, 2500);
        } else {
          this.submitTest();
        }
      }
    }, 1000);
  }

  getTimerColor(timeLeft: number): string {
    if (timeLeft <= 300) {
      // 5 minutes
      return 'bg-red-50 text-red-600';
    } else if (timeLeft <= 600) {
      // 10 minutes
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
    });
  }

  getTotaltime(): number {
    let totalTime = 0;
    this.testData?.sections.forEach((section: any) => {
      totalTime += section.duration;
    });

    return totalTime;
  }

  goToHome(): void {
    // Implement your navigation logic here
  }

  navigateSection() {
    if (this.testData!.sections.length - 1 > this.currentSection) {
      this.currentSection = this.currentSection + 1;
      this.timer = this.timer = 0.3 * 60 // this.testData!.sections[this.currentSection].duration * 60;

      // Simulate an API call
      this.isLoading = false;
      this.showPopup = false;
      this.timeUp = false;
      this.startTimer();
    }
  }

  showNavigationWarning() {
    this.showWarning = true;
  }

  closeWarning() {
    this.showWarning = false;
  }

  confirmNavigation() {
    this.navigateSection();
    this.showWarning = false;
  }

  calculateScore(): number {
    let totalScore = 0;

    // Iterate through each response
    this.testResponses.forEach((response) => {
      // Find the corresponding field in the test data
      const field = this.testData!.formData.fields.find(
        (f) => f.question === response.question
      );

      if (field) {
        // Determine the section of the field
        // If field.section is null or undefined, default to the first section (sectionId = 1)
        const sectionId = field.section ?? 1; // Use nullish coalescing operator
        const section = this.testData!.sections.find(
          (s) => s.sectionId === sectionId
        );

        if (section) {
          // Determine the scoring rules
          let scoring = section.scoring;

          // If both wrong and correct are 0, use the scoring of the first section
          if (scoring.wrong === 0 && scoring.correct === 0) {
            scoring = this.testData!.sections[0].scoring;
          }

          // Compare the user's answer with the correct answer
          if (response.answer === field.answer) {
            totalScore += scoring.correct;
          } else {
            totalScore += scoring.wrong;
          }
        }
      }
    });

    return totalScore;
  }

  formatResponses(): {
    question: string;
    response: string;
    correct_answer: string;
  }[] {
    // Initialize an array to store the formatted responses
    const formattedResponses: {
      question: string;
      response: string;
      correct_answer: string;
    }[] = [];

    // Iterate through each response
    this.testResponses.forEach((response) => {
      // Find the corresponding field in the test data
      const field = this.testData!.formData.fields.find(
        (f) => f.question === response.question
      );

      if (field) {
        // Push the formatted response to the array
        formattedResponses.push({
          question: field.question,
          response: response.answer,
          correct_answer: field.answer,
        });
      }
    });

    return formattedResponses;
  }

  // Submit the test
  submitTest(): void {
    // const score = this.calculateScore();
    // this.testScore = score;
    // this.testPercentage = (score / this.testData!.formData.fields.length)*100;

    // // Check if the user passed
    // const passmark = this.testData!.sections[0].scoring.passmark; // Assuming passmark is the same for all sections

    // const resData = localStorage.getItem('applicateCredentials');
    // if (resData) {
    //   const testId = this.route.snapshot.paramMap.get('testId');
    //   const res = JSON.parse(resData);

    //   const reqData = {
    //     applicant_name: res.name,
    //     applicant_email: res.email,
    //     applicant_id: res.applicant_id,
    //     test_response: this.formatResponses(),
    //     test_score: score,
    //     test_id: testId,
    //   };

    //   this.testService.saveTestResponse(reqData).subscribe({
    //     next: () => {
    //       localStorage.removeItem('applicateCredentials');
    //     },
    //     error: (error) => {
    //       localStorage.removeItem('applicateCredentials');
    //       console.error(error);
    //     },
    //   });
    // }

    this.currentView = 'thankyou';
  }
}
