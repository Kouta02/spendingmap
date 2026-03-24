import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  PaymentDate,
  PaymentDateBulk,
  CreditCard,
  CreditCardCreate,
  FinancialMonth,
} from '../models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class FinancialCalendarService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/financial-calendar/`;

  // --- Datas de Pagamento ---

  getPaymentDatesByYear(year: number): Observable<PaymentDate[]> {
    return this.http.get<PaymentDate[]>(`${this.baseUrl}payment-dates/by_year/?year=${year}`);
  }

  bulkUpdatePaymentDates(data: PaymentDateBulk): Observable<PaymentDate[]> {
    return this.http.post<PaymentDate[]>(`${this.baseUrl}payment-dates/bulk-update/`, data);
  }

  getFinancialMonths(year: number): Observable<FinancialMonth[]> {
    return this.http.get<FinancialMonth[]>(`${this.baseUrl}financial-months/?year=${year}`);
  }

  getCurrentFinancialMonth(): Observable<{ year: number; month: number; financial_month: string }> {
    return this.http.get<{ year: number; month: number; financial_month: string }>(
      `${this.baseUrl}current-month/`
    );
  }

  // --- Cartões de Crédito ---

  listCreditCards(): Observable<CreditCard[]> {
    return this.http.get<CreditCard[]>(`${this.baseUrl}credit-cards/`);
  }

  getCreditCard(id: string): Observable<CreditCard> {
    return this.http.get<CreditCard>(`${this.baseUrl}credit-cards/${id}/`);
  }

  createCreditCard(data: CreditCardCreate): Observable<CreditCard> {
    return this.http.post<CreditCard>(`${this.baseUrl}credit-cards/`, data);
  }

  updateCreditCard(id: string, data: CreditCardCreate): Observable<CreditCard> {
    return this.http.put<CreditCard>(`${this.baseUrl}credit-cards/${id}/`, data);
  }

  deleteCreditCard(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}credit-cards/${id}/`);
  }
}
