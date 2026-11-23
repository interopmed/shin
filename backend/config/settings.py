from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlparse

BASE_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BASE_DIR.parent

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
ALLOWED_HOSTS = [
    host.strip()
    for host in os.getenv(
        "DJANGO_ALLOWED_HOSTS",
        "localhost,127.0.0.1,testserver,shin.interopmed.com,.onrender.com,.up.railway.app",
    ).split(",")
    if host.strip()
]

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
  "apps.appointment",
  "apps.doctors",
  "apps.employees",
  "apps.finance",
  "apps.lab",
  "apps.patients",
  "apps.prescription",
  "apps.sales",
  "apps.schedule",
  "apps.settings",
  "apps.sms",
  "apps.stocks",
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
  "DEFAULT_PAGINATION_CLASS": "apps.core.pagination.StandardResultsSetPagination",
  "PAGE_SIZE": 200,
}

cors_origins_env = os.getenv("CORS_ALLOWED_ORIGINS")
if cors_origins_env:
  CORS_ALLOWED_ORIGINS = [origin.strip() for origin in cors_origins_env.split(",") if origin.strip()]
else:
  CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://shin.interopmed.com",
    "https://interopmed.com",
  ]

CORS_ALLOW_ALL_ORIGINS = os.getenv("CORS_ALLOW_ALL", "0") in {"1", "true", "True"}
CORS_ALLOW_CREDENTIALS = True

CSRF_TRUSTED_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "CSRF_TRUSTED_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000,https://shin.interopmed.com,https://interopmed.com",
    ).split(",")
    if origin.strip()
]
