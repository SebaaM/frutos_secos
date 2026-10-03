"""Documentation-only contracts for custom operations; runtime validation stays in serializers."""

from drf_spectacular.utils import OpenApiExample, OpenApiResponse, extend_schema
from rest_framework import serializers
from rest_framework.fields import empty


class ImageMetadataSerializer(serializers.Serializer):
    alt_text = serializers.CharField(max_length=255, allow_blank=False)
    credit = serializers.CharField(max_length=160, allow_blank=True, required=False)


class ImageOrderSerializer(serializers.Serializer):
    ids = serializers.ListField(child=serializers.IntegerField(min_value=1), max_length=10)


DETAIL_ERROR = {
    "type": "object",
    "properties": {"detail": {"type": "string"}},
    "required": ["detail"],
}
VALIDATION_ERROR = {
    "oneOf": [
        {"type": "object", "additionalProperties": {}},
        {"type": "array", "items": {"type": "string"}},
    ],
}


def admin_schema(*, summary, responses, request=empty, description="", parameters=None, examples=None, errors=(400, 403, 404)):
    error_responses = {
        400: OpenApiResponse(VALIDATION_ERROR, "Validación: errores por campo, non_field_errors o lista de mensajes."),
        403: OpenApiResponse(DETAIL_ERROR, "Acceso bloqueado: entorno, IP u origen no permitido."),
        404: OpenApiResponse(DETAIL_ERROR, "El recurso no existe."),
        409: OpenApiResponse(DETAIL_ERROR, "expected_stock no coincide con el stock físico actual. Actualizar y reintentar."),
    }
    return extend_schema(
        summary=summary, tags=["Backoffice"], request=request,
        responses={**{code: error_responses[code] for code in errors}, **responses},
        description=(
            "Requiere DEBUG y BACKOFFICE_ENABLED, conexión loopback y Origin permitido si está presente. "
            "Requiere una sesión de operador activo y X-CSRFToken para escrituras.\n\n" + description
        ),
        parameters=parameters or [], examples=examples or [],
    )


PRODUCT_EXAMPLE = OpenApiExample(
    "Producto en borrador", request_only=True,
    value={
        "name": "Almendras naturales", "slug": "almendras-naturales-ejemplo",
        "category": 1, "description": "Presentaciones fijas de almendras.",
        "ingredients": "Almendras.", "allergen_info": "Contiene almendras.",
        "storage_instructions": "Conservar en un lugar fresco y seco.",
        "is_published": False, "is_featured": False,
        "variants": [{"sku": "EJ-ALM-250", "weight_grams": 250, "price": "6300.00",
                      "is_active": True, "stock_physical": 10}],
    },
)
