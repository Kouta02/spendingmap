import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Bank, BankCreate } from '../models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class BankService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/banks/`;

  list(): Observable<Bank[]> {
    return this.http.get<Bank[]>(this.baseUrl);
  }

  get(id: string): Observable<Bank> {
    return this.http.get<Bank>(`${this.baseUrl}${id}/`);
  }

  create(data: BankCreate): Observable<Bank> {
    return this.http.post<Bank>(this.baseUrl, data);
  }

  update(id: string, data: BankCreate): Observable<Bank> {
    return this.http.put<Bank>(`${this.baseUrl}${id}/`, data);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}${id}/`);
  }
}
