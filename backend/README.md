# Backend

API de Django + Django REST Framework para catálogo, disponibilidad, pedidos e inventario. En producción usa PostgreSQL cuando `DATABASE_URL` está configurada; sin esa variable utiliza SQLite local para arrancar y probar el proyecto.

## Ejecutar localmente

```powershell
cd backend
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe manage.py migrate
.\.venv\Scripts\python.exe manage.py runserver 127.0.0.1:8000
```

Endpoints iniciales:

- `GET /api/v1/health/`
- `GET /api/v1/catalog/categories/`
- `GET /api/v1/catalog/products/`
- `GET /api/v1/catalog/products/?category=frutos-secos`

## OpenAPI y Swagger

Con Django y Vite en ejecución, abrir [Swagger UI](http://localhost:8443/api/docs/swagger/).
Esquema en `/api/schema/` (YAML) o `/api/schema/?format=json`; copia versionada en
[`docs/openapi.yaml`](../docs/openapi.yaml). Incluye catálogo, galería, categorías, stock, pedidos y autenticación.
Swagger usa assets locales y respeta el mismo acceso exclusivo de desarrollo que el backoffice.
“Try it out” puede modificar datos reales: probar escrituras solo en una base de pruebas.

```powershell
.\.venv\Scripts\python.exe manage.py spectacular --file ../docs/openapi.yaml --validate --fail-on-warn
```

Regenerar al cambiar endpoints o serializers. Ver [guía de API](../docs/api.md).

## Backoffice de catálogo

Administración en `/api/v1/backoffice/`, conectada al panel React `/backoffice`.
Productos y variantes se guardan juntos; stock se ajusta con motivo e historial, conservando
las unidades reservadas. Galerías aceptan archivos JPEG/PNG/WebP hasta 5 MB o URLs existentes.
Pillow valida el contenido. Archivos en `backend/media/`, fuera de Git.

Exige sesión de operador activo is_staff y CSRF para escrituras. Mantiene el guard local: DEBUG y BACKOFFICE_ENABLED habilitados,
conexión loopback y Origin permitido cuando exista. Vite transmite la IP real del cliente
en un header que sobrescribe. No exponer este servicio con DEBUG habilitado detrás de otros proxies.
Django admin permite consultar el catálogo pero no modificarlo ni saltear las validaciones.

Variables leídas desde el proceso: DJANGO_SECRET_KEY, DJANGO_DEBUG, DATABASE_URL,
BACKOFFICE_ENABLED, DJANGO_ALLOWED_HOSTS, CORS_ALLOWED_ORIGINS y CSRF_TRUSTED_ORIGINS.
Un `.env` no se carga automáticamente. Sin DATABASE_URL se conserva el SQLite local.

Documentación completa en [docs/backoffice.md](../docs/backoffice.md).
Pedidos, reservas transaccionales, tablero y autenticación ya están implementados: ver
[docs/pedidos.md](../docs/pedidos.md). Crear el primer operador interactivamente con
`.\.venv\Scripts\python.exe manage.py createsuperuser`; no existe cuenta predeterminada.
DEBUG usa email de consola: no envía emails reales. Configurar SMTP y FRONTEND_URL para envío real.
El comando `expire_reservations --dry-run` simula vencimientos sin escribir. La ejecución real
requiere ORDER_AUTO_EXPIRE_ENABLED y calendario confirmado; no hay tarea periódica activa.

`sample_catalog` carga ocho productos de desarrollo y sus variantes, categorías e imágenes de galería.
Solo en una base vacía, opcionalmente: `.\.venv\Scripts\python.exe manage.py loaddata sample_catalog`.
**No ejecutar sobre una base con datos administrados: puede sobrescribir ejemplos editados.**
No es una importación de producción ni un paso habitual de arranque.
