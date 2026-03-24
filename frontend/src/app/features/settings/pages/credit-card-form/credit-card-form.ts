import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  FormBuilder, FormGroup, ReactiveFormsModule, Validators,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { FinancialCalendarService } from '../../../../core/services/financial-calendar.service';

@Component({
  selector: 'app-credit-card-form',
  standalone: true,
  imports: [
    RouterLink, ReactiveFormsModule,
    MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule,
    MatProgressSpinnerModule, MatSnackBarModule,
  ],
  template: `
    <div class="page-header">
      <h2>{{ isEditing() ? 'Editar Cartao' : 'Novo Cartao de Credito' }}</h2>
    </div>

    <form [formGroup]="form" (ngSubmit)="onSubmit()" class="entity-form">
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Nome do Cartao</mat-label>
        <input matInput formControlName="name" placeholder="Ex: Nubank, BB, RecargaPay" />
        @if (form.get('name')?.hasError('required')) {
          <mat-error>Nome e obrigatorio</mat-error>
        }
      </mat-form-field>

      <div class="row">
        <mat-form-field appearance="outline">
          <mat-label>Dia de Fechamento</mat-label>
          <input matInput type="number" formControlName="closing_day" min="1" max="31" />
          <mat-hint>Dia 1 a 31</mat-hint>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Dia de Vencimento</mat-label>
          <input matInput type="number" formControlName="due_day" min="1" max="31" />
          <mat-hint>Dia 1 a 31</mat-hint>
        </mat-form-field>
      </div>

      <div class="form-actions">
        <a mat-button routerLink="/settings/credit-cards">Cancelar</a>
        <button mat-flat-button type="submit" [disabled]="form.invalid || saving()">
          @if (saving()) { <mat-spinner diameter="20" /> }
          @else { {{ isEditing() ? 'Salvar' : 'Criar' }} }
        </button>
      </div>
    </form>
  `,
  styles: `
    .entity-form { max-width: 500px; }
    .full-width { width: 100%; }
    .row {
      display: flex;
      gap: 16px;
    }
    .row mat-form-field { flex: 1; }
    .form-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      margin-top: 16px;
    }
    .page-header h2 {
      margin: 0 0 24px;
      font-size: 1.25rem;
    }
  `,
})
export class CreditCardForm implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly service = inject(FinancialCalendarService);
  private readonly snackBar = inject(MatSnackBar);

  isEditing = signal(false);
  saving = signal(false);
  private cardId = '';

  form: FormGroup = this.fb.group({
    name: ['', Validators.required],
    closing_day: [null, [Validators.required, Validators.min(1), Validators.max(31)]],
    due_day: [null, [Validators.required, Validators.min(1), Validators.max(31)]],
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditing.set(true);
      this.cardId = id;
      this.service.getCreditCard(id).subscribe({
        next: (card) => {
          this.form.patchValue({
            name: card.name,
            closing_day: card.closing_day,
            due_day: card.due_day,
          });
        },
        error: () => {
          this.snackBar.open('Cartao nao encontrado', 'OK', { duration: 3000 });
          this.router.navigate(['/settings/credit-cards']);
        },
      });
    }
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.saving.set(true);
    const data = this.form.value;

    const request$ = this.isEditing()
      ? this.service.updateCreditCard(this.cardId, data)
      : this.service.createCreditCard(data);

    request$.subscribe({
      next: () => {
        this.snackBar.open(
          this.isEditing() ? 'Cartao atualizado!' : 'Cartao criado!', 'OK', { duration: 3000 }
        );
        this.router.navigate(['/settings/credit-cards']);
      },
      error: () => {
        this.saving.set(false);
        this.snackBar.open('Erro ao salvar cartao.', 'OK', { duration: 5000 });
      },
    });
  }
}
