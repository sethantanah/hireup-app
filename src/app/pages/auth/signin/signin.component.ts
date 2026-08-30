import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { AlertService } from '../../../services/alert.service';
import { LoginData, SIGNIN_ERRORS } from '../../../models/users.models';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-signin',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './signin.component.html',
  styleUrl: './signin.component.scss',
})
export class SigninComponent implements OnInit {
  signinForm: FormGroup;
  isLoading = false;
  isSubmitted = false;
  errorMessage: string | null = null;
  showSuccessMessage = false;

  userRole: 'recruiter' | 'candidate' = 'recruiter';

  alert: any = null;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService,
    private alertService: AlertService
  ) {
    this.signinForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
      rememberMe: [false],
    });
  }

  ngOnInit(): void {
    this.route.url.subscribe(urlSegments => {
      const path = urlSegments.map(s => s.path).join('/');
      if (path.includes('candidate')) {
        this.userRole = 'candidate';
      } else if (path.includes('recruiter')) {
        this.userRole = 'recruiter';
      }
    });

    this.route.queryParams.subscribe(params => {
      if (params['role'] === 'candidate') {
        this.userRole = 'candidate';
      } else if (params['role'] === 'recruiter') {
        this.userRole = 'recruiter';
      }
    });

    this.alertService.alert$.subscribe((alert) => {
      this.alert = alert;
    });
  }

  setRole(role: 'recruiter' | 'candidate'): void {
    this.userRole = role;
  }

  onSubmit(): void {
    this.isSubmitted = true;
    this.errorMessage = null;

    if (this.signinForm.invalid) {
      return;
    }

    this.isLoading = true;

    const credentials = {
      email: this.signinForm.get('email')?.value,
      password: this.signinForm.get('password')?.value,
    };

    this.signin(credentials);
  }

  signin(login_data: LoginData): void {
    this.alertService.showAlert({
      type: 'success',
      message: 'Logging in...',
    });
    this.authService.logIn(login_data).subscribe({
      next: (res) => {
        localStorage.setItem('token', res.access_token);
        localStorage.setItem('USER', JSON.stringify(res.user));
        this.isLoading = false;

        if (this.userRole === 'candidate') {
          this.router.navigate(['/candidate-portal']);
        } else {
          this.router.navigate(['/jobposts/' + res.user.id]);
        }
      },
      error: (err) => {
        console.error(err);
        this.isLoading = false;
        this.alertService.showDanger(SIGNIN_ERRORS.getMessage(err));
      },
      complete: () => {
        this.isLoading = false;
      },
    });
  }

  onAlertClosed(): void {
    this.alertService.clearAlert();
  }

  navigateToSignup(): void {
    if (this.userRole === 'candidate') {
      this.router.navigate(['/auth/candidate/register']);
    } else {
      this.router.navigate(['/auth/recruiter/register']);
    }
  }

  navigateToForgotPassword(): void {
    this.router.navigate(['/auth/forgot-password']);
  }
}
