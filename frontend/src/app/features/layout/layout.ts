import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
  ],
  template: `
    <mat-sidenav-container class="sidenav-container">
      <mat-sidenav #sidenav [mode]="isMobile() ? 'over' : 'side'" [opened]="!isMobile()" class="sidenav">
        <div class="sidenav-header">
          <mat-icon class="logo-icon">account_balance_wallet</mat-icon>
          <span class="logo-text">SpendingMap</span>
        </div>
        <mat-nav-list>
          <a mat-list-item routerLink="/dashboard" routerLinkActive="active">
            <mat-icon matListItemIcon>dashboard</mat-icon>
            <span matListItemTitle>Dashboard</span>
          </a>
          <a mat-list-item routerLink="/expenses" routerLinkActive="active">
            <mat-icon matListItemIcon>receipt_long</mat-icon>
            <span matListItemTitle>Despesas</span>
          </a>
          <a mat-list-item routerLink="/categories" routerLinkActive="active">
            <mat-icon matListItemIcon>category</mat-icon>
            <span matListItemTitle>Categorias</span>
          </a>
          <a mat-list-item routerLink="/banks" routerLinkActive="active">
            <mat-icon matListItemIcon>account_balance</mat-icon>
            <span matListItemTitle>Bancos</span>
          </a>

          <div class="nav-section">Remuneração</div>
          <a mat-list-item routerLink="/salary" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}">
            <mat-icon matListItemIcon>payments</mat-icon>
            <span matListItemTitle>Contracheque</span>
          </a>
          <a mat-list-item routerLink="/salary/history" routerLinkActive="active">
            <mat-icon matListItemIcon>history</mat-icon>
            <span matListItemTitle>Histórico</span>
          </a>
          <a mat-list-item routerLink="/salary/projection" routerLinkActive="active">
            <mat-icon matListItemIcon>trending_up</mat-icon>
            <span matListItemTitle>Projeção</span>
          </a>

          <div class="nav-section">Planejamento</div>
          <a mat-list-item routerLink="/goals" routerLinkActive="active">
            <mat-icon matListItemIcon>flag</mat-icon>
            <span matListItemTitle>Metas</span>
          </a>
          <a mat-list-item routerLink="/reports" routerLinkActive="active">
            <mat-icon matListItemIcon>assessment</mat-icon>
            <span matListItemTitle>Relatórios</span>
          </a>
        </mat-nav-list>

        <div class="sidenav-footer">
          <button mat-button class="logout-btn" (click)="onLogout()">
            <mat-icon>logout</mat-icon>
            Sair
          </button>
        </div>
      </mat-sidenav>

      <mat-sidenav-content class="content">
        <mat-toolbar color="primary">
          <button mat-icon-button (click)="sidenav.toggle()">
            <mat-icon>menu</mat-icon>
          </button>
          <span>SpendingMap</span>
        </mat-toolbar>
        <div class="page-content">
          <router-outlet />
        </div>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: `
    .sidenav-container {
      height: 100%;
    }
    .sidenav {
      width: 240px;
    }
    .sidenav-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 16px;
      font-size: 1.2rem;
      font-weight: 500;
    }
    .logo-icon {
      color: var(--mat-sys-primary);
    }
    .content {
      display: flex;
      flex-direction: column;
      height: 100%;
    }
    .page-content {
      padding: 24px;
      flex: 1;
      overflow: auto;
    }
    .active {
      background-color: var(--mat-sys-secondary-container) !important;
    }
    .nav-section {
      padding: 16px 16px 4px;
      font-size: 0.75rem;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--mat-sys-on-surface-variant);
    }
    .sidenav-footer {
      margin-top: auto;
      padding: 16px;
      border-top: 1px solid var(--mat-sys-outline-variant);
    }
    .logout-btn {
      width: 100%;
      justify-content: flex-start;
      color: var(--mat-sys-on-surface-variant);
    }
    @media (max-width: 768px) {
      .page-content {
        padding: 16px;
      }
    }
  `,
})
export class Layout implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly breakpointObserver = inject(BreakpointObserver);
  private breakpointSub!: Subscription;
  isMobile = signal(false);

  ngOnInit(): void {
    this.breakpointSub = this.breakpointObserver
      .observe([Breakpoints.Handset])
      .subscribe((result) => this.isMobile.set(result.matches));
  }

  ngOnDestroy(): void {
    this.breakpointSub?.unsubscribe();
  }

  onLogout(): void {
    this.authService.logout();
  }
}
