from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import ExpenseViewSet, boleto_alerts

router = DefaultRouter()
router.register('', ExpenseViewSet)

urlpatterns = [
    path('boleto-alerts/', boleto_alerts, name='boleto-alerts'),
] + router.urls
