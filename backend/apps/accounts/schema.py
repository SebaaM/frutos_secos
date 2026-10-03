from drf_spectacular.extensions import OpenApiAuthenticationExtension


class CookieSessionScheme(OpenApiAuthenticationExtension):
    target_class = "apps.accounts.authentication.CsrfSessionAuthentication"
    name = "cookieAuth"

    def get_security_definition(self, auto_schema):
        return {"type": "apiKey", "in": "cookie", "name": "sessionid",
                "description": "Sesión HttpOnly. Escrituras requieren X-CSRFToken obtenido en /auth/session/."}
