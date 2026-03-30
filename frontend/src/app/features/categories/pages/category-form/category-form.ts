import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
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
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';

import { CategoryService } from '../../../../core/services/category.service';
import { IncomeService } from '../../../../core/services/income.service';
import { CategoryFlat } from '../../../../core/models';

type CategoryMode = 'expense' | 'income';

const ICON_CATEGORIES: { label: string; icons: string[] }[] = [
  {
    label: 'Alimentacao',
    icons: ['restaurant', 'fastfood', 'local_cafe', 'local_bar', 'lunch_dining', 'local_pizza', 'bakery_dining', 'liquor', 'local_grocery_store', 'kitchen', 'cake', 'icecream', 'ramen_dining', 'set_meal'],
  },
  {
    label: 'Moradia',
    icons: ['home', 'apartment', 'house', 'cottage', 'roofing', 'bed', 'chair', 'weekend', 'door_front', 'bathtub', 'microwave', 'iron', 'cleaning_services'],
  },
  {
    label: 'Transporte',
    icons: ['directions_car', 'local_gas_station', 'directions_bus', 'subway', 'two_wheeler', 'pedal_bike', 'flight', 'local_taxi', 'train', 'airport_shuttle', 'ev_station', 'garage'],
  },
  {
    label: 'Saude',
    icons: ['local_hospital', 'medical_services', 'healing', 'medication', 'vaccines', 'health_and_safety', 'monitor_heart', 'psychology', 'spa', 'fitness_center', 'self_improvement'],
  },
  {
    label: 'Educacao',
    icons: ['school', 'menu_book', 'auto_stories', 'library_books', 'science', 'calculate', 'translate', 'draw', 'architecture', 'biotech'],
  },
  {
    label: 'Lazer',
    icons: ['sports_esports', 'movie', 'music_note', 'headphones', 'theater_comedy', 'park', 'pool', 'beach_access', 'hiking', 'surfing', 'sports_soccer', 'sports_tennis', 'casino', 'celebration', 'nightlife'],
  },
  {
    label: 'Compras',
    icons: ['shopping_cart', 'shopping_bag', 'storefront', 'local_mall', 'checkroom', 'diamond', 'watch', 'redeem', 'sell', 'receipt_long'],
  },
  {
    label: 'Financas',
    icons: ['payments', 'account_balance', 'credit_card', 'savings', 'attach_money', 'trending_up', 'trending_down', 'currency_exchange', 'receipt', 'request_quote', 'account_balance_wallet', 'paid'],
  },
  {
    label: 'Tecnologia',
    icons: ['devices', 'smartphone', 'laptop', 'desktop_windows', 'tablet', 'tv', 'headset', 'mouse', 'keyboard', 'memory', 'wifi', 'router', 'cloud'],
  },
  {
    label: 'Servicos',
    icons: ['build', 'plumbing', 'electrical_services', 'handyman', 'construction', 'engineering', 'local_laundry_service', 'dry_cleaning', 'pest_control', 'water_drop', 'bolt', 'gas_meter'],
  },
  {
    label: 'Pessoal',
    icons: ['person', 'face', 'child_care', 'pets', 'favorite', 'star', 'emoji_events', 'card_giftcard', 'volunteer_activism', 'church', 'diversity_3', 'family_restroom'],
  },
  {
    label: 'Outros',
    icons: ['category', 'label', 'bookmark', 'flag', 'info', 'help', 'lightbulb', 'shield', 'lock', 'key', 'public', 'explore', 'map', 'photo_camera', 'brush'],
  },
];

