import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Income, IncomeCreate, IncomeFilters, IncomeCategory, IncomeCategoryCreate } from '../models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class IncomeService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/incomes/`;

  list(filters?: IncomeFilters): Observable<Income[]> {
    let params = new HttpParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params = params.set(key, value);
      });
    }
    return this.http.get<Income[]>(this.baseUrl, { params });
  }

  get(id: string): Observable<Income> {
    return this.http.get<Income>(`${this.baseUrl}${id}/`);
  }

  create(data: IncomeCreate): Observable<Income> {
    return this.http.post<Income>(this.baseUrl, data);
  }

  update(id: string, data: IncomeCreate): Observable<Income> {
    return this.http.put<Income>(`${this.baseUrl}${id}/`, data);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}${id}/`);
  }

  // Categorias de receita
  listCategories(): Observable<IncomeCategory[]> {
    return this.http.get<IncomeCategory[]>(`${this.baseUrl}categories/`);
  }

  getCategory(id: string): Observable<IncomeCategory> {
    return this.http.get<IncomeCategory>(`${this.baseUrl}categories/${id}/`);
  }

  createCategory(data: IncomeCategoryCreate): Observable<IncomeCategory> {
    return this.http.post<IncomeCategory>(`${this.baseUrl}categories/`, data);
  }

  updateCategory(id: string, data: IncomeCategoryCreate): Observable<IncomeCategory> {
    return this.http.put<IncomeCategory>(`${this.baseUrl}categories/${id}/`, data);
  }

  deleteCategory(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}categories/${id}/`);
  }
}
