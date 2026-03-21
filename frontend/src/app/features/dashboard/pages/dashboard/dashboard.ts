import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import * as echarts from 'echarts/core';
import { PieChart, BarChart, LineChart } from 'echarts/charts';
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { LabelLayout } from 'echarts/features';

echarts.use([
  PieChart, BarChart, LineChart,
  TitleComponent, TooltipComponent, LegendComponent, GridComponent,
  CanvasRenderer, LabelLayout,
]);
import { format, subMonths, addMonths } from 'date-fns';
import type { EChartsOption } from 'echarts';

import { RouterLink } from '@angular/router';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { DashboardService } from '../../../../core/services/dashboard.service';
import { GoalService } from '../../../../core/services/goal.service';
import {
  MonthlySummary,
  CategoryBreakdown,
  BankBreakdown,
  MonthlyEvolution,
  Goal,
} from '../../../../core/models';
import { CurrencyBrlPipe } from '../../../../shared/pipes/currency-brl.pipe';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    FormsModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatProgressBarModule,
    NgxEchartsDirective,
    RouterLink,
    CurrencyBrlPipe,
  ],
  providers: [provideEchartsCore({ echarts })],
  template: `
    <div class="page-header">
      <h1>Dashboard</h1>
      <div class="month-selector">
        <button mat-icon-button (click)="prevMonth()">
          <mat-icon>chevron_left</mat-icon>
        </button>
        <span class="month-label">{{ monthLabel() }}</span>
        <button mat-icon-button (click)="nextMonth()">
          <mat-icon>chevron_right</mat-icon>
        </button>
      </div>
    </div>

    @if (loading()) {
      <div class="loading">
        <mat-spinner diameter="40" />
      </div>
    } @else {
      <!-- Cards de resumo -->
      <div class="summary-cards">
        <mat-card class="summary-card bruto">
          <mat-card-content>
            <div class="card-icon">
              <mat-icon>paid</mat-icon>
            </div>
            <div class="card-info">
              <span class="card-label">Remuneração Total</span>
              <span class="card-value">{{ toNum(summary()?.receita_bruta) | currencyBrl }}</span>
              <a routerLink="/salary" class="card-link">Ver detalhes</a>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="summary-card receita">
          <mat-card-content>
            <div class="card-icon">
              <mat-icon>trending_up</mat-icon>
            </div>
            <div class="card-info">
              <span class="card-label">Receita Líquida</span>
              <span class="card-value">{{ toNum(summary()?.receita_liquida) | currencyBrl }}</span>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="summary-card descontos">
          <mat-card-content>
            <div class="card-icon">
              <mat-icon>receipt_long</mat-icon>
            </div>
            <div class="card-info">
              <span class="card-label">Descontos Salário</span>
              <span class="card-value">{{ toNum(summary()?.total_descontos_salario) | currencyBrl }}</span>
              <a routerLink="/salary" class="card-link">Ver detalhes</a>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="summary-card despesas">
          <mat-card-content>
            <div class="card-icon">
              <mat-icon>shopping_cart</mat-icon>
            </div>
            <div class="card-info">
              <span class="card-label">Total Despesas</span>
              <span class="card-value">{{ toNum(summary()?.total_despesas) | currencyBrl }}</span>
              <span class="card-sub">{{ summary()?.quantidade_despesas || 0 }} lançamentos</span>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="summary-card saldo" [class.negativo]="toNum(summary()?.saldo_livre) < 0">
          <mat-card-content>
            <div class="card-icon">
              <mat-icon>account_balance_wallet</mat-icon>
            </div>
            <div class="card-info">
              <span class="card-label">Saldo Livre</span>
              <span class="card-value">{{ toNum(summary()?.saldo_livre) | currencyBrl }}</span>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      @if (!summary()?.has_snapshot) {
        <div class="alert">
          <mat-icon>info</mat-icon>
          <span>Nenhum contracheque salvo para este mês. Gere um snapshot na tela de Contracheque para ver o saldo real.</span>
        </div>
      }

      <!-- Alertas de Metas -->
      @if (goalAlerts().length > 0) {
        <mat-card class="alerts-card">
          <mat-card-header>
            <mat-card-title>
              <mat-icon>warning</mat-icon> Metas
            </mat-card-title>
          </mat-card-header>
          <mat-card-content>
            @for (goal of goalAlerts(); track goal.id) {
              <div class="alert-item" [class]="goal.status">
                <div class="alert-info">
                  <span class="alert-name">{{ goal.name }}</span>
                  <span class="alert-detail">{{ toNum(goal.current_spending) | currencyBrl }} de {{ toNum(goal.amount_limit) | currencyBrl }}</span>
                </div>
                <div class="alert-bar">
                  <mat-progress-bar
                    [mode]="'determinate'"
                    [value]="Math.min(goal.percentage, 100)"
                    [color]="goal.status === 'excedido' ? 'warn' : 'accent'"
                  />
                  <span class="alert-pct" [class]="goal.status">{{ goal.percentage }}%</span>
                </div>
              </div>
            }
            <a mat-button routerLink="/goals" class="ver-todas">Ver todas as metas</a>
          </mat-card-content>
        </mat-card>
      }

      <!-- Gráficos -->
      <div class="charts-row">
        <mat-card class="chart-card">
          <mat-card-header>
            <mat-card-title>Despesas por Categoria</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            @if (categoryData().length > 0) {
              <div echarts [options]="categoryChartOptions()" class="chart"></div>
            } @else {
              <div class="empty-chart">
                <p>Sem despesas neste mês</p>
              </div>
            }
          </mat-card-content>
        </mat-card>

        <mat-card class="chart-card">
          <mat-card-header>
            <mat-card-title>Despesas por Banco</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            @if (bankData().length > 0) {
              <div echarts [options]="bankChartOptions()" class="chart"></div>
            } @else {
              <div class="empty-chart">
                <p>Sem despesas neste mês</p>
              </div>
            }
          </mat-card-content>
        </mat-card>
      </div>

      <mat-card class="chart-card full-width">
        <mat-card-header>
          <mat-card-title>Evolução Mensal</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          @if (evolutionData().length > 0) {
            <div echarts [options]="evolutionChartOptions()" class="chart-wide"></div>
          } @else {
            <div class="empty-chart">
              <p>Sem dados de evolução</p>
            </div>
          }
        </mat-card-content>
      </mat-card>
    }
  `,
  styles: `
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }
    .page-header h1 {
      margin: 0;
      font-size: 1.5rem;
    }
    .month-selector {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .month-label {
      font-size: 1.1rem;
      font-weight: 500;
      min-width: 160px;
      text-align: center;
      text-transform: capitalize;
    }

    .summary-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    .summary-card mat-card-content {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px !important;
    }
    .card-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .card-icon mat-icon {
      font-size: 28px;
      width: 28px;
      height: 28px;
    }
    .receita .card-icon {
      background: #e8f5e9;
      color: #2e7d32;
    }
    .despesas .card-icon {
      background: #fce4ec;
      color: #c62828;
    }
    .saldo .card-icon {
      background: #e3f2fd;
      color: #1565c0;
    }
    .saldo.negativo .card-icon {
      background: #fce4ec;
      color: #c62828;
    }
    .bruto .card-icon {
      background: #e8eaf6;
      color: #283593;
    }
    .descontos .card-icon {
      background: #fff3e0;
      color: #e65100;
    }
    .card-info {
      display: flex;
      flex-direction: column;
    }
    .card-label {
      font-size: 0.8rem;
      color: var(--mat-sys-on-surface-variant);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .card-value {
      font-size: 1.3rem;
      font-weight: 600;
      font-family: 'Roboto Mono', monospace;
    }
    .card-sub {
      font-size: 0.75rem;
      color: var(--mat-sys-on-surface-variant);
    }
    .card-link {
      font-size: 0.8rem;
      color: var(--mat-sys-primary);
      text-decoration: none;
      font-weight: 500;
      margin-top: 2px;
    }
    .card-link:hover {
      text-decoration: underline;
    }

    .alert {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      background: var(--mat-sys-surface-container);
      border-radius: 8px;
      margin-bottom: 24px;
      font-size: 0.875rem;
      color: var(--mat-sys-on-surface-variant);
    }

    .charts-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(380px, 1fr));
      gap: 16px;
      margin-bottom: 16px;
    }
    .chart-card.full-width {
      margin-bottom: 24px;
    }
    .chart {
      width: 100%;
      height: 320px;
    }
    .chart-wide {
      width: 100%;
      height: 350px;
    }
    .empty-chart {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 200px;
      color: var(--mat-sys-on-surface-variant);
    }
    .alerts-card {
      margin-bottom: 24px;
    }
    .alerts-card mat-card-title {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #e65100;
    }
    .alert-item {
      padding: 8px 0;
      border-bottom: 1px solid var(--mat-sys-outline-variant);
    }
    .alert-item:last-of-type { border-bottom: none; }
    .alert-info { display: flex; justify-content: space-between; margin-bottom: 4px; }
    .alert-name { font-weight: 500; font-size: 0.9rem; }
    .alert-detail { font-size: 0.85rem; font-family: 'Roboto Mono', monospace; color: var(--mat-sys-on-surface-variant); }
    .alert-bar { display: flex; align-items: center; gap: 8px; }
    .alert-bar mat-progress-bar { flex: 1; }
    .alert-pct { font-size: 0.85rem; font-weight: 500; min-width: 45px; text-align: right; }
    .alert-pct.alerta { color: #ff9800; }
    .alert-pct.excedido { color: #f44336; }
    .ver-todas { margin-top: 8px; }
    .loading {
      display: flex;
      justify-content: center;
      padding: 48px;
    }
  `,
})
export class DashboardPage implements OnInit {
  private readonly dashboardService = inject(DashboardService);
  private readonly goalService = inject(GoalService);
  private readonly currencyPipe = new CurrencyBrlPipe();

