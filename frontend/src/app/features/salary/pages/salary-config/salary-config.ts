import { Component, OnInit, inject, signal } from '@angular/core';
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
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';

import { SalaryService } from '../../../../core/services/salary.service';
import { SalaryConfig, SalaryResult, CalculateRequest } from '../../../../core/models';
import { CurrencyBrlPipe } from '../../../../shared/pipes/currency-brl.pipe';

@Component({
  selector: 'app-salary-config',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
    MatCheckboxModule,
    MatCardModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTabsModule,
    CurrencyBrlPipe,
  ],
  template: `
    <div class="page-header">
      <h1>Contracheque</h1>
    </div>

    @if (loading()) {
      <div class="loading">
        <mat-spinner diameter="40" />
      </div>
    } @else {
      <div class="salary-layout">
        <!-- Configuração -->
        <mat-card class="config-card">
          <mat-card-header>
            <mat-card-title>Configuração</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <form [formGroup]="form" class="config-form">
              <div class="row">
                <mat-form-field appearance="outline" class="half-width">
                  <mat-label>Padrão</mat-label>
                  <mat-select formControlName="padrao">
                    @for (p of padroes; track p) {
                      <mat-option [value]="p">{{ p }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>

                <mat-form-field appearance="outline" class="half-width">
                  <mat-label>Ano</mat-label>
                  <mat-select formControlName="year">
                    <mat-option [value]="2026">2026</mat-option>
                    <mat-option [value]="2027">2027</mat-option>
                    <mat-option [value]="2028">2028</mat-option>
                    <mat-option [value]="2029">2029</mat-option>
                  </mat-select>
                </mat-form-field>
              </div>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>GDAE (%)</mat-label>
                <input matInput type="number" formControlName="gdae_perc" min="40" max="100" />
              </mat-form-field>

              <div class="toggle-row">
                <mat-slide-toggle formControlName="has_aeq">AEQ</mat-slide-toggle>
                @if (form.get('has_aeq')?.value) {
                  <mat-form-field appearance="outline" class="small-field">
                    <mat-label>AEQ (%)</mat-label>
                    <input matInput type="number" formControlName="aeq_perc" min="0" max="30" />
                  </mat-form-field>
                }
              </div>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>VPI (R$)</mat-label>
                <input matInput type="number" formControlName="vpi" step="0.01" />
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Função Comissionada</mat-label>
                <mat-select formControlName="funcao_comissionada">
                  <mat-option value="">Nenhuma</mat-option>
                  @for (fc of fcOptions; track fc) {
                    <mat-option [value]="fc">{{ fc }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>

              <mat-divider />

              <h3>Descontos</h3>

              <div class="toggle-row">
                <mat-slide-toggle formControlName="has_funpresp">Funpresp</mat-slide-toggle>
                @if (form.get('has_funpresp')?.value) {
                  <mat-form-field appearance="outline" class="small-field">
                    <mat-label>Funpresp (%)</mat-label>
                    <input matInput type="number" formControlName="funpresp_perc" min="7.5" max="8.5" step="0.5" />
                  </mat-form-field>
                }
              </div>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Dependentes IR</mat-label>
                <input matInput type="number" formControlName="dependentes_ir" min="0" />
              </mat-form-field>

              <mat-divider />

              <h3>Auxílios</h3>

              <div class="toggle-row">
                <mat-slide-toggle formControlName="has_creche">Auxílio Creche</mat-slide-toggle>
                @if (form.get('has_creche')?.value) {
                  <mat-form-field appearance="outline" class="small-field">
                    <mat-label>Filhos</mat-label>
                    <input matInput type="number" formControlName="num_filhos" min="1" />
                  </mat-form-field>
                }
              </div>

              <mat-divider />

              <h3>Tabelas Aprovadas</h3>
              <div class="checkboxes">
                <mat-checkbox formControlName="approved_2026">2026</mat-checkbox>
                <mat-checkbox formControlName="approved_2027">2027</mat-checkbox>
                <mat-checkbox formControlName="approved_2028">2028</mat-checkbox>
                <mat-checkbox formControlName="approved_2029">2029</mat-checkbox>
              </div>

              <div class="form-actions">
                <button mat-flat-button (click)="onCalculate()" [disabled]="calculating()">
                  @if (calculating()) {
                    <mat-spinner diameter="20" />
                  } @else {
                    <ng-container><mat-icon>calculate</mat-icon> Calcular</ng-container>
                  }
                </button>
                <button mat-button (click)="onSaveConfig()" [disabled]="savingConfig()">
                  <mat-icon>save</mat-icon>
                  Salvar Config
                </button>
              </div>
            </form>
          </mat-card-content>
        </mat-card>

        <!-- Resultado -->
        @if (result()) {
          <mat-card class="result-card">
            <mat-card-header>
              <mat-card-title>
                Demonstrativo — Padrão {{ result()!.padrao }} ({{ result()!.year }})
              </mat-card-title>
              @if (result()!.effective_year !== result()!.year) {
                <mat-card-subtitle>
                  Usando tabela de {{ result()!.effective_year }} ({{ result()!.year }} não aprovado)
                </mat-card-subtitle>
              }
            </mat-card-header>
            <mat-card-content>
              <h3>Proventos</h3>
              <table class="paycheck-table">
                <tr>
                  <td>Vencimento Básico (VB)</td>
                  <td class="value">{{ result()!.vb | currencyBrl }}</td>
                </tr>
                <tr>
                  <td>Gratificação por Carreira (GAL)</td>
                  <td class="value">{{ result()!.gal | currencyBrl }}</td>
                </tr>
                @if (+result()!.gr > 0) {
                  <tr>
                    <td>Gratificação de Representação (GR)</td>
                    <td class="value">{{ result()!.gr | currencyBrl }}</td>
                  </tr>
                }
                <tr>
                  <td>GDAE</td>
                  <td class="value">{{ result()!.gdae | currencyBrl }}</td>
                </tr>
                @if (+result()!.aeq > 0) {
                  <tr>
                    <td>AEQ</td>
                    <td class="value">{{ result()!.aeq | currencyBrl }}</td>
                  </tr>
                }
                <tr>
                  <td>VPI</td>
                  <td class="value">{{ result()!.vpi | currencyBrl }}</td>
                </tr>
                @if (+result()!.fc > 0) {
                  <tr>
                    <td>Função Comissionada</td>
                    <td class="value">{{ result()!.fc | currencyBrl }}</td>
                  </tr>
                }
                @if (+result()!.abate_teto > 0) {
                  <tr class="negative">
                    <td>Abate-Teto</td>
                    <td class="value">- {{ result()!.abate_teto | currencyBrl }}</td>
                  </tr>
                }
                <tr>
                  <td>Auxílio Alimentação</td>
                  <td class="value">{{ result()!.auxilio_alimentacao | currencyBrl }}</td>
                </tr>
                @if (+result()!.auxilio_creche > 0) {
                  <tr>
                    <td>Auxílio Creche</td>
                    <td class="value">{{ result()!.auxilio_creche | currencyBrl }}</td>
                  </tr>
                }
                <tr class="subtotal">
                  <td>Total Bruto</td>
                  <td class="value">{{ result()!.bruto_total | currencyBrl }}</td>
                </tr>
              </table>

              <h3>Descontos</h3>
              <table class="paycheck-table">
                <tr>
                  <td>PSS (Previdência)</td>
                  <td class="value negative">- {{ result()!.pss | currencyBrl }}</td>
                </tr>
                @if (+result()!.funpresp > 0) {
                  <tr>
                    <td>Funpresp</td>
                    <td class="value negative">- {{ result()!.funpresp | currencyBrl }}</td>
                  </tr>
                }
                <tr>
                  <td>IRPF</td>
                  <td class="value negative">- {{ result()!.irpf | currencyBrl }}</td>
                </tr>
                <tr class="subtotal">
                  <td>Total Descontos</td>
                  <td class="value negative">- {{ result()!.total_descontos | currencyBrl }}</td>
                </tr>
              </table>

              <table class="paycheck-table">
                <tr class="total">
                  <td>Líquido</td>
                  <td class="value">{{ result()!.liquido | currencyBrl }}</td>
                </tr>
              </table>

              <div class="snapshot-actions">
                <button mat-flat-button (click)="onGenerateSnapshot()" [disabled]="generatingSnapshot()">
                  @if (generatingSnapshot()) {
                    <mat-spinner diameter="20" />
                  } @else {
                    <ng-container><mat-icon>save_alt</mat-icon> Salvar como Snapshot</ng-container>
                  }
                </button>
              </div>
            </mat-card-content>
          </mat-card>
        }
      </div>
    }
  `,
  styles: `
    .page-header {
      margin-bottom: 24px;
    }
    .page-header h1 {
      margin: 0;
      font-size: 1.5rem;
    }
    .salary-layout {
      display: flex;
      gap: 24px;
      align-items: flex-start;
      flex-wrap: wrap;
    }
    .config-card {
      flex: 0 0 380px;
      max-width: 400px;
    }
    .result-card {
      flex: 1;
      min-width: 380px;
    }
    .config-form {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding-top: 16px;
    }
    .row {
      display: flex;
      gap: 12px;
    }
    .half-width { flex: 1; }
    .full-width { width: 100%; }
    .small-field { width: 100px; }
    .toggle-row {
      display: flex;
      align-items: center;
      gap: 16px;
      margin: 8px 0;
    }
    .checkboxes {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
      margin: 8px 0;
    }
    .form-actions {
      display: flex;
      gap: 12px;
      margin-top: 16px;
    }
    h3 {
      margin: 16px 0 8px;
      font-size: 0.95rem;
      color: var(--mat-sys-on-surface-variant);
    }
    .paycheck-table {
      width: 100%;
      border-collapse: collapse;
    }
    .paycheck-table td {
      padding: 6px 0;
      border-bottom: 1px solid var(--mat-sys-outline-variant);
    }
    .paycheck-table .value {
      text-align: right;
      font-family: 'Roboto Mono', monospace;
      white-space: nowrap;
    }
    .paycheck-table .negative {
      color: #c62828;
    }
    .paycheck-table .subtotal td {
      font-weight: 500;
      border-bottom: 2px solid var(--mat-sys-outline);
    }
    .paycheck-table .total td {
      font-weight: 700;
      font-size: 1.1rem;
      color: var(--mat-sys-primary);
      border-bottom: none;
      padding-top: 12px;
    }
    .snapshot-actions {
      margin-top: 24px;
      display: flex;
      justify-content: flex-end;
    }
    .loading {
      display: flex;
      justify-content: center;
      padding: 48px;
    }
  `,
})
export class SalaryConfigPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly salaryService = inject(SalaryService);
  private readonly snackBar = inject(MatSnackBar);

  loading = signal(true);
  calculating = signal(false);
  savingConfig = signal(false);
  generatingSnapshot = signal(false);
  result = signal<SalaryResult | null>(null);

  private configId = '';

  padroes = [36, 37, 38, 39, 40, 41, 42, 43, 44, 45];
  fcOptions = ['FC-1', 'FC-2', 'FC-3', 'FC-4', 'FC-5', 'FC-6', 'FC-7'];

  form: FormGroup = this.fb.group({
    padrao: [38, Validators.required],
    year: [2026, Validators.required],
    gdae_perc: [40, [Validators.required, Validators.min(40), Validators.max(100)]],
    has_aeq: [false],
    aeq_perc: [0],
    vpi: [84.08],
    has_funpresp: [false],
    funpresp_perc: [8.5],
    funcao_comissionada: [''],
    has_creche: [false],
    num_filhos: [0],
    dependentes_ir: [0],
    approved_2026: [true],
    approved_2027: [false],
    approved_2028: [false],
    approved_2029: [false],
  });

  ngOnInit(): void {
    this.salaryService.getCurrentConfig().subscribe({
      next: (config) => {
        this.configId = config.id;
        this.form.patchValue({
          padrao: config.padrao,
          gdae_perc: +config.gdae_perc,
          has_aeq: config.has_aeq,
          aeq_perc: +config.aeq_perc,
          vpi: +config.vpi,
          has_funpresp: config.has_funpresp,
          funpresp_perc: +config.funpresp_perc,
          funcao_comissionada: config.funcao_comissionada,
          has_creche: config.has_creche,
          num_filhos: config.num_filhos,
          dependentes_ir: config.dependentes_ir,
          approved_2026: config.approved_2026,
          approved_2027: config.approved_2027,
          approved_2028: config.approved_2028,
          approved_2029: config.approved_2029,
        });
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onCalculate(): void {
    this.calculating.set(true);
    const v = this.form.value;
    const req: CalculateRequest = {
      padrao: v.padrao,
      year: v.year,
      gdae_perc: v.gdae_perc,
      has_aeq: v.has_aeq,
      aeq_perc: v.aeq_perc,
      vpi: v.vpi,
      has_funpresp: v.has_funpresp,
      funpresp_perc: v.funpresp_perc,
      funcao_comissionada: v.funcao_comissionada || '',
      has_creche: v.has_creche,
      num_filhos: v.num_filhos,
      dependentes_ir: v.dependentes_ir,
      approved_2026: v.approved_2026,
      approved_2027: v.approved_2027,
      approved_2028: v.approved_2028,
      approved_2029: v.approved_2029,
    };
    this.salaryService.calculate(req).subscribe({
      next: (res) => {
        this.result.set(res);
        this.calculating.set(false);
      },
      error: () => {
        this.calculating.set(false);
        this.snackBar.open('Erro ao calcular.', 'OK', { duration: 3000 });
      },
    });
  }

  onSaveConfig(): void {
    this.savingConfig.set(true);
    const v = this.form.value;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { year, ...configData } = v;
    this.salaryService.updateConfig(this.configId, configData).subscribe({
      next: () => {
        this.savingConfig.set(false);
        this.snackBar.open('Configuração salva!', 'OK', { duration: 3000 });
      },
      error: () => {
        this.savingConfig.set(false);
        this.snackBar.open('Erro ao salvar configuração.', 'OK', {
          duration: 3000,
        });
      },
    });
  }

  onGenerateSnapshot(): void {
    this.generatingSnapshot.set(true);
    const year = this.form.get('year')?.value;
    const now = new Date();
    const month =
      year === now.getFullYear()
        ? `${year}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
        : `${year}-01-01`;

    this.salaryService.generateSnapshot(month).subscribe({
      next: () => {
        this.generatingSnapshot.set(false);
        this.snackBar.open('Snapshot salvo!', 'OK', { duration: 3000 });
      },
      error: () => {
        this.generatingSnapshot.set(false);
        this.snackBar.open('Erro ao salvar snapshot.', 'OK', {
          duration: 3000,
        });
      },
    });
  }
}
