export interface Goal {
  id: string;
  name: string;
  category: string | null;
  category_name: string | null;
  amount_limit: string;
  month: string;
  current_spending: string;
  percentage: number;
  status: 'ok' | 'alerta' | 'excedido';
  created_at: string;
  updated_at: string;
}

export interface GoalCreate {
  name: string;
  category?: string | null;
  amount_limit: number;
  month: string;
}
