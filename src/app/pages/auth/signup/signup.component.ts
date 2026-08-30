import { CommonModule } from '@angular/common';
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
import { ActivatedRoute, Router } from '@angular/router';

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

  userRole: 'recruiter' | 'candidate' = 'candidate';
  alert: any = null;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService,
    private alertService: AlertService
  ) {
    this.signupForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      acceptTerms: [false, Validators.requiredTrue],
      password: [
        '',
        [
          Validators.required,
          Validators.minLength(8),
          this.passwordStrengthValidator,
        ],
      ],
      companyName: [''],
      fullName: [''],
      positionInCompany: [''],
      logo: [null],
    });
  }

  ngOnInit(): void {
    this.route.url.subscribe(urlSegments => {
      const path = urlSegments.map(s => s.path).join('/');
      if (path.includes('recruiter')) {
        this.userRole = 'recruiter';
      } else {
        this.userRole = 'candidate';
      }
      this.updateValidators();
    });

    this.route.queryParams.subscribe(params => {
      if (params['role'] === 'recruiter') {
        this.userRole = 'recruiter';
      } else if (params['role'] === 'candidate') {
        this.userRole = 'candidate';
      }
      this.updateValidators();
    });

    this.alertService.alert$.subscribe((alert) => {
      this.alert = alert;
    });
  }

  setRole(role: 'recruiter' | 'candidate'): void {
    this.userRole = role;
    this.updateValidators();
  }

  updateValidators(): void {
    const compControl = this.signupForm.get('companyName');
    const nameControl = this.signupForm.get('fullName');
    const posControl = this.signupForm.get('positionInCompany');

    if (this.userRole === 'candidate') {
      compControl?.clearValidators();
      nameControl?.clearValidators();
      posControl?.clearValidators();
    } else {
      compControl?.setValidators([Validators.required]);
      nameControl?.setValidators([Validators.required]);
      posControl?.setValidators([Validators.required]);
    }

    compControl?.updateValueAndValidity();
    nameControl?.updateValueAndValidity();
    posControl?.updateValueAndValidity();
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

    if (!this.signupForm.get('acceptTerms')?.value) {
      this.alertService.showDanger('You must accept the terms and conditions.');
      return;
    }

    this.isLoading = true;

    const emailVal = this.signupForm.get('email')?.value;
    const defaultName = emailVal ? emailVal.split('@')[0] : 'Candidate';

    const user_data: UserReq = {
      email: emailVal,
      password: this.signupForm.get('password')?.value,
      company_name: this.userRole === 'candidate' ? 'Candidate Account' : (this.signupForm.get('companyName')?.value || 'Candidate'),
      full_name: this.userRole === 'candidate' ? defaultName : (this.signupForm.get('fullName')?.value || defaultName),
      position_in_company: this.userRole === 'candidate' ? 'Job Seeker' : (this.signupForm.get('positionInCompany')?.value || 'Recruiter')
    };

    this.signup(user_data);
  }

  signup(user_data: UserReq): void {
    this.authService.signUp(user_data).subscribe({
      next: (res) => {
        this.alertService.showSuccess('Account created successfully!');
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

  navigateToSignin(): void {
    if (this.userRole === 'candidate') {
      this.router.navigate(['/auth/candidate/login']);
    } else {
      this.router.navigate(['/auth/recruiter/login']);
    }
  }

  onAlertClosed(): void {
    this.alertService.clearAlert();
  }
}
