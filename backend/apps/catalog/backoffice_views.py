from ipaddress import ip_address

from django.conf import settings
from django.db import IntegrityError, transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import APIException
from rest_framework.permissions import BasePermission
from rest_framework.response import Response

from .backoffice_serializers import (
    AdminCategorySerializer, AdminProductSerializer, AdminVariantSerializer,
    ImageInputSerializer, ProductInputSerializer, StockAdjustmentSerializer, StockMovementSerializer,
)
from .models import Category, Product, ProductImage, ProductVariant, StockMovement
from .serializers import ProductImageSerializer


class LocalDevelopmentOnly(BasePermission):
    message = "El backoffice sin autenticación solo está disponible en desarrollo local."

    def has_permission(self, request, view):
        origin = request.headers.get("Origin")
        def local(address):
            try:
                parsed = ip_address(address or "")
                mapped = getattr(parsed, "ipv4_mapped", None)
                return (mapped or parsed).is_loopback
            except ValueError:
                return False

        # Vite overwrites this header with the socket address; clients cannot spoof it.
        forwarded = request.META.get("HTTP_X_BACKOFFICE_CLIENT_IP")
        return (
            settings.DEBUG and settings.BACKOFFICE_ENABLED
            and local(request.META.get("REMOTE_ADDR"))
            and (forwarded is None or local(forwarded))
            and (not origin or origin in settings.CORS_ALLOWED_ORIGINS)
        )


class Conflict(APIException):
    status_code = status.HTTP_409_CONFLICT
    default_detail = "Los datos cambiaron. Actualizá antes de volver a intentar."


def check_publication(product):
    if product.is_published and (
        not product.category.is_active or not product.images.exists()
        or not product.variants.filter(is_active=True, price__gt=0).exists()
    ):
        raise serializers.ValidationError({"is_published": "Para publicar necesitás una categoría activa, una imagen y una presentación activa con precio positivo."})


def write_variants(product, variants):
    if variants is None:
        return
    existing = {item.id: item for item in product.variants.select_for_update().all()}
    ids = [item["id"] for item in variants if "id" in item]
    if len(ids) != len(set(ids)) or set(ids) - existing.keys():
        raise serializers.ValidationError({"variants": "Hay presentaciones repetidas o que no pertenecen al producto."})
    weights = [item["weight_grams"] for item in variants]
    skus = [item["sku"] for item in variants]
    if len(weights) != len(set(weights)) or len(skus) != len(set(skus)):
        raise serializers.ValidationError({"variants": "No repitas pesos ni SKU dentro del producto."})
    if existing.keys() - set(ids):
        raise serializers.ValidationError({"variants": "Las presentaciones existentes no se eliminan: desactivalas."})
    for data in variants:
        data = data.copy()
        variant_id = data.pop("id", None)
        has_stock = "stock_physical" in data
        initial_stock = data.pop("stock_physical", 0)
        if variant_id:
            variant = existing[variant_id]
            if has_stock and initial_stock != variant.stock_physical:
                raise serializers.ValidationError({"variants": "El stock existente se modifica mediante un ajuste con motivo."})
            if variant.stock_reserved and (data["weight_grams"] != variant.weight_grams or not data["is_active"]):
                raise serializers.ValidationError({"variants": "No cambies el peso ni desactives una presentación con unidades reservadas."})
            for field, value in data.items():
                setattr(variant, field, value)
            variant.save()
        else:
            variant = ProductVariant.objects.create(product=product, stock_physical=initial_stock, **data)
            if initial_stock:
                StockMovement.objects.create(variant=variant, delta=initial_stock, previous_stock=0,
                                             resulting_stock=initial_stock, reason="Stock inicial")


class CategoryAdminViewSet(viewsets.ModelViewSet):
    authentication_classes = []
    permission_classes = [LocalDevelopmentOnly]
    serializer_class = AdminCategorySerializer
    queryset = Category.objects.all()
    http_method_names = ["get", "post", "patch", "head", "options"]

    @transaction.atomic
    def perform_update(self, serializer):
        category = Category.objects.select_for_update().get(pk=serializer.instance.pk)
        if serializer.validated_data.get("is_active") is False and category.products.filter(is_published=True).exists():
            raise serializers.ValidationError({"is_active": "Pasá sus productos a borrador antes de desactivar esta categoría."})
        serializer.instance = category
        serializer.save()


