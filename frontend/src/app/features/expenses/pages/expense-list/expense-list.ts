import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { DatePipe } from '@angular/common';
import { format, subMonths, addMonths, parse } from 'date-fns';

import { ExpenseService } from '../../../../core/services/expense.service';
import { CategoryService } from '../../../../core/services/category.service';
import { BankService } from '../../../../core/services/bank.service';
import { PaymentTypeService } from '../../../../core/services/payment-type.service';
import { FinancialCalendarService } from '../../../../core/services/financial-calendar.service';
import { Expense, ExpenseFilters, CategoryFlat, Bank, PaymentType } from '../../../../core/models';
import { CurrencyBrlPipe } from '../../../../shared/pipes/currency-brl.pipe';
import {
  ConfirmDialog,
  ConfirmDialogData,
} from '../../../../shared/components/confirm-dialog/confirm-dialog';
import {
  MarkPaidDialog,
  MarkPaidDialogData,
  MarkPaidDialogResult,
} from '../../../../shared/components/mark-paid-dialog/mark-paid-dialog';

@Component({
  selector: 'app-expense-list',
  standalone: true,
  imports: [
    RouterLink,
    FormsModule,
    DatePipe,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatChipsModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    CurrencyBrlPipe,
  ],
  template: `
    <div class="page-header">
      <h1>Despesas</h1>
      <a mat-fab extended routerLink="/expenses/new">
        <mat-icon>add</mat-icon>
        Nova Despesa
      </a>
    </div>

    <div class="filters">
      <div class="month-selector">
        <button mat-icon-button (click)="prevMonth()">
          <mat-icon>chevron_left</mat-icon>
        </button>
        <span class="month-label">{{ monthLabel() }}</span>
        <button mat-icon-button (click)="nextMonth()">
          <mat-icon>chevron_right</mat-icon>
        </button>
      </div>

      <mat-form-field appearance="outline" class="filter-field">
        <mat-label>Categoria</mat-label>
        <mat-select [(ngModel)]="filterCategory" (selectionChange)="loadExpenses()">
          <mat-option value="">Todas</mat-option>
          @for (group of categoryGroups(); track group.root.id) {
            @if (group.children.length > 0) {
              <mat-optgroup [label]="group.root.name">
                <mat-option [value]="group.root.id">{{ group.root.name }} (geral)</mat-option>
                @for (child of group.children; track child.id) {
                  <mat-option [value]="child.id">{{ child.name }}</mat-option>
                }
              </mat-optgroup>
            } @else {
              <mat-option [value]="group.root.id">{{ group.root.name }}</mat-option>
            }
          }
        </mat-select>
      </mat-form-field>

      <mat-form-field appearance="outline" class="filter-field">
        <mat-label>Banco</mat-label>
        <mat-select [(ngModel)]="filterBank" (selectionChange)="loadExpenses()">
          <mat-option value="">Todos</mat-option>
          @for (bank of banks(); track bank.id) {
            <mat-option [value]="bank.id">{{ bank.name }}</mat-option>
          }
        </mat-select>
      </mat-form-field>

      <mat-form-field appearance="outline" class="filter-field">
        <mat-label>Tipo Pagamento</mat-label>
        <mat-select [(ngModel)]="filterPaymentType" (selectionChange)="loadExpenses()">
          <mat-option value="">Todos</mat-option>
          @for (pt of paymentTypes(); track pt.id) {
            <mat-option [value]="pt.id">{{ pt.name }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
    </div>

    @if (loading()) {
      <div class="loading">
        <mat-spinner diameter="40" />
      </div>
    } @else {
      <div class="total-bar">
        <span>Total do mês:</span>
        <strong>{{ totalMonth() | currencyBrl }}</strong>
      </div>

      @if (expenses().length === 0) {
        <div class="empty-state">
          <mat-icon>receipt_long</mat-icon>
          <p>Nenhuma despesa encontrada para este mês.</p>
          <a mat-flat-button routerLink="/expenses/new">Adicionar despesa</a>
        </div>
      } @else {
        <table mat-table [dataSource]="expenses()" class="expense-table">
          <ng-container matColumnDef="date">
            <th mat-header-cell *matHeaderCellDef>Data</th>
            <td mat-cell *matCellDef="let e">{{ e.date | date: 'dd/MM/yyyy' }}</td>
          </ng-container>

          <ng-container matColumnDef="description">
            <th mat-header-cell *matHeaderCellDef>Descrição</th>
            <td mat-cell *matCellDef="let e">
              {{ e.description }}
              @if (e.is_installment) {
                <span class="badge installment" [matTooltip]="'Parcela ' + e.installment_current + ' de ' + e.installment_total">
                  {{ e.installment_current }}/{{ e.installment_total }}
                </span>
              }
              @if (e.is_recurring) {
                <span class="badge recurring" matTooltip="Recorrente">
                  <mat-icon inline>repeat</mat-icon>
                </span>
              }
              @if (e.from_paycheck) {
                <span class="badge paycheck" matTooltip="Contracheque">
                  <mat-icon inline>payments</mat-icon>
                </span>
              }
              @if (e.is_predicted) {
                <span class="badge predicted" matTooltip="Prevista — será confirmada automaticamente na data">
                  <mat-icon inline>schedule</mat-icon> Prevista
                </span>
              }
              @if (e.boleto_status === 'pending') {
                @let alert = getBoletoAlert(e);
                @if (alert === 'overdue') {
                  <span class="badge boleto-overdue" matTooltip="Boleto vencido!">
                    <mat-icon inline>error</mat-icon> VENCIDO
                  </span>
                } @else if (alert === 'due_today') {
                  <span class="badge boleto-today" matTooltip="Vence hoje!">
                    <mat-icon inline>warning</mat-icon> VENCE HOJE
                  </span>
                } @else if (alert === 'due_3_days') {
                  <span class="badge boleto-soon" matTooltip="Vence em até 3 dias">
                    <mat-icon inline>schedule</mat-icon> Vence em breve
                  </span>
                } @else if (alert === 'due_5_days') {
                  <span class="badge boleto-5days" matTooltip="Vence em até 5 dias">
                    <mat-icon inline>schedule</mat-icon> Vence em breve
                  </span>
                } @else {
                  <span class="badge boleto-pending" matTooltip="Boleto pendente — dia {{ e.due_day }}">
                    <mat-icon inline>receipt</mat-icon> Pendente
                  </span>
                }
              }
              @if (e.boleto_status === 'paid') {
                <span class="badge boleto-paid" matTooltip="Boleto pago">
                  <mat-icon inline>check_circle</mat-icon> Pago
                </span>
              }
            </td>
          </ng-container>

          <ng-container matColumnDef="category">
            <th mat-header-cell *matHeaderCellDef>Categoria</th>
            <td mat-cell *matCellDef="let e">
              @if (e.category_name) {
                <span class="category-chip" [style.border-left-color]="getCategoryColor(e.category)">
                  {{ e.category_name }}
                </span>
              } @else {
                <span class="text-muted">—</span>
              }
            </td>
          </ng-container>

          <ng-container matColumnDef="bank">
            <th mat-header-cell *matHeaderCellDef>Banco</th>
            <td mat-cell *matCellDef="let e">
              @if (e.bank_name) {
                <span class="bank-chip" [style.border-left-color]="getBankColor(e.bank)">
                  {{ e.bank_name }}
                </span>
              } @else {
                <span class="text-muted">—</span>
              }
            </td>
          </ng-container>

          <ng-container matColumnDef="payment_type">
            <th mat-header-cell *matHeaderCellDef>Pagamento</th>
            <td mat-cell *matCellDef="let e">{{ e.payment_type_name || '—' }}</td>
          </ng-container>

          <ng-container matColumnDef="amount">
            <th mat-header-cell *matHeaderCellDef>Valor</th>
            <td mat-cell *matCellDef="let e" class="amount-cell">
              {{ e.amount | currencyBrl }}
            </td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let e">
              @if (!e.is_predicted) {
                @if (e.boleto_status === 'pending') {
                  <button mat-icon-button (click)="openMarkPaid(e)" matTooltip="Marcar como pago" color="primary">
                    <mat-icon>paid</mat-icon>
                  </button>
                }
                <a mat-icon-button [routerLink]="['/expenses', e.id, 'edit']" matTooltip="Editar">
                  <mat-icon>edit</mat-icon>
                </a>
                <button mat-icon-button (click)="confirmDelete(e)" matTooltip="Excluir" color="warn">
                  <mat-icon>delete</mat-icon>
                </button>
              }
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns" [class.predicted-row]="row.is_predicted"></tr>
        </table>
      }
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
    .filters {
      display: flex;
      gap: 16px;
      align-items: center;
      flex-wrap: wrap;
      margin-bottom: 16px;
    }
    .month-selector {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .month-label {
      font-size: 1.1rem;
      font-weight: 500;
      min-width: 140px;
      text-align: center;
      text-transform: capitalize;
    }
    .filter-field {
      width: 180px;
    }
    .total-bar {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      padding: 12px 16px;
      background: var(--mat-sys-surface-container);
      border-radius: 8px;
      margin-bottom: 16px;
      font-size: 1rem;
    }
    .expense-table {
      width: 100%;
    }
    .amount-cell {
      font-weight: 500;
      white-space: nowrap;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      font-size: 0.75rem;
      padding: 2px 6px;
      border-radius: 12px;
      margin-left: 6px;
      vertical-align: middle;
    }
    .badge mat-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }
    .installment {
      background: #e3f2fd;
      color: #1565c0;
    }
    .recurring {
      background: #f3e5f5;
      color: #7b1fa2;
    }
    .paycheck {
      background: #e8f5e9;
      color: #2e7d32;
    }
    .predicted {
      background: #fff3e0;
      color: #e65100;
    }
    .predicted-row {
      opacity: 0.6;
    }
    .boleto-overdue {
      background: #ffebee;
      color: #c62828;
      font-weight: 600;
      animation: pulse 1.5s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.6; }
    }
    .boleto-today {
      background: #fff3e0;
      color: #e65100;
      font-weight: 600;
    }
    .boleto-soon {
      background: #fffde7;
      color: #f57f17;
    }
    .boleto-5days {
      background: #e3f2fd;
      color: #1565c0;
    }
    .boleto-pending {
      background: #f5f5f5;
      color: #616161;
    }
    .boleto-paid {
      background: #e8f5e9;
      color: #2e7d32;
    }
    .category-chip,
    .bank-chip {
      border-left: 3px solid #ccc;
      padding-left: 6px;
    }
    .text-muted {
      color: var(--mat-sys-on-surface-variant);
    }
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
export class ExpenseList implements OnInit {
  private readonly expenseService = inject(ExpenseService);
  private readonly categoryService = inject(CategoryService);
  private readonly bankService = inject(BankService);
  private readonly paymentTypeService = inject(PaymentTypeService);
  private readonly financialCalendarService = inject(FinancialCalendarService);
  private readonly dialog = inject(MatDialog);

  expenses = signal<Expense[]>([]);
  categories = signal<CategoryFlat[]>([]);
  banks = signal<Bank[]>([]);
  paymentTypes = signal<PaymentType[]>([]);

  categoryGroups = computed(() => {
    const cats = this.categories();
    const roots = cats.filter((c) => !c.parent);
    return roots.map((root) => {
      const children = cats.filter((c) => c.parent === root.id);
      return { root, children };
    });
  });
  loading = signal(true);
  currentMonth = signal(format(new Date(), 'yyyy-MM'));
  monthLabel = signal('');

  filterCategory = '';
  filterBank = '';
  filterPaymentType = '';

  displayedColumns = [
    'date',
    'description',
    'category',
    'bank',
    'payment_type',
    'amount',
    'actions',
  ];

  ngOnInit(): void {
    this.categoryService.flat().subscribe((cats) => this.categories.set(cats));
    this.bankService.list().subscribe((banks) => this.banks.set(banks));
    this.paymentTypeService.list().subscribe((pts) => this.paymentTypes.set(pts));

    // Buscar o mês financeiro corrente antes de carregar despesas
    this.financialCalendarService.getCurrentFinancialMonth().subscribe({
      next: (fm) => {
        this.currentMonth.set(format(new Date(fm.year, fm.month - 1, 1), 'yyyy-MM'));
        this.updateMonthLabel();
        this.loadExpenses();
      },
      error: () => {
        // Fallback: mês calendário
        this.updateMonthLabel();
        this.loadExpenses();
      },
    });
  }

  loadExpenses(): void {
    this.loading.set(true);
    const filters: ExpenseFilters = {
      month: this.currentMonth(),
      ordering: '-date',
    };
    if (this.filterCategory) filters.category = this.filterCategory;
    if (this.filterBank) filters.bank = this.filterBank;
    if (this.filterPaymentType)
      filters.payment_type = this.filterPaymentType;

    this.expenseService.list(filters).subscribe({
      next: (expenses) => {
        this.expenses.set(expenses);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  totalMonth(): number {
    return this.expenses().reduce(
      (sum, e) => sum + parseFloat(String(e.amount)),
      0
    );
  }

  prevMonth(): void {
    const d = parse(this.currentMonth(), 'yyyy-MM', new Date());
    this.currentMonth.set(format(subMonths(d, 1), 'yyyy-MM'));
    this.updateMonthLabel();
    this.loadExpenses();
  }

  nextMonth(): void {
    const d = parse(this.currentMonth(), 'yyyy-MM', new Date());
    this.currentMonth.set(format(addMonths(d, 1), 'yyyy-MM'));
    this.updateMonthLabel();
    this.loadExpenses();
  }

  private updateMonthLabel(): void {
    const d = parse(this.currentMonth(), 'yyyy-MM', new Date());
    this.monthLabel.set(
      d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    );
  }

  getCategoryColor(categoryId: string | null): string {
    if (!categoryId) return '#ccc';
    return (
      this.categories().find((c) => c.id === categoryId)?.color || '#ccc'
    );
  }

  getBankColor(bankId: string | null): string {
    if (!bankId) return '#ccc';
    return this.banks().find((b) => b.id === bankId)?.color || '#ccc';
  }

  getBoletoAlert(expense: Expense): string | null {
    if (!expense.due_day || expense.boleto_status !== 'pending') return null;
    const today = new Date();
    const [year, month] = expense.date.split('-').map(Number);
    const maxDay = new Date(year, month, 0).getDate();
    const dueDay = Math.min(expense.due_day, maxDay);
    const dueDate = new Date(year, month - 1, dueDay);
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'overdue';
    if (diffDays === 0) return 'due_today';
    if (diffDays <= 3) return 'due_3_days';
    if (diffDays <= 5) return 'due_5_days';
    return null;
  }

  openMarkPaid(expense: Expense): void {
    const [year, month] = expense.date.split('-').map(Number);
    const maxDay = new Date(year, month, 0).getDate();
    const dueDay = Math.min(expense.due_day || 1, maxDay);
    const dueDate = new Date(year, month - 1, dueDay);

    const ref = this.dialog.open(MarkPaidDialog, {
      width: '400px',
      data: {
        description: expense.description,
        amount: parseFloat(String(expense.amount)),
        dueDate: dueDate.toLocaleDateString('pt-BR'),
      } as MarkPaidDialogData,
    });

    ref.afterClosed().subscribe((result: MarkPaidDialogResult | null) => {
      if (result?.confirmed) {
        this.expenseService.markPaid(expense.id, result.amount).subscribe(() => {
          this.loadExpenses();
        });
      }
    });
  }

  confirmDelete(expense: Expense): void {
    const ref = this.dialog.open(ConfirmDialog, {
      data: {
        title: 'Excluir Despesa',
        message: `Deseja excluir "${expense.description}"?`,
        confirmText: 'Excluir',
      } as ConfirmDialogData,
    });

    ref.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.expenseService.delete(expense.id).subscribe(() => {
          this.loadExpenses();
        });
      }
    });
  }
}