  Math = Math;

  loading = signal(true);
  currentMonth = signal(format(new Date(), 'yyyy-MM'));
  monthLabel = signal('');

  summary = signal<MonthlySummary | null>(null);
  categoryData = signal<CategoryBreakdown[]>([]);
  bankData = signal<BankBreakdown[]>([]);
  evolutionData = signal<MonthlyEvolution[]>([]);

  categoryChartOptions = signal<EChartsOption>({});
  bankChartOptions = signal<EChartsOption>({});
  evolutionChartOptions = signal<EChartsOption>({});
  goalAlerts = signal<Goal[]>([]);

  ngOnInit(): void {
    this.updateMonthLabel();
    this.loadAll();
  }

  loadAll(): void {
    this.loading.set(true);
    const month = this.currentMonth();

    // Carregar tudo em paralelo
    let loaded = 0;
    const checkDone = () => {
      loaded++;
      if (loaded >= 5) this.loading.set(false);
    };

    this.goalService.alerts(month).subscribe({
      next: (data) => { this.goalAlerts.set(data); checkDone(); },
      error: () => checkDone(),
    });

    this.dashboardService.getSummary(month).subscribe({
      next: (data) => { this.summary.set(data); checkDone(); },
      error: () => checkDone(),
    });

    this.dashboardService.getByCategory(month).subscribe({
      next: (data) => {
        this.categoryData.set(data);
        this.buildCategoryChart(data);
        checkDone();
      },
      error: () => checkDone(),
    });

    this.dashboardService.getByBank(month).subscribe({
      next: (data) => {
        this.bankData.set(data);
        this.buildBankChart(data);
        checkDone();
      },
      error: () => checkDone(),
    });

    this.dashboardService.getEvolution().subscribe({
      next: (data) => {
        this.evolutionData.set(data);
        this.buildEvolutionChart(data);
        checkDone();
      },
      error: () => checkDone(),
    });
  }

