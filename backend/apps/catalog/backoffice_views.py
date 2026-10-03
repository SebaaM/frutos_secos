from ipaddress import ip_address

from django.conf import settings
from django.db import IntegrityError, transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import APIException
from rest_framework.permissions import BasePermission, IsAdminUser
from rest_framework.response import Response
from drf_spectacular.utils import OpenApiExample, OpenApiParameter, extend_schema_view

from .backoffice_serializers import (
    AdminCategorySerializer, AdminProductSerializer, AdminVariantSerializer,
    ImageInputSerializer, ProductInputSerializer, StockAdjustmentSerializer, StockMovementSerializer,
)
from .models import Category, Product, ProductImage, ProductVariant, StockMovement
from .serializers import ProductImageSerializer
from .schema import admin_schema, ImageMetadataSerializer, ImageOrderSerializer, PRODUCT_EXAMPLE


class LocalDevelopmentOnly(BasePermission):
    message = "La administración solo está habilitada en desarrollo local y con origen permitido."

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


@extend_schema_view(
    list=admin_schema(summary="Listar todas las categorías", responses={200: AdminCategorySerializer(many=True)}, errors=(403,)),
    retrieve=admin_schema(summary="Consultar categoría", responses={200: AdminCategorySerializer}, errors=(403, 404)),
    create=admin_schema(summary="Crear categoría", request=AdminCategorySerializer, responses={201: AdminCategorySerializer}, errors=(400, 403), examples=[OpenApiExample("Categoría", value={"name": "Hierbas naturales", "slug": "hierbas-naturales", "is_active": True}, request_only=True)]),
    partial_update=admin_schema(summary="Editar o desactivar categoría", request=AdminCategorySerializer, responses={200: AdminCategorySerializer}, description="No se puede desactivar si tiene productos publicados. No admite DELETE ni PUT."),
)
class CategoryAdminViewSet(viewsets.ModelViewSet):
    permission_classes = [LocalDevelopmentOnly, IsAdminUser]
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


@extend_schema_view(
    list=admin_schema(
        summary="Listar productos administrativos", responses={200: AdminProductSerializer(many=True)}, errors=(403,),
        description="Incluye borradores, variantes inactivas y galería. Sin paginación; orden por nombre. Los filtros de disponibilidad del panel se aplican en React, no en este endpoint.",
        parameters=[
            OpenApiParameter("search", str, description="Buscar nombre o SKU, sin distinguir mayúsculas."),
            OpenApiParameter("category", int, description="ID numérico de categoría existente."),
            OpenApiParameter("published", str, enum=["true", "false"], description="Filtrar por publicación; otros valores no filtran."),
        ],
    ),
    retrieve=admin_schema(summary="Consultar producto administrativo", responses={200: AdminProductSerializer}, errors=(403, 404)),
    create=admin_schema(
        summary="Crear producto con presentaciones", request=ProductInputSerializer, responses={201: AdminProductSerializer}, errors=(400, 403), examples=[PRODUCT_EXAMPLE],
        description="Crear en borrador, cargar imágenes y luego publicar. Para publicar: categoría activa, al menos una imagen y una variante activa con precio positivo. SKU global único; peso único por producto. Productos y variantes se guardan en una transacción. stock_physical solo establece stock inicial de variantes nuevas; el reservado no se escribe.",
    ),
    partial_update=admin_schema(
        summary="Editar producto y presentaciones", request=ProductInputSerializer, responses={200: AdminProductSerializer},
        description="Los campos de producto son opcionales en PATCH. Si enviás variants, incluí todas las existentes con id y datos completos (sku, weight_grams, price, is_active); no se eliminan por omisión. Para ocultar: is_published=false o is_active=false. El stock existente solo cambia por adjust-stock. No cambiar peso ni desactivar una variante reservada. No admite DELETE ni PUT.",
        examples=[OpenApiExample("Pasar a borrador", value={"is_published": False}, request_only=True)],
    ),
)
class ProductAdminViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [LocalDevelopmentOnly, IsAdminUser]
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

    @admin_schema(
        summary="Agregar imagen a la galería",
        request={"multipart/form-data": ImageInputSerializer, "application/json": ImageInputSerializer},
        responses={201: ProductImageSerializer},
        description="Un archivo image por solicitud multipart o image_url en JSON, nunca ambos. alt_text obligatorio. Máximo 10 imágenes por producto; archivos JPEG/PNG/WebP de hasta 5 MiB y 25 megapíxeles. Se agrega al final; posición 0 es portada.",
        examples=[OpenApiExample("Imagen desde URL", value={"image_url": "https://images.example.com/almendras.jpg", "alt_text": "Almendras naturales en un cuenco.", "credit": ""}, request_only=True, media_type="application/json")],
    )
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

    @admin_schema(
        summary="Ordenar galería y elegir portada", request=ImageOrderSerializer,
        responses={200: ProductImageSerializer(many=True)},
        description="Enviar todos los IDs de la galería exactamente una vez, en el orden deseado. El primer ID pasa a portada. Devuelve la galería ordenada.",
        examples=[OpenApiExample("Orden de galería", value={"ids": [2, 1]}, request_only=True)],
    )
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
    queryset = ProductImage.objects.none()
    permission_classes = [LocalDevelopmentOnly, IsAdminUser]

    @admin_schema(summary="Editar descripción o crédito de imagen", request=ImageMetadataSerializer, responses={200: ProductImageSerializer}, description="Solo alt_text y credit; para reemplazar archivo o URL, agregar una imagen nueva.")
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

    @admin_schema(summary="Quitar imagen de la galería", responses={204: None}, description="Elimina la referencia, conserva el archivo físico para recuperación manual y normaliza posiciones. No se puede quitar la última imagen de un producto publicado: pasar antes a borrador.")
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
    queryset = ProductVariant.objects.none()
    permission_classes = [LocalDevelopmentOnly, IsAdminUser]

    @admin_schema(
        summary="Ajustar stock físico con auditoría", request=StockAdjustmentSerializer,
        responses={200: AdminVariantSerializer}, errors=(400, 403, 404, 409),
        description="delta entero distinto de 0; reason obligatorio; expected_stock es el físico observado. Si cambió, responde 409. Transacción con bloqueo de filas y movimiento auditado. No modifica reservado ni permite físico negativo o menor al reservado. Disponible = físico − reservado. Cantidades en paquetes, no gramos.",
        examples=[OpenApiExample("Ingreso de cinco paquetes", value={"delta": 5, "reason": "Reposición", "expected_stock": 10}, request_only=True)],
    )
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

    @admin_schema(summary="Consultar historial de stock", responses={200: StockMovementSerializer(many=True)}, errors=(403, 404), description="Hasta 100 movimientos, más recientes primero. Incluye delta, motivo, físico anterior/resultante y fecha.")
    @action(detail=True, methods=["get"], url_path="movements")
    def movements(self, request, pk=None):
        variant = get_object_or_404(ProductVariant, pk=pk)
        return Response(StockMovementSerializer(variant.stock_movements.all()[:100], many=True).data)
