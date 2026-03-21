import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  SalaryConfig,
  SalaryResult,
  SalarySnapshot,
  CalculateRequest,
} from '../models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SalaryService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/salary`;

  getCurrentConfig(): Observable<SalaryConfig> {
    return this.http.get<SalaryConfig>(`${this.baseUrl}/config/current/`);
  }

  updateConfig(id: string, data: Partial<SalaryConfig>): Observable<SalaryConfig> {
    return this.http.put<SalaryConfig>(`${this.baseUrl}/config/${id}/`, data);
  }

  calculate(data: CalculateRequest): Observable<SalaryResult> {
    return this.http.post<SalaryResult>(`${this.baseUrl}/calculate/`, data);
  }

  generateSnapshot(month: string): Observable<SalarySnapshot> {
    return this.http.post<SalarySnapshot>(`${this.baseUrl}/generate_snapshot/`, {
      month,
    });
  }

  listSnapshots(): Observable<SalarySnapshot[]> {
    return this.http.get<SalarySnapshot[]>(`${this.baseUrl}/snapshots/`);
  }

  getProjection(years: number[]): Observable<SalaryResult[]> {
    return this.http.post<SalaryResult[]>(`${this.baseUrl}/projection/`, {
      years,
    });
  }
}
