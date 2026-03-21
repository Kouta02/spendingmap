import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';

import { SalaryService } from '../../../../core/services/salary.service';
import { SalaryResult } from '../../../../core/models';
import { CurrencyBrlPipe } from '../../../../shared/pipes/currency-brl.pipe';

@Component({
  selector: 'app-salary-projection',
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatCardModule,
    CurrencyBrlPipe,
  ],
  template: `
    <div class="page-header">
      <h1>Projeção Salarial</h1>
      <button mat-flat-button (click)="onProject()" [disabled]="loading()">
        @if (loading()) {
          <mat-spinner diameter="20" />
        } @else {
          <ng-container><mat-icon>trending_up</mat-icon> Gerar Projeção (2026–2029)</ng-container>
        }
      </button>
    </div>

    <p class="info-text">
      <mat-icon inline>info</mat-icon>
      A projeção usa a configuração salva e aplica progressão automática (+1 padrão/ano).
    </p>

    @if (results().length > 0) {
      <table mat-table [dataSource]="results()" class="projection-table">
        <ng-container matColumnDef="year">
          <th mat-header-cell *matHeaderCellDef>Ano</th>
          <td mat-cell *matCellDef="let r">{{ r.year }}</td>
        </ng-container>

        <ng-container matColumnDef="padrao">
          <th mat-header-cell *matHeaderCellDef>Padrão</th>
          <td mat-cell *matCellDef="let r">{{ r.padrao }}</td>
        </ng-container>

        <ng-container matColumnDef="vb">
          <th mat-header-cell *matHeaderCellDef>VB</th>
          <td mat-cell *matCellDef="let r" class="value">{{ r.vb | currencyBrl }}</td>
        </ng-container>

        <ng-container matColumnDef="bruto_total">
          <th mat-header-cell *matHeaderCellDef>Bruto</th>
          <td mat-cell *matCellDef="let r" class="value">{{ r.bruto_total | currencyBrl }}</td>
        </ng-container>

        <ng-container matColumnDef="total_descontos">
          <th mat-header-cell *matHeaderCellDef>Descontos</th>
          <td mat-cell *matCellDef="let r" class="value negative">
            - {{ r.total_descontos | currencyBrl }}
          </td>
        </ng-container>

        <ng-container matColumnDef="liquido">
          <th mat-header-cell *matHeaderCellDef>Líquido</th>
          <td mat-cell *matCellDef="let r" class="value liquido">{{ r.liquido | currencyBrl }}</td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
        <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
      </table>
    }
  `,
  styles: `
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    .page-header h1 { margin: 0; font-size: 1.5rem; }
    .info-text {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 0.875rem;
      color: var(--mat-sys-on-surface-variant);
      margin-bottom: 24px;
    }
    .info-text mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }
    .projection-table { width: 100%; }
    .value {
      font-family: 'Roboto Mono', monospace;
      text-align: right;
      white-space: nowrap;
    }
    .negative { color: #c62828; }
    .liquido { font-weight: 500; color: var(--mat-sys-primary); }
  `,
})
export class SalaryProjectionPage {
  private readonly salaryService = inject(SalaryService);

  results = signal<SalaryResult[]>([]);
  loading = signal(false);
  displayedColumns = ['year', 'padrao', 'vb', 'bruto_total', 'total_descontos', 'liquido'];

  onProject(): void {
    this.loading.set(true);
    this.salaryService.getProjection([2026, 2027, 2028, 2029]).subscribe({
      next: (data) => {
        this.results.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
