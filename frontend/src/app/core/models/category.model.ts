export interface Category {
  id: string;
  name: string;
  parent: string | null;
  icon: string;
  color: string;
  full_path: string;
  children: Category[];
  created_at: string;
  updated_at: string;
}

export interface CategoryFlat {
  id: string;
  name: string;
  parent: string | null;
  icon: string;
  color: string;
  full_path: string;
  created_at: string;
  updated_at: string;
}

export interface CategoryCreate {
  name: string;
  parent?: string | null;
  icon?: string;
  color?: string;
}
