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

import { ThirdPartyService } from '../../../../core/services/third-party.service';

@Component({
  selector: 'app-third-party-form',
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
      <h1>{{ isEditing() ? 'Editar Terceiro' : 'Novo Terceiro' }}</h1>
    </div>

    <form [formGroup]="form" (ngSubmit)="onSubmit()" class="entity-form">
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Nome</mat-label>
        <input matInput formControlName="name" />
        @if (form.get('name')?.hasError('required')) {
          <mat-error>Nome é obrigatório</mat-error>
        }
      </mat-form-field>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Parentesco/Relação</mat-label>
        <input matInput formControlName="relationship" placeholder="Ex: Mãe, Irmão, Amigo" />
      </mat-form-field>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Observações</mat-label>
        <textarea matInput formControlName="notes" rows="3"></textarea>
      </mat-form-field>

      <div class="form-actions">
        <a mat-button routerLink="/settings/third-parties">Cancelar</a>
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
export class ThirdPartyForm implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly thirdPartyService = inject(ThirdPartyService);
  private readonly snackBar = inject(MatSnackBar);

  isEditing = signal(false);
  saving = signal(false);
  private thirdPartyId = '';

  form: FormGroup = this.fb.group({
    name: ['', Validators.required],
    relationship: [''],
    notes: [''],
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditing.set(true);
      this.thirdPartyId = id;
      this.thirdPartyService.get(id).subscribe({
        next: (tp) => {
          this.form.patchValue({
            name: tp.name,
            relationship: tp.relationship,
            notes: tp.notes,
          });
        },
        error: () => {
          this.snackBar.open('Terceiro não encontrado', 'OK', { duration: 3000 });
          this.router.navigate(['/settings/third-parties']);
        },
      });
    }
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    this.saving.set(true);
    const data = this.form.value;

    const request$ = this.isEditing()
      ? this.thirdPartyService.update(this.thirdPartyId, data)
      : this.thirdPartyService.create(data);

    request$.subscribe({
      next: () => {
        this.snackBar.open(
          this.isEditing() ? 'Terceiro atualizado!' : 'Terceiro cadastrado!',
          'OK',
          { duration: 3000 }
        );
        this.router.navigate(['/settings/third-parties']);
      },
      error: () => {
        this.saving.set(false);
        this.snackBar.open('Erro ao salvar terceiro.', 'OK', { duration: 5000 });
      },
    });
  }
}
