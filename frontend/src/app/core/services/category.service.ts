import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Category, CategoryFlat, CategoryCreate } from '../models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/categories/`;

  list(): Observable<Category[]> {
    return this.http.get<Category[]>(this.baseUrl);
  }

  tree(): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.baseUrl}tree/`);
  }

  flat(): Observable<CategoryFlat[]> {
    return this.http.get<CategoryFlat[]>(`${this.baseUrl}flat/`);
  }

  get(id: string): Observable<Category> {
    return this.http.get<Category>(`${this.baseUrl}${id}/`);
  }

  create(data: CategoryCreate): Observable<Category> {
    return this.http.post<Category>(this.baseUrl, data);
  }

  update(id: string, data: CategoryCreate): Observable<Category> {
    return this.http.put<Category>(`${this.baseUrl}${id}/`, data);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}${id}/`);
  }
}
