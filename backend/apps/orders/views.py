from django.db import transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import serializers, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, BasePermission, IsAdminUser
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from rest_framework.throttling import AnonRateThrottle

from apps.accounts.services import session_customer
from apps.accounts.serializers import MessageSerializer
from apps.catalog.backoffice_views import LocalDevelopmentOnly
from .models import Order
from .serializers import AdminOrderSerializer, OrderInputSerializer, OrderNoteSerializer, OrderSerializer, TransitionSerializer
from .services import create_order, transition_order


class CustomerVerified(BasePermission):
    message = "Accedé con el enlace enviado a tu email para ver tus pedidos."

    def has_permission(self, request, view):
        request.customer = session_customer(request)
        return request.customer is not None


class CheckoutThrottle(AnonRateThrottle):
    rate = "20/hour"


class OrderPagination(PageNumberPagination):
    page_size = 50


@extend_schema_view(
    create=extend_schema(tags=["Pedidos"], auth=[], request=OrderInputSerializer, responses={201: OrderSerializer, 200: OrderSerializer, 400: MessageSerializer, 403: MessageSerializer, 409: MessageSerializer, 429: MessageSerializer}, description="Crea A_CONFIRMAR sin reserva. Precios y total validados en servidor. Reintentos con el mismo idempotency_key y datos devuelven el mismo pedido. Requiere CSRF; no envía WhatsApp automáticamente."),
    list=extend_schema(tags=["Pedidos"], responses=OrderSerializer(many=True), description="Solo pedidos del cliente verificado por sesión. Ordenados por antigüedad; paginados de a 50."),
    retrieve=extend_schema(tags=["Pedidos"], responses={200: OrderSerializer, 403: MessageSerializer, 404: MessageSerializer}, description="Otro cliente recibe 404. Ni email ni referencia sirven como credenciales."),
)
class CustomerOrderViewSet(viewsets.GenericViewSet):
    serializer_class = OrderSerializer
    pagination_class = OrderPagination
    http_method_names = ["get", "post", "head", "options"]
    lookup_value_regex = "[0-9a-f-]{36}"

    def get_permissions(self):
        return [AllowAny()] if self.action == "create" else [CustomerVerified()]

    def get_throttles(self):
        return [CheckoutThrottle()] if self.action == "create" else []

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Order.objects.none()
        return Order.objects.filter(customer=self.request.customer).prefetch_related("lines", "events")

    def create(self, request):
        serializer = OrderInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        order, created = create_order(serializer.validated_data)
        return Response(OrderSerializer(order).data, status=201 if created else 200, headers={"Cache-Control": "no-store"})

    def list(self, request):
        page = self.paginate_queryset(self.get_queryset())
        response = self.get_paginated_response(self.get_serializer(page, many=True).data)
        response["Cache-Control"] = "no-store"
        return response

    def retrieve(self, request, pk=None):
        return Response(self.get_serializer(self.get_object()).data, headers={"Cache-Control": "no-store"})


@extend_schema_view(
    list=extend_schema(tags=["Backoffice"], responses=AdminOrderSerializer(many=True), parameters=[
        OpenApiParameter("status", str, enum=Order.Status.values),
        OpenApiParameter("search", str, description="Referencia o nombre, no modifica la identidad del cliente."),
        OpenApiParameter("delivery", str, enum=Order.Delivery.values),
    ], description="Operador activo y guard local. Más antiguos primero; 50 por página, sin agenda."),
    retrieve=extend_schema(tags=["Backoffice"], responses=AdminOrderSerializer),
    partial_update=extend_schema(tags=["Backoffice"], request=OrderNoteSerializer, responses=AdminOrderSerializer, description="Solo nota interna. No permite editar líneas, precios ni stock."),
)
class AdminOrderViewSet(viewsets.GenericViewSet):
    permission_classes = [LocalDevelopmentOnly, IsAdminUser]
    serializer_class = AdminOrderSerializer
    pagination_class = OrderPagination
    queryset = Order.objects.prefetch_related("lines", "events")
    http_method_names = ["get", "post", "patch", "head", "options"]
    lookup_value_regex = "[0-9a-f-]{36}"

    def get_queryset(self):
        queryset = super().get_queryset()
        for field in ["status", "delivery"]:
            value = self.request.query_params.get(field)
            if value:
                queryset = queryset.filter(**{field: value})
        query = self.request.query_params.get("search", "").strip()
        if query:
            queryset = queryset.filter(Q(reference__icontains=query) | Q(name__icontains=query))
        return queryset

    def list(self, request):
        page = self.paginate_queryset(self.get_queryset())
        return self.get_paginated_response(self.get_serializer(page, many=True).data)

    def retrieve(self, request, pk=None):
        return Response(self.get_serializer(self.get_object()).data)

    @transaction.atomic
    def partial_update(self, request, pk=None):
        order = get_object_or_404(Order.objects.select_for_update(), pk=pk)
        serializer = OrderNoteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        order.internal_note = serializer.validated_data["internal_note"]
        order.save(update_fields=["internal_note", "updated_at"])
        return Response(self.get_serializer(order).data)

    @extend_schema(tags=["Backoffice"], request=TransitionSerializer, responses={200: AdminOrderSerializer, 400: MessageSerializer, 403: MessageSerializer, 404: MessageSerializer, 409: MessageSerializer}, description="Transacción con bloqueo de pedido, productos y variantes. expected_status evita acciones obsoletas. Reservar mantiene stock; cancelar/vencer libera; terminar consume físico y reservado con historial. Vencimiento automático solo en RESERVADO, no durante preparación/reparto.")
    @action(detail=True, methods=["post"], url_path="transition")
    def transition(self, request, pk=None):
        self.get_object()
        serializer = TransitionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        order = transition_order(pk, data["status"], data["expected_status"], request.user, data["public_note"])
        return Response(self.get_serializer(order).data)

    def finalize_response(self, request, response, *args, **kwargs):
        response = super().finalize_response(request, response, *args, **kwargs)
        response["Cache-Control"] = "no-store"
        return response
