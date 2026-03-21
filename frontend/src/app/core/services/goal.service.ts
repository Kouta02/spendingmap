import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Goal, GoalCreate } from '../models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class GoalService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/goals/`;

  list(month?: string): Observable<Goal[]> {
    let params = new HttpParams();
    if (month) params = params.set('month', month + '-01');
    return this.http.get<Goal[]>(this.baseUrl, { params });
  }

  alerts(month?: string): Observable<Goal[]> {
    let params = new HttpParams();
    if (month) params = params.set('month', month);
    return this.http.get<Goal[]>(`${this.baseUrl}alerts/`, { params });
  }

  create(data: GoalCreate): Observable<Goal> {
    return this.http.post<Goal>(this.baseUrl, data);
  }

  update(id: string, data: GoalCreate): Observable<Goal> {
    return this.http.put<Goal>(`${this.baseUrl}${id}/`, data);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}${id}/`);
  }
}
