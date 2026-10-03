from django.test import SimpleTestCase, override_settings
from pathlib import Path
import yaml
from django.contrib.staticfiles import finders
from drf_spectacular.generators import SchemaGenerator
from drf_spectacular.validation import validate_schema
from rest_framework.test import APIClient


class OpenApiContractTests(SimpleTestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        # SimpleTestCase forbids DB queries: documenting the API must not load real data.
        cls.schema = SchemaGenerator().get_schema(request=None, public=True)

    def resolve(self, schema):
        if "$ref" in schema:
            return self.schema["components"]["schemas"][schema["$ref"].rsplit("/", 1)[1]]
        return schema

    def test_schema_is_valid_and_documents_exactly_supported_operations(self):
        validate_schema(self.schema)
        self.assertEqual(self.schema["openapi"], "3.0.3")
        expected = {
            "/api/v1/health/": {"get"},
            "/api/v1/catalog/categories/": {"get"},
            "/api/v1/catalog/categories/{id}/": {"get"},
            "/api/v1/catalog/products/": {"get"},
            "/api/v1/catalog/products/{id}/": {"get"},
            "/api/v1/backoffice/categories/": {"get", "post"},
            "/api/v1/backoffice/categories/{id}/": {"get", "patch"},
            "/api/v1/backoffice/products/": {"get", "post"},
            "/api/v1/backoffice/products/{id}/": {"get", "patch"},
            "/api/v1/backoffice/products/{id}/images/": {"post"},
            "/api/v1/backoffice/products/{id}/reorder-images/": {"post"},
            "/api/v1/backoffice/images/{id}/": {"patch", "delete"},
            "/api/v1/backoffice/variants/{id}/adjust-stock/": {"post"},
            "/api/v1/backoffice/variants/{id}/movements/": {"get"},
            "/api/v1/auth/session/": {"get"},
            "/api/v1/auth/staff/login/": {"post"},
            "/api/v1/auth/staff/logout/": {"post"},
            "/api/v1/auth/customer/request-link/": {"post"},
            "/api/v1/auth/customer/verify/": {"post"},
            "/api/v1/auth/customer/logout/": {"post"},
            "/api/v1/orders/": {"get", "post"},
            "/api/v1/orders/{id}/": {"get"},
            "/api/v1/backoffice/orders/": {"get"},
            "/api/v1/backoffice/orders/{id}/": {"get", "patch"},
            "/api/v1/backoffice/orders/{id}/transition/": {"post"},
        }
        self.assertEqual({path: set(operations) for path, operations in self.schema["paths"].items()}, expected)
        ids = [operation["operationId"] for operations in self.schema["paths"].values() for operation in operations.values()]
        self.assertEqual(len(ids), len(set(ids)))

    def test_exported_contract_matches_current_api(self):
        exported = Path(__file__).resolve().parents[3] / "docs" / "openapi.yaml"
        self.assertEqual(yaml.safe_load(exported.read_text(encoding="utf-8")), self.schema)

    def test_filters_nested_gallery_and_decimal_prices(self):
        public = self.schema["paths"]["/api/v1/catalog/products/"]["get"]
        self.assertEqual({p["name"] for p in public["parameters"]}, {"category", "featured"})
        self.assertEqual(public["responses"]["200"]["content"]["application/json"]["schema"]["type"], "array")
        product = self.schema["components"]["schemas"]["Product"]["properties"]
        self.assertEqual(product["variants"]["type"], "array")
        self.assertEqual(product["images"]["type"], "array")
        self.assertEqual(self.schema["components"]["schemas"]["ProductVariant"]["properties"]["price"]["type"], "string")

    def test_custom_write_contracts_do_not_reuse_read_serializers(self):
        paths = self.schema["paths"]
        create = paths["/api/v1/backoffice/products/"]["post"]
        request = self.resolve(create["requestBody"]["content"]["application/json"]["schema"])
        self.assertIn("variants", request["properties"])
        self.assertNotIn("images", request["properties"])
        self.assertIn("201", create["responses"])
        variant = self.resolve(request["properties"]["variants"]["items"])
        self.assertNotIn("stock_reserved", variant["properties"])
        self.assertEqual(variant["properties"]["weight_grams"]["type"], "integer")
        upload = paths["/api/v1/backoffice/products/{id}/images/"]["post"]
        multipart = self.resolve(upload["requestBody"]["content"]["multipart/form-data"]["schema"])
        self.assertEqual(multipart["properties"]["image"]["format"], "binary")
        self.assertIn("alt_text", multipart["required"])
        metadata = paths["/api/v1/backoffice/images/{id}/"]["patch"]
        properties = self.resolve(metadata["requestBody"]["content"]["application/json"]["schema"])["properties"]
        self.assertEqual(set(properties), {"alt_text", "credit"})
        self.assertEqual(set(paths["/api/v1/backoffice/variants/{id}/adjust-stock/"]["post"]["responses"]), {"200", "400", "403", "404", "409"})
        self.assertNotIn("content", paths["/api/v1/backoffice/images/{id}/"]["delete"]["responses"]["204"])

    @override_settings(DEBUG=True, BACKOFFICE_ENABLED=True)
    def test_local_documentation_and_static_swagger_resources(self):
        client = APIClient()
        schema = client.get("/api/schema/?format=json", REMOTE_ADDR="127.0.0.1")
        self.assertEqual(schema.status_code, 200)
        self.assertEqual(schema.json()["openapi"], "3.0.3")
        swagger = client.get("/api/docs/swagger/", REMOTE_ADDR="127.0.0.1")
        self.assertEqual(swagger.status_code, 200)
        self.assertContains(swagger, "/static/drf_spectacular_sidecar/swagger-ui-dist/swagger-ui-bundle.js")
        self.assertIsNotNone(finders.find("drf_spectacular_sidecar/swagger-ui-dist/swagger-ui-bundle.js"))

    def test_documentation_respects_local_development_guard(self):
        client = APIClient()
        for url in ["/api/schema/", "/api/docs/swagger/"]:
            with self.subTest(url=url):
                with override_settings(DEBUG=False, BACKOFFICE_ENABLED=True):
                    self.assertEqual(client.get(url, REMOTE_ADDR="127.0.0.1").status_code, 403)
                with override_settings(DEBUG=True, BACKOFFICE_ENABLED=False):
                    self.assertEqual(client.get(url, REMOTE_ADDR="127.0.0.1").status_code, 403)
                with override_settings(DEBUG=True, BACKOFFICE_ENABLED=True):
                    self.assertEqual(client.get(url, REMOTE_ADDR="192.0.2.1").status_code, 403)
                    self.assertEqual(client.get(url, REMOTE_ADDR="127.0.0.1", HTTP_X_BACKOFFICE_CLIENT_IP="192.0.2.1").status_code, 403)
                    self.assertEqual(client.get(url, REMOTE_ADDR="127.0.0.1", HTTP_ORIGIN="https://example.com").status_code, 403)
