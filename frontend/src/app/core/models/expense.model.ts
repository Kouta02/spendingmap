export interface Expense {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string | null;
  category_name: string | null;
  payment_type: PaymentType;
  bank: string | null;
  bank_name: string | null;
  is_installment: boolean;
  installment_current: number | null;
  installment_total: number | null;
  installment_group_id: string | null;
  is_recurring: boolean;
  from_paycheck: boolean;
  notes: string;
  created_at: string;
  updated_at: string;
}

export type PaymentType = 'CREDIT' | 'DEBIT' | 'BOLETO' | 'PIX';

export interface ExpenseCreate {
  description: string;
  amount: number;
  date: string;
  category?: string | null;
  payment_type: PaymentType;
  bank?: string | null;
  is_installment?: boolean;
  installment_total?: number | null;
  is_recurring?: boolean;
  notes?: string;
}

export interface ExpenseFilters {
  month?: string;
  category?: string;
  bank?: string;
  payment_type?: PaymentType;
  is_installment?: string;
  is_recurring?: string;
  from_paycheck?: string;
  search?: string;
  ordering?: string;
}
