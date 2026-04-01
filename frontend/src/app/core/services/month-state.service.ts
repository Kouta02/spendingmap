import { Injectable, inject, signal } from '@angular/core';
import { format, subMonths, addMonths, parse } from 'date-fns';
import { FinancialCalendarService } from './financial-calendar.service';

const STORAGE_KEY = 'sm_selected_month';

@Injectable({ providedIn: 'root' })
export class MonthStateService {
  private readonly financialCalendarService = inject(FinancialCalendarService);

  readonly currentMonth = signal(this.restore() || format(new Date(), 'yyyy-MM'));
  readonly monthLabel = signal('');

  private initialized = false;

  /**
   * Inicializa o mês: se já tem valor salvo na sessão, usa ele.
   * Caso contrário, busca o mês financeiro corrente na API.
   * Retorna uma Promise que resolve quando o mês estiver pronto.
   */
  init(): Promise<void> {
    if (this.initialized) {
      this.updateLabel();
      return Promise.resolve();
    }

    const saved = this.restore();
    if (saved) {
      this.currentMonth.set(saved);
      this.updateLabel();
      this.initialized = true;
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      this.financialCalendarService.getCurrentFinancialMonth().subscribe({
        next: (fm) => {
          const month = format(new Date(fm.year, fm.month - 1, 1), 'yyyy-MM');
          this.setMonth(month);
          this.initialized = true;
          resolve();
        },
        error: () => {
          this.updateLabel();
          this.initialized = true;
          resolve();
        },
      });
    });
  }

  setMonth(month: string): void {
    this.currentMonth.set(month);
    sessionStorage.setItem(STORAGE_KEY, month);
    this.updateLabel();
  }

  prevMonth(): void {
    const d = parse(this.currentMonth(), 'yyyy-MM', new Date());
    this.setMonth(format(subMonths(d, 1), 'yyyy-MM'));
  }

  nextMonth(): void {
    const d = parse(this.currentMonth(), 'yyyy-MM', new Date());
    this.setMonth(format(addMonths(d, 1), 'yyyy-MM'));
  }

  clear(): void {
    sessionStorage.removeItem(STORAGE_KEY);
    this.initialized = false;
  }

  private restore(): string | null {
    return sessionStorage.getItem(STORAGE_KEY);
  }

  private updateLabel(): void {
    const d = parse(this.currentMonth(), 'yyyy-MM', new Date());
    this.monthLabel.set(
      d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    );
  }
}
