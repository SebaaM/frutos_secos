from io import BytesIO
from tempfile import TemporaryDirectory

from PIL import Image
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from .models import Category, Product, ProductImage, ProductVariant, StockMovement


def image_file(format="PNG", name="photo.png"):
    stream = BytesIO()
    Image.new("RGB", (16, 16), "green").save(stream, format=format)
    return SimpleUploadedFile(name, stream.getvalue(), content_type="image/" + format.lower())


@override_settings(DEBUG=True, BACKOFFICE_ENABLED=True)
class BackofficeTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.media = TemporaryDirectory()
        self.addCleanup(self.media.cleanup)
        self.media_override = override_settings(MEDIA_ROOT=self.media.name)
        self.media_override.enable()
        self.addCleanup(self.media_override.disable)
        self.category = Category.objects.create(name="Hierbas", slug="hierbas")
        self.product = Product.objects.create(category=self.category, name="Menta", slug="menta")
        self.variant = ProductVariant.objects.create(product=self.product, sku="MENTA-50", weight_grams=50,
                                                    price="1300.00", stock_physical=10, stock_reserved=2)
        self.url = f"/api/v1/backoffice/products/{self.product.pk}/"

    def variant_data(self, **updates):
        return {"id": self.variant.id, "sku": self.variant.sku, "weight_grams": 50,
                "price": "1300.00", "is_active": True, **updates}

    def add_image(self, **updates):
        return self.client.post(self.url + "images/", {"image": image_file(), "alt_text": "Hojas de menta", **updates}, format="multipart")

    def publish(self):
        self.add_image()
        return self.client.patch(self.url, {"is_published": True}, format="json")

    def test_create_draft_with_initial_stock_movement(self):
        response = self.client.post("/api/v1/backoffice/products/", {
            "name": "Cedrón", "slug": "cedron", "category": self.category.id,
            "variants": [{"sku": "CEDRON-25", "weight_grams": 25, "price": "900.25", "stock_physical": 8}],
        }, format="json")
        self.assertEqual(response.status_code, 201, response.data)
        self.assertFalse(response.data["is_published"])
        self.assertEqual(response.data["variants"][0]["stock_available"], 8)
        self.assertEqual(StockMovement.objects.get().reason, "Stock inicial")

    def test_publication_requires_active_category_image_and_variant(self):
        response = self.client.patch(self.url, {"is_published": True}, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(self.publish().status_code, 200)
        response = self.client.patch(self.url, {"variants": [self.variant_data(is_active=False)]}, format="json")
        self.assertEqual(response.status_code, 400)
        self.variant.refresh_from_db()
        self.assertTrue(self.variant.is_active)

    def test_metadata_and_presentations_are_atomic(self):
        other = ProductVariant.objects.create(product=self.product, sku="MENTA-100", weight_grams=100, price="2000.00")
        data = [self.variant_data(price="1700.00"), {"id": other.id, "sku": "MENTA-50", "weight_grams": 100, "price": "2000.00"}]
        response = self.client.patch(self.url, {"name": "No guardar", "variants": data}, format="json")
        self.assertEqual(response.status_code, 400)
        self.product.refresh_from_db()
        self.variant.refresh_from_db()
        self.assertEqual(self.product.name, "Menta")
        self.assertEqual(str(self.variant.price), "1300.00")

    def test_duplicate_weights_zero_prices_and_invalid_ids_rejected(self):
        for variants in [
            [self.variant_data(), {"sku": "NEW", "weight_grams": 50, "price": "2.00"}],
            [self.variant_data(price="0.00")],
            [self.variant_data(weight_grams=0)],
            [self.variant_data(id=99999)],
            [],
        ]:
            self.assertEqual(self.client.patch(self.url, {"variants": variants}, format="json").status_code, 400)

    def test_reserved_weight_and_stock_are_protected(self):
        for change in [{"weight_grams": 60}, {"is_active": False}, {"stock_physical": 20}]:
            response = self.client.patch(self.url, {"variants": [self.variant_data(**change)]}, format="json")
            self.assertEqual(response.status_code, 400)
        self.client.patch(self.url, {"variants": [self.variant_data(stock_reserved=0)]}, format="json")
        self.variant.refresh_from_db()
        self.assertEqual(self.variant.stock_reserved, 2)

    def test_stock_adjustment_requires_reason_and_preserves_reserves(self):
        url = f"/api/v1/backoffice/variants/{self.variant.id}/adjust-stock/"
        for data, expected in [
            ({"delta": -9, "reason": "Merma", "expected_stock": 10}, 400),
            ({"delta": 0, "reason": "Merma", "expected_stock": 10}, 400),
            ({"delta": 2, "reason": "", "expected_stock": 10}, 400),
            ({"delta": 2, "reason": "Reposición", "expected_stock": 8}, 409),
        ]:
            self.assertEqual(self.client.post(url, data, format="json").status_code, expected)
        self.assertEqual(StockMovement.objects.count(), 0)
        response = self.client.post(url, {"delta": -3, "reason": "Merma", "expected_stock": 10}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["stock_available"], 5)
        movement = StockMovement.objects.get()
        self.assertEqual((movement.previous_stock, movement.resulting_stock, movement.delta), (10, 7, -3))
        self.assertEqual(self.client.get(url.replace("adjust-stock", "movements")).data[0]["reason"], "Merma")

    def test_multiple_images_upload_reorder_metadata_and_delete(self):
        first = self.add_image()
        second = self.add_image()
        self.assertEqual(first.status_code, 201, first.data)
        self.assertTrue(first.data["image_url"].startswith("http://testserver/media/products/"))
        ids = [second.data["id"], first.data["id"]]
        response = self.client.post(self.url + "reorder-images/", {"ids": ids}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual([item["id"] for item in response.data], ids)
        metadata_url = f"/api/v1/backoffice/images/{ids[0]}/"
        self.assertEqual(self.client.patch(metadata_url, {"alt_text": "Nueva descripción", "credit": "Rosana"}, format="json").status_code, 200)
        self.assertEqual(self.client.delete(metadata_url).status_code, 204)
        self.assertEqual(self.product.images.get().position, 0)
        self.assertEqual(self.client.delete(f"/api/v1/backoffice/images/{ids[1]}/").status_code, 204)

    def test_published_last_image_cannot_be_removed(self):
        self.publish()
        image = self.product.images.get()
        self.assertEqual(self.client.delete(f"/api/v1/backoffice/images/{image.id}/").status_code, 400)

    def test_legacy_url_images_are_preserved(self):
        image = ProductImage.objects.create(product=self.product, image_url="https://example.com/menta.jpg", alt_text="Menta", position=0)
        response = self.client.get(self.url)
        self.assertEqual(response.data["images"][0]["image_url"], image.image_url)
        self.assertEqual(self.client.patch(self.url, {"name": "Menta natural"}, format="json").status_code, 200)
        self.assertEqual(self.product.images.count(), 1)

    def test_image_validation_and_limits(self):
        for file in [SimpleUploadedFile("fake.png", b"not an image", content_type="image/png"), image_file("GIF", "photo.gif")]:
            self.assertEqual(self.add_image(image=file).status_code, 400)
        oversized = image_file()
        oversized.size = 5 * 1024 * 1024 + 1
        from .backoffice_serializers import ImageInputSerializer
        serializer = ImageInputSerializer(data={"image": oversized, "alt_text": "Menta"})
        self.assertFalse(serializer.is_valid())
        self.assertEqual(self.add_image(alt_text="").status_code, 400)
        for _ in range(10):
            self.assertEqual(self.add_image().status_code, 201)
        self.assertEqual(self.add_image().status_code, 400)
        ids = list(self.product.images.values_list("id", flat=True))
        self.assertEqual(self.client.post(self.url + "reorder-images/", {"ids": ids[:-1]}, format="json").status_code, 400)
        self.assertEqual(self.client.post(self.url + "reorder-images/", {"ids": [ids[0]] * 10}, format="json").status_code, 400)

    def test_categories_cannot_hide_published_products_accidentally(self):
        self.publish()
        url = f"/api/v1/backoffice/categories/{self.category.id}/"
        self.assertEqual(self.client.patch(url, {"is_active": False}, format="json").status_code, 400)
        self.client.patch(self.url, {"is_published": False}, format="json")
        self.assertEqual(self.client.patch(url, {"is_active": False}, format="json").status_code, 200)
        self.assertEqual(self.client.patch(self.url, {"is_published": True}, format="json").status_code, 400)

    def test_hard_deletion_and_public_writes_are_disabled(self):
        self.assertEqual(self.client.delete(self.url).status_code, 405)
        self.assertEqual(self.client.delete(f"/api/v1/backoffice/categories/{self.category.id}/").status_code, 405)
        self.assertEqual(self.client.post("/api/v1/catalog/products/", {}, format="json").status_code, 405)

    def test_backoffice_unavailable_in_production_remote_or_untrusted_origin(self):
        with override_settings(DEBUG=False):
            self.assertEqual(self.client.get(self.url).status_code, 403)
        with override_settings(BACKOFFICE_ENABLED=False):
            self.assertEqual(self.client.get(self.url).status_code, 403)
        self.assertEqual(self.client.get(self.url, REMOTE_ADDR="192.168.1.2").status_code, 403)
        self.assertEqual(self.client.post(self.url + "images/", {}, HTTP_ORIGIN="https://evil.example").status_code, 403)
        self.assertEqual(self.client.get(self.url, HTTP_ORIGIN="http://localhost:8443").status_code, 200)
