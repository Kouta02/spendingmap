import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';

import { FinancialCalendarService } from '../../../../core/services/financial-calendar.service';
import { CreditCard } from '../../../../core/models';
import {
  ConfirmDialog,
  ConfirmDialogData,
} from '../../../../shared/components/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-credit-card-list',
  standalone: true,
  imports: [
    RouterLink,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="page-header">
      <h2>Cartoes de Credito</h2>
      <a mat-fab extended routerLink="/settings/credit-cards/new">
        <mat-icon>add</mat-icon>
        Novo Cartao
      </a>
    </div>

    @if (loading()) {
      <div class="loading">
        <mat-spinner diameter="40" />
      </div>
    } @else if (cards().length === 0) {
      <div class="empty-state">
        <mat-icon>credit_card</mat-icon>
        <p>Nenhum cartao cadastrado.</p>
        <a mat-flat-button routerLink="/settings/credit-cards/new">Cadastrar cartao</a>
      </div>
    } @else {
      <table mat-table [dataSource]="cards()" class="data-table">
        <ng-container matColumnDef="name">
          <th mat-header-cell *matHeaderCellDef>Nome</th>
          <td mat-cell *matCellDef="let c">{{ c.name }}</td>
        </ng-container>

        <ng-container matColumnDef="closing_day">
          <th mat-header-cell *matHeaderCellDef>Fechamento</th>
          <td mat-cell *matCellDef="let c">Dia {{ c.closing_day }}</td>
        </ng-container>

        <ng-container matColumnDef="due_day">
          <th mat-header-cell *matHeaderCellDef>Vencimento</th>
          <td mat-cell *matCellDef="let c">Dia {{ c.due_day }}</td>
        </ng-container>

        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef></th>
          <td mat-cell *matCellDef="let c">
            <a
              mat-icon-button
              [routerLink]="['/settings/credit-cards', c.id, 'edit']"
              matTooltip="Editar"
            >
              <mat-icon>edit</mat-icon>
            </a>
            <button
              mat-icon-button
              (click)="confirmDelete(c)"
              matTooltip="Excluir"
              color="warn"
            >
              <mat-icon>delete</mat-icon>
            </button>
          </td>
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
      margin-bottom: 24px;
    }
    .page-header h2 { margin: 0; font-size: 1.25rem; }
    .data-table { width: 100%; }
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
export class CreditCardList implements OnInit {
  private readonly service = inject(FinancialCalendarService);
  private readonly dialog = inject(MatDialog);

  cards = signal<CreditCard[]>([]);
  loading = signal(true);
  displayedColumns = ['name', 'closing_day', 'due_day', 'actions'];

  ngOnInit(): void {
    this.loadCards();
  }

  loadCards(): void {
    this.loading.set(true);
    this.service.listCreditCards().subscribe({
      next: (cards) => {
        this.cards.set(cards);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  confirmDelete(card: CreditCard): void {
    const ref = this.dialog.open(ConfirmDialog, {
      data: {
        title: 'Excluir Cartao',
        message: `Deseja excluir "${card.name}"?`,
        confirmText: 'Excluir',
      } as ConfirmDialogData,
    });

    ref.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.service.deleteCreditCard(card.id).subscribe(() => {
          this.loadCards();
        });
      }
    });
  }
}
