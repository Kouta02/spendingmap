import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'currencyBrl', standalone: true })
export class CurrencyBrlPipe implements PipeTransform {
  transform(value: number | string | null | undefined): string {
    if (value === null || value === undefined) return 'R$ 0,00';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return 'R$ 0,00';
    return num.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  }
}
