import { Component, OnInit, inject, signal } from '@angular/core';
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
import { format, subMonths, addMonths } from 'date-fns';

import { ExpenseService } from '../../../../core/services/expense.service';
import { CategoryService } from '../../../../core/services/category.service';
import { BankService } from '../../../../core/services/bank.service';
import { Expense, ExpenseFilters, PaymentType, CategoryFlat, Bank } from '../../../../core/models';
import { CurrencyBrlPipe } from '../../../../shared/pipes/currency-brl.pipe';
import {
  ConfirmDialog,
  ConfirmDialogData,
} from '../../../../shared/components/confirm-dialog/confirm-dialog';

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
          @for (cat of categories(); track cat.id) {
            <mat-option [value]="cat.id">{{ cat.full_path }}</mat-option>
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
          <mat-option value="CREDIT">Crédito</mat-option>
          <mat-option value="DEBIT">Débito</mat-option>
          <mat-option value="BOLETO">Boleto</mat-option>
          <mat-option value="PIX">PIX</mat-option>
          <mat-option value="CASH">Saque/Dinheiro</mat-option>
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
            <td mat-cell *matCellDef="let e">{{ paymentTypeLabel(e.payment_type) }}</td>
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
              <a mat-icon-button [routerLink]="['/expenses', e.id, 'edit']" matTooltip="Editar">
                <mat-icon>edit</mat-icon>
              </a>
              <button mat-icon-button (click)="confirmDelete(e)" matTooltip="Excluir" color="warn">
                <mat-icon>delete</mat-icon>
              </button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
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
  private readonly dialog = inject(MatDialog);

  expenses = signal<Expense[]>([]);
  categories = signal<CategoryFlat[]>([]);
  banks = signal<Bank[]>([]);
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
    this.updateMonthLabel();
    this.categoryService.flat().subscribe((cats) => this.categories.set(cats));
    this.bankService.list().subscribe((banks) => this.banks.set(banks));
    this.loadExpenses();
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
      filters.payment_type = this.filterPaymentType as PaymentType;

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
    const d = new Date(this.currentMonth() + '-01');
    this.currentMonth.set(format(subMonths(d, 1), 'yyyy-MM'));
    this.updateMonthLabel();
    this.loadExpenses();
  }

  nextMonth(): void {
    const d = new Date(this.currentMonth() + '-01');
    this.currentMonth.set(format(addMonths(d, 1), 'yyyy-MM'));
    this.updateMonthLabel();
    this.loadExpenses();
  }

  private updateMonthLabel(): void {
    const d = new Date(this.currentMonth() + '-01');
    this.monthLabel.set(
      d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    );
  }

  paymentTypeLabel(type: PaymentType): string {
    const labels: Record<PaymentType, string> = {
      CREDIT: 'Crédito',
      DEBIT: 'Débito',
      BOLETO: 'Boleto',
      PIX: 'PIX',
      CASH: 'Saque/Dinheiro',
    };
    return labels[type] || type;
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
