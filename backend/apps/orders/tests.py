import uuid
from datetime import datetime, timedelta
from decimal import Decimal
from io import StringIO
from zoneinfo import ZoneInfo

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.management import call_command
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import Customer
from apps.catalog.models import Category, Product, ProductVariant, StockMovement
from .models import Order
from .services import business_deadline


@override_settings(DEBUG=True, BACKOFFICE_ENABLED=True, PASSWORD_HASHERS=["django.contrib.auth.hashers.MD5PasswordHasher"])
class OrderTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.admin = APIClient()
        self.staff = get_user_model().objects.create_user("operator", password="test-only-password", is_staff=True)
        self.admin.force_authenticate(self.staff)
        category = Category.objects.create(name="Frutos", slug="frutos")
        self.product = Product.objects.create(category=category, name="Nueces", slug="nueces", is_published=True)
        self.variant = ProductVariant.objects.create(product=self.product, sku="NUEZ-250", weight_grams=250, price="2000.25", stock_physical=10, stock_reserved=2)

    def payload(self, **extra):
        return {"idempotency_key": str(uuid.uuid4()), "name": "Cliente", "email": "client@example.invalid", "delivery": "retiro_local",
                "lines": [{"variant_id": self.variant.id, "quantity": 3, "expected_unit_price": "2000.25"}], **extra}

    def order(self, **extra):
        response = self.client.post("/api/v1/orders/", self.payload(**extra), format="json")
        self.assertEqual(response.status_code, 201, response.data)
        return response.data

    def change(self, order, target, expected=None, **extra):
        return self.admin.post(f"/api/v1/backoffice/orders/{order['id']}/transition/", {
            "status": target, "expected_status": expected or order["status"], **extra}, format="json")

    def assert_stock(self, physical, reserved):
        self.variant.refresh_from_db()
        self.assertEqual((self.variant.stock_physical, self.variant.stock_reserved), (physical, reserved))

    def test_creation_uses_server_prices_without_reservation_and_keeps_snapshot(self):
        order = self.order()
        self.assertEqual(order["subtotal"], "6000.75")
        self.assertEqual(order["status"], "A_CONFIRMAR")
        self.assert_stock(10, 2)
        self.variant.price = Decimal("4000.00")
        self.variant.save()
        self.product.name = "Nombre nuevo"
        self.product.save()
        response = self.admin.get(f"/api/v1/backoffice/orders/{order['id']}/")
        self.assertEqual(response.data["lines"][0]["unit_price"], "2000.25")
        self.assertEqual(response.data["lines"][0]["product_name"], "Nueces")

    def test_idempotency_and_conflicting_payload(self):
        data = self.payload()
        first = self.client.post("/api/v1/orders/", data, format="json")
        second = self.client.post("/api/v1/orders/", data, format="json")
        self.assertEqual(second.status_code, 200)
        self.assertEqual(first.data["id"], second.data["id"])
        self.assertEqual(Order.objects.count(), 1)
        data["name"] = "Otro cliente"
        self.assertEqual(self.client.post("/api/v1/orders/", data, format="json").status_code, 409)

    def test_prices_stock_archived_variants_and_delivery_are_validated(self):
        for lines in [[{"variant_id": self.variant.id, "quantity": 9, "expected_unit_price": "2000.25"}],
                      [{"variant_id": self.variant.id, "quantity": 1, "expected_unit_price": "0.01"}],
                      [{"variant_id": 99999, "quantity": 1, "expected_unit_price": "1.00"}]]:
            self.assertEqual(self.client.post("/api/v1/orders/", self.payload(lines=lines), format="json").status_code, 409)
        self.assertEqual(self.client.post("/api/v1/orders/", self.payload(delivery="entrega_local"), format="json").status_code, 400)
        self.variant.is_active = False
        self.variant.save()
        self.assertEqual(self.client.post("/api/v1/orders/", self.payload(), format="json").status_code, 409)
        self.assertEqual(Order.objects.count(), 0)

    def test_rejects_zero_fractional_and_duplicate_quantities(self):
        for qty in [0, -1, 1.5]:
            data = self.payload()
            data["lines"][0]["quantity"] = qty
            self.assertEqual(self.client.post("/api/v1/orders/", data, format="json").status_code, 400)
        data = self.payload()
        data["lines"] *= 2
        self.assertEqual(self.client.post("/api/v1/orders/", data, format="json").status_code, 400)

    def test_invalid_json_shapes_and_client_totals_are_rejected(self):
        self.assertEqual(self.client.post("/api/v1/orders/", [], format="json").status_code, 400)
        self.assertEqual(self.client.post("/api/v1/orders/", self.payload(subtotal="0.01"), format="json").status_code, 400)

    def test_board_columns_paginate_independently(self):
        order = self.order()
        self.change(order, "RESERVADO")
        self.assertEqual(self.admin.get("/api/v1/backoffice/orders/?bucket=confirmar").data["count"], 0)
        self.assertEqual(self.admin.get("/api/v1/backoffice/orders/?bucket=proximos").data["count"], 1)

    def test_pickup_lifecycle_consumes_stock_once_with_audit(self):
        order = self.order()
        for target in ["RESERVADO", "PREPARANDO", "LISTO_PARA_RETIRO", "TERMINADO"]:
            response = self.change(order, target, public_note="Actualizado")
            self.assertEqual(response.status_code, 200, response.data)
            order = response.data
            self.assert_stock(7 if target == "TERMINADO" else 10, 2 if target == "TERMINADO" else 5)
        movement = StockMovement.objects.get()
        self.assertEqual((movement.delta, movement.previous_stock, movement.resulting_stock), (-3, 10, 7))
        self.assertEqual(len(order["events"]), 5)
        self.assertEqual(self.change(order, "TERMINADO").status_code, 400)
        self.assert_stock(7, 2)

    def test_delivery_and_invalid_skip(self):
        order = self.order(delivery="entrega_local", address="Calle 123")
        self.assertEqual(self.change(order, "TERMINADO").status_code, 400)
        for target in ["RESERVADO", "PREPARANDO"]:
            response = self.change(order, target)
            self.assertEqual(response.status_code, 200)
            order = response.data
        self.assertEqual(self.change(order, "LISTO_PARA_RETIRO").status_code, 400)
        order = self.change(order, "EN_REPARTO").data
        self.assertEqual(self.change(order, "TERMINADO").status_code, 200)
        self.assert_stock(7, 2)

    def test_cancellation_and_expiration_release_only_reserved_units(self):
        for terminal in ["CANCELADO", "VENCIDO"]:
            order = self.order()
            order = self.change(order, "RESERVADO").data
            self.assertIsNotNone(order["reservation_expires_at"])
            self.assertEqual(self.change(order, terminal).status_code, 200)
            self.assert_stock(10, 2)
        order = self.order()
        self.assertEqual(self.change(order, "CANCELADO").status_code, 200)
        self.assert_stock(10, 2)

    def test_stock_is_rechecked_and_reservation_is_atomic_for_all_lines(self):
        second = ProductVariant.objects.create(product=self.product, sku="NUEZ-500", weight_grams=500, price="4000.00", stock_physical=3)
        order = self.order(lines=[{"variant_id": self.variant.id, "quantity": 3, "expected_unit_price": "2000.25"},
                                 {"variant_id": second.id, "quantity": 3, "expected_unit_price": "4000.00"}])
        second.stock_physical = 0
        second.save()
        self.assertEqual(self.change(order, "RESERVADO").status_code, 409)
        self.assert_stock(10, 2)
        self.assertEqual(Order.objects.get().status, "A_CONFIRMAR")

    def test_stale_transition_cannot_double_reserve(self):
        order = self.order()
        self.assertEqual(self.change(order, "RESERVADO").status_code, 200)
        self.assertEqual(self.change(order, "RESERVADO").status_code, 409)
        self.assert_stock(10, 5)

    def test_customer_isolation_and_internal_notes_are_private(self):
        order = self.order()
        self.admin.patch(f"/api/v1/backoffice/orders/{order['id']}/", {"internal_note": "Privado"}, format="json")
        self.assertEqual(self.client.get("/api/v1/orders/").status_code, 403)
        session = self.client.session
        session["customer_id"] = Customer.objects.get(email="client@example.invalid").id
        session["customer_verified_until"] = (timezone.now() + timedelta(days=1)).timestamp()
        session.save()
        response = self.client.get(f"/api/v1/orders/{order['id']}/")
        self.assertEqual(response.status_code, 200)
        self.assertNotIn("internal_note", response.data)
        self.assertEqual(self.client.get("/api/v1/orders/").data["count"], 1)
        other = self.order(email="other@example.invalid")
        self.assertEqual(self.client.get(f"/api/v1/orders/{other['id']}/").status_code, 404)

    def test_admin_order_permissions_sorting_and_note_cannot_change_price(self):
        first = self.order()
        second = self.order()
        response = self.admin.get("/api/v1/backoffice/orders/")
        self.assertEqual([item["id"] for item in response.data["results"]], [first["id"], second["id"]])
        self.assertEqual(self.client.get("/api/v1/backoffice/orders/").status_code, 403)
        response = self.admin.patch(f"/api/v1/backoffice/orders/{first['id']}/", {"internal_note": "Coordinar", "subtotal": "0.01", "status": "TERMINADO"}, format="json")
        self.assertEqual(response.data["subtotal"], "6000.75")
        self.assertEqual(response.data["status"], "A_CONFIRMAR")

    @override_settings(ORDER_AUTO_EXPIRE_ENABLED=True)
    def test_expiration_command_is_safe_and_idempotent(self):
        order = self.change(self.order(), "RESERVADO").data
        Order.objects.filter(pk=order["id"]).update(reservation_expires_at=timezone.now() - timedelta(seconds=1))
        call_command("expire_reservations", dry_run=True, stdout=StringIO())
        self.assert_stock(10, 5)
        call_command("expire_reservations", stdout=StringIO())
        call_command("expire_reservations", stdout=StringIO())
        self.assert_stock(10, 2)
        self.assertEqual(Order.objects.get().status, "VENCIDO")

    @override_settings(ORDER_BUSINESS_DAYS=[0, 1, 2, 3, 4], ORDER_BUSINESS_OPEN_HOUR=9, ORDER_BUSINESS_CLOSE_HOUR=18)
    def test_business_deadline_skips_weekend_and_closed_hours(self):
        friday = datetime(2026, 10, 2, 17, tzinfo=ZoneInfo("America/Argentina/Buenos_Aires"))
        self.assertEqual(business_deadline(friday, 2), datetime(2026, 10, 5, 10, tzinfo=friday.tzinfo))
