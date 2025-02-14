import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment';

@Injectable({
  providedIn: 'root',
})
export class JobpostingsApiService {
  constructor(private http: HttpClient) {}

  jobpostings(user_id: string): Observable<any> {
    const apiUrl = environment.apiUrl + `/jobposts/?user_id=${user_id}`;
    const headers = new HttpHeaders({
      accept: 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    });

    return this.http.get(apiUrl, { headers });
  }
}
