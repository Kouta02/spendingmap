from rest_framework.viewsets import ModelViewSet
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from .models import Goal
from .serializers import GoalSerializer


class GoalViewSet(ModelViewSet):
    queryset = Goal.objects.select_related('category').all()
    serializer_class = GoalSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['month', 'category']

    @action(detail=False, methods=['get'])
    def alerts(self, request):
        """Retorna metas com status 'alerta' ou 'excedido' para o dashboard."""
        month = request.query_params.get('month')
        qs = self.get_queryset()
        if month:
            year, m = month.split('-')
            qs = qs.filter(month__year=int(year), month__month=int(m))

        serializer = self.get_serializer(qs, many=True)
        alerts = [g for g in serializer.data if g['status'] in ('alerta', 'excedido')]
        return Response(alerts)
