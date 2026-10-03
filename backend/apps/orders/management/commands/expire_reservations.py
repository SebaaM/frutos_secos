from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from apps.catalog.backoffice_views import Conflict
from apps.orders.models import Order
from apps.orders.services import transition_order


class Command(BaseCommand):
    help = "Vence reservas pendientes. No toca pedidos en preparación, retiro o reparto."

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true", help="Solo mostrar cantidad, sin cambios.")

    def handle(self, *args, **options):
        if not options["dry_run"] and not settings.ORDER_AUTO_EXPIRE_ENABLED:
            raise CommandError("Configurar calendario y habilitar ORDER_AUTO_EXPIRE_ENABLED antes de ejecutar. Podés usar --dry-run.")
        ids = list(Order.objects.filter(status=Order.Status.RESERVADO, reservation_expires_at__lte=timezone.now()).values_list("pk", flat=True))
        count = 0
        for pk in ids:
            if not options["dry_run"]:
                try:
                    transition_order(pk, Order.Status.VENCIDO, Order.Status.RESERVADO,
                                     public_note="Venció el plazo de confirmación de la reserva.")
                except Conflict:
                    continue  # Another operator already handled it.
            count += 1
        self.stdout.write(f"Reservas vencidas{' (simulación)' if options['dry_run'] else ''}: {count}")
