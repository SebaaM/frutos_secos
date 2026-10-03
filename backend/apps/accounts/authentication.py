from rest_framework.authentication import SessionAuthentication


class CsrfSessionAuthentication(SessionAuthentication):
    """Login and anonymous checkout need CSRF protection, too."""

    def authenticate(self, request):
        self.enforce_csrf(request)
        return super().authenticate(request)
