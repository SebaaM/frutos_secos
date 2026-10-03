from decimal import Decimal
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers
from .models import Order, OrderEvent, OrderLine


class LineInputSerializer(serializers.Serializer):
    variant_id = serializers.IntegerField(min_value=1)
    quantity = serializers.IntegerField(min_value=1, max_value=999)
    expected_unit_price = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal("0.01"))


class OrderInputSerializer(serializers.Serializer):
    idempotency_key = serializers.UUIDField()
    lines = LineInputSerializer(many=True, allow_empty=False, max_length=100)
    name = serializers.CharField(max_length=120)
    email = serializers.EmailField(max_length=254)
    phone = serializers.CharField(max_length=40, allow_blank=True, required=False, default="")
    delivery = serializers.ChoiceField(choices=Order.Delivery.choices)
    address = serializers.CharField(max_length=300, allow_blank=True, required=False, default="")
    address_help = serializers.CharField(max_length=300, allow_blank=True, required=False, default="")

    def validate_email(self, value):
        return value.strip().lower()

    def validate(self, data):
        if data["delivery"] == Order.Delivery.ENTREGA and not data["address"].strip():
            raise serializers.ValidationError({"address": "Ingresá la dirección para reparto."})
        ids = [line["variant_id"] for line in data["lines"]]
        if len(set(ids)) != len(ids):
            raise serializers.ValidationError({"lines": "No repitas una presentación."})
        return data

    def to_internal_value(self, data):
        if not isinstance(data, dict):
            return super().to_internal_value(data)
        unknown = set(data) - set(self.fields)
        if unknown:
            raise serializers.ValidationError({key: "Campo no permitido." for key in sorted(unknown)})
        return super().to_internal_value(data)


class OrderLineSerializer(serializers.ModelSerializer):
    variant_id = serializers.IntegerField(read_only=True)
    line_total = serializers.SerializerMethodField()

    @extend_schema_field(serializers.DecimalField(max_digits=14, decimal_places=2))
    def get_line_total(self, line):
        return str(line.unit_price * line.quantity)

    class Meta:
        model = OrderLine
        fields = ["variant_id", "product_id_snapshot", "product_name", "sku", "weight_grams", "unit_price", "quantity", "line_total"]


class OrderEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderEvent
        fields = ["from_status", "to_status", "public_note", "created_at"]


class OrderSerializer(serializers.ModelSerializer):
    lines = OrderLineSerializer(many=True, read_only=True)
    events = OrderEventSerializer(many=True, read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Order
        fields = ["id", "reference", "name", "email", "phone", "delivery", "address", "address_help", "status", "status_label",
                  "subtotal", "reserved_at", "reservation_expires_at", "created_at", "updated_at", "lines", "events"]
        read_only_fields = fields


class AdminOrderSerializer(OrderSerializer):
    class Meta(OrderSerializer.Meta):
        fields = OrderSerializer.Meta.fields + ["internal_note"]
        read_only_fields = fields


class TransitionSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Order.Status.choices)
    expected_status = serializers.ChoiceField(choices=Order.Status.choices)
    public_note = serializers.CharField(max_length=500, allow_blank=True, required=False, default="")


class OrderNoteSerializer(serializers.Serializer):
    internal_note = serializers.CharField(max_length=4000, allow_blank=True)
