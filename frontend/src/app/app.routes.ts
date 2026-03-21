import { Routes } from '@angular/router';
import { Layout } from './features/layout/layout';

export const routes: Routes = [
  {
    path: '',
    component: Layout,
    children: [
      { path: '', redirectTo: 'expenses', pathMatch: 'full' },
      {
        path: 'expenses',
        loadComponent: () =>
          import('./features/expenses/pages/expense-list/expense-list').then(
            (m) => m.ExpenseList
          ),
      },
      {
        path: 'expenses/new',
        loadComponent: () =>
          import('./features/expenses/pages/expense-form/expense-form').then(
            (m) => m.ExpenseForm
          ),
      },
      {
        path: 'expenses/:id/edit',
        loadComponent: () =>
          import('./features/expenses/pages/expense-form/expense-form').then(
            (m) => m.ExpenseForm
          ),
      },
      {
        path: 'categories',
        loadComponent: () =>
          import(
            './features/categories/pages/category-list/category-list'
          ).then((m) => m.CategoryList),
      },
      {
        path: 'categories/new',
        loadComponent: () =>
          import(
            './features/categories/pages/category-form/category-form'
          ).then((m) => m.CategoryForm),
      },
      {
        path: 'categories/:id/edit',
        loadComponent: () =>
          import(
            './features/categories/pages/category-form/category-form'
          ).then((m) => m.CategoryForm),
      },
      {
        path: 'banks',
        loadComponent: () =>
          import('./features/banks/pages/bank-list/bank-list').then(
            (m) => m.BankList
          ),
      },
      {
        path: 'banks/new',
        loadComponent: () =>
          import('./features/banks/pages/bank-form/bank-form').then(
            (m) => m.BankForm
          ),
      },
      {
        path: 'banks/:id/edit',
        loadComponent: () =>
          import('./features/banks/pages/bank-form/bank-form').then(
            (m) => m.BankForm
          ),
      },
    ],
  },
];
