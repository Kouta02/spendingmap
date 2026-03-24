from rest_framework.routers import DefaultRouter

from .views import PaymentTypeViewSet

router = DefaultRouter()
router.register('', PaymentTypeViewSet)

urlpatterns = router.urls
