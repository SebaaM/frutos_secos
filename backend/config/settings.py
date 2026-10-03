"""Settings for the Rosana Frutos Secos API."""

import os
from pathlib import Path
from urllib.parse import unquote, urlparse

from django.core.exceptions import ImproperlyConfigured


BASE_DIR = Path(__file__).resolve().parent.parent


def env_list(name: str, default: str = "") -> list[str]:
    value = os.getenv(name, default)
    return [item.strip() for item in value.split(",") if item.strip()]


def database_settings() -> dict[str, object]:
    """Use PostgreSQL when DATABASE_URL is configured; otherwise use local SQLite."""

    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        return {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }

    parsed = urlparse(database_url)
    if parsed.scheme not in {"postgres", "postgresql"}:
        raise ImproperlyConfigured("DATABASE_URL must use the postgres or postgresql scheme.")

    return {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": parsed.path.lstrip("/"),
        "USER": unquote(parsed.username or ""),
        "PASSWORD": unquote(parsed.password or ""),
        "HOST": parsed.hostname or "localhost",
        "PORT": str(parsed.port or 5432),
    }


SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "unsafe-development-only-change-me")
DEBUG = os.getenv("DJANGO_DEBUG", "true").lower() == "true"
ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
    "rest_framework",
    "drf_spectacular",
    "drf_spectacular_sidecar",
    "apps.core",
    "apps.catalog",
    "apps.accounts",
    "apps.orders",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

DATABASES = {"default": database_settings()}

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "es-ar"
TIME_ZONE = "America/Argentina/Buenos_Aires"
USE_I18N = True
USE_TZ = True

STATIC_URL = "/static/"
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"
# Temporary catalog administration is never available outside local DEBUG mode.
BACKOFFICE_ENABLED = os.getenv("BACKOFFICE_ENABLED", "true").lower() == "true"
DATA_UPLOAD_MAX_MEMORY_SIZE = 6 * 1024 * 1024
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

CORS_ALLOWED_ORIGINS = env_list("CORS_ALLOWED_ORIGINS", "http://localhost:8443,http://127.0.0.1:8443")
CSRF_TRUSTED_ORIGINS = env_list("CSRF_TRUSTED_ORIGINS", "http://localhost:8443,http://127.0.0.1:8443")
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"
SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_HTTPONLY = True
CSRF_COOKIE_SECURE = not DEBUG
CORS_ALLOW_CREDENTIALS = True
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:8443")
CUSTOMER_LINK_MINUTES = int(os.getenv("CUSTOMER_LINK_MINUTES", "15"))
CUSTOMER_SESSION_DAYS = int(os.getenv("CUSTOMER_SESSION_DAYS", "7"))
EMAIL_BACKEND = os.getenv("EMAIL_BACKEND", "django.core.mail.backends.console.EmailBackend" if DEBUG else "django.core.mail.backends.smtp.EmailBackend")
EMAIL_HOST = os.getenv("EMAIL_HOST", "localhost")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587"))
EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD", "")
EMAIL_USE_TLS = os.getenv("EMAIL_USE_TLS", "true").lower() == "true"
EMAIL_TIMEOUT = 10
DEFAULT_FROM_EMAIL = os.getenv("DEFAULT_FROM_EMAIL", "Rosana <no-reply@example.invalid>")
ORDER_RESERVATION_HOURS = int(os.getenv("ORDER_RESERVATION_HOURS", "48"))
ORDER_BUSINESS_DAYS = [int(day) for day in env_list("ORDER_BUSINESS_DAYS", "0,1,2,3,4,5")]
ORDER_BUSINESS_OPEN_HOUR = int(os.getenv("ORDER_BUSINESS_OPEN_HOUR", "9"))
ORDER_BUSINESS_CLOSE_HOUR = int(os.getenv("ORDER_BUSINESS_CLOSE_HOUR", "19"))
ORDER_AUTO_EXPIRE_ENABLED = os.getenv("ORDER_AUTO_EXPIRE_ENABLED", "false").lower() == "true"
if (not ORDER_BUSINESS_DAYS or not set(ORDER_BUSINESS_DAYS) <= set(range(7))
    or not 0 <= ORDER_BUSINESS_OPEN_HOUR < ORDER_BUSINESS_CLOSE_HOUR <= 23
    or not 1 <= ORDER_RESERVATION_HOURS <= 480):
    raise ImproperlyConfigured("Revisar el calendario hábil y la duración de reservas.")

REST_FRAMEWORK = {
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.AllowAny"],
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
    "DEFAULT_AUTHENTICATION_CLASSES": ["apps.accounts.authentication.CsrfSessionAuthentication"],
    "NUM_PROXIES": 0,
}

SPECTACULAR_SETTINGS = {
    "TITLE": "Rosana Frutos Secos — API",
    "DESCRIPTION": (
        "Catálogo público y administración local de productos, categorías, galerías y stock. "
        "Precios en ARS como strings decimales; pesos enteros en gramos y stock en paquetes. "
        "Pedidos con reservas transaccionales, acceso por email y sesiones de operadores. "
        "El backoffice requiere operador activo, DEBUG, BACKOFFICE_ENABLED y cliente local; la documentación conserva su guard local. "
        "Escrituras requieren X-CSRFToken obtenido en /api/v1/auth/session/. "
        "Las operaciones de escritura de Swagger modifican datos reales: no ejecutarlas como prueba."
    ),
    "VERSION": "1.0.0",
    "OAS_VERSION": "3.0.3",
    "SERVE_INCLUDE_SCHEMA": False,
    "SERVE_AUTHENTICATION": [],
    "SERVE_PERMISSIONS": ["apps.catalog.backoffice_views.LocalDevelopmentOnly"],
    "COMPONENT_SPLIT_REQUEST": True,
    "ENUM_NAME_OVERRIDES": {"OrderStatusEnum": [
        ("A_CONFIRMAR", "A confirmar"), ("RESERVADO", "Reservado"), ("PREPARANDO", "Preparando"),
        ("LISTO_PARA_RETIRO", "Listo para retirar"), ("EN_REPARTO", "En reparto"),
        ("TERMINADO", "Terminado"), ("CANCELADO", "Cancelado"), ("VENCIDO", "Vencido"),
    ]},
    "PREPROCESSING_HOOKS": ["drf_spectacular.hooks.preprocess_exclude_path_format"],
    "SWAGGER_UI_DIST": "SIDECAR",
    "SWAGGER_UI_FAVICON_HREF": "SIDECAR",
    "SWAGGER_UI_SETTINGS": {
        "deepLinking": True,
        "displayRequestDuration": True,
        "persistAuthorization": False,
        "defaultModelsExpandDepth": -1,
        "docExpansion": "none",
        "validatorUrl": None,
    },
    "TAGS": [
        {"name": "Sistema", "description": "Disponibilidad del servicio; no comprueba conexión a la base."},
        {"name": "Catálogo", "description": "Lectura pública de productos publicados y categorías activas."},
        {"name": "Backoffice", "description": "Operadores autenticados y protección adicional de desarrollo local."},
        {"name": "Pedidos", "description": "Creación pendiente y seguimiento privado del cliente."},
        {"name": "Autenticación", "description": "Sesiones HttpOnly, CSRF y enlaces de acceso de un uso."},
    ],
}