  prevMonth(): void {
    const d = new Date(this.currentMonth() + '-01');
    this.currentMonth.set(format(subMonths(d, 1), 'yyyy-MM'));
    this.updateMonthLabel();
    this.loadAll();
  }

  nextMonth(): void {
    const d = new Date(this.currentMonth() + '-01');
    this.currentMonth.set(format(addMonths(d, 1), 'yyyy-MM'));
    this.updateMonthLabel();
    this.loadAll();
  }

  private updateMonthLabel(): void {
    const d = new Date(this.currentMonth() + '-01');
    this.monthLabel.set(
      d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    );
  }

  toNum(val: string | undefined | null): number {
    if (!val) return 0;
    return parseFloat(val);
  }

  private buildCategoryChart(data: CategoryBreakdown[]): void {
    this.categoryChartOptions.set({
      tooltip: {
        trigger: 'item',
        formatter: (params: any) =>
          `${params.name}: ${this.currencyPipe.transform(params.value)} (${params.percent}%)`,
      },
      series: [
        {
          type: 'pie',
          radius: ['40%', '70%'],
          avoidLabelOverlap: true,
          itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
          label: { show: true, formatter: '{b}' },
          data: data.map((d) => ({
            name: d.category_name,
            value: parseFloat(d.total),
            itemStyle: { color: d.category_color },
          })),
        },
      ],
    });
  }

  private buildBankChart(data: BankBreakdown[]): void {
    this.bankChartOptions.set({
      tooltip: {
        trigger: 'item',
        formatter: (params: any) =>
          `${params.name}: ${this.currencyPipe.transform(params.value)} (${params.percent}%)`,
      },
      series: [
        {
          type: 'pie',
          radius: ['40%', '70%'],
          avoidLabelOverlap: true,
          itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
          label: { show: true, formatter: '{b}' },
          data: data.map((d) => ({
            name: d.bank_name,
            value: parseFloat(d.total),
            itemStyle: { color: d.bank_color },
          })),
        },
      ],
    });
  }

  private buildEvolutionChart(data: MonthlyEvolution[]): void {
    const months = data.map((d) => {
      const dt = new Date(d.month);
      return dt.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
    });
    const despesas = data.map((d) => parseFloat(d.despesas));
    const receitas = data.map((d) => parseFloat(d.receita_liquida));

    this.evolutionChartOptions.set({
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          let result = `<strong>${params[0].axisValue}</strong><br/>`;
          for (const p of params) {
            result += `${p.marker} ${p.seriesName}: ${this.currencyPipe.transform(p.value)}<br/>`;
          }
          return result;
        },
      },
      legend: { data: ['Receita Líquida', 'Despesas'] },
      grid: { left: 80, right: 20, top: 40, bottom: 30 },
      xAxis: { type: 'category', data: months },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: (val: number) => {
            if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
            return val.toString();
          },
        },
      },
      series: [
        {
          name: 'Receita Líquida',
          type: 'line',
          data: receitas,
          smooth: true,
          itemStyle: { color: '#2e7d32' },
          areaStyle: { color: 'rgba(46, 125, 50, 0.08)' },
        },
        {
          name: 'Despesas',
          type: 'bar',
          data: despesas,
          itemStyle: { color: '#ef5350', borderRadius: [4, 4, 0, 0] },
        },
      ],
    });
  }
}
