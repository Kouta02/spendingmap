from django.contrib import admin

from .models import ThirdParty


@admin.register(ThirdParty)
class ThirdPartyAdmin(admin.ModelAdmin):
    list_display = ('name', 'relationship', 'created_at')
    search_fields = ('name',)
