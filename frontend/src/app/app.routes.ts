import { Routes } from '@angular/router';
import { Layout } from './features/layout/layout';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/pages/login/login').then((m) => m.LoginPage),
  },
  {
    path: '',
    component: Layout,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import(
            './features/dashboard/pages/dashboard/dashboard'
          ).then((m) => m.DashboardPage),
      },
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
        path: 'incomes',
        loadComponent: () =>
          import('./features/incomes/pages/income-list/income-list').then(
            (m) => m.IncomeList
          ),
      },
      {
        path: 'incomes/new',
        loadComponent: () =>
          import('./features/incomes/pages/income-form/income-form').then(
            (m) => m.IncomeForm
          ),
      },
      {
        path: 'incomes/:id/edit',
        loadComponent: () =>
          import('./features/incomes/pages/income-form/income-form').then(
            (m) => m.IncomeForm
          ),
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./features/settings/pages/settings/settings').then(
            (m) => m.SettingsPage
          ),
        children: [
          { path: '', redirectTo: 'categories', pathMatch: 'full' },
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
            path: 'third-parties',
            loadComponent: () =>
              import('./features/third-parties/pages/third-party-list/third-party-list').then(
                (m) => m.ThirdPartyList
              ),
          },
          {
            path: 'third-parties/new',
            loadComponent: () =>
              import('./features/third-parties/pages/third-party-form/third-party-form').then(
                (m) => m.ThirdPartyForm
              ),
          },
          {
            path: 'third-parties/:id/edit',
            loadComponent: () =>
              import('./features/third-parties/pages/third-party-form/third-party-form').then(
                (m) => m.ThirdPartyForm
              ),
          },
          {
            path: 'payment-types',
            loadComponent: () =>
              import(
                './features/settings/pages/payment-type-list/payment-type-list'
              ).then((m) => m.PaymentTypeList),
          },
          {
            path: 'payment-types/new',
            loadComponent: () =>
              import(
                './features/settings/pages/payment-type-form/payment-type-form'
              ).then((m) => m.PaymentTypeForm),
          },
          {
            path: 'payment-types/:id/edit',
            loadComponent: () =>
              import(
                './features/settings/pages/payment-type-form/payment-type-form'
              ).then((m) => m.PaymentTypeForm),
          },
          {
            path: 'payment-dates',
            loadComponent: () =>
              import(
                './features/settings/pages/payment-dates/payment-dates'
              ).then((m) => m.PaymentDatesPage),
          },
          {
            path: 'credit-cards',
            loadComponent: () =>
              import(
                './features/settings/pages/credit-card-list/credit-card-list'
              ).then((m) => m.CreditCardList),
          },
          {
            path: 'credit-cards/new',
            loadComponent: () =>
              import(
                './features/settings/pages/credit-card-form/credit-card-form'
              ).then((m) => m.CreditCardForm),
          },
          {
            path: 'credit-cards/:id/edit',
            loadComponent: () =>
              import(
                './features/settings/pages/credit-card-form/credit-card-form'
              ).then((m) => m.CreditCardForm),
          },
        ],
      },
      {
        path: 'salary',
        loadComponent: () =>
          import(
            './features/salary/pages/salary-config/salary-config'
          ).then((m) => m.SalaryConfigPage),
      },
      {
        path: 'salary/history',
        loadComponent: () =>
          import(
            './features/salary/pages/salary-snapshot/salary-snapshot'
          ).then((m) => m.SalarySnapshotPage),
      },
      {
        path: 'salary/projection',
        loadComponent: () =>
          import(
            './features/salary/pages/salary-projection/salary-projection'
          ).then((m) => m.SalaryProjectionPage),
      },
      {
        path: 'goals',
        loadComponent: () =>
          import('./features/goals/pages/goal-list/goal-list').then(
            (m) => m.GoalList
          ),
      },
      {
        path: 'reports',
        loadComponent: () =>
          import('./features/reports/pages/reports/reports').then(
            (m) => m.ReportsPage
          ),
      },
    ],
  },
];
