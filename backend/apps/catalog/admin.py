from django.contrib import admin

from .models import Category, Product, ProductImage, ProductVariant, StockMovement


class ReadOnlyAdmin(admin.ModelAdmin):
    """Catalog writes go through the transactional backoffice API."""

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(ProductVariant)
class ProductVariantAdmin(ReadOnlyAdmin):
    list_display = ("sku", "product", "weight_grams", "price", "stock_physical", "stock_reserved", "stock_available")
    search_fields = ("sku", "product__name")


@admin.register(Category)
class CategoryAdmin(ReadOnlyAdmin):
    list_display = ("name", "slug", "is_active")


@admin.register(Product)
class ProductAdmin(ReadOnlyAdmin):
    list_display = ("name", "category", "is_published", "is_featured")
    list_filter = ("category", "is_published", "is_featured")


@admin.register(ProductImage)
class ProductImageAdmin(ReadOnlyAdmin):
    list_display = ("product", "position", "alt_text")


@admin.register(StockMovement)
class StockMovementAdmin(ReadOnlyAdmin):
    list_display = ("variant", "delta", "previous_stock", "resulting_stock", "reason", "created_at")
    search_fields = ("variant__sku", "reason")
