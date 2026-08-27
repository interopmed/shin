from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlparse

BASE_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BASE_DIR.parent

# ---------------------------------------------------------------------------
# Module backend discovery
# ---------------------------------------------------------------------------
# Each installed module (e.g. shin-ehr) may declare Django apps in its
# interopmed.module.json via a "djangoApps" array.  We read the manifest,
# add the module's backend/ directory to sys.path, and append its apps to
# INSTALLED_APPS — all from a single Django server on port 8000.
# ---------------------------------------------------------------------------
_STATE_FILE = PROJECT_ROOT / ".shin-node" / "state.json"


def _discover_module_django_apps() -> tuple[list[str], list[dict]]:
  """
  Scan installed+enabled modules for djangoApps declarations.

  Returns:
    app_labels:  list of Django app labels to add to INSTALLED_APPS
    url_entries: list of {"prefix": ..., "module": ...} for URL wiring
  """
  if not _STATE_FILE.exists():
    return [], []

  try:
    state = json.loads(_STATE_FILE.read_text(encoding="utf-8"))
  except (json.JSONDecodeError, OSError):
    return [], []

  app_labels: list[str] = []
  url_entries: list[dict] = []
  seen_paths: set[str] = set()

  modules = state.get("installedModules", [])
  # Prioritize other modules over lab to prevent lab's legacy/empty app dirs from shadowing new ones
  modules = sorted(modules, key=lambda m: 1 if m.get("moduleId") == "lab" else 0)

  for mod in modules:
    if mod.get("status") != "enabled":
      continue
    repo_url = mod.get("repositoryUrl", "")
    if not repo_url:
      continue

    module_root = (PROJECT_ROOT / repo_url).resolve()
    backend_dir = module_root / "backend"

    # Read the module manifest for djangoApps declarations
    manifest_path = module_root / "interopmed.module.json"
    if not manifest_path.exists():
      continue
    try:
      manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
      continue

    django_apps = manifest.get("djangoApps", [])
    if not django_apps or not backend_dir.is_dir():
      continue

    # Add this module's backend/ to sys.path (once)
    backend_str = str(backend_dir)
    if backend_str not in seen_paths:
      seen_paths.add(backend_str)
      if backend_str not in sys.path:
        sys.path.append(backend_str)

    for entry in django_apps:
      label = entry.get("appLabel", "")
      if label:
        app_labels.append(label)
      url_prefix = entry.get("urlPrefix")
      url_module = entry.get("urlModule")
      if url_prefix and url_module:
        url_entries.append({"prefix": url_prefix, "module": url_module})

  return app_labels, url_entries


_MODULE_APP_LABELS, MODULE_URL_ENTRIES = _discover_module_django_apps()


def load_env_file(path: Path) -> None:
  if not path.exists():
    return

  for line in path.read_text(encoding="utf-8").splitlines():
    raw = line.strip()
    if not raw or raw.startswith("#") or "=" not in raw:
      continue

    key, value = raw.split("=", 1)
    key = key.strip()
    value = value.strip().strip('"').strip("'")
    os.environ.setdefault(key, value)


load_env_file(PROJECT_ROOT / ".env.local")
load_env_file(PROJECT_ROOT / ".env")


def parse_database_url(url: str) -> dict[str, str]:
  parsed = urlparse(url)
  query = parse_qs(parsed.query)
  return {
    "ENGINE": "django.db.backends.postgresql",
    "NAME": parsed.path.lstrip("/"),
    "USER": unquote(parsed.username or ""),
    "PASSWORD": unquote(parsed.password or ""),
    "HOST": parsed.hostname or "localhost",
    "PORT": str(parsed.port or 5432),
    "OPTIONS": {
      **({"sslmode": query["sslmode"][0]} if "sslmode" in query else {}),
    },
  }


SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "django-insecure-shin-core")
DEBUG = os.getenv("DJANGO_DEBUG", "1") not in {"0", "false", "False"}
ALLOWED_HOSTS = [host.strip() for host in os.getenv("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1,testserver").split(",") if host.strip()]

INSTALLED_APPS = [
  "django.contrib.admin",
  "django.contrib.auth",
  "django.contrib.contenttypes",
  "django.contrib.sessions",
  "django.contrib.messages",
  "django.contrib.staticfiles",
  "rest_framework",
  "corsheaders",
  "apps.core",
  *_MODULE_APP_LABELS,
]

MIDDLEWARE = [
  "django.middleware.security.SecurityMiddleware",
  "django.contrib.sessions.middleware.SessionMiddleware",
  "corsheaders.middleware.CorsMiddleware",
  "django.middleware.common.CommonMiddleware",
  "django.middleware.csrf.CsrfViewMiddleware",
  "django.contrib.auth.middleware.AuthenticationMiddleware",
  "django.contrib.messages.middleware.MessageMiddleware",
  "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

DATABASE_URL = os.getenv("SHIN_DATABASE_URL") or os.getenv("DATABASE_URL")
if not DATABASE_URL:
  raise ValueError("Neither SHIN_DATABASE_URL nor DATABASE_URL environment variable is set.")
DATABASES = {"default": parse_database_url(DATABASE_URL)}

TEMPLATES = [
  {
    "BACKEND": "django.template.backends.django.DjangoTemplates",
    "DIRS": [],
    "APP_DIRS": True,
    "OPTIONS": {
      "context_processors": [
        "django.template.context_processors.debug",
        "django.template.context_processors.request",
        "django.contrib.auth.context_processors.auth",
        "django.contrib.messages.context_processors.messages",
      ],
    },
  },
]

AUTH_PASSWORD_VALIDATORS = [
  {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
  {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
  {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
  {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = os.getenv("DJANGO_TIME_ZONE", "Asia/Colombo")
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

REST_FRAMEWORK = {
  "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.AllowAny"],
  "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
  "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
  "PAGE_SIZE": 200,
}

CORS_ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]

CORS_ALLOW_CREDENTIALS = True
