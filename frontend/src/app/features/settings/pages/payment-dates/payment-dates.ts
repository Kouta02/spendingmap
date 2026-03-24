import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FinancialCalendarService } from '../../../../core/services/financial-calendar.service';
import { FinancialMonth, PaymentDate } from '../../../../core/models';

const MONTH_NAMES = [
  '', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

@Component({
  selector: 'app-payment-dates',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatButtonModule, MatCardModule, MatFormFieldModule, MatIconModule,
    MatInputModule, MatSelectModule, MatSnackBarModule, MatTableModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="header">
      <h2>Datas de Pagamento</h2>
      <mat-form-field appearance="outline" class="year-select">
        <mat-label>Ano</mat-label>
        <mat-select [(value)]="selectedYear" (selectionChange)="loadYear()">
          @for (y of availableYears; track y) {
            <mat-option [value]="y">{{ y }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
    </div>

    <p class="info-text">
      Informe o dia do mês em que você recebe o pagamento. O sistema calculará automaticamente os meses financeiros.
    </p>

    <mat-card>
      <mat-card-content>
        <div class="months-grid">
          @for (m of months; track m.month) {
            <div class="month-item">
              <label>{{ m.label }}</label>
              <mat-form-field appearance="outline" class="day-input">
                <input matInput type="number" min="1" max="31"
                       [(ngModel)]="m.day" placeholder="Dia" />
              </mat-form-field>
            </div>
          }
        </div>
        <div class="actions">
          <button mat-raised-button color="primary" (click)="save()" [disabled]="saving()">
            <mat-icon>save</mat-icon>
            Salvar
          </button>
        </div>
      </mat-card-content>
    </mat-card>

    @if (financialMonths().length > 0) {
      <h3>Meses Financeiros Calculados</h3>
      <mat-card>
        <mat-card-content>
          <table mat-table [dataSource]="financialMonths()" class="full-width">
            <ng-container matColumnDef="label">
              <th mat-header-cell *matHeaderCellDef>Mês Financeiro</th>
              <td mat-cell *matCellDef="let fm">{{ fm.label }}</td>
            </ng-container>
            <ng-container matColumnDef="start">
              <th mat-header-cell *matHeaderCellDef>Início</th>
              <td mat-cell *matCellDef="let fm">{{ formatDate(fm.start) }}</td>
            </ng-container>
            <ng-container matColumnDef="end">
              <th mat-header-cell *matHeaderCellDef>Fim</th>
              <td mat-cell *matCellDef="let fm">{{ formatDate(fm.end) }}</td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="['label', 'start', 'end']"></tr>
            <tr mat-row *matRowDef="let row; columns: ['label', 'start', 'end'];"></tr>
          </table>
        </mat-card-content>
      </mat-card>
    }
  `,
  styles: `
    .header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 8px;
    }
    .header h2 { margin: 0; }
    .year-select { width: 120px; }
    .info-text {
      color: #666;
      margin-bottom: 16px;
      font-size: 0.9rem;
    }
    .months-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: 8px 16px;
    }
    .month-item {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .month-item label {
      min-width: 80px;
      font-weight: 500;
    }
    .day-input { width: 80px; }
    .actions {
      margin-top: 16px;
      display: flex;
      justify-content: flex-end;
    }
    h3 { margin-top: 24px; }
    .full-width { width: 100%; }
  `,
})
export class PaymentDatesPage implements OnInit {
  private readonly service = inject(FinancialCalendarService);
  private readonly snackBar = inject(MatSnackBar);

  selectedYear = new Date().getFullYear();
  availableYears = [2025, 2026, 2027, 2028, 2029];
  saving = signal(false);
  financialMonths = signal<FinancialMonth[]>([]);

  months = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    label: MONTH_NAMES[i + 1],
    day: null as number | null,
  }));

  ngOnInit(): void {
    this.loadYear();
  }

  loadYear(): void {
    this.service.getPaymentDatesByYear(this.selectedYear).subscribe((dates) => {
      // Resetar
      this.months.forEach((m) => (m.day = null));
      for (const pd of dates) {
        const item = this.months.find((m) => m.month === pd.month);
        if (item) item.day = pd.payment_day;
      }
      this.loadFinancialMonths();
    });
  }

  save(): void {
    const dates = this.months
      .filter((m) => m.day !== null && m.day > 0)
      .map((m) => ({ month: m.month, payment_day: m.day! }));

    if (dates.length === 0) {
      this.snackBar.open('Informe pelo menos uma data de pagamento.', 'OK', { duration: 3000 });
      return;
    }

    this.saving.set(true);
    this.service.bulkUpdatePaymentDates({ year: this.selectedYear, dates }).subscribe({
      next: () => {
        this.snackBar.open('Datas salvas com sucesso!', 'OK', { duration: 3000 });
        this.saving.set(false);
        this.loadFinancialMonths();
      },
      error: () => {
        this.snackBar.open('Erro ao salvar. Tente novamente.', 'OK', { duration: 3000 });
        this.saving.set(false);
      },
    });
  }

  private loadFinancialMonths(): void {
    this.service.getFinancialMonths(this.selectedYear).subscribe((fms) => {
      this.financialMonths.set(fms);
    });
  }

  formatDate(dateStr: string): string {
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  }
}
