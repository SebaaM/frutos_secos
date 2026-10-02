from decimal import Decimal

from rest_framework import serializers

from .models import Category, Product, ProductImage, ProductVariant, StockMovement
from .serializers import ProductImageSerializer


class AdminCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "slug", "is_active"]


class VariantInputSerializer(serializers.Serializer):
    id = serializers.IntegerField(required=False, min_value=1)
    sku = serializers.CharField(max_length=64)
    weight_grams = serializers.IntegerField(min_value=1, max_value=2147483647)
    price = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal("0.01"))
    is_active = serializers.BooleanField(default=True)
    stock_physical = serializers.IntegerField(min_value=0, max_value=2147483647, required=False)


class ProductInputSerializer(serializers.ModelSerializer):
    variants = VariantInputSerializer(many=True, required=False)

    class Meta:
        model = Product
        fields = ["name", "slug", "category", "description", "ingredients", "allergen_info",
                  "storage_instructions", "is_published", "is_featured", "variants"]


class AdminVariantSerializer(serializers.ModelSerializer):
    stock_available = serializers.IntegerField(read_only=True)

    class Meta:
        model = ProductVariant
        fields = ["id", "sku", "weight_grams", "price", "is_active", "stock_physical",
                  "stock_reserved", "stock_available"]
        read_only_fields = fields


class AdminProductSerializer(serializers.ModelSerializer):
    variants = AdminVariantSerializer(many=True, read_only=True)
    images = ProductImageSerializer(many=True, read_only=True)

    class Meta:
        model = Product
        fields = ["id", "name", "slug", "category", "description", "ingredients", "allergen_info",
                  "storage_instructions", "is_published", "is_featured", "variants", "images", "updated_at"]


class ImageInputSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ["image", "image_url", "alt_text", "credit"]
        extra_kwargs = {"alt_text": {"allow_blank": False}}

    def validate_image(self, image):
        if image.size > 5 * 1024 * 1024:
            raise serializers.ValidationError("Cada imagen debe pesar como máximo 5 MB.")
        if image.image.format not in {"JPEG", "PNG", "WEBP"}:
            raise serializers.ValidationError("Usá una imagen JPEG, PNG o WebP válida.")
        if image.image.width * image.image.height > 25_000_000:
            raise serializers.ValidationError("La imagen no puede superar 25 megapíxeles.")
        # The extension is derived from verified content, not the untrusted filename.
        image.name = "upload." + {"JPEG": "jpg", "PNG": "png", "WEBP": "webp"}[image.image.format]
        return image

    def validate(self, attrs):
        file = attrs.get("image", getattr(self.instance, "image", None))
        url = attrs.get("image_url", getattr(self.instance, "image_url", ""))
        if not file and not url:
            raise serializers.ValidationError("Subí una imagen o ingresá su URL.")
        if file and url:
            raise serializers.ValidationError("Elegí un archivo o una URL, no ambos.")
        return attrs


class StockAdjustmentSerializer(serializers.Serializer):
    delta = serializers.IntegerField(min_value=-2147483647, max_value=2147483647)
    reason = serializers.CharField(max_length=255, allow_blank=False)
    expected_stock = serializers.IntegerField(min_value=0, max_value=2147483647)

    def validate_delta(self, value):
        if value == 0:
            raise serializers.ValidationError("El ajuste debe agregar o quitar unidades.")
        return value


class StockMovementSerializer(serializers.ModelSerializer):
    class Meta:
        model = StockMovement
        fields = ["id", "variant", "delta", "previous_stock", "resulting_stock", "reason", "created_at"]
