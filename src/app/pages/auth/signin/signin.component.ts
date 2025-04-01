import { Component, OnInit } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
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
    this.alertService.alert$.subscribe((alert) => {
      this.alert = alert;
    });
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
      message: 'Loggin in...',
    });
    this.authService.logIn(login_data).subscribe({
      next: (res) => {
        localStorage.setItem('token', res.access_token);
        localStorage.setItem('USER', JSON.stringify(res.user));
        this.router.navigate(['/jobposts/' + res.user.id]);
        this.isLoading = false;
        
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
    this.router.navigate(['/auth/signup']);
  }

  navigateToForgotPassword(): void {
    this.router.navigate(['/auth/forgot-password']);
  }
}
