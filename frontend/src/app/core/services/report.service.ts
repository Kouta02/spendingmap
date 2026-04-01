import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  ReportSummary,
  ReportByCategory,
  InstallmentsReport,
  MonthlyComparison,
  Expense,
} from '../models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ReportService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/reports`;

  getSummary(start: string, end: string): Observable<ReportSummary> {
    const params = new HttpParams().set('start', start).set('end', end);
    return this.http.get<ReportSummary>(`${this.baseUrl}/summary/`, { params });
  }

  getByCategory(start: string, end: string, paymentTypes?: string[]): Observable<ReportByCategory> {
    let params = new HttpParams().set('start', start).set('end', end);
    if (paymentTypes?.length) params = params.set('payment_types', paymentTypes.join(','));
    return this.http.get<ReportByCategory>(`${this.baseUrl}/by-category/`, { params });
  }

  getInstallments(): Observable<InstallmentsReport> {
    return this.http.get<InstallmentsReport>(`${this.baseUrl}/installments/`);
  }

  getComparison(months?: number): Observable<MonthlyComparison[]> {
    let params = new HttpParams();
    if (months) params = params.set('months', months.toString());
    return this.http.get<MonthlyComparison[]>(`${this.baseUrl}/comparison/`, { params });
  }

  getExpensesByCategory(start: string, end: string, categoryId: string | null, categoryGroup = false, paymentTypes?: string[]): Observable<Expense[]> {
    let params = new HttpParams().set('start', start).set('end', end);
    if (categoryId) params = params.set('category', categoryId);
    if (categoryGroup) params = params.set('category_group', 'true');
    if (paymentTypes?.length) params = params.set('payment_types', paymentTypes.join(','));
    return this.http.get<Expense[]>(`${this.baseUrl}/expenses-by-category/`, { params });
  }
}
