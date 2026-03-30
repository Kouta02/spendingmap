import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  MonthlySummary,
  CategoryBreakdown,
  CreditCardBreakdown,
  ThirdPartyBreakdown,
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

  getByCreditCard(month?: string): Observable<CreditCardBreakdown[]> {
    let params = new HttpParams();
    if (month) params = params.set('month', month);
    return this.http.get<CreditCardBreakdown[]>(`${this.baseUrl}/by-credit-card/`, { params });
  }

  getByThirdParty(month?: string): Observable<ThirdPartyBreakdown[]> {
    let params = new HttpParams();
    if (month) params = params.set('month', month);
    return this.http.get<ThirdPartyBreakdown[]>(`${this.baseUrl}/by-third-party/`, { params });
  }

  getEvolution(months?: number): Observable<MonthlyEvolution[]> {
    let params = new HttpParams();
    if (months) params = params.set('months', months.toString());
    return this.http.get<MonthlyEvolution[]>(`${this.baseUrl}/evolution/`, { params });
  }

  getExpenseDetails(month?: string): Observable<ExpenseDetails> {
    let params = new HttpParams();
    if (month) params = params.set('month', month);
    return this.http.get<ExpenseDetails>(`${this.baseUrl}/expense-details/`, { params });
  }
}

export interface ExpenseDetailItem {
  description: string;
  amount: string;
}

export interface ExpenseDetails {
  descontos: ExpenseDetailItem[];
  despesas: ExpenseDetailItem[];
}
