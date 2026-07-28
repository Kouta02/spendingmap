import { Component, OnInit, WritableSignal, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { DatePipe } from '@angular/common';

import { IncomeService } from '../../../../core/services/income.service';
import { ThirdPartyService } from '../../../../core/services/third-party.service';
import { MonthStateService } from '../../../../core/services/month-state.service';
import { FilterStateService } from '../../../../core/services/filter-state.service';
import { Income, IncomeFilters, IncomeCategory, ThirdParty } from '../../../../core/models';
import { CurrencyBrlPipe } from '../../../../shared/pipes/currency-brl.pipe';
import {
  ConfirmDialog,
  ConfirmDialogData,
} from '../../../../shared/components/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-income-list',
  standalone: true,
  imports: [
    RouterLink, FormsModule, DatePipe,
    MatTableModule, MatButtonModule, MatIconModule, MatSelectModule,
    MatFormFieldModule, MatTooltipModule, MatProgressSpinnerModule,
    CurrencyBrlPipe,
  ],
  template: `
    <div class="page-header">
      <h1>Receitas</h1>
      <a mat-fab extended routerLink="/incomes/new">
        <mat-icon>add</mat-icon>
        Nova Receita
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
        <mat-select [ngModel]="filterCategory()" (ngModelChange)="filterCategory.set($event)"
                    (selectionChange)="loadIncomes()">
          <mat-option value="">Todas</mat-option>
          @for (cat of categories(); track cat.id) {
            <mat-option [value]="cat.id">{{ cat.name }}</mat-option>
          }
        </mat-select>
      </mat-form-field>

      <mat-form-field appearance="outline" class="filter-field">
        <mat-label>Pessoa</mat-label>
        <mat-select [ngModel]="filterThirdParty()" (ngModelChange)="filterThirdParty.set($event)"
                    (selectionChange)="loadIncomes()">
          <mat-option value="">Todos</mat-option>
          @for (tp of thirdParties(); track tp.id) {
            <mat-option [value]="tp.id">{{ tp.name }}</mat-option>
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
        <span>Total do mes:</span>
        <strong>{{ totalMonth() | currencyBrl }}</strong>
      </div>

      @if (incomes().length === 0) {
        <div class="empty-state">
          <mat-icon>account_balance_wallet</mat-icon>
          <p>Nenhuma receita encontrada para este mes.</p>
          <a mat-flat-button routerLink="/incomes/new">Adicionar receita</a>
        </div>
      } @else {
        <table mat-table [dataSource]="incomes()" class="data-table">
          <ng-container matColumnDef="date">
            <th mat-header-cell *matHeaderCellDef>Data</th>
            <td mat-cell *matCellDef="let i">{{ i.date | date: 'dd/MM/yyyy' }}</td>
          </ng-container>

          <ng-container matColumnDef="description">
            <th mat-header-cell *matHeaderCellDef>Descricao</th>
            <td mat-cell *matCellDef="let i">
              {{ i.description }}
              @if (i.is_recurring) {
                <span class="badge recurring" matTooltip="Recorrente">
                  <mat-icon inline>repeat</mat-icon>
                </span>
              }
              @if (i.third_party_name) {
                <span class="badge third-party" [matTooltip]="'Terceiro: ' + i.third_party_name">
                  <mat-icon inline>person</mat-icon> {{ i.third_party_name }}
                </span>
              }
            </td>
          </ng-container>

          <ng-container matColumnDef="category">
            <th mat-header-cell *matHeaderCellDef>Categoria</th>
            <td mat-cell *matCellDef="let i">{{ i.category_name || '—' }}</td>
          </ng-container>

          <ng-container matColumnDef="amount">
            <th mat-header-cell *matHeaderCellDef>Valor</th>
            <td mat-cell *matCellDef="let i" class="amount-cell">
              {{ i.amount | currencyBrl }}
            </td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let i">
              <a mat-icon-button [routerLink]="['/incomes', i.id, 'edit']" matTooltip="Editar">
                <mat-icon>edit</mat-icon>
              </a>
              <button mat-icon-button (click)="confirmDelete(i)" matTooltip="Excluir" color="warn">
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
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    .page-header h1 { margin: 0; font-size: 1.5rem; }
    .filters { display: flex; gap: 16px; align-items: center; flex-wrap: wrap; margin-bottom: 16px; }
    .month-selector { display: flex; align-items: center; gap: 4px; }
    .month-label { font-size: 1.1rem; font-weight: 500; min-width: 140px; text-align: center; text-transform: capitalize; }
    .filter-field { width: 180px; }
    .total-bar { display: flex; justify-content: flex-end; gap: 8px; padding: 12px 16px; background: var(--mat-sys-surface-container); border-radius: 8px; margin-bottom: 16px; }
    .data-table { width: 100%; }
    .amount-cell { font-weight: 500; white-space: nowrap; color: #2e7d32; }
    .badge { display: inline-flex; align-items: center; font-size: 0.75rem; padding: 2px 6px; border-radius: 12px; margin-left: 6px; vertical-align: middle; }
    .badge mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .recurring { background: #e8f5e9; color: #2e7d32; }
    .third-party { background: #e1bee7; color: #6a1b9a; }
    .loading { display: flex; justify-content: center; padding: 48px; }
    .empty-state { display: flex; flex-direction: column; align-items: center; padding: 48px; gap: 16px; color: var(--mat-sys-on-surface-variant); }
    .empty-state mat-icon { font-size: 48px; width: 48px; height: 48px; }
  `,
})
export class IncomeList implements OnInit {
  private readonly incomeService = inject(IncomeService);
  private readonly thirdPartyService = inject(ThirdPartyService);
  private readonly monthState = inject(MonthStateService);
  private readonly filterState = inject(FilterStateService);
  private readonly dialog = inject(MatDialog);

