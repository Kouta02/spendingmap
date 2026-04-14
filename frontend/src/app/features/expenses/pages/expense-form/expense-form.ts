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
import { MatTooltipModule } from '@angular/material/tooltip';
import { provideNativeDateAdapter } from '@angular/material/core';
import { NgxMaskDirective } from 'ngx-mask';
import { format } from 'date-fns';

import { MatDialog } from '@angular/material/dialog';
import { ExpenseService } from '../../../../core/services/expense.service';
import { CategoryService } from '../../../../core/services/category.service';
import { PaymentTypeService } from '../../../../core/services/payment-type.service';
import { FinancialCalendarService } from '../../../../core/services/financial-calendar.service';
import { ThirdPartyService } from '../../../../core/services/third-party.service';
import { CategoryFlat, PaymentType, CreditCard, ThirdParty, ExpenseCreate } from '../../../../core/models';
import { CategoryDialog, CategoryDialogData } from '../../../../shared/components/category-dialog/category-dialog';

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
    MatTooltipModule,
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
        <!-- 1ª linha: Descrição -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Descrição</mat-label>
          <input matInput formControlName="description" />
          @if (form.get('description')?.hasError('required')) {
            <mat-error>Descrição é obrigatória</mat-error>
          }
        </mat-form-field>

        <!-- 2ª linha: Valor + Data -->
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

        <!-- 3ª linha: Tipo de Pagamento -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Tipo de Pagamento</mat-label>
          <mat-select formControlName="payment_type" (selectionChange)="onPaymentTypeChange()">
            <mat-option [value]="null">Nenhum</mat-option>
            @for (pt of paymentTypes(); track pt.id) {
              <mat-option [value]="pt.id">{{ pt.name }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <!-- Cartão de crédito (condicional) -->
        @if (showCreditCardField()) {
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Cartão de Crédito</mat-label>
            <mat-select formControlName="credit_card">
              <mat-option [value]="null">Nenhum</mat-option>
              @for (card of creditCards(); track card.id) {
                <mat-option [value]="card.id">{{ card.name }} (fecha dia {{ card.closing_day }}, vence dia {{ card.due_day }})</mat-option>
              }
            </mat-select>
          </mat-form-field>
        }

        <!-- 4ª linha: Toggles (Parcelado, Recorrente, Terceiros) -->
        <div class="toggles">
          <mat-slide-toggle
            formControlName="is_installment"
            (change)="onInstallmentToggle()"
            [disabled]="isEditingInstallment()"
          >
            Parcelado
          </mat-slide-toggle>

          <mat-slide-toggle
            formControlName="is_recurring"
            (change)="onRecurringToggle()"
            [disabled]="isEditingInstallment()"
          >
            Recorrente
          </mat-slide-toggle>

          <mat-slide-toggle
            formControlName="has_third_party"
            (change)="onThirdPartyToggle()"
          >
            Terceiros
          </mat-slide-toggle>
        </div>

        <!-- Parcela existente (edição) -->
        @if (isEditingInstallment()) {
          <p class="info-text">
            <mat-icon inline>info</mat-icon>
            Parcela {{ editingInstallmentCurrent() }}/{{ editingInstallmentTotal() }}
          </p>
        }

        <!-- Número de parcelas (criação) -->
        @if (form.get('is_installment')?.value && !isEditingInstallment()) {
          <div class="row">
            <mat-form-field appearance="outline" class="half-width">
              <mat-label>Total de parcelas</mat-label>
              <input
                matInput
                type="number"
                formControlName="installment_total"
                min="2"
                max="240"
              />
              @if (form.get('installment_total')?.hasError('required')) {
                <mat-error>Informe o total de parcelas</mat-error>
              }
              @if (form.get('installment_total')?.hasError('min')) {
                <mat-error>Mínimo 2 parcelas</mat-error>
              }
            </mat-form-field>
            <mat-form-field appearance="outline" class="half-width">
              <mat-label>Parcela inicial</mat-label>
              <input
                matInput
                type="number"
                formControlName="installment_start"
                min="1"
                [max]="form.get('installment_total')?.value || 240"
              />
              <mat-hint>A partir de qual parcela criar</mat-hint>
            </mat-form-field>
          </div>
          <p class="info-text">
            <mat-icon inline>info</mat-icon>
            @if ((form.get('installment_start')?.value || 1) > 1) {
              Serão criadas {{ (form.get('installment_total')?.value || 0) - (form.get('installment_start')?.value || 1) + 1 }} parcelas
              ({{ form.get('installment_start')?.value }}/{{ form.get('installment_total')?.value }} a {{ form.get('installment_total')?.value }}/{{ form.get('installment_total')?.value }})
              a partir da data selecionada.
            } @else {
              Serão criadas {{ form.get('installment_total')?.value || 0 }} parcelas
              a partir da data selecionada.
            }
          </p>
        }

        <!-- Dropdown de terceiros (condicional) -->
        @if (form.get('has_third_party')?.value) {
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Pessoa</mat-label>
            <mat-select formControlName="third_party">
              <mat-option [value]="null">Nenhum</mat-option>
              @for (tp of thirdParties(); track tp.id) {
                <mat-option [value]="tp.id">{{ tp.name }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
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

        <!-- 5ª linha: Categoria -->
        <div class="category-row">
          <mat-form-field appearance="outline" class="category-field">
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
          <button mat-icon-button type="button" (click)="openNewCategory()" matTooltip="Criar nova categoria" class="add-category-btn">
            <mat-icon>add</mat-icon>
          </button>
        </div>

        <!-- 6ª linha: Observações -->
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
    .category-row {
      display: flex;
      align-items: flex-start;
      gap: 4px;
    }
    .category-field {
      flex: 1;
    }
    .add-category-btn {
      margin-top: 8px;
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
  private readonly paymentTypeService = inject(PaymentTypeService);
  private readonly financialCalendarService = inject(FinancialCalendarService);
  private readonly thirdPartyService = inject(ThirdPartyService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);

  categories = signal<CategoryFlat[]>([]);
  paymentTypes = signal<PaymentType[]>([]);
  creditCards = signal<CreditCard[]>([]);
  thirdParties = signal<ThirdParty[]>([]);
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
  isEditingInstallment = signal(false);
  editingInstallmentCurrent = signal<number | null>(null);
  editingInstallmentTotal = signal<number | null>(null);
  loadingData = signal(true);
  saving = signal(false);

  private expenseId = '';
  private originalBoletoStatus: string | null = null;

  form: FormGroup = this.fb.group({
    description: ['', Validators.required],
    amount: ['', Validators.required],
    date: [new Date(), Validators.required],
    payment_type: [null],
    credit_card: [null],
    is_installment: [false],
    installment_total: [null],
    installment_start: [1],
    is_recurring: [false],
    has_third_party: [false],
    third_party: [null],
    due_day: [null],
    category: [null],
    notes: [''],
  });

  ngOnInit(): void {
    this.categoryService.flat().subscribe((cats) => this.categories.set(cats));
    this.paymentTypeService.list().subscribe((pts) => {
      this.paymentTypes.set(pts);
      this.updateDueDayVisibility();
    });
    this.financialCalendarService.listCreditCards().subscribe((cards) => this.creditCards.set(cards));
    this.thirdPartyService.list().subscribe((tps) => this.thirdParties.set(tps));

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
            payment_type: expense.payment_type,
            credit_card: expense.credit_card,
            is_installment: expense.is_installment,
            installment_total: expense.installment_total,
            is_recurring: expense.is_recurring,
            has_third_party: !!expense.third_party,
            third_party: expense.third_party,
            due_day: expense.due_day,
            category: expense.category,
            notes: expense.notes,
          });
          this.originalBoletoStatus = expense.boleto_status;
          if (expense.is_installment && expense.installment_current) {
            this.isEditingInstallment.set(true);
            this.editingInstallmentCurrent.set(expense.installment_current);
            this.editingInstallmentTotal.set(expense.installment_total);
          }
          if (expense.credit_card) {
            this.showCreditCardField.set(true);
          }
          this.updateDueDayVisibility();
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
    const isCredit = pt?.name?.toLowerCase().includes('crédito') ||
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
      this.form.get('installment_start')?.setValue(1);
    }
    this.form.get('installment_total')?.updateValueAndValidity();
    this.updateDueDayVisibility();
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

  onThirdPartyToggle(): void {
    if (!this.form.get('has_third_party')?.value) {
      this.form.get('third_party')?.setValue(null);
    }
  }

  private updateDueDayVisibility(): void {
    const ptId = this.form.get('payment_type')?.value;
    const pt = this.paymentTypes().find((p) => p.id === ptId);
    const isBoleto = pt?.name?.toLowerCase() === 'boleto';
    const isRecurring = this.form.get('is_recurring')?.value;
    const isInstallment = this.form.get('is_installment')?.value;
    this.showDueDayField.set(!!isBoleto && (!!isRecurring || !!isInstallment));
    if (!isBoleto || (!isRecurring && !isInstallment)) {
      this.form.get('due_day')?.setValue(null);
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

  openNewCategory(): void {
    const ref = this.dialog.open(CategoryDialog, {
      width: '400px',
      data: { categories: this.categories() } as CategoryDialogData,
    });

    ref.afterClosed().subscribe((created) => {
      if (created) {
        this.categoryService.flat().subscribe((cats) => {
          this.categories.set(cats);
          this.form.get('category')?.setValue(created.id);
        });
      }
    });
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
      payment_type: val.payment_type,
      credit_card: val.credit_card || null,
      third_party: val.has_third_party ? (val.third_party || null) : null,
      is_installment: val.is_installment || false,
      installment_total: val.is_installment ? val.installment_total : null,
      installment_start: val.is_installment && val.installment_start > 1 ? val.installment_start : undefined,
      is_recurring: val.is_recurring || false,
      due_day: val.due_day || null,
      boleto_status: this.isEditing() ? this.originalBoletoStatus : (val.due_day ? 'pending' : null),
      notes: val.notes || '',
    };

    const request$ = this.isEditing()
      ? this.expenseService.update(this.expenseId, data)
      : this.expenseService.create(data);

    request$.subscribe({
      next: () => {
        this.saving.set(false);
        if (this.isEditing()) {
          this.snackBar.open('Despesa atualizada!', 'OK', { duration: 3000 });
          this.router.navigate(['/expenses']);
        } else {
          this.snackBar.open('Despesa criada!', 'OK', { duration: 3000 });
          this.form.patchValue({ description: '', amount: '', notes: '' });
          this.form.get('description')?.markAsUntouched();
          this.form.get('amount')?.markAsUntouched();
        }
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
