import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment';
import { LoginData, UserReq } from '../models/users.models';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  constructor(private http: HttpClient, private router: Router) {}

  signUp(user_data: UserReq): Observable<any> {
    const apiUrl = environment.apiUrl + `/authentication/signup`;
    const headers = new HttpHeaders({
      accept: 'application/json',
    });

    return this.http.post(apiUrl, user_data, { headers });
  }

  logIn(login_data: LoginData): Observable<any> {
    const apiUrl = environment.apiUrl + `/authentication/signin`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded'
      });

    let formParams = new HttpParams();
    formParams = formParams.set('username', login_data.email);
    formParams = formParams.set('password', login_data.password);
    return this.http.post(apiUrl, formParams, { headers });
  }



  // Email Connection


  googleLogin() {
    const apiUrl = environment.apiUrl + `/connect-mail/connect-gmail-client`;
    const headers = new HttpHeaders({
      accept: 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    });
    return this.http.get(apiUrl, { headers });
  }


  outlookLogin() {
    const apiUrl = environment.apiUrl + `/connect-mail/connect-gmail-client`;
    const headers = new HttpHeaders({
      accept: 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    });
    return this.http.get(apiUrl, { headers });
  }


  handleAuthCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    if (code) {
      console.log("Received OAuth Code:", code);
      localStorage.setItem('oauth_code', code);
      this.router.navigate(['/dashboard']); // Redirect user to dashboard
    }
  }
}
