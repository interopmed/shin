from django.contrib import admin
from django.urls import include, path

urlpatterns = [
  path("admin/", admin.site.urls),
  path("api/", include("apps.core.urls")),
]

# ---------------------------------------------------------------------------
# Dynamically wire URL routes from installed modules
# ---------------------------------------------------------------------------
# Module manifests declare URL prefixes and Django URL modules via the
# "djangoApps" section.  settings.MODULE_URL_ENTRIES is populated at startup.
# ---------------------------------------------------------------------------
from django.conf import settings  # noqa: E402

for _entry in getattr(settings, "MODULE_URL_ENTRIES", []):
  urlpatterns.append(
    path(_entry["prefix"], include(_entry["module"]))
  )
