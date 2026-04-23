export interface Expense {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string | null;
  category_name: string | null;
  payment_type: string | null;
  payment_type_name: string | null;
  third_party: string | null;
  third_party_name: string | null;
  credit_card: string | null;
  credit_card_name: string | null;
  financial_month: string | null;
  is_installment: boolean;
  installment_current: number | null;
  installment_total: number | null;
  installment_group_id: string | null;
  is_recurring: boolean;
  from_paycheck: boolean;
  due_day: number | null;
  due_date: string | null;
  boleto_status: 'pending' | 'paid' | null;
  is_predicted: boolean;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface ExpenseCreate {
  description: string;
  amount: number;
  date: string;
  category?: string | null;
  payment_type?: string | null;
  third_party?: string | null;
  credit_card?: string | null;
  is_installment?: boolean;
  installment_total?: number | null;
  installment_start?: number;
  is_recurring?: boolean;
  due_day?: number | null;
  boleto_status?: string | null;
  notes?: string;
}

export interface ExpenseFilters {
  month?: string;
  category?: string;
  third_party?: string;
  credit_card?: string;
  payment_type?: string;
  is_installment?: string;
  is_recurring?: string;
  from_paycheck?: string;
  search?: string;
  ordering?: string;
}
