import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';

import { BankService } from '../../../../core/services/bank.service';
import { Bank } from '../../../../core/models';
import {
  ConfirmDialog,
  ConfirmDialogData,
} from '../../../../shared/components/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-bank-list',
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
      <h1>Bancos</h1>
      <a mat-fab extended routerLink="/banks/new">
        <mat-icon>add</mat-icon>
        Novo Banco
      </a>
    </div>

    @if (loading()) {
      <div class="loading">
        <mat-spinner diameter="40" />
      </div>
    } @else if (banks().length === 0) {
      <div class="empty-state">
        <mat-icon>account_balance</mat-icon>
        <p>Nenhum banco cadastrado.</p>
        <a mat-flat-button routerLink="/banks/new">Criar banco</a>
      </div>
    } @else {
      <table mat-table [dataSource]="banks()" class="data-table">
        <ng-container matColumnDef="color">
          <th mat-header-cell *matHeaderCellDef>Cor</th>
          <td mat-cell *matCellDef="let b">
            <span
              class="color-dot"
              [style.background-color]="b.color || '#ccc'"
            ></span>
          </td>
        </ng-container>

        <ng-container matColumnDef="name">
          <th mat-header-cell *matHeaderCellDef>Nome</th>
          <td mat-cell *matCellDef="let b">{{ b.name }}</td>
        </ng-container>

        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef></th>
          <td mat-cell *matCellDef="let b">
            <a
              mat-icon-button
              [routerLink]="['/banks', b.id, 'edit']"
              matTooltip="Editar"
            >
              <mat-icon>edit</mat-icon>
            </a>
            <button
              mat-icon-button
              (click)="confirmDelete(b)"
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
    .page-header h1 { margin: 0; font-size: 1.5rem; }
    .data-table { width: 100%; }
    .color-dot {
      display: inline-block;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      border: 1px solid rgba(0,0,0,0.12);
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
export class BankList implements OnInit {
  private readonly bankService = inject(BankService);
  private readonly dialog = inject(MatDialog);

  banks = signal<Bank[]>([]);
  loading = signal(true);
  displayedColumns = ['color', 'name', 'actions'];

  ngOnInit(): void {
    this.loadBanks();
  }

  loadBanks(): void {
    this.loading.set(true);
    this.bankService.list().subscribe({
      next: (banks) => {
        this.banks.set(banks);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  confirmDelete(bank: Bank): void {
    const ref = this.dialog.open(ConfirmDialog, {
      data: {
        title: 'Excluir Banco',
        message: `Deseja excluir "${bank.name}"?`,
        confirmText: 'Excluir',
      } as ConfirmDialogData,
    });

    ref.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.bankService.delete(bank.id).subscribe(() => {
          this.loadBanks();
        });
      }
    });
  }
}
