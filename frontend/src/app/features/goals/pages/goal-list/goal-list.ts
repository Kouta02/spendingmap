import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';
import { NgxMaskDirective } from 'ngx-mask';
import { format, subMonths, addMonths } from 'date-fns';

import { GoalService } from '../../../../core/services/goal.service';
import { CategoryService } from '../../../../core/services/category.service';
import { Goal, GoalCreate, CategoryFlat } from '../../../../core/models';
import { CurrencyBrlPipe } from '../../../../shared/pipes/currency-brl.pipe';
import {
  ConfirmDialog,
  ConfirmDialogData,
} from '../../../../shared/components/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-goal-list',
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDialogModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatCardModule,
    NgxMaskDirective,
    CurrencyBrlPipe,
  ],
  template: `
    <div class="page-header">
      <h1>Metas de Gasto</h1>
      <div class="header-actions">
        <div class="month-selector">
          <button mat-icon-button (click)="prevMonth()">
            <mat-icon>chevron_left</mat-icon>
          </button>
          <span class="month-label">{{ monthLabel() }}</span>
          <button mat-icon-button (click)="nextMonth()">
            <mat-icon>chevron_right</mat-icon>
          </button>
        </div>
      </div>
    </div>

    <!-- Formulário de criação -->
    <mat-card class="form-card">
      <mat-card-header>
        <mat-card-title>{{ editingId() ? 'Editar Meta' : 'Nova Meta' }}</mat-card-title>
      </mat-card-header>
      <mat-card-content>
        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="goal-form">
          <mat-form-field appearance="outline">
            <mat-label>Nome da meta</mat-label>
            <input matInput formControlName="name" placeholder="Ex: Limite de assinaturas" />
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Categoria (opcional)</mat-label>
            <mat-select formControlName="category">
              <mat-option [value]="null">Total geral</mat-option>
              @for (cat of categories(); track cat.id) {
                <mat-option [value]="cat.id">{{ cat.full_path }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Limite (R$)</mat-label>
            <input
              matInput
              formControlName="amount_limit"
              mask="separator.2"
              thousandSeparator="."
              decimalMarker=","
              prefix="R$ "
            />
          </mat-form-field>

          <div class="form-actions">
            @if (editingId()) {
              <button mat-button type="button" (click)="cancelEdit()">Cancelar</button>
            }
            <button mat-flat-button type="submit" [disabled]="form.invalid || saving()">
              {{ editingId() ? 'Salvar' : 'Criar' }}
            </button>
          </div>
        </form>
      </mat-card-content>
    </mat-card>

    <!-- Lista de metas -->
    @if (loading()) {
      <div class="loading">
        <mat-spinner diameter="40" />
      </div>
    } @else if (goals().length === 0) {
      <div class="empty-state">
        <mat-icon>flag</mat-icon>
        <p>Nenhuma meta definida para este mês.</p>
      </div>
    } @else {
      <div class="goals-list">
        @for (goal of goals(); track goal.id) {
          <mat-card class="goal-card" [class.alerta]="goal.status === 'alerta'" [class.excedido]="goal.status === 'excedido'">
            <mat-card-content>
              <div class="goal-header">
                <div class="goal-info">
                  <span class="goal-name">{{ goal.name }}</span>
                  <span class="goal-category">{{ goal.category_name || 'Total geral' }}</span>
                </div>
                <div class="goal-actions">
                  <button mat-icon-button (click)="startEdit(goal)" matTooltip="Editar">
                    <mat-icon>edit</mat-icon>
                  </button>
                  <button mat-icon-button (click)="confirmDelete(goal)" matTooltip="Excluir" color="warn">
                    <mat-icon>delete</mat-icon>
                  </button>
                </div>
              </div>
              <div class="goal-progress">
                <div class="progress-labels">
                  <span>{{ toNum(goal.current_spending) | currencyBrl }}</span>
                  <span>{{ toNum(goal.amount_limit) | currencyBrl }}</span>
                </div>
                <mat-progress-bar
                  [mode]="'determinate'"
                  [value]="Math.min(goal.percentage, 100)"
                  [color]="goal.status === 'excedido' ? 'warn' : goal.status === 'alerta' ? 'accent' : 'primary'"
                />
                <div class="progress-footer">
                  <span class="percentage" [class]="goal.status">{{ goal.percentage }}%</span>
                  @if (goal.status === 'alerta') {
                    <span class="status-badge alerta">Atenção</span>
                  }
                  @if (goal.status === 'excedido') {
                    <span class="status-badge excedido">Excedido</span>
                  }
                </div>
              </div>
            </mat-card-content>
          </mat-card>
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
      flex-wrap: wrap;
      gap: 12px;
    }
    .page-header h1 { margin: 0; font-size: 1.5rem; }
    .header-actions { display: flex; gap: 12px; align-items: center; }
    .month-selector { display: flex; align-items: center; gap: 4px; }
    .month-label {
      font-size: 1.1rem; font-weight: 500;
      min-width: 140px; text-align: center; text-transform: capitalize;
    }

    .form-card { max-width: 700px; margin-bottom: 24px; }
    .goal-form {
      display: flex; gap: 12px; align-items: flex-start;
      flex-wrap: wrap; padding-top: 12px;
    }
    .goal-form mat-form-field { flex: 1; min-width: 180px; }
    .form-actions { display: flex; gap: 8px; align-items: center; padding-top: 8px; }

    .goals-list { display: flex; flex-direction: column; gap: 12px; max-width: 700px; }
    .goal-card { transition: border-left 0.2s; border-left: 4px solid transparent; }
    .goal-card.alerta { border-left-color: #ff9800; }
    .goal-card.excedido { border-left-color: #f44336; }

    .goal-header { display: flex; justify-content: space-between; align-items: flex-start; }
    .goal-info { display: flex; flex-direction: column; }
    .goal-name { font-weight: 500; font-size: 1rem; }
    .goal-category { font-size: 0.8rem; color: var(--mat-sys-on-surface-variant); }
    .goal-actions { display: flex; }

    .goal-progress { margin-top: 12px; }
    .progress-labels {
      display: flex; justify-content: space-between;
      font-size: 0.85rem; margin-bottom: 4px;
      font-family: 'Roboto Mono', monospace;
    }
    .progress-footer {
      display: flex; justify-content: space-between; align-items: center;
      margin-top: 4px;
    }
    .percentage { font-size: 0.85rem; font-weight: 500; }
    .percentage.ok { color: var(--mat-sys-primary); }
    .percentage.alerta { color: #ff9800; }
    .percentage.excedido { color: #f44336; }

    .status-badge {
      font-size: 0.75rem; padding: 2px 8px;
      border-radius: 12px; font-weight: 500;
    }
    .status-badge.alerta { background: #fff3e0; color: #e65100; }
    .status-badge.excedido { background: #fce4ec; color: #c62828; }

    .loading { display: flex; justify-content: center; padding: 48px; }
    .empty-state {
      display: flex; flex-direction: column; align-items: center;
      padding: 48px; gap: 16px; color: var(--mat-sys-on-surface-variant);
    }
    .empty-state mat-icon { font-size: 48px; width: 48px; height: 48px; }
  `,
})
export class GoalList implements OnInit {
  private readonly goalService = inject(GoalService);
  private readonly categoryService = inject(CategoryService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder);

