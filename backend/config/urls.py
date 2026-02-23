from django.contrib import admin
from django.urls import include, path
from rest_framework.authtoken.views import obtain_auth_token

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/login/', obtain_auth_token, name='api-login'),
    path('api/categories/', include('apps.categories.urls')),
    path('api/banks/', include('apps.banks.urls')),
    path('api/expenses/', include('apps.expenses.urls')),
]
