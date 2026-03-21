from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import SalaryConfigViewSet, SalarySnapshotViewSet, SalaryCalculationViewSet

router = DefaultRouter()
router.register(r'config', SalaryConfigViewSet, basename='salary-config')
router.register(r'snapshots', SalarySnapshotViewSet, basename='salary-snapshot')
router.register(r'', SalaryCalculationViewSet, basename='salary-calculation')

urlpatterns = [
    path('', include(router.urls)),
]
