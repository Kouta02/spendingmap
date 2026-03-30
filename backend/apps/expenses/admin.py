from django.contrib import admin

from .models import Expense


@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = (
        'description', 'amount', 'date', 'category',
        'payment_type', 'third_party', 'is_installment', 'from_paycheck',
    )
    list_filter = ('payment_type', 'is_installment', 'is_recurring', 'from_paycheck', 'category', 'third_party')
    search_fields = ('description', 'notes')
    date_hierarchy = 'date'
