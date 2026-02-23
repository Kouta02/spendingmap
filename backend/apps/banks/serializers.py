from rest_framework import serializers

from .models import Bank


class BankSerializer(serializers.ModelSerializer):
    class Meta:
        model = Bank
        fields = ['id', 'name', 'color', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