  goals = signal<Goal[]>([]);
  categories = signal<CategoryFlat[]>([]);
  loading = signal(true);
  saving = signal(false);
  editingId = signal<string | null>(null);
  currentMonth = signal(format(new Date(), 'yyyy-MM'));
  monthLabel = signal('');

  Math = Math;

  form: FormGroup = this.fb.group({
    name: ['', Validators.required],
    category: [null],
    amount_limit: ['', Validators.required],
  });

  ngOnInit(): void {
    this.updateMonthLabel();
    this.categoryService.flat().subscribe((cats) => this.categories.set(cats));
    this.loadGoals();
  }

  loadGoals(): void {
    this.loading.set(true);
    this.goalService.list(this.currentMonth()).subscribe({
      next: (goals) => {
        this.goals.set(goals);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.saving.set(true);

    const val = this.form.value;
    const data: GoalCreate = {
      name: val.name,
      category: val.category || null,
      amount_limit:
        typeof val.amount_limit === 'string'
          ? parseFloat(val.amount_limit.replace(/\./g, '').replace(',', '.'))
          : val.amount_limit,
      month: this.currentMonth() + '-01',
    };

    const request$ = this.editingId()
      ? this.goalService.update(this.editingId()!, data)
      : this.goalService.create(data);

    request$.subscribe({
      next: () => {
        this.saving.set(false);
        this.form.reset({ category: null });
        this.editingId.set(null);
        this.snackBar.open(
          this.editingId() ? 'Meta atualizada!' : 'Meta criada!',
          'OK',
          { duration: 3000 }
        );
        this.loadGoals();
      },
      error: () => {
        this.saving.set(false);
        this.snackBar.open('Erro ao salvar meta.', 'OK', { duration: 3000 });
      },
    });
  }

  startEdit(goal: Goal): void {
    this.editingId.set(goal.id);
    this.form.patchValue({
      name: goal.name,
      category: goal.category,
      amount_limit: goal.amount_limit,
    });
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.form.reset({ category: null });
  }

  confirmDelete(goal: Goal): void {
    const ref = this.dialog.open(ConfirmDialog, {
      data: {
        title: 'Excluir Meta',
        message: `Deseja excluir "${goal.name}"?`,
        confirmText: 'Excluir',
      } as ConfirmDialogData,
    });
    ref.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.goalService.delete(goal.id).subscribe(() => this.loadGoals());
      }
    });
  }

  prevMonth(): void {
    const d = new Date(this.currentMonth() + '-01');
    this.currentMonth.set(format(subMonths(d, 1), 'yyyy-MM'));
    this.updateMonthLabel();
    this.loadGoals();
  }

  nextMonth(): void {
    const d = new Date(this.currentMonth() + '-01');
    this.currentMonth.set(format(addMonths(d, 1), 'yyyy-MM'));
    this.updateMonthLabel();
    this.loadGoals();
  }

  private updateMonthLabel(): void {
    const d = new Date(this.currentMonth() + '-01');
    this.monthLabel.set(
      d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    );
  }

  toNum(val: string | undefined | null): number {
    return val ? parseFloat(val) : 0;
  }
}
