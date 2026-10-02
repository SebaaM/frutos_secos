from rest_framework import viewsets
from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema, extend_schema_view

from .models import Category, Product
from .serializers import CategorySerializer, ProductSerializer
from .schema import DETAIL_ERROR


@extend_schema(tags=["Catálogo"], auth=[])
@extend_schema_view(
    list=extend_schema(summary="Listar categorías activas", description="Lista sin paginación, ordenada por nombre."),
    retrieve=extend_schema(summary="Consultar categoría activa", responses={200: CategorySerializer, 404: OpenApiResponse(DETAIL_ERROR, "Categoría inexistente o inactiva.")}),
)
class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = CategorySerializer
    queryset = Category.objects.filter(is_active=True)
    pagination_class = None


@extend_schema(tags=["Catálogo"], auth=[])
@extend_schema_view(
    list=extend_schema(
        summary="Listar productos publicados",
        description="Lista sin paginación, ordenada por nombre. Solo categorías activas y variantes activas; incluye variantes agotadas y galería ordenada por posición.",
        parameters=[
            OpenApiParameter("category", str, description="Slug de categoría; por ejemplo frutos-secos."),
            OpenApiParameter("featured", str, enum=["true"], description="El valor literal true limita a destacados. Otros valores no filtran."),
        ],
    ),
    retrieve=extend_schema(summary="Consultar producto publicado", responses={200: ProductSerializer, 404: OpenApiResponse(DETAIL_ERROR, "Producto inexistente, en borrador o con categoría inactiva.")}),
)
class ProductViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ProductSerializer
    pagination_class = None

    def get_queryset(self):
        queryset = (
            Product.objects.filter(is_published=True, category__is_active=True)
            .select_related("category")
            .prefetch_related("variants", "images")
        )
        category = self.request.query_params.get("category")
        if category:
            queryset = queryset.filter(category__slug=category)
        if self.request.query_params.get("featured") == "true":
            queryset = queryset.filter(is_featured=True)
        return queryset
