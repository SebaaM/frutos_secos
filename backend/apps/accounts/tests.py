import re
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core import mail
from django.core.cache import cache
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from .models import AccessLink, Customer
from .services import send_access_link, token_hash


@override_settings(DEBUG=True, BACKOFFICE_ENABLED=True, EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend", PASSWORD_HASHERS=["django.contrib.auth.hashers.MD5PasswordHasher"])
class AuthenticationTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient(enforce_csrf_checks=True)
        self.staff = get_user_model().objects.create_user("operator", password="test-only-password", is_staff=True)
        self.customer = Customer.objects.create(email="customer@example.invalid")

    def csrf(self):
        response = self.client.get("/api/v1/auth/session/")
        self.assertEqual(response.status_code, 200)
        return {"HTTP_X_CSRFTOKEN": response.data["csrf_token"]}

    def token(self):
        send_access_link(self.customer.email)
        return re.search(r"#token=([A-Za-z0-9_-]+)", mail.outbox[-1].body).group(1)

    def test_anonymous_login_and_checkout_require_csrf(self):
        for url, data in [("/api/v1/auth/staff/login/", {"username": "operator", "password": "test-only-password"}),
                          ("/api/v1/auth/customer/verify/", {"token": "a" * 43}),
                          ("/api/v1/orders/", {})]:
            self.assertEqual(self.client.post(url, data, format="json").status_code, 403)
        self.assertEqual(self.client.get("/api/v1/backoffice/products/").status_code, 403)

    def test_staff_login_permissions_rotation_and_logout(self):
        token = self.csrf()
        before = self.client.session.session_key
        response = self.client.post("/api/v1/auth/staff/login/", {"username": "operator", "password": "test-only-password"}, format="json", **token)
        self.assertEqual(response.status_code, 200, response.data)
        self.assertNotEqual(before, self.client.session.session_key)
        self.assertEqual(response.data["staff"]["username"], "operator")
        self.assertEqual(self.client.get("/api/v1/backoffice/products/").status_code, 200)
        self.assertEqual(self.client.post("/api/v1/backoffice/categories/", {"name": "Test", "slug": "test"}, format="json").status_code, 403)
        self.assertEqual(self.client.post("/api/v1/auth/staff/logout/", {}, format="json", **self.csrf()).status_code, 200)
        self.assertEqual(self.client.get("/api/v1/backoffice/products/").status_code, 403)

    def test_non_staff_and_inactive_accounts_cannot_login(self):
        for active, staff in [(True, False), (False, True)]:
            self.staff.is_active = active
            self.staff.is_staff = staff
            self.staff.save()
            self.assertEqual(self.client.post("/api/v1/auth/staff/login/", {"username": "operator", "password": "test-only-password"}, format="json", **self.csrf()).status_code, 400)

    def test_known_and_unknown_email_have_identical_response_and_no_token(self):
        responses = [self.client.post("/api/v1/auth/customer/request-link/", {"email": email}, format="json", **self.csrf())
                     for email in [self.customer.email.upper(), "unknown@example.invalid"]]
        self.assertEqual([r.status_code for r in responses], [202, 202])
        self.assertEqual(responses[0].data, responses[1].data)
        self.assertEqual(len(mail.outbox), 1)
        raw = re.search(r"#token=([A-Za-z0-9_-]+)", mail.outbox[0].body).group(1)
        self.assertEqual(AccessLink.objects.get().token_hash, token_hash(raw))
        self.assertNotIn(raw, str(responses[0].data))
        self.assertFalse(Customer.objects.filter(email="unknown@example.invalid").exists())

    def test_magic_link_is_single_use_and_customer_is_not_staff(self):
        raw = self.token()
        self.assertEqual(self.client.post("/api/v1/auth/customer/verify/", {"token": raw}, format="json", **self.csrf()).status_code, 200)
        self.assertEqual(self.client.get("/api/v1/auth/session/").data["customer"]["email"], self.customer.email)
        self.assertEqual(self.client.get("/api/v1/backoffice/orders/").status_code, 403)
        self.assertEqual(self.client.post("/api/v1/auth/customer/verify/", {"token": raw}, format="json", **self.csrf()).status_code, 403)
        self.assertEqual(self.client.post("/api/v1/auth/customer/logout/", {}, format="json", **self.csrf()).status_code, 200)
        self.assertIsNone(self.client.get("/api/v1/auth/session/").data["customer"])

    def test_expired_link_and_replaced_link_are_rejected(self):
        old = self.token()
        raw = self.token()
        self.assertEqual(self.client.post("/api/v1/auth/customer/verify/", {"token": old}, format="json", **self.csrf()).status_code, 403)
        AccessLink.objects.filter(token_hash=token_hash(raw)).update(expires_at=timezone.now() - timedelta(seconds=1))
        self.assertEqual(self.client.post("/api/v1/auth/customer/verify/", {"token": raw}, format="json", **self.csrf()).status_code, 403)

    def test_expired_customer_session_has_no_access(self):
        session = self.client.session
        session["customer_id"] = self.customer.id
        session["customer_verified_until"] = timezone.now().timestamp() - 1
        session.save()
        self.assertEqual(self.client.get("/api/v1/orders/").status_code, 403)

    def test_email_request_rate_limit(self):
        for _ in range(5):
            self.assertEqual(self.client.post("/api/v1/auth/customer/request-link/", {"email": "unknown@example.invalid"}, format="json", **self.csrf()).status_code, 202)
        self.assertEqual(self.client.post("/api/v1/auth/customer/request-link/", {"email": "unknown@example.invalid"}, format="json", **self.csrf()).status_code, 429)
