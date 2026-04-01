from django.urls import path

from . import views

urlpatterns = [
    path('summary/', views.summary_by_period, name='report-summary'),
    path('by-category/', views.by_category_period, name='report-by-category'),
    path('installments/', views.installments_projection, name='report-installments'),
    path('comparison/', views.monthly_comparison, name='report-comparison'),
    path('expenses-by-category/', views.expenses_by_category_detail, name='report-expenses-by-category'),
]
