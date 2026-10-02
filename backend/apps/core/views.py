from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import serializers
from drf_spectacular.utils import OpenApiExample, extend_schema, inline_serializer


@extend_schema(
    summary="Comprobar disponibilidad del servicio", tags=["Sistema"], auth=[],
    description="Devuelve ok cuando Django responde; no comprueba la conexión a la base de datos.",
    responses=inline_serializer(name="Health", fields={"status": serializers.ChoiceField(choices=["ok"])}),
    examples=[OpenApiExample("Servicio disponible", value={"status": "ok"}, response_only=True)],
)
@api_view(["GET"])
def health_check(request):
    return Response({"status": "ok"})
