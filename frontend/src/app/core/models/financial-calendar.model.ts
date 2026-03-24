export interface PaymentDate {
  id: string;
  year: number;
  month: number;
  payment_day: number;
  created_at: string;
  updated_at: string;
}

export interface PaymentDateBulk {
  year: number;
  dates: { month: number; payment_day: number }[];
}

export interface CreditCard {
  id: string;
  name: string;
  closing_day: number;
  due_day: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreditCardCreate {
  name: string;
  closing_day: number;
  due_day: number;
  is_active?: boolean;
}

export interface FinancialMonth {
  month: number;
  label: string;
  start: string;
  end: string;
}
