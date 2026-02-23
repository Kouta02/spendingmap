from rest_framework.viewsets import ModelViewSet

from .models import Bank
from .serializers import BankSerializer


class BankViewSet(ModelViewSet):
    queryset = Bank.objects.all()
    serializer_class = BankSerializer
    search_fields = ['name']
