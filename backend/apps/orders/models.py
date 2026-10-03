import secrets
import uuid

from django.conf import settings
from django.db import models


def order_reference():
    return "RF-" + secrets.token_hex(6).upper()


class Order(models.Model):
    class Status(models.TextChoices):
        A_CONFIRMAR = "A_CONFIRMAR", "A confirmar"
        RESERVADO = "RESERVADO", "Reservado"
        PREPARANDO = "PREPARANDO", "Preparando"
        LISTO_PARA_RETIRO = "LISTO_PARA_RETIRO", "Listo para retirar"
        EN_REPARTO = "EN_REPARTO", "En reparto"
        TERMINADO = "TERMINADO", "Terminado"
        CANCELADO = "CANCELADO", "Cancelado"
        VENCIDO = "VENCIDO", "Vencido"

    class Delivery(models.TextChoices):
        RETIRO = "retiro_local", "Retiro local"
        ENTREGA = "entrega_local", "Reparto local"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reference = models.CharField(max_length=24, unique=True, default=order_reference, editable=False)
    customer = models.ForeignKey("accounts.Customer", on_delete=models.PROTECT, related_name="orders")
    idempotency_key = models.UUIDField(unique=True, editable=False)
    request_fingerprint = models.CharField(max_length=64, editable=False)
    name = models.CharField(max_length=120)
    email = models.EmailField()
    phone = models.CharField(max_length=40, blank=True)
    delivery = models.CharField(max_length=20, choices=Delivery.choices)
    address = models.CharField(max_length=300, blank=True)
    address_help = models.CharField(max_length=300, blank=True)
    status = models.CharField(max_length=24, choices=Status.choices, default=Status.A_CONFIRMAR)
    subtotal = models.DecimalField(max_digits=14, decimal_places=2)
    internal_note = models.TextField(blank=True)
    reserved_at = models.DateTimeField(null=True, blank=True)
    reservation_expires_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["created_at", "id"]
        indexes = [models.Index(fields=["status", "created_at"])]
        constraints = [models.CheckConstraint(condition=models.Q(subtotal__gte=0), name="order_nonnegative_subtotal")]


class OrderLine(models.Model):
    order = models.ForeignKey(Order, related_name="lines", on_delete=models.CASCADE)
    variant = models.ForeignKey("catalog.ProductVariant", on_delete=models.PROTECT)
    product_id_snapshot = models.PositiveBigIntegerField()
    product_name = models.CharField(max_length=160)
    sku = models.CharField(max_length=64)
    weight_grams = models.PositiveIntegerField()
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.PositiveIntegerField()

    class Meta:
        ordering = ["id"]
        constraints = [
            models.UniqueConstraint(fields=["order", "variant"], name="order_unique_variant"),
            models.CheckConstraint(condition=models.Q(quantity__gt=0), name="order_positive_quantity"),
        ]


class OrderEvent(models.Model):
    order = models.ForeignKey(Order, related_name="events", on_delete=models.CASCADE)
    from_status = models.CharField(max_length=24, blank=True)
    to_status = models.CharField(max_length=24, choices=Order.Status.choices)
    public_note = models.CharField(max_length=500, blank=True)
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at", "id"]
