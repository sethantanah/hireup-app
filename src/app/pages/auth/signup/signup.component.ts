import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
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
import { ERROR_MESSAGES, LoginData, SIGNIN_ERRORS, UserReq } from '../../../models/users.models';
import { AlertPopupComponent } from '../../components/alert-popup/alert-popup.component';
import { AlertService } from '../../../services/alert.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-signup',
  imports: [ReactiveFormsModule, CommonModule, AlertPopupComponent],
  templateUrl: './signup.component.html',
  styleUrl: './signup.component.scss',
})
export class SignupComponent implements OnInit {
  signupForm: FormGroup;
  isLoading = false;
  isSubmitted = false;
  logoPreview: string | null = null;

  alert: any = null;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService,
    private alertService: AlertService
  ) {
    this.signupForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      acceptTerms: [false],
      password: [
        '',
        [
          Validators.required,
          Validators.minLength(8),
          this.passwordStrengthValidator,
        ],
      ],
      companyName: ['', Validators.required],
      fullName: ['', Validators.required],
      positionInCompany: ['', Validators.required],
      logo: [null],
    });
  }

  ngOnInit(): void {
    this.alertService.alert$.subscribe((alert) => {
      this.alert = alert;
    });
  }

  passwordStrengthValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value) {
      return null;
    }

    const hasUpperCase = /[A-Z]+/.test(value);
    const hasLowerCase = /[a-z]+/.test(value);
    const hasNumeric = /[0-9]+/.test(value);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/.test(value);

    const passwordValid =
      hasUpperCase && hasLowerCase && hasNumeric && hasSpecialChar;

    return !passwordValid ? { passwordStrength: true } : null;
  }

  onFileChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.signupForm.patchValue({
        logo: file,
      });

      // Preview the logo
      const reader = new FileReader();
      reader.onload = () => {
        this.logoPreview = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  onSubmit(): void {
    this.isSubmitted = true;

    if (this.signupForm.invalid) {
      return;
    }

    this.isLoading = true;

    // Create form data for file upload
    // const formData = new FormData();
    // formData.append('email', this.signupForm.get('email')?.value);
    // formData.append('password', this.signupForm.get('password')?.value);
    // formData.append('company_name', this.signupForm.get('companyName')?.value);

    // if (this.signupForm.get('logo')?.value) {
    //   formData.append('logo', this.signupForm.get('logo')?.value);
    // }

    if (!this.signupForm.get('acceptTerms')?.value) {
      this.alertService.showDanger('You must accept the terms and conditions.');
      this.isLoading = false;
      return;
    }

    const user_data: UserReq = {
      email: this.signupForm.get('email')?.value,
      password: this.signupForm.get('password')?.value,
      company_name: this.signupForm.get('companyName')?.value,
      full_name: this.signupForm.get('fullName')?.value,
      position_in_company: this.signupForm.get('positionInCompany')?.value
    };

    this.signup(user_data);
  }

  signup(user_data: UserReq): void {
    this.authService.signUp(user_data).subscribe({
      next: (res) => {
        this.alertService.showSuccess('Sign up successfully!');
        const login_data: LoginData = {
          email: user_data.email,
          password: user_data.password,
        };
        this.signin(login_data);
      },
      error: (err) => {
        this.isLoading = false;
        this.alertService.showDanger(ERROR_MESSAGES.getMessage(err));
      },
      complete: () => {
        this.isLoading = false;
      },
    });
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

  navigateToSignin(): void {
    this.router.navigate(['/auth/signin']);
  }

  onAlertClosed(): void {
    this.alertService.clearAlert();
  }
}
