from django.contrib import admin
from django.urls import include, path
from rest_framework.authtoken.views import obtain_auth_token

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/login/', obtain_auth_token, name='api-login'),
    path('api/categories/', include('apps.categories.urls')),
    path('api/third-parties/', include('apps.third_parties.urls')),
    path('api/expenses/', include('apps.expenses.urls')),
    path('api/salary/', include('apps.salary.urls')),
    path('api/dashboard/', include('apps.dashboard.urls')),
    path('api/goals/', include('apps.goals.urls')),
    path('api/reports/', include('apps.reports.urls')),
    path('api/payment-types/', include('apps.payment_types.urls')),
    path('api/incomes/', include('apps.incomes.urls')),
    path('api/financial-calendar/', include('apps.financial_calendar.urls')),
]
