from django.contrib import admin
from django.urls import include, path
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

from apps.catalog.backoffice_views import LocalDevelopmentOnly


urlpatterns = [
    path("api/schema/", SpectacularAPIView.as_view(), name="api-schema"),
    path("api/docs/swagger/", SpectacularSwaggerView.as_view(
        url_name="api-schema", authentication_classes=[], permission_classes=[LocalDevelopmentOnly],
    ), name="api-swagger"),
    path("admin/", admin.site.urls),
    path("api/v1/", include("apps.core.urls")),
    path("api/v1/auth/", include("apps.accounts.urls")),
    path("api/v1/", include("apps.orders.urls")),
    path("api/v1/catalog/", include("apps.catalog.urls")),
    path("api/v1/backoffice/", include("apps.catalog.backoffice_urls")),
    path("api/v1/backoffice/", include("apps.orders.backoffice_urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
