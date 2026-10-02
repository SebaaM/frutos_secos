from rest_framework.routers import APIRootView, DefaultRouter

from .backoffice_views import CategoryAdminViewSet, ImageAdminViewSet, LocalDevelopmentOnly, ProductAdminViewSet, VariantAdminViewSet


class LocalApiRoot(APIRootView):
    authentication_classes = []
    permission_classes = [LocalDevelopmentOnly]

router = DefaultRouter()
router.APIRootView = LocalApiRoot
router.register("categories", CategoryAdminViewSet, basename="backoffice-category")
router.register("products", ProductAdminViewSet, basename="backoffice-product")
router.register("images", ImageAdminViewSet, basename="backoffice-image")
router.register("variants", VariantAdminViewSet, basename="backoffice-variant")
urlpatterns = router.urls