@Component({
  selector: 'app-category-form',
  standalone: true,
  imports: [
    RouterLink,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule,
  ],
  template: `
    <div class="page-header">
      <h1>{{ isEditing() ? 'Editar Categoria' : 'Nova Categoria' }}{{ categoryMode === 'income' ? ' de Receita' : '' }}</h1>
    </div>

    <form [formGroup]="form" (ngSubmit)="onSubmit()" class="entity-form">
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Nome</mat-label>
        <input matInput formControlName="name" />
        @if (form.get('name')?.hasError('required')) {
          <mat-error>Nome é obrigatório</mat-error>
        }
      </mat-form-field>

      @if (categoryMode === 'expense') {
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Categoria pai (opcional)</mat-label>
          <mat-select formControlName="parent">
            <mat-option [value]="null">Nenhuma (raiz)</mat-option>
            @for (cat of parentOptions(); track cat.id) {
              <mat-option [value]="cat.id">{{ cat.full_path }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      }

      <div class="icon-picker-section">
        <label class="section-label">
          Icone
          @if (form.get('icon')?.value) {
            <span class="selected-icon-preview">
              <mat-icon>{{ form.get('icon')?.value }}</mat-icon>
              {{ form.get('icon')?.value }}
              <button mat-icon-button type="button" (click)="selectIcon('')" matTooltip="Remover icone" class="remove-icon-btn">
                <mat-icon>close</mat-icon>
              </button>
            </span>
          }
        </label>

        <div class="icon-grid-container">
          @for (group of allIconGroups; track group.label) {
            <div class="icon-group">
              <span class="icon-group-label">{{ group.label }}</span>
              <div class="icon-grid">
                @for (icon of group.icons; track icon) {
                  <button
                    type="button"
                    mat-icon-button
                    [matTooltip]="icon"
                    [class.selected]="form.get('icon')?.value === icon"
                    (click)="selectIcon(icon)"
                    class="icon-btn"
                  >
                    <mat-icon>{{ icon }}</mat-icon>
                  </button>
                }
              </div>
            </div>
          }
        </div>
      </div>

      <div class="color-field">
        <label>Cor</label>
        <div class="color-row">
          <input
            type="color"
            [value]="form.get('color')?.value || '#2196f3'"
            (input)="onColorChange($event)"
            class="color-input"
          />
          <mat-form-field appearance="outline" class="color-text">
            <mat-label>Hex</mat-label>
            <input matInput formControlName="color" placeholder="#2196f3" />
          </mat-form-field>
        </div>
      </div>

      <div class="form-actions">
        <a mat-button routerLink="/settings/categories">Cancelar</a>
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
    .entity-form { max-width: 600px; }
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
    .icon-search-field {
      margin-top: 8px;
    }
    .icon-picker-section {
      margin-bottom: 16px;
    }
    .icon-grid-container {
      max-height: 280px;
      overflow-y: auto;
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: 8px;
      padding: 8px;
    }
    .icon-group {
      margin-bottom: 8px;
    }
    .icon-group-label {
      font-size: 0.75rem;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--mat-sys-on-surface-variant);
      display: block;
      padding: 4px 4px 2px;
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
    .no-results {
      text-align: center;
      color: var(--mat-sys-on-surface-variant);
      padding: 16px;
    }
    .color-field { margin-bottom: 16px; }
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
export class CategoryForm implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly categoryService = inject(CategoryService);
  private readonly incomeService = inject(IncomeService);
  private readonly snackBar = inject(MatSnackBar);

  isEditing = signal(false);
  saving = signal(false);
  parentOptions = signal<CategoryFlat[]>([]);
  private categoryId = '';
  categoryMode: CategoryMode = 'expense';

  iconSearch = '';
  readonly allIconGroups = ICON_CATEGORIES;

  filteredIconGroups = computed(() => {
    const search = this.iconSearch.toLowerCase().trim();
    if (!search) return this.allIconGroups;
    return this.allIconGroups
      .map((group) => ({
        label: group.label,
        icons: group.icons.filter((icon) => icon.includes(search)),
      }))
      .filter((group) => group.icons.length > 0);
  });

  form: FormGroup = this.fb.group({
    name: ['', Validators.required],
    parent: [null],
    icon: [''],
    color: ['#2196f3'],
  });

  selectIcon(icon: string): void {
    this.form.get('icon')?.setValue(icon);
  }

  ngOnInit(): void {
    const typeParam = this.route.snapshot.queryParamMap.get('type');
    if (typeParam === 'income') {
      this.categoryMode = 'income';
    }

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditing.set(true);
      this.categoryId = id;

      if (this.categoryMode === 'income') {
        this.incomeService.getCategory(id).subscribe({
          next: (cat) => {
            this.form.patchValue({
              name: cat.name,
              icon: cat.icon,
              color: cat.color || '#2196f3',
            });
          },
          error: () => {
            this.snackBar.open('Categoria não encontrada', 'OK', { duration: 3000 });
            this.router.navigate(['/settings/categories']);
          },
        });
      } else {
        this.categoryService.get(id).subscribe({
          next: (cat) => {
            this.form.patchValue({
              name: cat.name,
              parent: cat.parent,
              icon: cat.icon,
              color: cat.color || '#2196f3',
            });
            this.loadParentOptions();
          },
          error: () => {
            this.snackBar.open('Categoria não encontrada', 'OK', { duration: 3000 });
            this.router.navigate(['/settings/categories']);
          },
        });
      }
    } else if (this.categoryMode === 'expense') {
      this.loadParentOptions();
      const parentId = this.route.snapshot.queryParamMap.get('parent');
      if (parentId) {
        this.form.get('parent')?.setValue(parentId);
      }
    }
  }

  private loadParentOptions(): void {
    this.categoryService.flat().subscribe((cats) => {
      if (this.categoryId) {
        this.parentOptions.set(cats.filter((c) => c.id !== this.categoryId));
      } else {
        this.parentOptions.set(cats);
      }
    });
  }

  onColorChange(event: Event): void {
    const color = (event.target as HTMLInputElement).value;
    this.form.get('color')?.setValue(color);
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    this.saving.set(true);

    if (this.categoryMode === 'income') {
      const data = {
        name: this.form.value.name,
        icon: this.form.value.icon || '',
        color: this.form.value.color || '',
      };

      const request$ = this.isEditing()
        ? this.incomeService.updateCategory(this.categoryId, data)
        : this.incomeService.createCategory(data);

      request$.subscribe({
        next: () => {
          this.snackBar.open(
            this.isEditing() ? 'Categoria atualizada!' : 'Categoria criada!',
            'OK',
            { duration: 3000 }
          );
          this.router.navigate(['/settings/categories']);
        },
        error: () => {
          this.saving.set(false);
          this.snackBar.open('Erro ao salvar categoria.', 'OK', { duration: 5000 });
        },
      });
    } else {
      const data = this.form.value;

      const request$ = this.isEditing()
        ? this.categoryService.update(this.categoryId, data)
        : this.categoryService.create(data);

      request$.subscribe({
        next: () => {
          this.snackBar.open(
            this.isEditing() ? 'Categoria atualizada!' : 'Categoria criada!',
            'OK',
            { duration: 3000 }
          );
          this.router.navigate(['/settings/categories']);
        },
        error: () => {
          this.saving.set(false);
          this.snackBar.open('Erro ao salvar categoria.', 'OK', { duration: 5000 });
        },
      });
    }
  }
}
