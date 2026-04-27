import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Expense, ExpenseCreate, ExpenseFilters } from '../models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ExpenseService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/expenses/`;

  list(filters?: ExpenseFilters): Observable<Expense[]> {
    let params = new HttpParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params = params.set(key, value);
        }
      });
    }
    return this.http.get<Expense[]>(this.baseUrl, { params });
  }

  get(id: string): Observable<Expense> {
    return this.http.get<Expense>(`${this.baseUrl}${id}/`);
  }

  create(data: ExpenseCreate): Observable<Expense> {
    return this.http.post<Expense>(this.baseUrl, data);
  }

  update(id: string, data: Partial<ExpenseCreate>): Observable<Expense> {
    return this.http.put<Expense>(`${this.baseUrl}${id}/`, data);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}${id}/`);
  }

  deleteInstallments(id: string, fromMonth?: string): Observable<{ deleted: number }> {
    let params = new HttpParams();
    if (fromMonth) params = params.set('from_month', fromMonth);
    return this.http.delete<{ deleted: number }>(`${this.baseUrl}${id}/delete-installments/`, { params });
  }

  stopRecurring(description: string, financialMonth: string): Observable<{
    description: string;
    recurrence_ends_at: string;
    updated_id: string;
  }> {
    return this.http.post<{ description: string; recurrence_ends_at: string; updated_id: string }>(
      `${this.baseUrl}stop-recurring/`,
      { description, financial_month: financialMonth },
    );
  }

  markPaid(id: string, amount?: number): Observable<Expense> {
    const body: Record<string, unknown> = {};
    if (amount !== undefined) body['amount'] = amount;
    return this.http.post<Expense>(`${this.baseUrl}${id}/mark-paid/`, body);
  }

  getBoletoAlerts(): Observable<BoletoAlert[]> {
    return this.http.get<BoletoAlert[]>(`${this.baseUrl}boleto-alerts/`);
  }
}

export interface BoletoAlert {
  id: string;
  description: string;
  amount: string;
  date: string;
  due_date: string;
  days_until: number;
  alert_level: 'overdue' | 'due_today' | 'due_3_days' | 'due_5_days';
  category_name: string | null;
  third_party_name: string | null;
}
