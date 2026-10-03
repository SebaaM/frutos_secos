from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from unittest import skipUnless

from django.db import close_old_connections, connection
from django.test import TransactionTestCase, override_settings
from rest_framework.exceptions import APIException

from apps.catalog.models import Category, Product, ProductVariant
from .serializers import OrderInputSerializer
from .services import create_order, transition_order
from .models import Order
import uuid


@skipUnless(connection.vendor == "postgresql", "Los bloqueos de filas requieren PostgreSQL; SQLite no los valida.")
class ReservationConcurrencyTests(TransactionTestCase):
    def setUp(self):
        category = Category.objects.create(name="Frutos", slug="frutos")
        product = Product.objects.create(name="Nueces", slug="nueces", category=category, is_published=True)
        self.variant = ProductVariant.objects.create(product=product, sku="N-250", weight_grams=250, price="100.00", stock_physical=1)

    def order(self, key=None):
        data = OrderInputSerializer(data={"idempotency_key": str(key or uuid.uuid4()), "name": "Test", "email": "test@example.invalid", "delivery": "retiro_local",
            "lines": [{"variant_id": self.variant.pk, "quantity": 1, "expected_unit_price": "100.00"}]})
        data.is_valid(raise_exception=True)
        return data.validated_data

    def test_two_orders_cannot_reserve_the_same_last_package(self):
        orders = [create_order(self.order())[0], create_order(self.order())[0]]
        barrier = Barrier(2)
        def reserve(order):
            close_old_connections()
            try:
                barrier.wait(timeout=10)
                try:
                    transition_order(order.pk, Order.Status.RESERVADO, Order.Status.A_CONFIRMAR)
                    return 200
                except APIException as error:
                    return error.status_code
            finally:
                close_old_connections()
        with ThreadPoolExecutor(max_workers=2) as pool:
            self.assertEqual(sorted(pool.map(reserve, orders)), [200, 409])
        self.variant.refresh_from_db()
        self.assertEqual(self.variant.stock_reserved, 1)

    def test_duplicate_concurrent_checkout_has_one_order(self):
        payload = self.order()
        barrier = Barrier(2)
        def checkout(_):
            close_old_connections()
            try:
                barrier.wait(timeout=10)
                return str(create_order(payload)[0].pk)
            finally:
                close_old_connections()
        with ThreadPoolExecutor(max_workers=2) as pool:
            ids = list(pool.map(checkout, range(2)))
        self.assertEqual(ids[0], ids[1])
        self.assertEqual(Order.objects.count(), 1)
