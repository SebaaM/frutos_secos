from rest_framework.routers import DefaultRouter

from .backoffice_views import CategoryAdminViewSet, ImageAdminViewSet, ProductAdminViewSet, VariantAdminViewSet

router = DefaultRouter()
router.register("categories", CategoryAdminViewSet)
router.register("products", ProductAdminViewSet, basename="backoffice-product")
router.register("images", ImageAdminViewSet, basename="backoffice-image")
router.register("variants", VariantAdminViewSet, basename="backoffice-variant")
urlpatterns = router.urls
