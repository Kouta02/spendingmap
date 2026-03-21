import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { SalaryService } from '../../../../core/services/salary.service';
import { SalarySnapshot } from '../../../../core/models';
import { CurrencyBrlPipe } from '../../../../shared/pipes/currency-brl.pipe';

@Component({
  selector: 'app-salary-snapshot',
  standalone: true,
  imports: [
    DatePipe,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    CurrencyBrlPipe,
  ],
  template: `
    <div class="page-header">
      <h1>Histórico de Contracheques</h1>
    </div>

    @if (loading()) {
      <div class="loading">
        <mat-spinner diameter="40" />
      </div>
    } @else if (snapshots().length === 0) {
      <div class="empty-state">
        <mat-icon>history</mat-icon>
        <p>Nenhum contracheque salvo ainda.</p>
        <p>Gere um snapshot na tela de Contracheque.</p>
      </div>
    } @else {
      <table mat-table [dataSource]="snapshots()" class="snapshot-table">
        <ng-container matColumnDef="month">
          <th mat-header-cell *matHeaderCellDef>Mês</th>
          <td mat-cell *matCellDef="let s">{{ s.month | date: 'MM/yyyy' }}</td>
        </ng-container>

        <ng-container matColumnDef="padrao">
          <th mat-header-cell *matHeaderCellDef>Padrão</th>
          <td mat-cell *matCellDef="let s">{{ s.padrao }}</td>
        </ng-container>

        <ng-container matColumnDef="bruto_total">
          <th mat-header-cell *matHeaderCellDef>Bruto</th>
          <td mat-cell *matCellDef="let s" class="value">{{ s.bruto_total | currencyBrl }}</td>
        </ng-container>

        <ng-container matColumnDef="total_descontos">
          <th mat-header-cell *matHeaderCellDef>Descontos</th>
          <td mat-cell *matCellDef="let s" class="value negative">
            - {{ toNumber(s.pss) + toNumber(s.irpf) + toNumber(s.funpresp) + toNumber(s.abate_teto) | currencyBrl }}
          </td>
        </ng-container>

        <ng-container matColumnDef="liquido">
          <th mat-header-cell *matHeaderCellDef>Líquido</th>
          <td mat-cell *matCellDef="let s" class="value liquido">{{ s.liquido | currencyBrl }}</td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
        <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
      </table>
    }
  `,
  styles: `
    .page-header {
      margin-bottom: 24px;
    }
    .page-header h1 { margin: 0; font-size: 1.5rem; }
    .snapshot-table { width: 100%; }
    .value {
      font-family: 'Roboto Mono', monospace;
      text-align: right;
      white-space: nowrap;
    }
    .negative { color: #c62828; }
    .liquido { font-weight: 500; color: var(--mat-sys-primary); }
    .loading {
      display: flex;
      justify-content: center;
      padding: 48px;
    }
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 48px;
      gap: 16px;
      color: var(--mat-sys-on-surface-variant);
    }
    .empty-state mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
    }
  `,
})
export class SalarySnapshotPage implements OnInit {
  private readonly salaryService = inject(SalaryService);

  snapshots = signal<SalarySnapshot[]>([]);
  loading = signal(true);
  displayedColumns = ['month', 'padrao', 'bruto_total', 'total_descontos', 'liquido'];

  ngOnInit(): void {
    this.salaryService.listSnapshots().subscribe({
      next: (data) => {
        this.snapshots.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  toNumber(val: string | number): number {
    return typeof val === 'string' ? parseFloat(val) : val;
  }
}
