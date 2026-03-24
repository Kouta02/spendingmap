import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { provideNativeDateAdapter } from '@angular/material/core';
import { NgxMaskDirective } from 'ngx-mask';
import { format } from 'date-fns';

import { ExpenseService } from '../../../../core/services/expense.service';
import { CategoryService } from '../../../../core/services/category.service';
import { BankService } from '../../../../core/services/bank.service';
import { PaymentTypeService } from '../../../../core/services/payment-type.service';
import { FinancialCalendarService } from '../../../../core/services/financial-calendar.service';
import { CategoryFlat, Bank, PaymentType, CreditCard, ExpenseCreate } from '../../../../core/models';

@Component({
  selector: 'app-expense-form',
  standalone: true,
  imports: [
    RouterLink,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatDatepickerModule,
    MatCheckboxModule,
    MatSlideToggleModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    NgxMaskDirective,
  ],
  providers: [provideNativeDateAdapter()],
  template: `
    <div class="page-header">
      <h1>{{ isEditing() ? 'Editar Despesa' : 'Nova Despesa' }}</h1>
    </div>

    @if (loadingData()) {
      <div class="loading">
        <mat-spinner diameter="40" />
      </div>
    } @else {
      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="expense-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Descrição</mat-label>
          <input matInput formControlName="description" />
          @if (form.get('description')?.hasError('required')) {
            <mat-error>Descrição é obrigatória</mat-error>
          }
        </mat-form-field>

        <div class="row">
          <mat-form-field appearance="outline" class="half-width">
            <mat-label>Valor (R$)</mat-label>
            <input
              matInput
              formControlName="amount"
              mask="separator.2"
              thousandSeparator="."
              decimalMarker=","
              prefix="R$ "
            />
            @if (form.get('amount')?.hasError('required')) {
              <mat-error>Valor é obrigatório</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline" class="half-width">
            <mat-label>Data</mat-label>
            <input matInput [matDatepicker]="picker" formControlName="date" />
            <mat-datepicker-toggle matIconSuffix [for]="picker" />
            <mat-datepicker #picker />
            @if (form.get('date')?.hasError('required')) {
              <mat-error>Data é obrigatória</mat-error>
            }
          </mat-form-field>
        </div>

        <div class="row">
          <mat-form-field appearance="outline" class="half-width">
            <mat-label>Categoria</mat-label>
            <mat-select formControlName="category">
              <mat-option [value]="null">Nenhuma</mat-option>
              @for (group of categoryGroups(); track group.root.id) {
                @if (group.children.length > 0) {
                  <mat-optgroup [label]="group.root.name">
                    <mat-option [value]="group.root.id">{{ group.root.name }} (geral)</mat-option>
                    @for (child of group.children; track child.id) {
                      <mat-option [value]="child.id">{{ child.name }}</mat-option>
                    }
                  </mat-optgroup>
                } @else {
                  <mat-option [value]="group.root.id">{{ group.root.name }}</mat-option>
                }
              }
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" class="half-width">
            <mat-label>Banco</mat-label>
            <mat-select formControlName="bank">
              <mat-option [value]="null">Nenhum</mat-option>
              @for (bank of banks(); track bank.id) {
                <mat-option [value]="bank.id">{{ bank.name }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
        </div>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Tipo de Pagamento</mat-label>
          <mat-select formControlName="payment_type" (selectionChange)="onPaymentTypeChange()">
            <mat-option [value]="null">Nenhum</mat-option>
            @for (pt of paymentTypes(); track pt.id) {
              <mat-option [value]="pt.id">{{ pt.name }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        @if (showCreditCardField()) {
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Cartao de Credito</mat-label>
            <mat-select formControlName="credit_card">
              <mat-option [value]="null">Nenhum</mat-option>
              @for (card of creditCards(); track card.id) {
                <mat-option [value]="card.id">{{ card.name }} (fecha dia {{ card.closing_day }}, vence dia {{ card.due_day }})</mat-option>
              }
            </mat-select>
          </mat-form-field>
        }

        @if (!isEditing()) {
          <div class="toggles">
            <mat-slide-toggle
              formControlName="is_installment"
              (change)="onInstallmentToggle()"
            >
              Parcelado
            </mat-slide-toggle>

            <mat-slide-toggle
              formControlName="is_recurring"
              (change)="onRecurringToggle()"
            >
              Recorrente
            </mat-slide-toggle>
          </div>

          @if (form.get('is_installment')?.value) {
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Número de parcelas</mat-label>
              <input
                matInput
                type="number"
                formControlName="installment_total"
                min="2"
                max="72"
              />
              @if (form.get('installment_total')?.hasError('required')) {
                <mat-error>Informe o número de parcelas</mat-error>
              }
              @if (form.get('installment_total')?.hasError('min')) {
                <mat-error>Mínimo 2 parcelas</mat-error>
              }
            </mat-form-field>
            <p class="info-text">
              <mat-icon inline>info</mat-icon>
              Serão criadas {{ form.get('installment_total')?.value || 0 }} parcelas
              a partir da data selecionada.
            </p>
          }

          @if (form.get('is_recurring')?.value) {
            <p class="info-text">
              <mat-icon inline>info</mat-icon>
              Esta despesa será gerada mensalmente de forma automática.
            </p>
          }

          @if (showDueDayField()) {
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Dia de vencimento do boleto</mat-label>
              <input
                matInput
                type="number"
                formControlName="due_day"
                min="1"
                max="31"
                placeholder="Ex: 15"
              />
              <mat-hint>Dia do mês em que o boleto vence (1 a 31)</mat-hint>
            </mat-form-field>
          }
        }

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Observações</mat-label>
          <textarea matInput formControlName="notes" rows="3"></textarea>
        </mat-form-field>

        <div class="form-actions">
          <a mat-button routerLink="/expenses">Cancelar</a>
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
    }
  `,
  styles: `
    .expense-form {
      max-width: 600px;
    }
    .full-width {
      width: 100%;
    }
    .row {
      display: flex;
      gap: 16px;
    }
    .half-width {
      flex: 1;
    }
    .toggles {
      display: flex;
      gap: 24px;
      margin-bottom: 16px;
    }
    .info-text {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 0.875rem;
      color: var(--mat-sys-on-surface-variant);
      margin-bottom: 16px;
    }
    .info-text mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }
    .form-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      margin-top: 16px;
    }
    .loading {
      display: flex;
      justify-content: center;
      padding: 48px;
    }
    .page-header h1 {
      margin: 0 0 24px;
      font-size: 1.5rem;
    }
  `,
})
export class ExpenseForm implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly expenseService = inject(ExpenseService);
  private readonly categoryService = inject(CategoryService);
  private readonly bankService = inject(BankService);
  private readonly paymentTypeService = inject(PaymentTypeService);
  private readonly financialCalendarService = inject(FinancialCalendarService);
  private readonly snackBar = inject(MatSnackBar);

  categories = signal<CategoryFlat[]>([]);
  banks = signal<Bank[]>([]);
  paymentTypes = signal<PaymentType[]>([]);
  creditCards = signal<CreditCard[]>([]);
  showCreditCardField = signal(false);
  showDueDayField = signal(false);

  categoryGroups = computed(() => {
    const cats = this.categories();
    const roots = cats.filter((c) => !c.parent);
    return roots.map((root) => {
      const children = cats.filter((c) => c.parent === root.id);
      return { root, children };
    });
  });
  isEditing = signal(false);
  loadingData = signal(true);
  saving = signal(false);

  private expenseId = '';

  form: FormGroup = this.fb.group({
    description: ['', Validators.required],
    amount: ['', Validators.required],
    date: [new Date(), Validators.required],
    category: [null],
    bank: [null],
    payment_type: [null],
    credit_card: [null],
    is_installment: [false],
    installment_total: [null],
    is_recurring: [false],
    due_day: [null],
    notes: [''],
  });

  ngOnInit(): void {
    this.categoryService.flat().subscribe((cats) => this.categories.set(cats));
    this.bankService.list().subscribe((banks) => this.banks.set(banks));
    this.paymentTypeService.list().subscribe((pts) => this.paymentTypes.set(pts));
    this.financialCalendarService.listCreditCards().subscribe((cards) => this.creditCards.set(cards));

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditing.set(true);
      this.expenseId = id;
      this.expenseService.get(id).subscribe({
        next: (expense) => {
          this.form.patchValue({
            description: expense.description,
            amount: expense.amount,
            date: new Date(expense.date + 'T00:00:00'),
            category: expense.category,
            bank: expense.bank,
            payment_type: expense.payment_type,
            credit_card: expense.credit_card,
            is_installment: expense.is_installment,
            installment_total: expense.installment_total,
            is_recurring: expense.is_recurring,
            due_day: expense.due_day,
            notes: expense.notes,
          });
          if (expense.credit_card) {
            this.showCreditCardField.set(true);
          }
          if (expense.due_day) {
            this.showDueDayField.set(true);
          }
          this.loadingData.set(false);
        },
        error: () => {
          this.snackBar.open('Despesa não encontrada', 'OK', {
            duration: 3000,
          });
          this.router.navigate(['/expenses']);
        },
      });
    } else {
      this.loadingData.set(false);
    }
  }

  onPaymentTypeChange(): void {
    const ptId = this.form.get('payment_type')?.value;
    const pt = this.paymentTypes().find((p) => p.id === ptId);
    const isCredit = pt?.name?.toLowerCase().includes('cr\u00e9dito') ||
                     pt?.name?.toLowerCase().includes('credito');
    this.showCreditCardField.set(!!isCredit);
    if (!isCredit) {
      this.form.get('credit_card')?.setValue(null);
    }
    this.updateDueDayVisibility();
  }

  onInstallmentToggle(): void {
    if (this.form.get('is_installment')?.value) {
      this.form.get('is_recurring')?.setValue(false);
      this.form
        .get('installment_total')
        ?.setValidators([Validators.required, Validators.min(2)]);
    } else {
      this.form.get('installment_total')?.clearValidators();
      this.form.get('installment_total')?.setValue(null);
    }
    this.form.get('installment_total')?.updateValueAndValidity();
  }

  onRecurringToggle(): void {
    if (this.form.get('is_recurring')?.value) {
      this.form.get('is_installment')?.setValue(false);
      this.form.get('installment_total')?.clearValidators();
      this.form.get('installment_total')?.setValue(null);
      this.form.get('installment_total')?.updateValueAndValidity();
    }
    this.updateDueDayVisibility();
  }

  private updateDueDayVisibility(): void {
    const ptId = this.form.get('payment_type')?.value;
    const pt = this.paymentTypes().find((p) => p.id === ptId);
    const isBoleto = pt?.name?.toLowerCase() === 'boleto';
    const isRecurring = this.form.get('is_recurring')?.value;
    this.showDueDayField.set(!!isBoleto && !!isRecurring);
    if (!isBoleto || !isRecurring) {
      this.form.get('due_day')?.setValue(null);
    }
  }

  private parseAmount(value: unknown): number {
    if (typeof value === 'number') return value;
    const str = String(value);
    // Se contém vírgula, é formato pt-BR (1.234,56) → remover pontos, trocar vírgula
    if (str.includes(',')) {
      return parseFloat(str.replace(/\./g, '').replace(',', '.'));
    }
    // Senão, é formato numérico padrão (1234.56)
    return parseFloat(str);
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    this.saving.set(true);
    const val = this.form.value;
    const data: ExpenseCreate = {
      description: val.description,
      amount: this.parseAmount(val.amount),
      date: format(val.date, 'yyyy-MM-dd'),
      category: val.category || null,
      bank: val.bank || null,
      payment_type: val.payment_type,
      credit_card: val.credit_card || null,
      is_installment: val.is_installment || false,
      installment_total: val.is_installment ? val.installment_total : null,
      is_recurring: val.is_recurring || false,
      due_day: val.due_day || null,
      boleto_status: val.due_day ? 'pending' : null,
      notes: val.notes || '',
    };

    const request$ = this.isEditing()
      ? this.expenseService.update(this.expenseId, data)
      : this.expenseService.create(data);

    request$.subscribe({
      next: () => {
        this.snackBar.open(
          this.isEditing() ? 'Despesa atualizada!' : 'Despesa criada!',
          'OK',
          { duration: 3000 }
        );
        this.router.navigate(['/expenses']);
      },
      error: (err) => {
        this.saving.set(false);
        const msg =
          err?.error?.detail || 'Erro ao salvar despesa. Tente novamente.';
        this.snackBar.open(msg, 'OK', { duration: 5000 });
      },
    });
  }
}
