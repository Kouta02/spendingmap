import { Component, OnInit, HostListener, inject, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
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
import { ExpenseService } from '../../../../core/services/expense.service';
import { CategoryService } from '../../../../core/services/category.service';
import { PaymentTypeService } from '../../../../core/services/payment-type.service';
import { ThirdPartyService } from '../../../../core/services/third-party.service';
import { FinancialCalendarService } from '../../../../core/services/financial-calendar.service';
import { MonthStateService } from '../../../../core/services/month-state.service';
import { Expense, ExpenseFilters, CategoryFlat, PaymentType, ThirdParty } from '../../../../core/models';
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

interface ColumnFilter {
  search: string;
  selected: string[] | null;
}

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
        <mat-label>Pessoa</mat-label>
        <mat-select [(ngModel)]="filterThirdParty" (selectionChange)="loadExpenses()">
          <mat-option value="">Todos</mat-option>
          @for (tp of thirdParties(); track tp.id) {
            <mat-option [value]="tp.id">{{ tp.name }}</mat-option>
          }
        </mat-select>
      </mat-form-field>

      <mat-form-field appearance="outline" class="filter-field">
        <mat-label>Cartão</mat-label>
        <mat-select [(ngModel)]="filterCreditCard" (selectionChange)="loadExpenses()">
          <mat-option value="">Todos</mat-option>
          @for (card of creditCards(); track card.id) {
            <mat-option [value]="card.id">{{ card.name }}</mat-option>
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

      <mat-form-field appearance="outline" class="filter-field">
        <mat-label>Agrupar por</mat-label>
        <mat-select [ngModel]="groupBy()" (ngModelChange)="onGroupByChange($event)">
          <mat-option value="">Nenhum</mat-option>
          <mat-option value="date">Data</mat-option>
          <mat-option value="category">Categoria</mat-option>
          <mat-option value="payment_type">Pagamento</mat-option>
        </mat-select>
      </mat-form-field>
    </div>

    @if (loading()) {
      <div class="loading">
        <mat-spinner diameter="40" />
      </div>
    } @else {
      <div class="total-bar">
        @if (hasActiveColumnFilters()) {
          <span>Total filtrado:</span>
        } @else {
          <span>Total do mês:</span>
        }
        <strong>{{ totalMonth() | currencyBrl }}</strong>
      </div>

      @if (expenses().length === 0) {
        <div class="empty-state">
          <mat-icon>receipt_long</mat-icon>
          <p>Nenhuma despesa encontrada para este mês.</p>
          <a mat-flat-button routerLink="/expenses/new">Adicionar despesa</a>
        </div>
      } @else {
        <table mat-table [dataSource]="tableDataSource()" class="expense-table">
          <ng-container matColumnDef="date">
            <th mat-header-cell *matHeaderCellDef (click)="toggleSort('date')"
                [class.th-sorted]="sortColumn() === 'date'" class="th-sortable">
              <div class="th-filter">
                Data
                @if (sortColumn() === 'date') {
                  <mat-icon class="sort-icon">{{ sortDir() === 'asc' ? 'arrow_upward' : 'arrow_downward' }}</mat-icon>
                }
                <button class="col-filter-btn"
                        [class.col-filter-active]="isColumnFilterActive('date')"
                        (click)="openFilter('date', $event)">▾</button>
              </div>
            </th>
            <td mat-cell *matCellDef="let e">
              @if (e._isGroup) {
                @if (groupBy() === 'date') {
                  <strong>{{ e._groupLabel }}</strong>
                }
              } @else {
                {{ e.date | date: 'dd/MM/yyyy' }}
              }
            </td>
          </ng-container>

          <ng-container matColumnDef="description">
            <th mat-header-cell *matHeaderCellDef (click)="toggleSort('description')"
                [class.th-sorted]="sortColumn() === 'description'" class="th-sortable">
              <div class="th-filter">
                Descrição
                @if (sortColumn() === 'description') {
                  <mat-icon class="sort-icon">{{ sortDir() === 'asc' ? 'arrow_upward' : 'arrow_downward' }}</mat-icon>
                }
                <button class="col-filter-btn"
                        [class.col-filter-active]="isColumnFilterActive('description')"
                        (click)="openFilter('description', $event)">▾</button>
              </div>
            </th>
            <td mat-cell *matCellDef="let e">
              @if (e._isGroup) {
                <span class="group-count">{{ e._count }} despesa{{ e._count > 1 ? 's' : '' }}</span>
              } @else {
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
                @if (e.third_party_name) {
                  <span class="badge third-party" [matTooltip]="'Terceiro: ' + e.third_party_name">
                    <mat-icon inline>person</mat-icon> {{ e.third_party_name }}
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
              }
            </td>
          </ng-container>

          <ng-container matColumnDef="category">
            <th mat-header-cell *matHeaderCellDef (click)="toggleSort('category')"
                [class.th-sorted]="sortColumn() === 'category'" class="th-sortable">
              <div class="th-filter">
                Categoria
                @if (sortColumn() === 'category') {
                  <mat-icon class="sort-icon">{{ sortDir() === 'asc' ? 'arrow_upward' : 'arrow_downward' }}</mat-icon>
                }
                <button class="col-filter-btn"
                        [class.col-filter-active]="isColumnFilterActive('category')"
                        (click)="openFilter('category', $event)">▾</button>
              </div>
            </th>
            <td mat-cell *matCellDef="let e">
              @if (e._isGroup) {
                @if (groupBy() === 'category') {
                  <strong>{{ e._groupLabel }}</strong>
                } @else {
                  <span class="group-summary">{{ e._distinctCategories }} categoria{{ e._distinctCategories > 1 ? 's' : '' }}</span>
                }
              } @else {
                @if (e.category_name) {
                  <span class="category-chip" [style.border-left-color]="getCategoryColor(e.category)">
                    {{ e.category_name }}
                  </span>
                } @else {
                  <span class="text-muted">—</span>
                }
              }
            </td>
          </ng-container>

          <ng-container matColumnDef="payment_type">
            <th mat-header-cell *matHeaderCellDef (click)="toggleSort('payment_type')"
                [class.th-sorted]="sortColumn() === 'payment_type'" class="th-sortable">
              <div class="th-filter">
                Pagamento
                @if (sortColumn() === 'payment_type') {
                  <mat-icon class="sort-icon">{{ sortDir() === 'asc' ? 'arrow_upward' : 'arrow_downward' }}</mat-icon>
                }
                <button class="col-filter-btn"
                        [class.col-filter-active]="isColumnFilterActive('payment_type')"
                        (click)="openFilter('payment_type', $event)">▾</button>
              </div>
            </th>
            <td mat-cell *matCellDef="let e">
              @if (e._isGroup) {
                @if (groupBy() === 'payment_type') {
                  <strong>{{ e._groupLabel }}</strong>
                } @else {
                  <span class="group-summary">{{ e._distinctPaymentTypes }} tipo{{ e._distinctPaymentTypes > 1 ? 's' : '' }}</span>
                }
              } @else {
                {{ e.credit_card_name ? e.payment_type_name + ' - ' + e.credit_card_name : (e.payment_type_name || '—') }}
              }
            </td>
          </ng-container>

          <ng-container matColumnDef="amount">
            <th mat-header-cell *matHeaderCellDef (click)="toggleSort('amount')"
                [class.th-sorted]="sortColumn() === 'amount'" class="th-sortable">
              <div class="th-filter">
                Valor
                @if (sortColumn() === 'amount') {
                  <mat-icon class="sort-icon">{{ sortDir() === 'asc' ? 'arrow_upward' : 'arrow_downward' }}</mat-icon>
                }
              </div>
            </th>
            <td mat-cell *matCellDef="let e" class="amount-cell">
              @if (e._isGroup) {
                <strong>{{ e._totalAmount | currencyBrl }}</strong>
              } @else {
                {{ e.amount | currencyBrl }}
              }
            </td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let e">
              @if (e._isGroup) {
                <button mat-icon-button (click)="toggleGroup(e._groupKey)" [matTooltip]="isGroupExpanded(e._groupKey) ? 'Recolher' : 'Expandir'">
                  <mat-icon>{{ isGroupExpanded(e._groupKey) ? 'remove' : 'add' }}</mat-icon>
                </button>
              } @else if (!e.is_predicted) {
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
          <tr mat-row *matRowDef="let row; columns: displayedColumns"
              [class.predicted-row]="row.is_predicted"
              [class.group-row]="row._isGroup"
              [class.group-child-row]="row._isChild"></tr>
        </table>
      }
    }

    <!-- Painel de filtro por coluna (overlay) -->
    @if (activeFilterColumn()) {
      <div class="fp-backdrop" (click)="closeFilter()"></div>
      <div class="fp-panel"
           [style.top.px]="filterPanelPos().top"
           [style.left.px]="filterPanelPos().left"
           (click)="$event.stopPropagation()">

        <div class="fp-header">
          <strong>{{ columnLabels[activeFilterColumn()!] }}</strong>
          <button class="fp-close" (click)="closeFilter()">✕</button>
        </div>

        <div class="fp-section">
          <div class="fp-section-label">Classificar por:</div>
          <div class="fp-sort-row">
            <button class="fp-btn"
                    [class.fp-btn-active]="sortColumn() === activeFilterColumn() && sortDir() === 'asc'"
                    (click)="sortBy(activeFilterColumn()!, 'asc')">Crescente</button>
            <button class="fp-btn"
                    [class.fp-btn-active]="sortColumn() === activeFilterColumn() && sortDir() === 'desc'"
                    (click)="sortBy(activeFilterColumn()!, 'desc')">Decrescente</button>
          </div>
        </div>

        <div class="fp-section">
          <div class="fp-section-label">Filtro:</div>
          <input class="fp-input"
                 placeholder="Pesquisar (nesta coluna)"
                 [value]="getFilterSearch(activeFilterColumn()!)"
                 (input)="setFilterSearch(activeFilterColumn()!, $any($event.target).value)">
        </div>

        <div class="fp-section">
          <div class="fp-section-label">Valores:</div>
          <label class="fp-value-row">
            <input type="checkbox"
                   [checked]="isAllSelected(activeFilterColumn()!)"
                   (click)="$event.preventDefault(); toggleAll(activeFilterColumn()!)">
            <span>(Selecionar tudo)</span>
          </label>
          <div class="fp-values-list">
            @for (opt of filteredDistinctValues(); track opt.value) {
              <label class="fp-value-row">
                <input type="checkbox"
                       [checked]="isValueSelected(activeFilterColumn()!, opt.value)"
                       (click)="$event.preventDefault(); toggleValue(activeFilterColumn()!, opt.value)">
                <span>{{ opt.label }}</span>
              </label>
            }
            @if (filteredDistinctValues().length === 0) {
              <div class="fp-empty">Nenhum valor encontrado.</div>
            }
          </div>
        </div>

        <div class="fp-actions">
          <button class="fp-btn" (click)="clearColumnFilter(activeFilterColumn()!)">Limpar filtro</button>
        </div>
      </div>
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
      width: 160px;
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
    .third-party {
      background: #e1bee7;
      color: #6a1b9a;
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
    .category-chip {
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

    /* ========== Agrupamento ========== */
    .group-row {
      background: var(--mat-sys-surface-container);
      font-weight: 500;
    }
    .group-row:hover {
      background: var(--mat-sys-surface-container-high) !important;
    }
    .group-child-row {
      background: var(--mat-sys-surface-container-lowest);
    }
    .group-count {
      font-weight: 500;
      color: var(--mat-sys-on-surface-variant);
    }
    .group-summary {
      font-size: 0.85rem;
      color: var(--mat-sys-on-surface-variant);
    }

    /* ========== Ordenação por coluna ========== */
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

    /* ========== Filtro por coluna (estilo Excel) ========== */
    .th-filter {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .col-filter-btn {
      border: 0;
      background: transparent;
      cursor: pointer;
      padding: 0;
      font-size: 12px;
      line-height: 18px;
      width: 18px;
      height: 18px;
      opacity: 0.6;
      border-radius: 4px;
      transition: opacity 0.15s, background 0.15s;
    }
    .col-filter-btn:hover {
      opacity: 1;
      background: rgba(0, 0, 0, 0.06);
    }
    .col-filter-btn.col-filter-active {
      opacity: 1;
      font-weight: 700;
      color: #1565c0;
    }

    /* Backdrop */
    .fp-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 999;
    }

    /* Painel */
    .fp-panel {
      position: fixed;
      z-index: 1000;
      min-width: 280px;
      max-width: 340px;
      max-height: 460px;
      overflow: auto;
      background: #fff;
      border: 1px solid rgba(0, 0, 0, 0.15);
      border-radius: 10px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
      padding: 12px;
    }
    .fp-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 8px;
      font-size: 13px;
    }
    .fp-close {
      border: 0;
      background: transparent;
      cursor: pointer;
      font-size: 14px;
      opacity: 0.7;
      padding: 2px 4px;
      border-radius: 4px;
    }
    .fp-close:hover {
      opacity: 1;
      background: rgba(0, 0, 0, 0.06);
    }
    .fp-section {
      border-top: 1px solid rgba(0, 0, 0, 0.08);
      padding-top: 8px;
      margin-top: 8px;
    }
    .fp-section-label {
      font-size: 12px;
      opacity: 0.85;
      margin-bottom: 6px;
    }
    .fp-sort-row {
      display: flex;
      gap: 8px;
    }
    .fp-btn {
      padding: 7px 10px;
      border-radius: 8px;
      border: 1px solid rgba(0, 0, 0, 0.15);
      background: #f7f7f7;
      cursor: pointer;
      font-size: 12px;
      transition: background 0.15s, border-color 0.15s;
    }
    .fp-btn:hover {
      background: #efefef;
    }
    .fp-btn-active {
      background: #e9f2ff;
      border-color: #9ac2ff;
      font-weight: 700;
    }
    .fp-input {
      width: 100%;
      box-sizing: border-box;
      padding: 8px 10px;
      border-radius: 8px;
      border: 1px solid rgba(0, 0, 0, 0.15);
      outline: none;
      font-size: 13px;
    }
    .fp-input:focus {
      border-color: #9ac2ff;
    }
    .fp-value-row {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 5px 2px;
      cursor: pointer;
      user-select: none;
      font-size: 13px;
    }
    .fp-value-row:hover {
      background: rgba(0, 0, 0, 0.03);
      border-radius: 4px;
    }
    .fp-values-list {
      max-height: 200px;
      overflow-y: auto;
      margin-top: 6px;
      padding-top: 6px;
      border-top: 1px dashed rgba(0, 0, 0, 0.12);
    }
    .fp-empty {
      font-size: 12px;
      opacity: 0.7;
      padding: 6px 2px;
    }
    .fp-actions {
      border-top: 1px solid rgba(0, 0, 0, 0.08);
      padding-top: 10px;
      margin-top: 10px;
      display: flex;
      justify-content: flex-end;
    }
  `,
})
export class ExpenseList implements OnInit {
  private readonly expenseService = inject(ExpenseService);
  private readonly categoryService = inject(CategoryService);
  private readonly paymentTypeService = inject(PaymentTypeService);
  private readonly thirdPartyService = inject(ThirdPartyService);
  private readonly financialCalendarService = inject(FinancialCalendarService);
  private readonly monthState = inject(MonthStateService);
  private readonly dialog = inject(MatDialog);

  expenses = signal<Expense[]>([]);
  categories = signal<CategoryFlat[]>([]);
  paymentTypes = signal<PaymentType[]>([]);
  thirdParties = signal<ThirdParty[]>([]);
  creditCards = signal<{ id: string; name: string }[]>([]);

  categoryGroups = computed(() => {
    const cats = this.categories();
    const roots = cats.filter((c) => !c.parent);
    return roots.map((root) => {
      const children = cats.filter((c) => c.parent === root.id);
      return { root, children };
    });
  });
  loading = signal(true);
  currentMonth = this.monthState.currentMonth;
  monthLabel = this.monthState.monthLabel;

  filterCategory = '';
  filterThirdParty = '';
  filterCreditCard = '';
  filterPaymentType = '';
  groupBy = signal('');
  expandedGroups = signal<Set<string>>(new Set());

  displayedColumns = [
    'date',
    'description',
    'category',
    'payment_type',
    'amount',
    'actions',
  ];

  // ========== Filtro por coluna (estilo Excel) ==========

  readonly columnLabels: Record<string, string> = {
    date: 'Data',
    description: 'Descrição',
    category: 'Categoria',
    payment_type: 'Pagamento',
  };

  activeFilterColumn = signal<string | null>(null);
  filterPanelPos = signal({ top: 0, left: 0 });
  sortColumn = signal<string | null>(null);
  sortDir = signal<'asc' | 'desc'>('asc');
  columnFilters = signal<Record<string, ColumnFilter>>({});

  distinctValues = computed(() => {
    const expenses = this.expenses();
    const result: Record<string, { value: string; label: string }[]> = {};

    for (const col of Object.keys(this.columnLabels)) {
      const map = new Map<string, string>();
      for (const e of expenses) {
        const value = this.getColumnValue(e, col);
        const label = this.getColumnDisplayLabel(e, col);
        if (value && !map.has(value)) map.set(value, label);
      }
      const arr = Array.from(map.entries()).map(([v, l]) => ({ value: v, label: l }));
      if (col === 'date') {
        arr.sort((a, b) => a.value.localeCompare(b.value));
      } else {
        arr.sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
      }
      result[col] = arr;
    }

    return result;
  });

  filteredDistinctValues = computed(() => {
    const col = this.activeFilterColumn();
    if (!col) return [];
    const all = this.distinctValues()[col] || [];
    const search = (this.columnFilters()[col]?.search || '').trim().toLowerCase();
    if (!search) return all;
    return all.filter((opt) => opt.label.toLowerCase().includes(search));
  });

  filteredExpenses = computed(() => {
    let result = this.expenses();
    const filters = this.columnFilters();

    for (const [col, f] of Object.entries(filters)) {
      if (f.selected !== null && f.selected.length > 0) {
        const selectedSet = new Set(f.selected);
        result = result.filter((e) => selectedSet.has(this.getColumnValue(e, col)));
      }
      const needle = f.search.trim().toLowerCase();
      if (needle) {
        result = result.filter((e) => this.getColumnValue(e, col).toLowerCase().includes(needle));
      }
    }

    const sortCol = this.sortColumn();
    const dir = this.sortDir();
    if (sortCol) {
      result = [...result].sort((a, b) => {
        if (sortCol === 'amount') {
          const na = parseFloat(String(a.amount));
          const nb = parseFloat(String(b.amount));
          return dir === 'asc' ? na - nb : nb - na;
        }
        const va = this.getColumnValue(a, sortCol);
        const vb = this.getColumnValue(b, sortCol);
        if (sortCol === 'date') {
          return dir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
        }
        const cmp = va.localeCompare(vb, 'pt-BR', { sensitivity: 'base' });
        return dir === 'asc' ? cmp : -cmp;
      });
    }

    return result;
  });

  tableDataSource = computed(() => {
    const expenses = this.filteredExpenses();
    const gb = this.groupBy();
    if (!gb) return expenses;

    const groups = new Map<string, any[]>();
    for (const e of expenses) {
      let key: string;
      if (gb === 'date') key = e.date;
      else if (gb === 'category') key = e.category_name || '(sem categoria)';
      else key = e.credit_card_name
        ? (e.payment_type_name || '—') + ' - ' + e.credit_card_name
        : (e.payment_type_name || '—');

      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(e);
    }

    const expanded = this.expandedGroups();
    const rows: any[] = [];

    for (const [key, items] of groups) {
      let label = key;
      if (gb === 'date') {
        const [y, m, d] = key.split('-');
        label = `${d}/${m}/${y}`;
      }

      const distinctCategories = new Set(items.map((e: any) => e.category_name || '(sem categoria)')).size;
      const distinctPaymentTypes = new Set(items.map((e: any) =>
        e.credit_card_name ? (e.payment_type_name || '—') + ' - ' + e.credit_card_name : (e.payment_type_name || '—')
      )).size;
      const totalAmount = items.reduce((sum: number, e: any) => sum + parseFloat(String(e.amount)), 0);

      rows.push({
        _isGroup: true,
        _groupKey: key,
        _groupLabel: label,
        _count: items.length,
        _totalAmount: totalAmount,
        _distinctCategories: distinctCategories,
        _distinctPaymentTypes: distinctPaymentTypes,
      });

      if (expanded.has(key)) {
        for (const item of items) {
          rows.push({ ...item, _isChild: true });
        }
      }
    }

    return rows;
  });

  toggleGroup(key: string): void {
    const current = new Set(this.expandedGroups());
    if (current.has(key)) current.delete(key);
    else current.add(key);
    this.expandedGroups.set(current);
  }

  isGroupExpanded(key: string): boolean {
    return this.expandedGroups().has(key);
  }

  onGroupByChange(value: string): void {
    this.groupBy.set(value);
    this.expandedGroups.set(new Set());
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.activeFilterColumn()) this.closeFilter();
  }

  openFilter(column: string, event: MouseEvent): void {
    event.stopPropagation();
    event.preventDefault();

    if (this.activeFilterColumn() === column) {
      this.closeFilter();
      return;
    }

    const btn = event.target as HTMLElement;
    const rect = btn.getBoundingClientRect();
    const panelWidth = 310;
    let left = rect.right - panelWidth;
    if (left < 8) left = 8;
    if (left + panelWidth > window.innerWidth - 8) left = window.innerWidth - panelWidth - 8;

    let top = rect.bottom + 6;
    if (top + 400 > window.innerHeight) {
      top = rect.top - 400 - 6;
      if (top < 8) top = 8;
    }

    this.filterPanelPos.set({ top, left });
    this.activeFilterColumn.set(column);
  }

  closeFilter(): void {
    this.activeFilterColumn.set(null);
  }

  sortBy(column: string, dir: 'asc' | 'desc'): void {
    this.sortColumn.set(column);
    this.sortDir.set(dir);
    this.closeFilter();
  }

  toggleSort(column: string): void {
    if (this.sortColumn() === column) {
      if (this.sortDir() === 'asc') {
        this.sortDir.set('desc');
      } else {
        this.sortColumn.set(null);
      }
    } else {
      this.sortColumn.set(column);
      this.sortDir.set('asc');
    }
  }

  getFilterSearch(column: string): string {
    return this.columnFilters()[column]?.search || '';
  }

  setFilterSearch(column: string, text: string): void {
    const current = { ...this.columnFilters() };
    const existing = current[column] || { search: '', selected: null };
    current[column] = { ...existing, search: text };
    this.columnFilters.set(current);
  }

  isAllSelected(column: string): boolean {
    return this.columnFilters()[column]?.selected === null || this.columnFilters()[column]?.selected === undefined;
  }

  isValueSelected(column: string, value: string): boolean {
    const f = this.columnFilters()[column];
    if (!f || f.selected === null) return true;
    return f.selected.includes(value);
  }

  toggleAll(column: string): void {
    const current = { ...this.columnFilters() };
    const existing = current[column] || { search: '', selected: null };
    current[column] = { ...existing, selected: null };
    this.columnFilters.set(current);
  }

  toggleValue(column: string, value: string): void {
    const current = { ...this.columnFilters() };
    const existing = current[column] || { search: '', selected: null };

    if (existing.selected === null) {
      current[column] = { ...existing, selected: [value] };
    } else {
      const set = new Set(existing.selected);
      if (set.has(value)) {
        set.delete(value);
      } else {
        set.add(value);
      }
      const next = Array.from(set);
      current[column] = { ...existing, selected: next.length > 0 ? next : null };
    }

    this.columnFilters.set(current);
  }

  clearColumnFilter(column: string): void {
    const current = { ...this.columnFilters() };
    delete current[column];
    this.columnFilters.set(current);
    if (this.sortColumn() === column) {
      this.sortColumn.set(null);
    }
    this.closeFilter();
  }

  isColumnFilterActive(column: string): boolean {
    const f = this.columnFilters()[column];
    if (!f) return false;
    return f.search.trim() !== '' || f.selected !== null;
  }

  hasActiveColumnFilters(): boolean {
    return Object.keys(this.columnFilters()).some((col) => this.isColumnFilterActive(col));
  }

  private getColumnValue(e: Expense, column: string): string {
    switch (column) {
      case 'date':
        return e.date;
      case 'description':
        return e.description;
      case 'category':
        return e.category_name || '';
      case 'payment_type':
        return e.credit_card_name
          ? (e.payment_type_name || '') + ' - ' + e.credit_card_name
          : (e.payment_type_name || '');
      default:
        return '';
    }
  }

  private getColumnDisplayLabel(e: Expense, column: string): string {
    switch (column) {
      case 'date':
        const parts = e.date.split('-');
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      case 'description':
        return e.description;
      case 'category':
        return e.category_name || '(sem categoria)';
      case 'payment_type':
        return e.credit_card_name
          ? (e.payment_type_name || '—') + ' - ' + e.credit_card_name
          : (e.payment_type_name || '—');
      default:
        return '';
    }
  }

  // ========== Funcionalidades existentes ==========

  ngOnInit(): void {
    this.categoryService.flat().subscribe((cats) => this.categories.set(cats));
    this.paymentTypeService.list().subscribe((pts) => this.paymentTypes.set(pts));
    this.thirdPartyService.list().subscribe((tps) => this.thirdParties.set(tps));
    this.financialCalendarService.listCreditCards().subscribe((cards) =>
      this.creditCards.set(cards.map((c) => ({ id: c.id, name: c.name })))
    );

    this.monthState.init().then(() => this.loadExpenses());
  }

  loadExpenses(): void {
    this.loading.set(true);
    this.columnFilters.set({});
    this.sortColumn.set(null);
    this.closeFilter();

    const filters: ExpenseFilters = {
      month: this.currentMonth(),
      ordering: '-date',
    };
    if (this.filterCategory) filters.category = this.filterCategory;
    if (this.filterThirdParty) filters.third_party = this.filterThirdParty;
    if (this.filterCreditCard) filters.credit_card = this.filterCreditCard;
    if (this.filterPaymentType) filters.payment_type = this.filterPaymentType;

    this.expenseService.list(filters).subscribe({
      next: (expenses) => {
        this.expenses.set(expenses);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  totalMonth(): number {
    return this.filteredExpenses().reduce(
      (sum, e) => sum + parseFloat(String(e.amount)),
      0
    );
  }

  prevMonth(): void {
    this.monthState.prevMonth();
    this.loadExpenses();
  }

  nextMonth(): void {
    this.monthState.nextMonth();
    this.loadExpenses();
  }

  getCategoryColor(categoryId: string | null): string {
    if (!categoryId) return '#ccc';
    return (
      this.categories().find((c) => c.id === categoryId)?.color || '#ccc'
    );
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
    if (expense.is_installment && expense.installment_group_id) {
      this.confirmDeleteInstallment(expense);
      return;
    }

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

  private confirmDeleteInstallment(expense: Expense): void {
    // Contar parcelas a partir do mês selecionado
    const currentMonth = this.currentMonth();

    this.expenseService.list({ month: currentMonth, ordering: 'date' }).subscribe((all) => {
      const groupExpenses = all.filter(e =>
        e.installment_group_id === expense.installment_group_id
      );
      // Parcela atual é 1 das do mês; total do grupo a partir deste mês obtemos via contagem
      const parcela = expense.installment_current || 1;
      const total = expense.installment_total || 1;
      const restantes = total - parcela + 1;

      const ref = this.dialog.open(ConfirmDialog, {
        data: {
          title: 'Excluir Parcelas',
          message: `Deseja excluir todas as ${restantes} parcelas restantes de "${expense.description}" (${parcela}/${total} a ${total}/${total})?`,
          confirmText: `Excluir ${restantes} parcelas`,
        } as ConfirmDialogData,
      });

      ref.afterClosed().subscribe((confirmed) => {
        if (confirmed) {
          this.expenseService.deleteInstallments(expense.id, currentMonth).subscribe(() => {
            this.loadExpenses();
          });
        }
      });
    });
  }
}
