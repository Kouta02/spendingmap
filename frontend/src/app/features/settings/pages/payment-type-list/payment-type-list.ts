import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';

import { PaymentTypeService } from '../../../../core/services/payment-type.service';
import { PaymentType } from '../../../../core/models';
import {
  ConfirmDialog,
  ConfirmDialogData,
} from '../../../../shared/components/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-payment-type-list',
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
      <h2>Tipos de Pagamento</h2>
      <a mat-fab extended routerLink="/settings/payment-types/new">
        <mat-icon>add</mat-icon>
        Novo Tipo
      </a>
    </div>

    @if (loading()) {
      <div class="loading">
        <mat-spinner diameter="40" />
      </div>
    } @else if (paymentTypes().length === 0) {
      <div class="empty-state">
        <mat-icon>payments</mat-icon>
        <p>Nenhum tipo de pagamento cadastrado.</p>
        <a mat-flat-button routerLink="/settings/payment-types/new">Criar tipo</a>
      </div>
    } @else {
      <table mat-table [dataSource]="paymentTypes()" class="data-table">
        <ng-container matColumnDef="icon">
          <th mat-header-cell *matHeaderCellDef>Icone</th>
          <td mat-cell *matCellDef="let pt">
            @if (pt.icon) {
              <mat-icon>{{ pt.icon }}</mat-icon>
            }
          </td>
        </ng-container>

        <ng-container matColumnDef="name">
          <th mat-header-cell *matHeaderCellDef>Nome</th>
          <td mat-cell *matCellDef="let pt">{{ pt.name }}</td>
        </ng-container>

        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef></th>
          <td mat-cell *matCellDef="let pt">
            <a
              mat-icon-button
              [routerLink]="['/settings/payment-types', pt.id, 'edit']"
              matTooltip="Editar"
            >
              <mat-icon>edit</mat-icon>
            </a>
            <button
              mat-icon-button
              (click)="confirmDelete(pt)"
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
export class PaymentTypeList implements OnInit {
  private readonly paymentTypeService = inject(PaymentTypeService);
  private readonly dialog = inject(MatDialog);

  paymentTypes = signal<PaymentType[]>([]);
  loading = signal(true);
  displayedColumns = ['icon', 'name', 'actions'];

  ngOnInit(): void {
    this.loadPaymentTypes();
  }

  loadPaymentTypes(): void {
    this.loading.set(true);
    this.paymentTypeService.list().subscribe({
      next: (pts) => {
        this.paymentTypes.set(pts);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  confirmDelete(pt: PaymentType): void {
    const ref = this.dialog.open(ConfirmDialog, {
      data: {
        title: 'Excluir Tipo de Pagamento',
        message: `Deseja excluir "${pt.name}"?`,
        confirmText: 'Excluir',
      } as ConfirmDialogData,
    });

    ref.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.paymentTypeService.delete(pt.id).subscribe(() => {
          this.loadPaymentTypes();
        });
      }
    });
  }
}
