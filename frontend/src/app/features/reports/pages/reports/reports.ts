import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { provideNativeDateAdapter } from '@angular/material/core';
import { format } from 'date-fns';

import { ReportService } from '../../../../core/services/report.service';
import { FinancialCalendarService } from '../../../../core/services/financial-calendar.service';
import {
  ReportSummary,
  ReportByCategory,
  InstallmentsReport,
  MonthlyComparison,
} from '../../../../core/models';
import { CurrencyBrlPipe } from '../../../../shared/pipes/currency-brl.pipe';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [
    FormsModule,
    MatCardModule,
    MatTabsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatProgressSpinnerModule,
    CurrencyBrlPipe,
  ],
  providers: [provideNativeDateAdapter()],
  template: `
    <div class="page-header">
      <h1>Relatórios</h1>
    </div>

    <mat-tab-group (selectedTabChange)="onTabChange($event.index)">
      <!-- Aba: Comparativo Mensal -->
      <mat-tab label="Comparativo Mensal">
        <div class="tab-content">
          @if (loadingComparison()) {
            <div class="loading"><mat-spinner diameter="40" /></div>
          } @else if (comparison().length > 0) {
            <table mat-table [dataSource]="comparison()" class="report-table">
              <ng-container matColumnDef="month_label">
                <th mat-header-cell *matHeaderCellDef>Mês</th>
                <td mat-cell *matCellDef="let r">{{ r.month_label }}</td>
              </ng-container>
              <ng-container matColumnDef="receita_liquida">
                <th mat-header-cell *matHeaderCellDef>Receita Líquida</th>
                <td mat-cell *matCellDef="let r" class="value">{{ toNum(r.receita_liquida) | currencyBrl }}</td>
              </ng-container>
              <ng-container matColumnDef="total_despesas">
                <th mat-header-cell *matHeaderCellDef>Despesas</th>
                <td mat-cell *matCellDef="let r" class="value negative">{{ toNum(r.total_despesas) | currencyBrl }}</td>
              </ng-container>
              <ng-container matColumnDef="saldo">
                <th mat-header-cell *matHeaderCellDef>Saldo</th>
                <td mat-cell *matCellDef="let r" class="value" [class.negative]="toNum(r.saldo) < 0"
                    [class.positive]="toNum(r.saldo) >= 0">
                  {{ toNum(r.saldo) | currencyBrl }}
                </td>
              </ng-container>
              <ng-container matColumnDef="quantidade_despesas">
                <th mat-header-cell *matHeaderCellDef>Qtd</th>
                <td mat-cell *matCellDef="let r">{{ r.quantidade_despesas }}</td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="comparisonCols"></tr>
              <tr mat-row *matRowDef="let row; columns: comparisonCols"></tr>
            </table>
          } @else {
            <p class="empty">Sem dados para exibir.</p>
          }
        </div>
      </mat-tab>

      <!-- Aba: Por Categoria -->
      <mat-tab label="Por Categoria">
        <div class="tab-content">
          <div class="date-filters">
            <mat-form-field appearance="outline">
              <mat-label>Início</mat-label>
              <input matInput [matDatepicker]="startPicker" [(ngModel)]="startDate" />
              <mat-datepicker-toggle matIconSuffix [for]="startPicker" />
              <mat-datepicker #startPicker />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Fim</mat-label>
              <input matInput [matDatepicker]="endPicker" [(ngModel)]="endDate" />
              <mat-datepicker-toggle matIconSuffix [for]="endPicker" />
              <mat-datepicker #endPicker />
            </mat-form-field>
            <button mat-flat-button (click)="loadByCategory()">
              <mat-icon>search</mat-icon> Filtrar
            </button>
          </div>

          @if (loadingCategory()) {
            <div class="loading"><mat-spinner diameter="40" /></div>
          } @else if (categoryReport()?.data?.length) {
            <div class="total-bar">
              <span>Total no período:</span>
              <strong>{{ toNum(categoryReport()!.total) | currencyBrl }}</strong>
            </div>
            <table mat-table [dataSource]="categoryReport()!.data" class="report-table">
              <ng-container matColumnDef="category_name">
                <th mat-header-cell *matHeaderCellDef>Categoria</th>
                <td mat-cell *matCellDef="let r">
                  <span class="cat-dot" [style.background-color]="r.category_color"></span>
                  {{ r.category_name }}
                </td>
              </ng-container>
              <ng-container matColumnDef="total">
                <th mat-header-cell *matHeaderCellDef>Total</th>
                <td mat-cell *matCellDef="let r" class="value">{{ toNum(r.total) | currencyBrl }}</td>
              </ng-container>
              <ng-container matColumnDef="percentage">
                <th mat-header-cell *matHeaderCellDef>%</th>
                <td mat-cell *matCellDef="let r" class="value">{{ r.percentage }}%</td>
              </ng-container>
              <ng-container matColumnDef="count">
                <th mat-header-cell *matHeaderCellDef>Qtd</th>
                <td mat-cell *matCellDef="let r">{{ r.count }}</td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="categoryCols"></tr>
              <tr mat-row *matRowDef="let row; columns: categoryCols"></tr>
            </table>
          } @else {
            <p class="empty">Sem despesas no período.</p>
          }
        </div>
      </mat-tab>

      <!-- Aba: Parcelas Futuras -->
      <mat-tab label="Parcelas Futuras">
        <div class="tab-content">
          @if (loadingInstallments()) {
            <div class="loading"><mat-spinner diameter="40" /></div>
          } @else if (installments()?.data?.length) {
            <div class="total-bar">
              <span>Total restante em parcelas:</span>
              <strong>{{ toNum(installments()!.total_remaining) | currencyBrl }}</strong>
              <span class="sub">({{ installments()!.groups_count }} grupos)</span>
            </div>
            @for (group of installments()!.data; track group.installment_group_id) {
              <mat-card class="installment-card">
                <mat-card-content>
                  <div class="inst-header">
                    <span class="inst-desc">{{ group.description }}</span>
                    <span class="inst-amount">{{ toNum(group.amount_per_installment) | currencyBrl }}/mês</span>
                  </div>
                  <div class="inst-meta">
                    @if (group.category_name) {
                      <span>{{ group.category_name }}</span>
                    }
                    @if (group.credit_card_name) {
                      <span>{{ group.credit_card_name }}</span>
                    }
                    <span>{{ group.remaining }} parcelas restantes de {{ group.installment_total }}</span>
                    <span class="inst-total">Total: {{ toNum(group.total_remaining) | currencyBrl }}</span>
                  </div>
                </mat-card-content>
              </mat-card>
            }
          } @else {
            <p class="empty">Nenhuma parcela futura encontrada.</p>
          }
        </div>
      </mat-tab>
    </mat-tab-group>
  `,
  styles: `
    .page-header { margin-bottom: 24px; }
    .page-header h1 { margin: 0; font-size: 1.5rem; }
    .tab-content { padding: 24px 0; }
    .date-filters { display: flex; gap: 12px; align-items: flex-start; margin-bottom: 16px; flex-wrap: wrap; }
    .date-filters mat-form-field { width: 160px; }
    .report-table { width: 100%; }
    .value { font-family: 'Roboto Mono', monospace; text-align: right; white-space: nowrap; }
    .negative { color: #c62828; }
    .positive { color: #2e7d32; }
    .total-bar {
      display: flex; gap: 8px; align-items: center;
      padding: 12px 16px; background: var(--mat-sys-surface-container);
      border-radius: 8px; margin-bottom: 16px;
    }
    .total-bar .sub { font-size: 0.85rem; color: var(--mat-sys-on-surface-variant); }
    .cat-dot {
      display: inline-block; width: 12px; height: 12px;
      border-radius: 50%; margin-right: 6px; vertical-align: middle;
    }
    .installment-card { margin-bottom: 12px; }
    .inst-header { display: flex; justify-content: space-between; align-items: center; }
    .inst-desc { font-weight: 500; }
    .inst-amount { font-family: 'Roboto Mono', monospace; font-weight: 500; }
    .inst-meta {
      display: flex; gap: 16px; flex-wrap: wrap;
      margin-top: 8px; font-size: 0.85rem; color: var(--mat-sys-on-surface-variant);
    }
    .inst-total { font-weight: 500; color: var(--mat-sys-on-surface); }
    .loading { display: flex; justify-content: center; padding: 48px; }
    .empty { text-align: center; padding: 48px; color: var(--mat-sys-on-surface-variant); }
  `,
})
export class ReportsPage implements OnInit {
  private readonly reportService = inject(ReportService);
  private readonly financialCalendarService = inject(FinancialCalendarService);

