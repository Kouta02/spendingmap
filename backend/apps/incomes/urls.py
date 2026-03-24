from rest_framework.routers import DefaultRouter

from .views import IncomeViewSet, IncomeCategoryViewSet

router = DefaultRouter()
router.register('categories', IncomeCategoryViewSet)
router.register('', IncomeViewSet)

urlpatterns = router.urls
