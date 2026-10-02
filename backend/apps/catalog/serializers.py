from rest_framework import serializers

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
            "image_url",
            "images",
            "is_featured",
            "category",
            "variants",
        ]

    def get_variants(self, product):
        return ProductVariantSerializer(product.variants.filter(is_active=True), many=True).data
