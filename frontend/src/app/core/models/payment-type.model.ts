export interface PaymentType {
  id: string;
  name: string;
  icon: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentTypeCreate {
  name: string;
  icon: string;
}
