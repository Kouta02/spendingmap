from django.urls import path

from . import views

urlpatterns = [
    path('summary/', views.monthly_summary, name='dashboard-summary'),
    path('by-category/', views.expenses_by_category, name='dashboard-by-category'),
    path('by-bank/', views.expenses_by_bank, name='dashboard-by-bank'),
    path('evolution/', views.monthly_evolution, name='dashboard-evolution'),
]
