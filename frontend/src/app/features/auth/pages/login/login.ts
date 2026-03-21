import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="login-container">
      <mat-card class="login-card">
        <div class="login-header">
          <mat-icon class="logo">account_balance_wallet</mat-icon>
          <h1>SpendingMap</h1>
          <p>Controle de Despesas</p>
        </div>

        <mat-card-content>
          <form [formGroup]="form" (ngSubmit)="onLogin()">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Login</mat-label>
              <input matInput formControlName="username" autocomplete="username" />
              @if (form.get('username')?.hasError('required')) {
                <mat-error>Login é obrigatório</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Senha</mat-label>
              <input
                matInput
                [type]="hidePassword() ? 'password' : 'text'"
                formControlName="password"
                autocomplete="current-password"
              />
              <button
                mat-icon-button
                matSuffix
                type="button"
                (click)="hidePassword.set(!hidePassword())"
              >
                <mat-icon>{{ hidePassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
              @if (form.get('password')?.hasError('required')) {
                <mat-error>Senha é obrigatória</mat-error>
              }
            </mat-form-field>

            @if (errorMessage()) {
              <div class="error-message">
                <mat-icon>error</mat-icon>
                <span>{{ errorMessage() }}</span>
              </div>
            }

            <button
              mat-flat-button
              class="full-width login-btn"
              type="submit"
              [disabled]="form.invalid || loading()"
            >
              @if (loading()) {
                <mat-spinner diameter="20" />
              } @else {
                Entrar
              }
            </button>
          </form>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: `
    .login-container {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #1565c0 0%, #0d47a1 100%);
      padding: 16px;
    }
    .login-card {
      width: 100%;
      max-width: 400px;
      padding: 32px;
    }
    .login-header {
      text-align: center;
      margin-bottom: 24px;
    }
    .login-header .logo {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: var(--mat-sys-primary);
    }
    .login-header h1 {
      margin: 8px 0 4px;
      font-size: 1.5rem;
    }
    .login-header p {
      margin: 0;
      font-size: 0.875rem;
      color: var(--mat-sys-on-surface-variant);
    }
    .full-width {
      width: 100%;
    }
    .login-btn {
      height: 48px;
      font-size: 1rem;
      margin-top: 8px;
    }
    .error-message {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      margin-bottom: 16px;
      background: #fce4ec;
      color: #c62828;
      border-radius: 8px;
      font-size: 0.875rem;
    }
    .error-message mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }
  `,
})
export class LoginPage {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  loading = signal(false);
  errorMessage = signal('');
  hidePassword = signal(true);

  form: FormGroup = this.fb.group({
    username: ['', Validators.required],
    password: ['', Validators.required],
  });

  onLogin(): void {
    if (this.form.invalid) return;

    this.loading.set(true);
    this.errorMessage.set('');

    const { username, password } = this.form.value;
    this.authService.login(username, password).subscribe({
      next: () => {
        this.router.navigate(['/dashboard']);
      },
      error: () => {
        this.loading.set(false);
        this.errorMessage.set('Login ou senha incorretos.');
      },
    });
  }
}
