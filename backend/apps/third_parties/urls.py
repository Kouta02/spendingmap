from rest_framework.routers import DefaultRouter

from .views import ThirdPartyViewSet

router = DefaultRouter()
router.register('', ThirdPartyViewSet)

urlpatterns = router.urls
