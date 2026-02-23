from django.contrib import admin

from .models import Expense


@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = (
        'description', 'amount', 'date', 'category',
        'payment_type', 'bank', 'is_installment', 'from_paycheck',
    )
    list_filter = ('payment_type', 'is_installment', 'is_recurring', 'from_paycheck', 'category', 'bank')
    search_fields = ('description', 'notes')
    date_hierarchy = 'date'
