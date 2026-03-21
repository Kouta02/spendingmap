import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
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
      <div class="tree">
        @for (cat of categories(); track cat.id) {
          <ng-container>
            @if (true) {
              <div class="tree-node depth-0">
                <div class="node-content">
                  <span class="color-dot" [style.background-color]="cat.color || '#ccc'"></span>
                  @if (cat.icon) {
                    <mat-icon class="cat-icon">{{ cat.icon }}</mat-icon>
                  }
                  <span class="cat-name">{{ cat.name }}</span>
                  <span class="actions">
                    <a mat-icon-button [routerLink]="['/categories', cat.id, 'edit']" matTooltip="Editar" class="small-btn">
                      <mat-icon>edit</mat-icon>
                    </a>
                    <a mat-icon-button [routerLink]="['/categories', 'new']" [queryParams]="{parent: cat.id}" matTooltip="Adicionar subcategoria" class="small-btn">
                      <mat-icon>add</mat-icon>
                    </a>
                    <button mat-icon-button (click)="confirmDelete(cat)" matTooltip="Excluir" color="warn" class="small-btn">
                      <mat-icon>delete</mat-icon>
                    </button>
                  </span>
                </div>
              </div>
              @for (child of cat.children; track child.id) {
                <div class="tree-node depth-1">
                  <div class="node-content">
                    <span class="color-dot" [style.background-color]="child.color || cat.color || '#ccc'"></span>
                    @if (child.icon) {
                      <mat-icon class="cat-icon">{{ child.icon }}</mat-icon>
                    }
                    <span class="cat-name">{{ child.name }}</span>
                    <span class="actions">
                      <a mat-icon-button [routerLink]="['/categories', child.id, 'edit']" matTooltip="Editar" class="small-btn">
                        <mat-icon>edit</mat-icon>
                      </a>
                      <a mat-icon-button [routerLink]="['/categories', 'new']" [queryParams]="{parent: child.id}" matTooltip="Adicionar subcategoria" class="small-btn">
                        <mat-icon>add</mat-icon>
                      </a>
                      <button mat-icon-button (click)="confirmDelete(child)" matTooltip="Excluir" color="warn" class="small-btn">
                        <mat-icon>delete</mat-icon>
                      </button>
                    </span>
                  </div>
                </div>
                @for (grandchild of child.children; track grandchild.id) {
                  <div class="tree-node depth-2">
                    <div class="node-content">
                      <span class="color-dot" [style.background-color]="grandchild.color || child.color || cat.color || '#ccc'"></span>
                      @if (grandchild.icon) {
                        <mat-icon class="cat-icon">{{ grandchild.icon }}</mat-icon>
                      }
                      <span class="cat-name">{{ grandchild.name }}</span>
                      <span class="actions">
                        <a mat-icon-button [routerLink]="['/categories', grandchild.id, 'edit']" matTooltip="Editar" class="small-btn">
                          <mat-icon>edit</mat-icon>
                        </a>
                        <a mat-icon-button [routerLink]="['/categories', 'new']" [queryParams]="{parent: grandchild.id}" matTooltip="Adicionar subcategoria" class="small-btn">
                          <mat-icon>add</mat-icon>
                        </a>
                        <button mat-icon-button (click)="confirmDelete(grandchild)" matTooltip="Excluir" color="warn" class="small-btn">
                          <mat-icon>delete</mat-icon>
                        </button>
                      </span>
                    </div>
                  </div>
                }
              }
            }
          </ng-container>
        }
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
    .page-header h1 { margin: 0; font-size: 1.5rem; }
    .tree { max-width: 700px; }
    .tree-node {
      border-bottom: 1px solid var(--mat-sys-outline-variant);
    }
    .node-content {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 0;
    }
    .depth-0 .node-content { padding-left: 0; }
    .depth-1 .node-content { padding-left: 32px; }
    .depth-2 .node-content { padding-left: 64px; }
    .color-dot {
      display: inline-block;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      border: 1px solid rgba(0,0,0,0.12);
      flex-shrink: 0;
    }
    .cat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      color: var(--mat-sys-on-surface-variant);
    }
    .cat-name {
      flex: 1;
      font-size: 0.95rem;
    }
    .depth-0 .cat-name { font-weight: 500; }
    .actions {
      display: flex;
      gap: 0;
      opacity: 0.5;
      transition: opacity 0.15s;
    }
    .tree-node:hover .actions { opacity: 1; }
    .small-btn {
      transform: scale(0.85);
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
export class CategoryList implements OnInit {
  private readonly categoryService = inject(CategoryService);
  private readonly dialog = inject(MatDialog);

  categories = signal<Category[]>([]);
  loading = signal(true);

  ngOnInit(): void {
    this.loadCategories();
  }

  loadCategories(): void {
    this.loading.set(true);
    this.categoryService.tree().subscribe({
      next: (cats) => {
        this.categories.set(cats);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  confirmDelete(category: Category): void {
    const hasChildren = category.children && category.children.length > 0;
    const message = hasChildren
      ? `Deseja excluir "${category.name}" e todas as suas subcategorias?`
      : `Deseja excluir "${category.name}"?`;

    const ref = this.dialog.open(ConfirmDialog, {
      data: {
        title: 'Excluir Categoria',
        message,
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
