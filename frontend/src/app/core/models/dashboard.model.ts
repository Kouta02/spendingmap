export interface MonthlySummary {
  month: string;
  receita_liquida: string;
  receita_bruta: string;
  total_descontos_salario: string;
  total_despesas: string;
  quantidade_despesas: number;
  saldo_livre: string;
  has_snapshot: boolean;
}

export interface CategoryBreakdown {
  category_id: string | null;
  category_name: string;
  category_color: string;
  total: string;
  count: number;
}

export interface BankBreakdown {
  bank_id: string | null;
  bank_name: string;
  bank_color: string;
  total: string;
  count: number;
}

export interface MonthlyEvolution {
  month: string;
  despesas: string;
  quantidade: number;
  receita_liquida: string;
}
