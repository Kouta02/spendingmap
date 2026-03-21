import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';

import { CategoryService } from '../../../../core/services/category.service';
import { Category } from '../../../../core/models';
import {
  ConfirmDialog,
  ConfirmDialogData,
} from '../../../../shared/components/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-category-list',
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
      <h1>Categorias</h1>
      <a mat-fab extended routerLink="/categories/new">
        <mat-icon>add</mat-icon>
        Nova Categoria
      </a>
    </div>

    @if (loading()) {
      <div class="loading">
        <mat-spinner diameter="40" />
      </div>
    } @else if (categories().length === 0) {
      <div class="empty-state">
        <mat-icon>category</mat-icon>
        <p>Nenhuma categoria cadastrada.</p>
        <a mat-flat-button routerLink="/categories/new">Criar categoria</a>
      </div>
    } @else {
      <table mat-table [dataSource]="categories()" class="data-table">
        <ng-container matColumnDef="color">
          <th mat-header-cell *matHeaderCellDef>Cor</th>
          <td mat-cell *matCellDef="let c">
            <span
              class="color-dot"
              [style.background-color]="c.color || '#ccc'"
            ></span>
          </td>
        </ng-container>

        <ng-container matColumnDef="icon">
          <th mat-header-cell *matHeaderCellDef>Ícone</th>
          <td mat-cell *matCellDef="let c">
            @if (c.icon) {
              <mat-icon>{{ c.icon }}</mat-icon>
            } @else {
              <span class="text-muted">—</span>
            }
          </td>
        </ng-container>

        <ng-container matColumnDef="name">
          <th mat-header-cell *matHeaderCellDef>Nome</th>
          <td mat-cell *matCellDef="let c">{{ c.name }}</td>
        </ng-container>

        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef></th>
          <td mat-cell *matCellDef="let c">
            <a
              mat-icon-button
              [routerLink]="['/categories', c.id, 'edit']"
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
    .page-header h1 { margin: 0; font-size: 1.5rem; }
    .data-table { width: 100%; }
    .color-dot {
      display: inline-block;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      border: 1px solid rgba(0,0,0,0.12);
    }
    .text-muted { color: var(--mat-sys-on-surface-variant); }
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
export class CategoryList implements OnInit {
  private readonly categoryService = inject(CategoryService);
  private readonly dialog = inject(MatDialog);

  categories = signal<Category[]>([]);
  loading = signal(true);
  displayedColumns = ['color', 'icon', 'name', 'actions'];

  ngOnInit(): void {
    this.loadCategories();
  }

  loadCategories(): void {
    this.loading.set(true);
    this.categoryService.list().subscribe({
      next: (cats) => {
        this.categories.set(cats);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  confirmDelete(category: Category): void {
    const ref = this.dialog.open(ConfirmDialog, {
      data: {
        title: 'Excluir Categoria',
        message: `Deseja excluir "${category.name}"?`,
        confirmText: 'Excluir',
      } as ConfirmDialogData,
    });

    ref.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.categoryService.delete(category.id).subscribe(() => {
          this.loadCategories();
        });
      }
    });
  }
}
