from decimal import Decimal

from django.test import TestCase
from rest_framework.test import APIClient

from .models import Category, Product, ProductImage, ProductVariant


class CatalogApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.category = Category.objects.create(name="Frutos secos", slug="frutos-secos")
        self.product = Product.objects.create(
            category=self.category,
            name="Almendras naturales",
            slug="almendras-naturales",
            ingredients="Almendras.",
            allergen_info="Contiene almendras.",
            is_published=True,
        )

    def test_lists_only_published_products_and_active_variants(self):
        ProductVariant.objects.create(
            product=self.product,
            sku="ALM-250",
            weight_grams=250,
            price=Decimal("4200.00"),
            stock_physical=12,
            stock_reserved=2,
        )
        ProductVariant.objects.create(
            product=self.product,
            sku="ALM-500",
            weight_grams=500,
            price=Decimal("8000.00"),
            stock_physical=10,
            is_active=False,
        )
        ProductImage.objects.create(
            product=self.product,
            image_url="https://images.example.com/almendras-1.jpg",
            alt_text="Almendras naturales sobre fondo claro.",
            position=0,
        )
        ProductImage.objects.create(
            product=self.product,
            image_url="https://images.example.com/almendras-2.jpg",
            alt_text="Detalle de almendras naturales.",
            position=1,
        )
        Product.objects.create(
            category=self.category,
            name="Borrador",
            slug="borrador",
            is_published=False,
        )

        response = self.client.get("/api/v1/catalog/products/?category=frutos-secos")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 1)
        variant = response.json()[0]["variants"][0]
        self.assertEqual(variant["stock_available"], 10)
        self.assertEqual(variant["availability"], "in_stock")
        self.assertEqual(len(response.json()[0]["images"]), 2)
        self.assertEqual(response.json()[0]["images"][0]["position"], 0)

    def test_variant_reports_low_and_out_of_stock(self):
        low_stock = ProductVariant.objects.create(
            product=self.product,
            sku="ALM-100",
            weight_grams=100,
            price=Decimal("2000.00"),
            stock_physical=5,
        )
        out_of_stock = ProductVariant.objects.create(
            product=self.product,
            sku="ALM-025",
            weight_grams=25,
            price=Decimal("800.00"),
            stock_physical=5,
            stock_reserved=5,
        )

        self.assertEqual(low_stock.availability, "low_stock")
        self.assertEqual(out_of_stock.availability, "out_of_stock")
