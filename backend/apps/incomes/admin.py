from django.contrib import admin

from .models import Income, IncomeCategory

admin.site.register(IncomeCategory)
admin.site.register(Income)
