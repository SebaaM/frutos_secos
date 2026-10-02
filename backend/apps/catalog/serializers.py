from rest_framework import serializers
from drf_spectacular.utils import extend_schema_field

from .models import Category, Product, ProductImage, ProductVariant


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "slug"]


class ProductVariantSerializer(serializers.ModelSerializer):
    stock_available = serializers.IntegerField(read_only=True)
    availability = serializers.CharField(read_only=True)

    class Meta:
        model = ProductVariant
        fields = ["id", "sku", "weight_grams", "price", "stock_available", "availability"]


class ProductImageSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    @extend_schema_field(serializers.URLField())
    def get_image_url(self, obj):
        if obj.image:
            request = self.context.get("request")
            return request.build_absolute_uri(obj.image.url) if request else obj.image.url
        return obj.image_url

    class Meta:
        model = ProductImage
        fields = ["id", "image_url", "alt_text", "credit", "position"]


class ProductSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    variants = serializers.SerializerMethodField()
    images = ProductImageSerializer(many=True, read_only=True)

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "slug",
            "description",
            "ingredients",
            "allergen_info",
            "storage_instructions",
            "image_url",
            "images",
            "is_featured",
            "category",
            "variants",
        ]

    @extend_schema_field(ProductVariantSerializer(many=True))
    def get_variants(self, product):
        return ProductVariantSerializer(product.variants.filter(is_active=True), many=True).data
