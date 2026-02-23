from rest_framework.routers import DefaultRouter

from .views import BankViewSet

router = DefaultRouter()
router.register('', BankViewSet)

urlpatterns = router.urls
