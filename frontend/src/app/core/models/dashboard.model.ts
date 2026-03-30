export interface MonthlySummary {
  month: string;
  remuneracao_bruta: string;
  remuneracao_liquida: string;
  total_descontos_salario: string;
  quantidade_descontos: number;
  total_despesas: string;
  quantidade_despesas: number;
  total_outras_receitas: string;
  quantidade_receitas: number;
  saldo_livre: string;
  has_snapshot: boolean;
  is_predicted?: boolean;
}

export interface CategoryBreakdown {
  category_id: string | null;
  category_name: string;
  category_color: string;
  total: string;
  count: number;
}

export interface CreditCardBreakdown {
  credit_card_id: string | null;
  credit_card_name: string;
  total: string;
  count: number;
}

export interface ThirdPartyBreakdown {
  third_party_id: string | null;
  third_party_name: string;
  total: string;
  count: number;
}

export interface MonthlyEvolution {
  month: string;
  despesas: string;
  quantidade: number;
  receita_liquida: string;
}
