import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  MonthlySummary,
  CategoryBreakdown,
  BankBreakdown,
  MonthlyEvolution,
} from '../models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/dashboard`;

  getSummary(month?: string): Observable<MonthlySummary> {
    let params = new HttpParams();
    if (month) params = params.set('month', month);
    return this.http.get<MonthlySummary>(`${this.baseUrl}/summary/`, { params });
  }

  getByCategory(month?: string): Observable<CategoryBreakdown[]> {
    let params = new HttpParams();
    if (month) params = params.set('month', month);
    return this.http.get<CategoryBreakdown[]>(`${this.baseUrl}/by-category/`, { params });
  }

  getByBank(month?: string): Observable<BankBreakdown[]> {
    let params = new HttpParams();
    if (month) params = params.set('month', month);
    return this.http.get<BankBreakdown[]>(`${this.baseUrl}/by-bank/`, { params });
  }

  getEvolution(months?: number): Observable<MonthlyEvolution[]> {
    let params = new HttpParams();
    if (months) params = params.set('months', months.toString());
    return this.http.get<MonthlyEvolution[]>(`${this.baseUrl}/evolution/`, { params });
  }
}
