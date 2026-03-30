export interface ReportSummary {
  period: { start: string; end: string };
  total: string;
  total_externo: string;
  total_contracheque: string;
  count: number;
  by_payment_type: {
    payment_type: string;
    total: string;
    count: number;
  }[];
}

export interface ReportByCategory {
  period: { start: string; end: string };
  total: string;
  data: {
    category_id: string | null;
    category_name: string;
    category_color: string;
    total: string;
    count: number;
    percentage: number;
  }[];
}

export interface InstallmentGroup {
  installment_group_id: string;
  description: string;
  amount_per_installment: string;
  category_name: string | null;
  credit_card_name: string | null;
  installment_total: number;
  remaining: number;
  total_remaining: string;
  installments: {
    date: string;
    installment_current: number;
    amount: string;
  }[];
}

export interface InstallmentsReport {
  from_month: string;
  total_remaining: string;
  groups_count: number;
  data: InstallmentGroup[];
}

export interface MonthlyComparison {
  month: string;
  month_label: string;
  receita_liquida: string;
  total_despesas: string;
  quantidade_despesas: number;
  saldo: string;
}
