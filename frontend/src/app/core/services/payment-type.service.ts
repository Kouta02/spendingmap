import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PaymentType, PaymentTypeCreate } from '../models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class PaymentTypeService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/payment-types/`;

  list(): Observable<PaymentType[]> {
    return this.http.get<PaymentType[]>(this.baseUrl);
  }

  get(id: string): Observable<PaymentType> {
    return this.http.get<PaymentType>(`${this.baseUrl}${id}/`);
  }

  create(data: PaymentTypeCreate): Observable<PaymentType> {
    return this.http.post<PaymentType>(this.baseUrl, data);
  }

  update(id: string, data: PaymentTypeCreate): Observable<PaymentType> {
    return this.http.put<PaymentType>(`${this.baseUrl}${id}/`, data);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}${id}/`);
  }
}
