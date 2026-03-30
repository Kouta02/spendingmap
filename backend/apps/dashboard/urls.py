from django.urls import path

from . import views

urlpatterns = [
    path('summary/', views.monthly_summary, name='dashboard-summary'),
    path('by-category/', views.expenses_by_category, name='dashboard-by-category'),
    path('by-credit-card/', views.expenses_by_credit_card, name='dashboard-by-credit-card'),
    path('by-third-party/', views.expenses_by_third_party, name='dashboard-by-third-party'),
    path('evolution/', views.monthly_evolution, name='dashboard-evolution'),
    path('expense-details/', views.expense_details, name='dashboard-expense-details'),
]
