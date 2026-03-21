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
}
