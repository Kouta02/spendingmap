import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
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
      <mat-sidenav #sidenav mode="side" opened class="sidenav">
        <div class="sidenav-header">
          <mat-icon class="logo-icon">account_balance_wallet</mat-icon>
          <span class="logo-text">SpendingMap</span>
        </div>
        <mat-nav-list>
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
        </mat-nav-list>
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
  `,
})
export class Layout {}
