import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { NgxMaskDirective } from 'ngx-mask';

export interface MarkPaidDialogData {
  description: string;
  amount: number;
  dueDate: string;
}

export interface MarkPaidDialogResult {
  confirmed: boolean;
  amount: number;
}

@Component({
  selector: 'app-mark-paid-dialog',
  standalone: true,
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    NgxMaskDirective,
  ],
  template: `
    <h2 mat-dialog-title>Marcar como Pago</h2>
    <mat-dialog-content>
      <p><strong>{{ data.description }}</strong></p>
      <p>Vencimento: {{ data.dueDate }}</p>
      <mat-form-field appearance="outline" style="width: 100%; margin-top: 12px;">
        <mat-label>Valor pago (R$)</mat-label>
        <input
          matInput
          [(ngModel)]="amount"
          mask="separator.2"
          thousandSeparator="."
          decimalMarker=","
          prefix="R$ "
        />
        <mat-hint>Ajuste se o valor pago for diferente do original</mat-hint>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close(null)">Cancelar</button>
      <button mat-flat-button (click)="confirm()">
        Confirmar Pagamento
      </button>
    </mat-dialog-actions>
  `,
})
export class MarkPaidDialog {
  readonly data = inject<MarkPaidDialogData>(MAT_DIALOG_DATA);
  readonly dialogRef = inject(MatDialogRef<MarkPaidDialog>);

  amount: number = this.data.amount;

  confirm(): void {
    const parsed = typeof this.amount === 'string'
      ? parseFloat(String(this.amount).replace(/\./g, '').replace(',', '.'))
      : this.amount;
    this.dialogRef.close({ confirmed: true, amount: parsed } as MarkPaidDialogResult);
  }
}
