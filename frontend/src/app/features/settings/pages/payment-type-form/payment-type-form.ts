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
import { MatTooltipModule } from '@angular/material/tooltip';

import { PaymentTypeService } from '../../../../core/services/payment-type.service';

const PAYMENT_ICONS = [
  'credit_card', 'payment', 'payments', 'account_balance_wallet',
  'attach_money', 'money', 'currency_exchange', 'receipt', 'receipt_long',
  'pix', 'qr_code', 'qr_code_scanner',
  'smartphone', 'phone_android', 'contactless',
  'account_balance', 'savings', 'paid',
  'request_quote', 'price_check', 'sell',
  'shopping_cart', 'storefront', 'local_atm',
  'swap_horiz', 'sync_alt', 'send',
  'arrow_downward', 'arrow_upward',
  'description', 'assignment', 'task',
  'work', 'business_center', 'corporate_fare',
];

@Component({
  selector: 'app-payment-type-form',
  standalone: true,
  imports: [
    RouterLink, ReactiveFormsModule,
    MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule,
    MatProgressSpinnerModule, MatSnackBarModule, MatTooltipModule,
  ],
  template: `
    <div class="page-header">
      <h2>{{ isEditing() ? 'Editar Tipo de Pagamento' : 'Novo Tipo de Pagamento' }}</h2>
    </div>

    <form [formGroup]="form" (ngSubmit)="onSubmit()" class="entity-form">
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Nome</mat-label>
        <input matInput formControlName="name" />
        @if (form.get('name')?.hasError('required')) {
          <mat-error>Nome e obrigatorio</mat-error>
        }
      </mat-form-field>

      <div class="icon-picker-section">
        <label class="section-label">
          Icone
          @if (form.get('icon')?.value) {
            <span class="selected-icon-preview">
              <mat-icon>{{ form.get('icon')?.value }}</mat-icon>
              {{ form.get('icon')?.value }}
              <button mat-icon-button type="button" (click)="selectIcon('')" matTooltip="Remover" class="remove-icon-btn">
                <mat-icon>close</mat-icon>
              </button>
            </span>
          }
        </label>
        <div class="icon-grid-container">
          <div class="icon-grid">
            @for (icon of paymentIcons; track icon) {
              <button type="button" mat-icon-button [matTooltip]="icon"
                [class.selected]="form.get('icon')?.value === icon"
                (click)="selectIcon(icon)" class="icon-btn">
                <mat-icon>{{ icon }}</mat-icon>
              </button>
            }
          </div>
        </div>
      </div>

      <div class="form-actions">
        <a mat-button routerLink="/settings/payment-types">Cancelar</a>
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
    .section-label {
      font-size: 0.875rem;
      color: var(--mat-sys-on-surface-variant);
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .selected-icon-preview {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: var(--mat-sys-primary-container);
      color: var(--mat-sys-on-primary-container);
      padding: 2px 4px 2px 8px;
      border-radius: 16px;
      font-size: 0.8rem;
    }
    .remove-icon-btn {
      width: 24px !important;
      height: 24px !important;
      line-height: 24px !important;
    }
    .remove-icon-btn mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }
    .icon-picker-section { margin-bottom: 16px; }
    .icon-grid-container {
      max-height: 220px;
      overflow-y: auto;
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: 8px;
      padding: 8px;
      margin-top: 8px;
    }
    .icon-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 2px;
    }
    .icon-btn {
      border-radius: 8px !important;
      transition: background-color 0.15s;
    }
    .icon-btn:hover {
      background-color: var(--mat-sys-surface-container-highest);
    }
    .icon-btn.selected {
      background-color: var(--mat-sys-primary-container);
      color: var(--mat-sys-on-primary-container);
    }
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
export class PaymentTypeForm implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly paymentTypeService = inject(PaymentTypeService);
  private readonly snackBar = inject(MatSnackBar);

  isEditing = signal(false);
  saving = signal(false);
  private paymentTypeId = '';
  readonly paymentIcons = PAYMENT_ICONS;

  form: FormGroup = this.fb.group({
    name: ['', Validators.required],
    icon: [''],
  });

  selectIcon(icon: string): void {
    this.form.get('icon')?.setValue(icon);
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditing.set(true);
      this.paymentTypeId = id;
      this.paymentTypeService.get(id).subscribe({
        next: (pt) => {
          this.form.patchValue({ name: pt.name, icon: pt.icon });
        },
        error: () => {
          this.snackBar.open('Tipo de pagamento nao encontrado', 'OK', { duration: 3000 });
          this.router.navigate(['/settings/payment-types']);
        },
      });
    }
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.saving.set(true);
    const data = this.form.value;

    const request$ = this.isEditing()
      ? this.paymentTypeService.update(this.paymentTypeId, data)
      : this.paymentTypeService.create(data);

    request$.subscribe({
      next: () => {
        this.snackBar.open(
          this.isEditing() ? 'Tipo atualizado!' : 'Tipo criado!', 'OK', { duration: 3000 }
        );
        this.router.navigate(['/settings/payment-types']);
      },
      error: () => {
        this.saving.set(false);
        this.snackBar.open('Erro ao salvar tipo de pagamento.', 'OK', { duration: 5000 });
      },
    });
  }
}
