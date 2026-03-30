import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';

import { ThirdPartyService } from '../../../../core/services/third-party.service';
import { ThirdParty } from '../../../../core/models';
import {
  ConfirmDialog,
  ConfirmDialogData,
} from '../../../../shared/components/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-third-party-list',
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
      <h1>Terceiros</h1>
      <a mat-fab extended routerLink="/settings/third-parties/new">
        <mat-icon>add</mat-icon>
        Novo Terceiro
      </a>
    </div>

    @if (loading()) {
      <div class="loading">
        <mat-spinner diameter="40" />
      </div>
    } @else if (thirdParties().length === 0) {
      <div class="empty-state">
        <mat-icon>people</mat-icon>
        <p>Nenhum terceiro cadastrado.</p>
        <a mat-flat-button routerLink="/settings/third-parties/new">Cadastrar terceiro</a>
      </div>
    } @else {
      <table mat-table [dataSource]="thirdParties()" class="data-table">
        <ng-container matColumnDef="name">
          <th mat-header-cell *matHeaderCellDef>Nome</th>
          <td mat-cell *matCellDef="let tp">{{ tp.name }}</td>
        </ng-container>

        <ng-container matColumnDef="relationship">
          <th mat-header-cell *matHeaderCellDef>Parentesco/Relação</th>
          <td mat-cell *matCellDef="let tp">{{ tp.relationship || '—' }}</td>
        </ng-container>

        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef></th>
          <td mat-cell *matCellDef="let tp">
            <a
              mat-icon-button
              [routerLink]="['/settings/third-parties', tp.id, 'edit']"
              matTooltip="Editar"
            >
              <mat-icon>edit</mat-icon>
            </a>
            <button
              mat-icon-button
              (click)="confirmDelete(tp)"
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
export class ThirdPartyList implements OnInit {
  private readonly thirdPartyService = inject(ThirdPartyService);
  private readonly dialog = inject(MatDialog);

  thirdParties = signal<ThirdParty[]>([]);
  loading = signal(true);
  displayedColumns = ['name', 'relationship', 'actions'];

  ngOnInit(): void {
    this.loadThirdParties();
  }

  loadThirdParties(): void {
    this.loading.set(true);
    this.thirdPartyService.list().subscribe({
      next: (data) => {
        this.thirdParties.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  confirmDelete(tp: ThirdParty): void {
    const ref = this.dialog.open(ConfirmDialog, {
      data: {
        title: 'Excluir Terceiro',
        message: `Deseja excluir "${tp.name}"?`,
        confirmText: 'Excluir',
      } as ConfirmDialogData,
    });

    ref.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.thirdPartyService.delete(tp.id).subscribe(() => {
          this.loadThirdParties();
        });
      }
    });
  }
}