class ProductAdminViewSet(viewsets.ReadOnlyModelViewSet):
    authentication_classes = []
    permission_classes = [LocalDevelopmentOnly]
    serializer_class = AdminProductSerializer

    def get_queryset(self):
        products = Product.objects.select_related("category").prefetch_related("variants", "images")
        params = self.request.query_params
        if params.get("search"):
            products = products.filter(Q(name__icontains=params["search"]) | Q(variants__sku__icontains=params["search"]))
        if params.get("category"):
            products = products.filter(category_id=params["category"])
        if params.get("published") in {"true", "false"}:
            products = products.filter(is_published=params["published"] == "true")
        return products.distinct()

    def create(self, request):
        return self.write_product(request)

    def partial_update(self, request, pk=None):
        return self.write_product(request, pk)

    def write_product(self, request, pk=None):
        try:
            with transaction.atomic():
                product = get_object_or_404(Product.objects.select_for_update(), pk=pk) if pk else None
                serializer = ProductInputSerializer(product, data=request.data, partial=bool(pk))
                serializer.is_valid(raise_exception=True)
                variants = serializer.validated_data.pop("variants", None)
                # Lock the category too, so publication cannot race with deactivation.
                category = serializer.validated_data.get("category", product.category if product else None)
                if category:
                    serializer.validated_data["category"] = Category.objects.select_for_update().get(pk=category.pk)
                product = serializer.save()
                write_variants(product, variants)
                check_publication(product)
        except IntegrityError:
            raise serializers.ValidationError("El SKU, peso o identificador ya existe. Revisá las presentaciones.")
        return Response(AdminProductSerializer(product, context={"request": request}).data,
                        status=status.HTTP_200_OK if pk else status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="images")
    def add_image(self, request, pk=None):
        with transaction.atomic():
            product = get_object_or_404(Product.objects.select_for_update(), pk=pk)
            if product.images.count() >= 10:
                raise serializers.ValidationError("El producto admite hasta 10 imágenes.")
            serializer = ImageInputSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            image = serializer.save(product=product, position=product.images.count())
        return Response(ProductImageSerializer(image, context={"request": request}).data, status=201)

    @action(detail=True, methods=["post"], url_path="reorder-images")
    def reorder_images(self, request, pk=None):
        with transaction.atomic():
            product = get_object_or_404(Product.objects.select_for_update(), pk=pk)
            images = list(product.images.all())
            ids = request.data.get("ids")
            if not isinstance(ids, list) or any(type(i) is not int for i in ids) or len(ids) != len(images) or set(ids) != {image.id for image in images}:
                raise serializers.ValidationError("Enviá todos los identificadores de la galería, sin repetir.")
            # Move away from occupied positions first (the unique constraint stays valid).
            for index, image in enumerate(images):
                image.position = 100 + index
                image.save(update_fields=["position"])
            positions = {image_id: index for index, image_id in enumerate(ids)}
            for image in images:
                image.position = positions[image.id]
                image.save(update_fields=["position"])
        return Response(ProductImageSerializer(product.images.all(), many=True, context={"request": request}).data)


class ImageAdminViewSet(viewsets.GenericViewSet):
    authentication_classes = []
    permission_classes = [LocalDevelopmentOnly]

    def partial_update(self, request, pk=None):
        image = get_object_or_404(ProductImage, pk=pk)
        with transaction.atomic():
            Product.objects.select_for_update().get(pk=image.product_id)
            image = get_object_or_404(ProductImage, pk=pk)
            # Replacement is a new gallery upload; this route edits accessible metadata.
            unknown = set(request.data) - {"alt_text", "credit"}
            if unknown:
                raise serializers.ValidationError("Solo podés editar descripción y crédito en esta ruta.")
            serializer = ImageInputSerializer(image, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            image = serializer.save()
        return Response(ProductImageSerializer(image, context={"request": request}).data)

    def destroy(self, request, pk=None):
        image = get_object_or_404(ProductImage, pk=pk)
        with transaction.atomic():
            product = Product.objects.select_for_update().get(pk=image.product_id)
            image = get_object_or_404(ProductImage, pk=pk)
            if product.is_published and product.images.count() == 1:
                raise serializers.ValidationError("Pasá el producto a borrador antes de eliminar su última imagen.")
            # Preserve the physical file for recovery; only remove the gallery reference.
            image.delete()
            for index, remaining in enumerate(product.images.all()):
                remaining.position = index
                remaining.save(update_fields=["position"])
        return Response(status=204)


class VariantAdminViewSet(viewsets.GenericViewSet):
    authentication_classes = []
    permission_classes = [LocalDevelopmentOnly]

    @action(detail=True, methods=["post"], url_path="adjust-stock")
    def adjust_stock(self, request, pk=None):
        serializer = StockAdjustmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        variant = get_object_or_404(ProductVariant, pk=pk)
        with transaction.atomic():
            Product.objects.select_for_update().get(pk=variant.product_id)
            variant = ProductVariant.objects.select_for_update().get(pk=pk)
            if variant.stock_physical != data["expected_stock"]:
                raise Conflict()
            next_stock = variant.stock_physical + data["delta"]
            if next_stock < variant.stock_reserved:
                raise serializers.ValidationError("El físico no puede ser negativo ni menor al reservado.")
            if next_stock > 2147483647:
                raise serializers.ValidationError("El stock supera el máximo de unidades admitido.")
            StockMovement.objects.create(variant=variant, delta=data["delta"], previous_stock=variant.stock_physical,
                                         resulting_stock=next_stock, reason=data["reason"])
            variant.stock_physical = next_stock
            variant.save(update_fields=["stock_physical"])
        return Response(AdminVariantSerializer(variant).data)

    @action(detail=True, methods=["get"], url_path="movements")
    def movements(self, request, pk=None):
        variant = get_object_or_404(ProductVariant, pk=pk)
        return Response(StockMovementSerializer(variant.stock_movements.all()[:100], many=True).data)
