import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { BankService } from '../../../../core/services/bank.service';

@Component({
  selector: 'app-bank-form',
  standalone: true,
  imports: [
    RouterLink,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  template: `
    <div class="page-header">
      <h1>{{ isEditing() ? 'Editar Banco' : 'Novo Banco' }}</h1>
    </div>

    <form [formGroup]="form" (ngSubmit)="onSubmit()" class="entity-form">
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Nome</mat-label>
        <input matInput formControlName="name" />
        @if (form.get('name')?.hasError('required')) {
          <mat-error>Nome é obrigatório</mat-error>
        }
      </mat-form-field>

      <div class="color-field">
        <label>Cor</label>
        <div class="color-row">
          <input
            type="color"
            [value]="form.get('color')?.value || '#4caf50'"
            (input)="onColorChange($event)"
            class="color-input"
          />
          <mat-form-field appearance="outline" class="color-text">
            <mat-label>Hex</mat-label>
            <input matInput formControlName="color" placeholder="#4caf50" />
          </mat-form-field>
        </div>
      </div>

      <div class="form-actions">
        <a mat-button routerLink="/settings/banks">Cancelar</a>
        <button
          mat-flat-button
          type="submit"
          [disabled]="form.invalid || saving()"
        >
          @if (saving()) {
            <mat-spinner diameter="20" />
          } @else {
            {{ isEditing() ? 'Salvar' : 'Criar' }}
          }
        </button>
      </div>
    </form>
  `,
  styles: `
    .entity-form { max-width: 500px; }
    .full-width { width: 100%; }
    .color-field {
      margin-bottom: 16px;
    }
    .color-field label {
      font-size: 0.875rem;
      color: var(--mat-sys-on-surface-variant);
      margin-bottom: 8px;
      display: block;
    }
    .color-row {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .color-input {
      width: 48px;
      height: 48px;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      padding: 0;
    }
    .color-text { flex: 1; }
    .form-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      margin-top: 16px;
    }
    .page-header h1 {
      margin: 0 0 24px;
      font-size: 1.5rem;
    }
  `,
})
export class BankForm implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly bankService = inject(BankService);
  private readonly snackBar = inject(MatSnackBar);

  isEditing = signal(false);
  saving = signal(false);
  private bankId = '';

  form: FormGroup = this.fb.group({
    name: ['', Validators.required],
    color: ['#4caf50'],
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditing.set(true);
      this.bankId = id;
      this.bankService.get(id).subscribe({
        next: (bank) => {
          this.form.patchValue({
            name: bank.name,
            color: bank.color || '#4caf50',
          });
        },
        error: () => {
          this.snackBar.open('Banco não encontrado', 'OK', { duration: 3000 });
          this.router.navigate(['/settings/banks']);
        },
      });
    }
  }

  onColorChange(event: Event): void {
    const color = (event.target as HTMLInputElement).value;
    this.form.get('color')?.setValue(color);
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    this.saving.set(true);
    const data = this.form.value;

    const request$ = this.isEditing()
      ? this.bankService.update(this.bankId, data)
      : this.bankService.create(data);

    request$.subscribe({
      next: () => {
        this.snackBar.open(
          this.isEditing() ? 'Banco atualizado!' : 'Banco criado!',
          'OK',
          { duration: 3000 }
        );
        this.router.navigate(['/settings/banks']);
      },
      error: () => {
        this.saving.set(false);
        this.snackBar.open('Erro ao salvar banco.', 'OK', { duration: 5000 });
      },
    });
  }
}
