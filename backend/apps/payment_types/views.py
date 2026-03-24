from rest_framework.viewsets import ModelViewSet

from .models import PaymentType
from .serializers import PaymentTypeSerializer


class PaymentTypeViewSet(ModelViewSet):
    queryset = PaymentType.objects.all()
    serializer_class = PaymentTypeSerializer
    search_fields = ['name']
