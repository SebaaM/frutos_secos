from django.contrib import admin
from apps.catalog.admin import ReadOnlyAdmin
from .models import Order, OrderEvent, OrderLine


@admin.register(Order)
class OrderAdmin(ReadOnlyAdmin):
    list_display = ["reference", "status", "delivery", "created_at"]
    search_fields = ["reference", "name"]
    list_filter = ["status", "delivery"]


admin.site.register(OrderLine, ReadOnlyAdmin)
admin.site.register(OrderEvent, ReadOnlyAdmin)
