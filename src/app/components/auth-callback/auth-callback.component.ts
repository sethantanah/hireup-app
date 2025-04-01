import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-auth-callback',
  imports: [],
  templateUrl: './auth-callback.component.html',
  styleUrl: './auth-callback.component.scss'
})
export class AuthCallbackComponent implements OnInit {
  constructor(private router: Router) {}

  ngOnInit(): void {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    if (code) {
      console.log('OAuth Code Received:', code);
      localStorage.setItem('oauth_code', code); // Store code in local storage
      this.router.navigate(['/dashboard']); // Redirect to dashboard after login
    } else {
      console.error('No OAuth code found');
      this.router.navigate(['/auth/signin']); // Redirect to login if authentication fails
    }
  }
}