  loadingComparison = signal(true);
  loadingCategory = signal(false);
  loadingInstallments = signal(false);

  comparison = signal<MonthlyComparison[]>([]);
  categoryReport = signal<ReportByCategory | null>(null);
  installments = signal<InstallmentsReport | null>(null);

  comparisonCols = ['month_label', 'receita_liquida', 'total_despesas', 'saldo', 'quantidade_despesas'];
  categoryCols = ['category_name', 'total', 'percentage', 'count'];

  startDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  endDate = new Date();

  ngOnInit(): void {
    this.loadComparison();

    this.financialCalendarService.getCurrentFinancialMonth().subscribe({
      next: (fm) => {
        this.financialCalendarService.getFinancialMonths(fm.year).subscribe((months) => {
          const current = months.find((m) => m.month === fm.month);
          if (current) {
            this.startDate = new Date(current.start + 'T00:00:00');
            this.endDate = new Date(current.end + 'T00:00:00');
          }
        });
      },
    });
  }

  onTabChange(index: number): void {
    if (index === 1 && !this.categoryReport()) {
      this.loadByCategory();
    }
    if (index === 2 && !this.installments()) {
      this.loadInstallments();
    }
  }

  loadComparison(): void {
    this.loadingComparison.set(true);
    this.reportService.getComparison(6).subscribe({
      next: (data) => { this.comparison.set(data); this.loadingComparison.set(false); },
      error: () => this.loadingComparison.set(false),
    });
  }

  loadByCategory(): void {
    this.loadingCategory.set(true);
    const start = format(this.startDate, 'yyyy-MM-dd');
    const end = format(this.endDate, 'yyyy-MM-dd');
    this.reportService.getByCategory(start, end).subscribe({
      next: (data) => { this.categoryReport.set(data); this.loadingCategory.set(false); },
      error: () => this.loadingCategory.set(false),
    });
  }

  loadInstallments(): void {
    this.loadingInstallments.set(true);
    this.reportService.getInstallments().subscribe({
      next: (data) => { this.installments.set(data); this.loadingInstallments.set(false); },
      error: () => this.loadingInstallments.set(false),
    });
  }

  toNum(val: string | undefined | null): number {
    return val ? parseFloat(val) : 0;
  }
}
