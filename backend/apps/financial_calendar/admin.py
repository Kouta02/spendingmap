from django.contrib import admin

from .models import CreditCard, PaymentDate

admin.site.register(PaymentDate)
admin.site.register(CreditCard)