  incomes = signal<Income[]>([]);
  categories = signal<IncomeCategory[]>([]);
  thirdParties = signal<ThirdParty[]>([]);
  loading = signal(true);
  currentMonth = this.monthState.currentMonth;
  monthLabel = this.monthState.monthLabel;

  filterCategory = this.filterState.persistent('incomes.category', '');
  filterThirdParty = this.filterState.persistent('incomes.thirdParty', '');

  displayedColumns = ['date', 'description', 'category', 'amount', 'actions'];

  ngOnInit(): void {
    this.incomeService.listCategories().subscribe((cats) => {
      this.categories.set(cats);
      this.dropOrphanFilter(this.filterCategory, cats.map((c) => c.id));
    });
    this.thirdPartyService.list().subscribe((tps) => {
      this.thirdParties.set(tps);
      this.dropOrphanFilter(this.filterThirdParty, tps.map((t) => t.id));
    });

    this.monthState.init().then(() => this.loadIncomes());
  }

  /** Descarta filtro restaurado que aponta para um registro que não existe mais. */
  private dropOrphanFilter(filter: WritableSignal<string>, validIds: string[]): void {
    if (filter() && !validIds.includes(filter())) {
      filter.set('');
      this.loadIncomes();
    }
  }

  loadIncomes(): void {
    this.loading.set(true);
    const filters: IncomeFilters = { month: this.currentMonth(), ordering: '-date' };
    if (this.filterCategory()) filters.category = this.filterCategory();
    if (this.filterThirdParty()) filters.third_party = this.filterThirdParty();

    this.incomeService.list(filters).subscribe({
      next: (incomes) => { this.incomes.set(incomes); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  totalMonth(): number {
    return this.incomes().reduce((sum, i) => sum + parseFloat(String(i.amount)), 0);
  }

  prevMonth(): void {
    this.monthState.prevMonth();
    this.loadIncomes();
  }

  nextMonth(): void {
    this.monthState.nextMonth();
    this.loadIncomes();
  }

  confirmDelete(income: Income): void {
    const ref = this.dialog.open(ConfirmDialog, {
      data: { title: 'Excluir Receita', message: `Deseja excluir "${income.description}"?`, confirmText: 'Excluir' } as ConfirmDialogData,
    });
    ref.afterClosed().subscribe((confirmed) => {
      if (confirmed) this.incomeService.delete(income.id).subscribe(() => this.loadIncomes());
    });
  }
}
