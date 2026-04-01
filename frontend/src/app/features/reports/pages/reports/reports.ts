import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { provideNativeDateAdapter } from '@angular/material/core';
import { format } from 'date-fns';

import { ReportService } from '../../../../core/services/report.service';
import { FinancialCalendarService } from '../../../../core/services/financial-calendar.service';
import { PaymentTypeService } from '../../../../core/services/payment-type.service';
import {
  ReportSummary,
  ReportByCategory,
  ReportCategoryItem,
  InstallmentsReport,
  MonthlyComparison,
  Expense,
  PaymentType,
} from '../../../../core/models';
import { CurrencyBrlPipe } from '../../../../shared/pipes/currency-brl.pipe';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [
    FormsModule,
    DatePipe,
    MatCardModule,
    MatTabsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatCheckboxModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
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
            <mat-form-field appearance="outline" class="filter-pt">
              <mat-label>Tipo Pagamento</mat-label>
              <mat-select [(ngModel)]="selectedPaymentTypes" multiple>
                @for (pt of paymentTypes(); track pt.id) {
                  <mat-option [value]="pt.id">{{ pt.name }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <button mat-flat-button (click)="loadByCategory()">
              <mat-icon>search</mat-icon> Filtrar
            </button>
            <mat-checkbox [(ngModel)]="groupCategories">Agrupar Categorias</mat-checkbox>
          </div>

          @if (loadingCategory()) {
            <div class="loading"><mat-spinner diameter="40" /></div>
          } @else if (categoryReport()?.data?.length) {
            <div class="total-bar">
              <span>Total no período:</span>
              <strong>{{ toNum(categoryReport()!.total) | currencyBrl }}</strong>
            </div>
            <table class="cat-table">
              <thead>
                <tr>
                  <th class="th-sortable" [class.th-sorted]="catSortColumn() === 'category_name'" (click)="toggleCatSort('category_name')">
                    Categoria
                    @if (catSortColumn() === 'category_name') {
                      <mat-icon class="sort-icon">{{ catSortDir() === 'asc' ? 'arrow_upward' : 'arrow_downward' }}</mat-icon>
                    }
                  </th>
                  <th class="value th-sortable" [class.th-sorted]="catSortColumn() === 'total'" (click)="toggleCatSort('total')">
                    Total
                    @if (catSortColumn() === 'total') {
                      <mat-icon class="sort-icon">{{ catSortDir() === 'asc' ? 'arrow_upward' : 'arrow_downward' }}</mat-icon>
                    }
                  </th>
                  <th class="value th-sortable" [class.th-sorted]="catSortColumn() === 'percentage'" (click)="toggleCatSort('percentage')">
                    %
                    @if (catSortColumn() === 'percentage') {
                      <mat-icon class="sort-icon">{{ catSortDir() === 'asc' ? 'arrow_upward' : 'arrow_downward' }}</mat-icon>
                    }
                  </th>
                  <th class="th-sortable" [class.th-sorted]="catSortColumn() === 'count'" (click)="toggleCatSort('count')">
                    Qtd
                    @if (catSortColumn() === 'count') {
                      <mat-icon class="sort-icon">{{ catSortDir() === 'asc' ? 'arrow_upward' : 'arrow_downward' }}</mat-icon>
                    }
                  </th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                @for (r of categoryTableData(); track r._isExpenseDetail ? '_detail_' : (r.category_id || 'none') + (r._isChild ? '_child' : '')) {
                  @if (r._isExpenseDetail) {
                    <tr>
                      <td colspan="5" class="detail-cell">
                        <div class="detail-section">
                          <div class="detail-header">
                            <h3>Despesas: {{ r._categoryName }}</h3>
                            <button mat-icon-button (click)="closeCategoryExpenses()" matTooltip="Fechar">
                              <mat-icon>close</mat-icon>
                            </button>
                          </div>
                          @if (r._loading) {
                            <div class="loading-sm"><mat-spinner diameter="30" /></div>
                          } @else if (r._expenses.length > 0) {
                            <table mat-table [dataSource]="r._expenses" class="report-table detail-table">
                              <ng-container matColumnDef="date">
                                <th mat-header-cell *matHeaderCellDef>Data</th>
                                <td mat-cell *matCellDef="let e">{{ e.date | date: 'dd/MM/yyyy' }}</td>
                              </ng-container>
                              <ng-container matColumnDef="description">
                                <th mat-header-cell *matHeaderCellDef>Descrição</th>
                                <td mat-cell *matCellDef="let e">
                                  {{ e.description }}
                                  @if (e.is_installment) {
                                    <span class="badge installment">{{ e.installment_current }}/{{ e.installment_total }}</span>
                                  }
                                  @if (e.is_recurring) {
                                    <span class="badge recurring"><mat-icon inline>repeat</mat-icon></span>
                                  }
                                  @if (e.from_paycheck) {
                                    <span class="badge paycheck"><mat-icon inline>payments</mat-icon></span>
                                  }
                                  @if (e.third_party_name) {
                                    <span class="badge third-party"><mat-icon inline>person</mat-icon> {{ e.third_party_name }}</span>
                                  }
                                </td>
                              </ng-container>
                              <ng-container matColumnDef="category">
                                <th mat-header-cell *matHeaderCellDef>Categoria</th>
                                <td mat-cell *matCellDef="let e">{{ e.category_name || '—' }}</td>
                              </ng-container>
                              <ng-container matColumnDef="payment_type">
                                <th mat-header-cell *matHeaderCellDef>Pagamento</th>
                                <td mat-cell *matCellDef="let e">{{ e.credit_card_name ? e.payment_type_name + ' - ' + e.credit_card_name : (e.payment_type_name || '—') }}</td>
                              </ng-container>
                              <ng-container matColumnDef="amount">
                                <th mat-header-cell *matHeaderCellDef>Valor</th>
                                <td mat-cell *matCellDef="let e" class="value">{{ toNum(e.amount) | currencyBrl }}</td>
                              </ng-container>
                              <tr mat-header-row *matHeaderRowDef="expenseDetailCols"></tr>
                              <tr mat-row *matRowDef="let row; columns: expenseDetailCols"></tr>
                            </table>
                          } @else {
                            <p class="empty-sm">Nenhuma despesa encontrada.</p>
                          }
                        </div>
                      </td>
                    </tr>
                  } @else {
                    <tr [class.cat-group-bg]="r._isGroup" [class.cat-child-bg]="r._isChild"
                        [class.cat-selected]="selectedCategoryId() === (r.category_id || '__none__') && !r._isGroup">
                      <td>
                        @if (r._isGroup) {
                          <span class="cat-group-row">
                            <span class="cat-dot" [style.background-color]="r.category_color"></span>
                            <strong>{{ r.category_name }}</strong>
                            <span class="cat-sub-count">({{ r._childCount }} subcategoria{{ r._childCount > 1 ? 's' : '' }})</span>
                          </span>
                        } @else {
                          <span [class.cat-child]="r._isChild">
                            <span class="cat-dot" [style.background-color]="r.category_color"></span>
                            {{ r.category_name }}
                          </span>
                        }
                      </td>
                      <td class="value">
                        @if (r._isGroup) { <strong>{{ toNum(r.total) | currencyBrl }}</strong> }
                        @else { {{ toNum(r.total) | currencyBrl }} }
                      </td>
                      <td class="value">
                        @if (r._isGroup) { <strong>{{ r.percentage }}%</strong> }
                        @else { {{ r.percentage }}% }
                      </td>
                      <td>
                        @if (r._isGroup) { <strong>{{ r.count }}</strong> }
                        @else { {{ r.count }} }
                      </td>
                      <td class="actions-cell">
                        @if (r._isGroup) {
                          <button mat-icon-button (click)="toggleCategoryGroup(r.category_id)"
                                  [matTooltip]="isCategoryExpanded(r.category_id) ? 'Recolher' : 'Expandir'">
                            <mat-icon>{{ isCategoryExpanded(r.category_id) ? 'remove' : 'add' }}</mat-icon>
                          </button>
                        } @else {
                          <button mat-icon-button (click)="loadCategoryExpenses(r)"
                                  [matTooltip]="selectedCategoryId() === (r.category_id || '__none__') ? 'Fechar' : 'Ver despesas'">
                            <mat-icon>{{ selectedCategoryId() === (r.category_id || '__none__') ? 'visibility_off' : 'visibility' }}</mat-icon>
                          </button>
                        }
                      </td>
                    </tr>
                  }
                }
              </tbody>
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

    /* Tabela de categorias */
    .cat-table {
      width: 100%;
      border-collapse: collapse;
    }
    .cat-table th, .cat-table td {
      padding: 12px 16px;
      border-bottom: 1px solid var(--mat-sys-outline-variant);
      font-size: 0.875rem;
    }
    .cat-table th {
      text-align: left;
      font-weight: 500;
      color: var(--mat-sys-on-surface-variant);
    }
    .th-sortable {
      cursor: pointer;
      user-select: none;
    }
    .th-sortable:hover {
      background: rgba(0, 0, 0, 0.04);
    }
    .th-sorted {
      color: var(--mat-sys-primary);
    }
    .sort-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      vertical-align: middle;
      color: var(--mat-sys-primary);
    }
    .cat-table tbody tr:hover:not(.cat-group-bg) {
      background: rgba(0, 0, 0, 0.02);
    }
    .actions-cell { width: 48px; text-align: center; }

    /* Agrupamento de categorias */
    .cat-group-bg { background: var(--mat-sys-surface-container); }
    .cat-group-bg:hover { background: var(--mat-sys-surface-container-high) !important; }
    .cat-child-bg { background: var(--mat-sys-surface-container-lowest); }
    .cat-selected { background: rgba(var(--mat-sys-primary-rgb, 25, 118, 210), 0.06) !important; }
    .cat-group-row { display: flex; align-items: center; gap: 4px; }
    .cat-sub-count { font-size: 0.8rem; color: var(--mat-sys-on-surface-variant); font-weight: 400; }
    .cat-child { padding-left: 20px; }
    .date-filters mat-checkbox { margin-top: 8px; }
    .filter-pt { width: 200px; }

    /* Tabela de despesas detalhada inline */
    .detail-cell { padding: 0 !important; border-bottom: none !important; }
    .detail-section {
      padding: 16px;
      background: var(--mat-sys-surface-container-lowest);
      border-bottom: 2px solid var(--mat-sys-outline-variant);
    }
    .detail-header {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 12px;
    }
    .detail-header h3 { margin: 0; font-size: 1rem; }
    .detail-table { margin-top: 8px; }
    .loading-sm { display: flex; justify-content: center; padding: 24px; }
    .empty-sm { text-align: center; padding: 16px; color: var(--mat-sys-on-surface-variant); font-size: 0.875rem; }
    .badge {
      display: inline-flex; align-items: center;
      font-size: 0.75rem; padding: 2px 6px; border-radius: 12px;
      margin-left: 6px; vertical-align: middle;
    }
    .badge mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .installment { background: #e3f2fd; color: #1565c0; }
    .recurring { background: #f3e5f5; color: #7b1fa2; }
    .paycheck { background: #e8f5e9; color: #2e7d32; }
    .third-party { background: #e1bee7; color: #6a1b9a; }
  `,
})
export class ReportsPage implements OnInit {
  private readonly reportService = inject(ReportService);
  private readonly financialCalendarService = inject(FinancialCalendarService);
  private readonly paymentTypeService = inject(PaymentTypeService);

  paymentTypes = signal<PaymentType[]>([]);
  selectedPaymentTypes: string[] = [];

  loadingComparison = signal(true);
  loadingCategory = signal(false);
  loadingInstallments = signal(false);

  comparison = signal<MonthlyComparison[]>([]);
  categoryReport = signal<ReportByCategory | null>(null);
  installments = signal<InstallmentsReport | null>(null);

  comparisonCols = ['month_label', 'receita_liquida', 'total_despesas', 'saldo', 'quantidade_despesas'];
  expenseDetailCols = ['date', 'description', 'category', 'payment_type', 'amount'];

  groupCategories = false;
  expandedCategories = signal<Set<string>>(new Set());
  catSortColumn = signal<string | null>(null);
  catSortDir = signal<'asc' | 'desc'>('asc');
  selectedCategoryId = signal<string | null>(null);
  selectedCategoryName = signal('');
  categoryExpenses = signal<Expense[]>([]);
  loadingCategoryExpenses = signal(false);

  private groupedCategoryRows = computed(() => {
    const report = this.categoryReport();
    if (!report?.data) return [];

    if (!this.groupCategories) return report.data as any[];

    const items = report.data;
    const parentIds = new Set(items.filter(i => i.parent_id).map(i => i.parent_id!));
    const childItems = items.filter(i => i.parent_id);
    const rootItems = items.filter(i => !i.parent_id);

    const expanded = this.expandedCategories();
    const totalGeral = parseFloat(report.total) || 1;
    const rows: any[] = [];

    for (const root of rootItems) {
      const children = childItems.filter(c => c.parent_id === root.category_id);
      if (children.length > 0) {
        const groupTotal = parseFloat(root.total) + children.reduce((s, c) => s + parseFloat(c.total), 0);
        const groupCount = root.count + children.reduce((s, c) => s + c.count, 0);
        const groupPercentage = Math.round(groupTotal / totalGeral * 1000) / 10;

        rows.push({
          ...root,
          _isGroup: true,
          total: String(groupTotal),
          count: groupCount,
          percentage: groupPercentage,
          _childCount: children.length,
        });

        if (expanded.has(root.category_id!)) {
          if (root.count > 0) {
            rows.push({ ...root, _isChild: true, category_name: root.category_name + ' (geral)' });
          }
          for (const child of children) {
            rows.push({ ...child, _isChild: true });
          }
        }
      } else if (!root.category_id || !parentIds.has(root.category_id)) {
        rows.push(root);
      } else {
        rows.push(root);
      }
    }

    return rows;
  });

  categoryTableData = computed(() => {
    let rows = [...this.groupedCategoryRows()];

    // Ordenação
    const sortCol = this.catSortColumn();
    const sortDir = this.catSortDir();
    if (sortCol) {
      // Separar grupos (pai) dos filhos para ordenar apenas os de nível raiz
      // e manter filhos logo após seus pais
      const topLevel = rows.filter(r => !r._isChild);
      const childMap = new Map<string, any[]>();
      for (const r of rows) {
        if (r._isChild) {
          const parentId = r.parent_id || '__orphan__';
          if (!childMap.has(parentId)) childMap.set(parentId, []);
          childMap.get(parentId)!.push(r);
        }
      }

      topLevel.sort((a, b) => {
        let cmp: number;
        if (sortCol === 'category_name') {
          cmp = (a.category_name || '').localeCompare(b.category_name || '', 'pt-BR', { sensitivity: 'base' });
        } else if (sortCol === 'total') {
          cmp = parseFloat(a.total) - parseFloat(b.total);
        } else if (sortCol === 'percentage') {
          cmp = (a.percentage || 0) - (b.percentage || 0);
        } else {
          cmp = (a.count || 0) - (b.count || 0);
        }
        return sortDir === 'asc' ? cmp : -cmp;
      });

      rows = [];
      for (const item of topLevel) {
        rows.push(item);
        const children = childMap.get(item.category_id);
        if (children) rows.push(...children);
      }
    }

    const selectedId = this.selectedCategoryId();
    const expenses = this.categoryExpenses();
    const loading = this.loadingCategoryExpenses();

    if (!selectedId) return rows;

    const result: any[] = [];
    for (const row of rows) {
      result.push(row);
      const rowId = row.category_id || '__none__';
      if (rowId === selectedId && !row._isGroup) {
        result.push({
          _isExpenseDetail: true,
          _loading: loading,
          _expenses: expenses,
          _categoryName: this.selectedCategoryName(),
        });
      }
    }
    return result;
  });

  startDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  endDate = new Date();

  ngOnInit(): void {
    this.paymentTypeService.list().subscribe((pts) => this.paymentTypes.set(pts));
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
    this.closeCategoryExpenses();
    const start = format(this.startDate, 'yyyy-MM-dd');
    const end = format(this.endDate, 'yyyy-MM-dd');
    const pts = this.selectedPaymentTypes.length ? this.selectedPaymentTypes : undefined;
    this.reportService.getByCategory(start, end, pts).subscribe({
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

  toggleCatSort(column: string): void {
    if (this.catSortColumn() === column) {
      if (this.catSortDir() === 'asc') {
        this.catSortDir.set('desc');
      } else {
        this.catSortColumn.set(null);
      }
    } else {
      this.catSortColumn.set(column);
      this.catSortDir.set('asc');
    }
  }

  toggleCategoryGroup(categoryId: string): void {
    const current = new Set(this.expandedCategories());
    if (current.has(categoryId)) current.delete(categoryId);
    else current.add(categoryId);
    this.expandedCategories.set(current);
  }

  isCategoryExpanded(categoryId: string): boolean {
    return this.expandedCategories().has(categoryId);
  }

  loadCategoryExpenses(item: any): void {
    const itemId = item.category_id || '__none__';

    // Toggle: se clicar na mesma, fecha
    if (this.selectedCategoryId() === itemId) {
      this.closeCategoryExpenses();
      return;
    }

    this.selectedCategoryId.set(itemId);
    this.selectedCategoryName.set(item.category_name);
    this.categoryExpenses.set([]);
    this.loadingCategoryExpenses.set(true);

    const start = format(this.startDate, 'yyyy-MM-dd');
    const end = format(this.endDate, 'yyyy-MM-dd');
    const isGroup = !!item._isGroup;

    const pts = this.selectedPaymentTypes.length ? this.selectedPaymentTypes : undefined;

    this.reportService.getExpensesByCategory(start, end, item.category_id, isGroup, pts).subscribe({
      next: (data) => {
        this.categoryExpenses.set(data);
        this.loadingCategoryExpenses.set(false);
      },
      error: () => this.loadingCategoryExpenses.set(false),
    });
  }

  closeCategoryExpenses(): void {
    this.selectedCategoryId.set(null);
    this.selectedCategoryName.set('');
    this.categoryExpenses.set([]);
  }

  toNum(val: string | undefined | null): number {
    return val ? parseFloat(val) : 0;
  }
}
