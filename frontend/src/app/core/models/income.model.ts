export interface IncomeCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface IncomeCategoryCreate {
  name: string;
  icon: string;
  color: string;
}

export interface Income {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string | null;
  category_name: string | null;
  third_party: string | null;
  third_party_name: string | null;
  credit_card: string | null;
  credit_card_name: string | null;
  is_recurring: boolean;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface IncomeCreate {
  description: string;
  amount: number;
  date: string;
  category?: string | null;
  third_party?: string | null;
  credit_card?: string | null;
  is_recurring?: boolean;
  notes?: string;
}

export interface IncomeFilters {
  month?: string;
  category?: string;
  third_party?: string;
  is_recurring?: string;
  ordering?: string;
}
