from rest_framework import serializers

from .models import Category


class CategorySerializer(serializers.ModelSerializer):
    full_path = serializers.CharField(read_only=True)
    children = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = [
            'id', 'name', 'parent', 'icon', 'color',
            'full_path', 'children',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_children(self, obj: Category) -> list:
        children = obj.children.all()
        if children.exists():
            return CategorySerializer(children, many=True).data
        return []
