import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  ReportSummary,
  ReportByCategory,
  InstallmentsReport,
  MonthlyComparison,
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

  getByCategory(start: string, end: string): Observable<ReportByCategory> {
    const params = new HttpParams().set('start', start).set('end', end);
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
}
