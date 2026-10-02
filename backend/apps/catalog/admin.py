from django.contrib import admin

from .models import Category, Product, ProductImage, ProductVariant


class ProductVariantInline(admin.TabularInline):
    model = ProductVariant
    extra = 0


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 0


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "is_active")
    prepopulated_fields = {"slug": ("name",)}


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("name", "category", "is_published", "is_featured")
    list_filter = ("category", "is_published", "is_featured")
    prepopulated_fields = {"slug": ("name",)}
    inlines = [ProductVariantInline, ProductImageInline]
