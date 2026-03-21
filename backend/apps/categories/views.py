from rest_framework.viewsets import ModelViewSet
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Category
from .serializers import CategorySerializer


class CategoryViewSet(ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    search_fields = ['name']

    @action(detail=False, methods=['get'])
    def tree(self, request):
        """Retorna apenas categorias raiz, com filhos aninhados recursivamente."""
        roots = Category.objects.filter(parent__isnull=True)
        serializer = CategorySerializer(roots, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def flat(self, request):
        """Retorna todas as categorias em lista plana com full_path."""
        categories = Category.objects.select_related('parent').all()
        serializer = CategorySerializer(categories, many=True)
        # Remove children no flat para simplificar
        data = []
        for item in serializer.data:
            item_copy = {k: v for k, v in item.items() if k != 'children'}
            data.append(item_copy)
        return Response(data)
