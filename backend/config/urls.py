from django.contrib import admin
from django.urls import include, path
from apps.authentication import EmailTokenObtainPairView
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
  path("admin/", admin.site.urls),
  path("api/auth/login/", EmailTokenObtainPairView.as_view(), name="token_obtain_pair"),
  path("api/auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
  path("api/appointment/", include("apps.appointment.urls")),
  path("api/doctors/", include("apps.doctors.urls")),
  path("api/employees/", include("apps.employees.urls")),
  path("api/finance/", include("apps.finance.urls")),
  path("api/lab/", include("apps.lab.urls")),
  path("api/prescription/", include("apps.prescription.urls")),
  path("api/sales/", include("apps.sales.urls")),
  path("api/schedule/", include("apps.schedule.urls")),
  path("api/settings/", include("apps.settings.urls")),
  path("api/sms/", include("apps.sms.urls")),
  path("api/stocks/", include("apps.stocks.urls")),
  path("api/", include("apps.core.urls")),
]
