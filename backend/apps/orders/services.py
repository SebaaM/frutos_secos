import hashlib
import json
from datetime import datetime, time, timedelta
from decimal import Decimal

from django.conf import settings
from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework import serializers

from apps.accounts.models import Customer
from apps.catalog.backoffice_views import Conflict
from apps.catalog.models import Product, ProductVariant, StockMovement
from .models import Order, OrderEvent, OrderLine


HELD = {Order.Status.RESERVADO, Order.Status.PREPARANDO, Order.Status.LISTO_PARA_RETIRO, Order.Status.EN_REPARTO}
TRANSITIONS = {
    Order.Status.A_CONFIRMAR: {Order.Status.RESERVADO, Order.Status.CANCELADO},
    Order.Status.RESERVADO: {Order.Status.PREPARANDO, Order.Status.CANCELADO, Order.Status.VENCIDO},
    Order.Status.PREPARANDO: {Order.Status.LISTO_PARA_RETIRO, Order.Status.EN_REPARTO, Order.Status.CANCELADO},
    Order.Status.LISTO_PARA_RETIRO: {Order.Status.TERMINADO, Order.Status.CANCELADO},
    Order.Status.EN_REPARTO: {Order.Status.TERMINADO, Order.Status.CANCELADO},
}


def business_deadline(start, hours):
    """Configured operating hours, in the shop timezone (no implicit holiday calendar)."""
    zone = timezone.get_default_timezone()
    cursor = timezone.localtime(start, zone)
    remaining = timedelta(hours=hours)
    for _ in range(3660):
        opening = datetime.combine(cursor.date(), time(settings.ORDER_BUSINESS_OPEN_HOUR), tzinfo=zone)
        closing = datetime.combine(cursor.date(), time(settings.ORDER_BUSINESS_CLOSE_HOUR), tzinfo=zone)
        if cursor.weekday() in settings.ORDER_BUSINESS_DAYS and cursor < closing:
            cursor = max(cursor, opening)
            available = closing - cursor
            if remaining <= available:
                return cursor + remaining
            remaining -= available
        cursor = datetime.combine(cursor.date() + timedelta(days=1), time.min, tzinfo=zone)
    raise ValueError("El calendario de reservas no permite calcular un vencimiento.")


def locked_variants(ids):
    # The catalog locks product before variant. Use the same order to avoid deadlocks.
    product_ids = ProductVariant.objects.filter(pk__in=ids).values_list("product_id", flat=True)
    list(Product.objects.select_for_update().filter(pk__in=product_ids).order_by("pk"))
    return {v.pk: v for v in ProductVariant.objects.select_for_update().filter(pk__in=ids).order_by("pk")}


def fingerprint(data):
    return hashlib.sha256(json.dumps(data, default=str, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


def existing_order(key, digest):
    existing = Order.objects.filter(idempotency_key=key).first()
    if existing and existing.request_fingerprint != digest:
        raise Conflict("Este intento de pedido ya se usó con otros datos. Revisá el carrito y volvé a iniciar el envío.")
    return existing


def create_order(data):
    digest = fingerprint(data)
    existing = existing_order(data["idempotency_key"], digest)
    if existing:
        return existing, False
    try:
        with transaction.atomic():
            customer, _ = Customer.objects.get_or_create(email=data["email"])
            lines = data["lines"]
            variants = locked_variants([line["variant_id"] for line in lines])
            total = Decimal("0.00")
            snapshots = []
            for line in lines:
                v = variants.get(line["variant_id"])
                if v is None or not v.is_active or not v.product.is_published or not v.product.category.is_active or v.price <= 0:
                    raise Conflict("Una presentación ya no está disponible. Actualizá el catálogo.")
                if v.stock_available < line["quantity"]:
                    raise Conflict(f"No hay suficientes paquetes disponibles de {v.product.name}, {v.weight_grams} g. Actualizá el carrito.")
                if v.price != line["expected_unit_price"]:
                    raise Conflict("Un precio cambió. Actualizá el catálogo y revisá el carrito antes de enviarlo.")
                total += v.price * line["quantity"]
                snapshots.append(dict(variant=v, product_id_snapshot=v.product_id, product_name=v.product.name,
                    sku=v.sku, weight_grams=v.weight_grams, unit_price=v.price, quantity=line["quantity"]))
            fields = {key: value for key, value in data.items() if key != "lines"}
            order = Order.objects.create(customer=customer, request_fingerprint=digest, subtotal=total, **fields)
            OrderLine.objects.bulk_create([OrderLine(order=order, **line) for line in snapshots])
            OrderEvent.objects.create(order=order, to_status=Order.Status.A_CONFIRMAR,
                                     public_note="Pedido recibido. Stock, pago y entrega pendientes de confirmación.")
            return order, True
    except IntegrityError:
        # The unique request key also prevents duplicates in concurrent requests.
        existing = existing_order(data["idempotency_key"], digest)
        if existing:
            return existing, False
        raise


@transaction.atomic
def transition_order(order_id, target, expected, actor=None, public_note=""):
    order = Order.objects.select_for_update().get(pk=order_id)
    if order.status != expected:
        raise Conflict("El pedido cambió de estado. Actualizá el tablero antes de continuar.")
    if target not in TRANSITIONS.get(order.status, set()):
        raise serializers.ValidationError({"status": "Ese cambio de estado no está permitido."})
    if target == Order.Status.LISTO_PARA_RETIRO and order.delivery != Order.Delivery.RETIRO:
        raise serializers.ValidationError({"status": "Un pedido para reparto no se marca para retiro."})
    if target == Order.Status.EN_REPARTO and order.delivery != Order.Delivery.ENTREGA:
        raise serializers.ValidationError({"status": "Un pedido para retiro no pasa a reparto."})
    lines = list(order.lines.all())
    variants = locked_variants([line.variant_id for line in lines])
    # Validate all lines before applying any mutations.
    for line in lines:
        v = variants[line.variant_id]
        if target == Order.Status.RESERVADO:
            if not v.is_active or not v.product.is_published or not v.product.category.is_active or v.stock_available < line.quantity:
                raise Conflict(f"Stock insuficiente o presentación no disponible: {line.product_name}, {line.weight_grams} g.")
        elif order.status in HELD and v.stock_reserved < line.quantity:
            raise Conflict("El stock reservado es inconsistente. Revisá el inventario antes de continuar.")
    for line in lines:
        v = variants[line.variant_id]
        previous = v.stock_physical
        if target == Order.Status.RESERVADO:
            v.stock_reserved += line.quantity
        elif order.status in HELD and target not in HELD:
            v.stock_reserved -= line.quantity
            if target == Order.Status.TERMINADO:
                v.stock_physical -= line.quantity
                StockMovement.objects.create(variant=v, delta=-line.quantity, previous_stock=previous,
                    resulting_stock=v.stock_physical, reason=f"Pedido {order.reference} terminado")
        v.save(update_fields=["stock_physical", "stock_reserved"])
    if target == Order.Status.RESERVADO:
        order.reserved_at = timezone.now()
        order.reservation_expires_at = business_deadline(order.reserved_at, settings.ORDER_RESERVATION_HOURS)
    elif target != Order.Status.RESERVADO:
        # The pending-payment deadline stops when preparation starts; units stay held.
        order.reservation_expires_at = None
    previous_status = order.status
    order.status = target
    order.save(update_fields=["status", "reserved_at", "reservation_expires_at", "updated_at"])
    OrderEvent.objects.create(order=order, from_status=previous_status, to_status=target, actor=actor, public_note=public_note)
    return order
