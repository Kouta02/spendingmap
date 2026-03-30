from rest_framework.viewsets import ModelViewSet

from .models import ThirdParty
from .serializers import ThirdPartySerializer


class ThirdPartyViewSet(ModelViewSet):
    queryset = ThirdParty.objects.all()
    serializer_class = ThirdPartySerializer
    search_fields = ['name']
