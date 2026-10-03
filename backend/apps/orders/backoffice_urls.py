from rest_framework.routers import SimpleRouter
from .views import AdminOrderViewSet

router = SimpleRouter()
router.register("orders", AdminOrderViewSet, basename="admin-order")
urlpatterns = router.urls
