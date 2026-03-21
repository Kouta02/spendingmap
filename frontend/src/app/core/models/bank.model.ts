export interface Bank {
  id: string;
  name: string;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface BankCreate {
  name: string;
  color?: string;
}
