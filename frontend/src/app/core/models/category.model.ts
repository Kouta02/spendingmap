export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface CategoryCreate {
  name: string;
  icon?: string;
  color?: string;
}
