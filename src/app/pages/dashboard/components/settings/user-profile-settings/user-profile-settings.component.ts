import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CandidateService } from '../../../../../services/candidate.service';

@Component({
  selector: 'app-user-profile-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-profile-settings.component.html',
  styleUrl: './user-profile-settings.component.scss'
})
export class UserProfileSettingsComponent implements OnInit {
  userProfile = {
    full_name: '',
    email: '',
    company_name: '',
    position_in_company: '',
    avatar_url: ''
  };

  isLoading: boolean = false;
  isSaving: boolean = false;
  isUploadingAvatar: boolean = false;

  feedback: { type: 'success' | 'error'; message: string } | null = null;

  constructor(private candidateService: CandidateService) {}

  ngOnInit(): void {
    this.loadUserData();
  }

  loadUserData(): void {
    const userStr = localStorage.getItem('USER');
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        this.userProfile = {
          full_name: u.full_name || `${u.first_name || ''} ${u.last_name || ''}`.trim(),
          email: u.email || u.username || '',
          company_name: u.company_name || u.org_name || '',
          position_in_company: u.position_in_company || u.role || 'Recruiter',
          avatar_url: u.avatar_url || u.logo_url || ''
        };
      } catch (e) {
        console.error('Error parsing stored user data:', e);
      }
    }
  }

  get userInitials(): string {
    if (this.userProfile.full_name && this.userProfile.full_name.trim()) {
      return this.userProfile.full_name.trim().charAt(0).toUpperCase();
    }
    if (this.userProfile.email) {
      return this.userProfile.email.charAt(0).toUpperCase();
    }
    return 'R';
  }

  onAvatarSelected(event: any): void {
    const file: File = event.target.files[0];
    if (!file) return;

    this.isUploadingAvatar = true;
    this.feedback = null;

    this.candidateService.uploadUserAvatar(file).subscribe({
      next: (res: any) => {
        this.isUploadingAvatar = false;
        if (res.avatar_url) {
          this.userProfile.avatar_url = res.avatar_url;
          this.updateLocalUser({ avatar_url: res.avatar_url, logo_url: res.avatar_url });
          this.feedback = { type: 'success', message: 'Recruiter profile picture updated successfully!' };
        }
      },
      error: (err: any) => {
        this.isUploadingAvatar = false;
        console.error('Recruiter avatar upload error:', err);
        this.feedback = {
          type: 'error',
          message: err?.error?.detail || 'Failed to upload avatar image.'
        };
      }
    });
  }

  saveProfile(): void {
    this.isSaving = true;
    this.feedback = null;

    const payload = {
      full_name: this.userProfile.full_name,
      company_name: this.userProfile.company_name,
      position_in_company: this.userProfile.position_in_company,
      avatar_url: this.userProfile.avatar_url
    };

    this.candidateService.updateUserProfile(payload).subscribe({
      next: (res: any) => {
        this.isSaving = false;
        this.updateLocalUser(payload);
        this.feedback = { type: 'success', message: 'Recruiter profile saved successfully!' };
      },
      error: (err: any) => {
        this.isSaving = false;
        console.error('Error updating user profile:', err);
        this.feedback = {
          type: 'error',
          message: err?.error?.detail || 'Failed to update profile.'
        };
      }
    });
  }

  private updateLocalUser(updates: any): void {
    const userStr = localStorage.getItem('USER');
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        const updated = { ...u, ...updates };
        localStorage.setItem('USER', JSON.stringify(updated));
      } catch (e) {
        console.error('Error updating local USER storage:', e);
      }
    }
  }
}
