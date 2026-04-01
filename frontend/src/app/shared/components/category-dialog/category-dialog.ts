import { Component, inject, signal, computed } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { CategoryService } from '../../../core/services/category.service';
import { CategoryFlat, CategoryCreate } from '../../../core/models';

export interface CategoryDialogData {
  categories: CategoryFlat[];
}

@Component({
  selector: 'app-category-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <h2 mat-dialog-title>Nova Categoria</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="category-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Nome</mat-label>
          <input matInput formControlName="name" cdkFocusInitial />
          @if (form.get('name')?.hasError('required')) {
            <mat-error>Nome é obrigatório</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Categoria pai (opcional)</mat-label>
          <mat-select formControlName="parent">
            <mat-option [value]="null">Nenhuma (raiz)</mat-option>
            @for (cat of rootCategories(); track cat.id) {
              <mat-option [value]="cat.id">{{ cat.name }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Cor</mat-label>
          <input matInput formControlName="color" type="color" />
        </mat-form-field>
      </form>

      @if (error()) {
        <p class="error-msg">{{ error() }}</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-flat-button
              (click)="onCreate()"
              [disabled]="form.invalid || saving()">
        @if (saving()) {
          <mat-spinner diameter="20" />
        } @else {
          Criar
        }
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .category-form {
      display: flex;
      flex-direction: column;
      min-width: 320px;
    }
    .full-width {
      width: 100%;
    }
    .error-msg {
      color: #c62828;
      font-size: 0.875rem;
      margin-top: 0;
    }
  `,
})
export class CategoryDialog {
  private readonly fb = inject(FormBuilder);
  private readonly categoryService = inject(CategoryService);
  private readonly dialogRef = inject(MatDialogRef<CategoryDialog>);
  readonly data = inject<CategoryDialogData>(MAT_DIALOG_DATA);

  saving = signal(false);
  error = signal('');

  rootCategories = computed(() =>
    this.data.categories.filter((c) => !c.parent)
  );

  form = this.fb.group({
    name: ['', Validators.required],
    parent: [null as string | null],
    color: ['#2196f3'],
  });

  onCreate(): void {
    if (this.form.invalid) return;

    this.saving.set(true);
    this.error.set('');

    const val = this.form.value;
    const payload: CategoryCreate = {
      name: val.name!,
      parent: val.parent || null,
      color: val.color || '#2196f3',
    };

    this.categoryService.create(payload).subscribe({
      next: (created) => {
        this.dialogRef.close(created);
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(err?.error?.name?.[0] || 'Erro ao criar categoria.');
      },
    });
  }
}
