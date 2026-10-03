import hashlib
import secrets
from datetime import timedelta

from django.conf import settings
from django.core.mail import send_mail
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import AuthenticationFailed

from .models import AccessLink, Customer


def token_hash(token):
    return hashlib.sha256(token.encode()).hexdigest()


def session_customer(request):
    if request.session.get("customer_verified_until", 0) <= timezone.now().timestamp():
        return None
    return Customer.objects.filter(pk=request.session.get("customer_id")).first()


def send_access_link(email):
    customer = Customer.objects.filter(email=email).first()
    if customer is None:
        return
    raw = secrets.token_urlsafe(32)
    with transaction.atomic():
        Customer.objects.select_for_update().get(pk=customer.pk)
        # A new email invalidates earlier unused links.
        AccessLink.objects.filter(customer=customer, used_at=None).update(used_at=timezone.now())
        link = AccessLink.objects.create(customer=customer, token_hash=token_hash(raw),
            expires_at=timezone.now() + timedelta(minutes=settings.CUSTOMER_LINK_MINUTES))
    url = f"{settings.FRONTEND_URL.rstrip('/')}/mis-pedidos#token={raw}"
    try:
        send_mail("Tu acceso a Rosana Frutos Secos",
                  f"Abrí {url}\nConfirmá el acceso en la web. El enlace vence en {settings.CUSTOMER_LINK_MINUTES} minutos y se usa una sola vez.\nSi no lo solicitaste, ignorá este email.",
                  settings.DEFAULT_FROM_EMAIL, [customer.email], fail_silently=False)
    except Exception:
        AccessLink.objects.filter(pk=link.pk).update(used_at=timezone.now())
        # Do not leak account existence or tokens through errors/logs.
        import logging
        logging.getLogger(__name__).error("No se pudo enviar un enlace de acceso; revisar configuración de email.")


def verify_access_link(request, raw):
    with transaction.atomic():
        link = AccessLink.objects.select_for_update().filter(token_hash=token_hash(raw)).first()
        if link is None or link.used_at or link.expires_at <= timezone.now():
            raise AuthenticationFailed("El enlace no es válido o venció. Pedí uno nuevo.")
        link.used_at = timezone.now()
        link.save(update_fields=["used_at"])
        request.session.cycle_key()
        request.session["customer_id"] = link.customer_id
        request.session["customer_verified_until"] = (timezone.now() + timedelta(days=settings.CUSTOMER_SESSION_DAYS)).timestamp()
