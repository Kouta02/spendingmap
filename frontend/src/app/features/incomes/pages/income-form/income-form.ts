import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  FormBuilder, FormGroup, ReactiveFormsModule, Validators,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { provideNativeDateAdapter } from '@angular/material/core';
import { NgxMaskDirective } from 'ngx-mask';
import { format } from 'date-fns';

import { IncomeService } from '../../../../core/services/income.service';
import { FinancialCalendarService } from '../../../../core/services/financial-calendar.service';
import { IncomeCategory, IncomeCreate, CreditCard } from '../../../../core/models';

@Component({
  selector: 'app-income-form',
  standalone: true,
  imports: [
    RouterLink, ReactiveFormsModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule,
    MatIconModule, MatDatepickerModule, MatSlideToggleModule,
    MatProgressSpinnerModule, MatSnackBarModule, NgxMaskDirective,
  ],
  providers: [provideNativeDateAdapter()],
  template: `
    <div class="page-header">
      <h1>{{ isEditing() ? 'Editar Receita' : 'Nova Receita' }}</h1>
    </div>

    @if (loadingData()) {
      <div class="loading"><mat-spinner diameter="40" /></div>
    } @else {
      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="income-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Descricao</mat-label>
          <input matInput formControlName="description" />
          @if (form.get('description')?.hasError('required')) {
            <mat-error>Descricao e obrigatoria</mat-error>
          }
        </mat-form-field>

        <div class="row">
          <mat-form-field appearance="outline" class="half-width">
            <mat-label>Valor (R$)</mat-label>
            <input matInput formControlName="amount"
              mask="separator.2" thousandSeparator="." decimalMarker="," prefix="R$ " />
            @if (form.get('amount')?.hasError('required')) {
              <mat-error>Valor e obrigatorio</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline" class="half-width">
            <mat-label>Data</mat-label>
            <input matInput [matDatepicker]="picker" formControlName="date" />
            <mat-datepicker-toggle matIconSuffix [for]="picker" />
            <mat-datepicker #picker />
          </mat-form-field>
        </div>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Categoria</mat-label>
          <mat-select formControlName="category">
            <mat-option [value]="null">Nenhuma</mat-option>
            @for (cat of categories(); track cat.id) {
              <mat-option [value]="cat.id">{{ cat.name }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <div class="toggles">
          <mat-slide-toggle formControlName="is_recurring">Recorrente</mat-slide-toggle>
          <mat-slide-toggle formControlName="is_card_refund" (change)="onCardRefundToggle()">Devolução Cartão</mat-slide-toggle>
        </div>

        @if (form.get('is_card_refund')?.value) {
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Cartão de Crédito</mat-label>
            <mat-select formControlName="credit_card">
              @for (card of creditCards(); track card.id) {
                <mat-option [value]="card.id">{{ card.name }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
        }

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Observacoes</mat-label>
          <textarea matInput formControlName="notes" rows="3"></textarea>
        </mat-form-field>

        <div class="form-actions">
          <a mat-button routerLink="/incomes">Cancelar</a>
          <button mat-flat-button type="submit" [disabled]="form.invalid || saving()">
            @if (saving()) { <mat-spinner diameter="20" /> }
            @else { {{ isEditing() ? 'Salvar' : 'Criar' }} }
          </button>
        </div>
      </form>
    }
  `,
  styles: `
    .income-form { max-width: 600px; }
    .full-width { width: 100%; }
    .row { display: flex; gap: 16px; }
    .half-width { flex: 1; }
    .toggles { display: flex; gap: 24px; margin-bottom: 16px; }
    .form-actions { display: flex; gap: 12px; justify-content: flex-end; margin-top: 16px; }
    .loading { display: flex; justify-content: center; padding: 48px; }
    .page-header h1 { margin: 0 0 24px; font-size: 1.5rem; }
  `,
})
export class IncomeForm implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly incomeService = inject(IncomeService);
  private readonly financialCalendarService = inject(FinancialCalendarService);
  private readonly snackBar = inject(MatSnackBar);

  categories = signal<IncomeCategory[]>([]);
  creditCards = signal<CreditCard[]>([]);
  isEditing = signal(false);
  loadingData = signal(true);
  saving = signal(false);
  private incomeId = '';

  form: FormGroup = this.fb.group({
    description: ['', Validators.required],
    amount: ['', Validators.required],
    date: [new Date(), Validators.required],
    category: [null],
    is_recurring: [false],
    is_card_refund: [false],
    credit_card: [null],
    notes: [''],
  });

  ngOnInit(): void {
    this.incomeService.listCategories().subscribe((cats) => this.categories.set(cats));
    this.financialCalendarService.listCreditCards().subscribe((cards) => this.creditCards.set(cards));

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditing.set(true);
      this.incomeId = id;
      this.incomeService.get(id).subscribe({
        next: (income) => {
          this.form.patchValue({
            description: income.description,
            amount: income.amount,
            date: new Date(income.date + 'T00:00:00'),
            category: income.category,
            is_recurring: income.is_recurring,
            is_card_refund: !!income.credit_card,
            credit_card: income.credit_card,
            notes: income.notes,
          });
          this.loadingData.set(false);
        },
        error: () => {
          this.snackBar.open('Receita nao encontrada', 'OK', { duration: 3000 });
          this.router.navigate(['/incomes']);
        },
      });
    } else {
      this.loadingData.set(false);
    }
  }

  onCardRefundToggle(): void {
    if (!this.form.get('is_card_refund')?.value) {
      this.form.get('credit_card')?.setValue(null);
    }
  }

  private parseAmount(value: unknown): number {
    if (typeof value === 'number') return value;
    const str = String(value);
    if (str.includes(',')) {
      return parseFloat(str.replace(/\./g, '').replace(',', '.'));
    }
    return parseFloat(str);
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.saving.set(true);
    const val = this.form.value;
    const data: IncomeCreate = {
      description: val.description,
      amount: this.parseAmount(val.amount),
      date: format(val.date, 'yyyy-MM-dd'),
      category: val.category || null,
      credit_card: val.is_card_refund ? (val.credit_card || null) : null,
      is_recurring: val.is_recurring || false,
      notes: val.notes || '',
    };

    const request$ = this.isEditing()
      ? this.incomeService.update(this.incomeId, data)
      : this.incomeService.create(data);

    request$.subscribe({
      next: () => {
        this.snackBar.open(
          this.isEditing() ? 'Receita atualizada!' : 'Receita criada!', 'OK', { duration: 3000 }
        );
        this.router.navigate(['/incomes']);
      },
      error: (err) => {
        this.saving.set(false);
        this.snackBar.open(err?.error?.detail || 'Erro ao salvar receita.', 'OK', { duration: 5000 });
      },
    });
  }
}
