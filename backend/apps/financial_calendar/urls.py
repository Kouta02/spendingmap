from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    CreditCardViewSet,
    PaymentDateViewSet,
    current_financial_month_view,
    financial_months_view,
)

router = DefaultRouter()
router.register('payment-dates', PaymentDateViewSet)
router.register('credit-cards', CreditCardViewSet)

urlpatterns = [
    path('financial-months/', financial_months_view, name='financial-months'),
    path('current-month/', current_financial_month_view, name='current-financial-month'),
] + router.urls
