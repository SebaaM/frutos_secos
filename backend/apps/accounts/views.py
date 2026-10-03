import hashlib

from django.contrib.auth import authenticate, login, logout
from django.middleware.csrf import get_token, rotate_token
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import serializers
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import SimpleRateThrottle
from rest_framework.views import APIView

from apps.catalog.backoffice_views import LocalDevelopmentOnly
from apps.catalog.schema import VALIDATION_ERROR
from .serializers import EmailInputSerializer, MessageSerializer, SessionSerializer, StaffLoginSerializer, VerifyLinkSerializer
from .services import send_access_link, session_customer, verify_access_link


class AuthThrottle(SimpleRateThrottle):
    rate = "10/hour"

    def get_cache_key(self, request, view):
        return self.cache_format % {"scope": "auth_ip", "ident": self.get_ident(request)}


class EmailThrottle(SimpleRateThrottle):
    rate = "5/hour"

    def get_cache_key(self, request, view):
        email = str(request.data.get("email", "")).strip().lower()
        return self.cache_format % {"scope": "auth_email", "ident": hashlib.sha256(email.encode()).hexdigest()}


def session_data(request):
    customer = session_customer(request)
    return {"csrf_token": get_token(request),
            "staff": {"username": request.user.get_username()} if request.user.is_active and request.user.is_staff else None,
            "customer": {"email": customer.email} if customer else None}


class AuthView(APIView):
    permission_classes = [AllowAny]

    def finalize_response(self, request, response, *args, **kwargs):
        response = super().finalize_response(request, response, *args, **kwargs)
        response["Cache-Control"] = "no-store"
        response["Referrer-Policy"] = "no-referrer"
        return response


class SessionView(AuthView):
    @extend_schema(tags=["Autenticación"], auth=[], summary="Consultar sesión y obtener token CSRF", responses=SessionSerializer)
    def get(self, request):
        return Response(session_data(request))


class StaffLoginView(AuthView):
    permission_classes = [LocalDevelopmentOnly]
    throttle_classes = [AuthThrottle]

    @extend_schema(tags=["Autenticación"], auth=[], request=StaffLoginSerializer, responses={200: SessionSerializer, 400: OpenApiResponse(VALIDATION_ERROR), 403: MessageSerializer, 429: MessageSerializer}, summary="Iniciar sesión de operador", description="Solo operadores activos is_staff. Requiere X-CSRFToken incluso antes de iniciar sesión. Mantiene el guard de desarrollo local.")
    def post(self, request):
        data = StaffLoginSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        user = authenticate(request=request, **data.validated_data)
        if user is None or not user.is_active or not user.is_staff:
            raise serializers.ValidationError({"detail": "Usuario o contraseña incorrectos."})
        login(request, user)
        return Response(session_data(request))


class StaffLogoutView(AuthView):
    @extend_schema(tags=["Autenticación"], request=None, responses=SessionSerializer, summary="Cerrar la sesión compartida del navegador")
    def post(self, request):
        logout(request)
        return Response(session_data(request))


class RequestLinkView(AuthView):
    throttle_classes = [AuthThrottle, EmailThrottle]

    @extend_schema(tags=["Autenticación"], auth=[], request=EmailInputSerializer, responses={202: MessageSerializer, 400: OpenApiResponse(VALIDATION_ERROR), 403: MessageSerializer, 429: MessageSerializer}, summary="Solicitar acceso del cliente por email", description="Respuesta genérica para evitar revelar cuentas. Enlace de un uso, enviado solo a emails con pedidos existentes. Requiere CSRF.")
    def post(self, request):
        data = EmailInputSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        send_access_link(data.validated_data["email"])
        return Response({"detail": "Si ese email tiene pedidos, recibirás un enlace de acceso. Revisá también spam."}, status=202)


class VerifyLinkView(AuthView):
    throttle_classes = [AuthThrottle]

    @extend_schema(tags=["Autenticación"], auth=[], request=VerifyLinkSerializer, responses={200: SessionSerializer, 400: OpenApiResponse(VALIDATION_ERROR), 403: MessageSerializer, 429: MessageSerializer}, summary="Canjear enlace de acceso", description="POST explícito: abrir un email no consume el enlace. Token aleatorio guardado como hash; no es el número de pedido. Requiere CSRF.")
    def post(self, request):
        data = VerifyLinkSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        verify_access_link(request, data.validated_data["token"])
        rotate_token(request)
        return Response(session_data(request))


class CustomerLogoutView(AuthView):
    @extend_schema(tags=["Autenticación"], request=None, responses=SessionSerializer, summary="Cerrar acceso del cliente")
    def post(self, request):
        request.session.pop("customer_id", None)
        request.session.pop("customer_verified_until", None)
        request.session.cycle_key()
        rotate_token(request)
        return Response(session_data(request))
