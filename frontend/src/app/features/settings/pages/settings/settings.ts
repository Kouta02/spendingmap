import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatTabsModule, MatIconModule],
  template: `
    <h1>Configuracoes</h1>
    <nav mat-tab-nav-bar [tabPanel]="tabPanel">
      <a mat-tab-link
        routerLink="categories"
        routerLinkActive
        #catActive="routerLinkActive"
        [active]="catActive.isActive"
      >
        <mat-icon>category</mat-icon>
        Categorias
      </a>
      <a mat-tab-link
        routerLink="banks"
        routerLinkActive
        #bankActive="routerLinkActive"
        [active]="bankActive.isActive"
      >
        <mat-icon>account_balance</mat-icon>
        Bancos
      </a>
      <a mat-tab-link
        routerLink="payment-types"
        routerLinkActive
        #ptActive="routerLinkActive"
        [active]="ptActive.isActive"
      >
        <mat-icon>payments</mat-icon>
        Tipos de Pagamento
      </a>
      <a mat-tab-link
        routerLink="payment-dates"
        routerLinkActive
        #pdActive="routerLinkActive"
        [active]="pdActive.isActive"
      >
        <mat-icon>event</mat-icon>
        Datas de Pagamento
      </a>
      <a mat-tab-link
        routerLink="credit-cards"
        routerLinkActive
        #ccActive="routerLinkActive"
        [active]="ccActive.isActive"
      >
        <mat-icon>credit_card</mat-icon>
        Cartoes de Credito
      </a>
    </nav>
    <mat-tab-nav-panel #tabPanel>
      <div class="tab-content">
        <router-outlet />
      </div>
    </mat-tab-nav-panel>
  `,
  styles: `
    h1 {
      margin: 0 0 16px;
      font-size: 1.5rem;
    }
    .tab-content {
      padding-top: 24px;
    }
    mat-icon {
      margin-right: 8px;
      font-size: 20px;
      width: 20px;
      height: 20px;
    }
  `,
})
export class SettingsPage {}
