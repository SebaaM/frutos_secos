# Rosana Frutos Secos

Ecommerce local de frutos secos, mixes y hierbas naturales. La tienda permite armar un carrito y enviar el pedido a WhatsApp para confirmar disponibilidad, pago y modalidad de entrega.

## Estructura

```text
.
├── backend/     # Django + DRF; PostgreSQL en producción, SQLite para bootstrap local
├── docs/        # Decisiones de negocio y producto
├── frontend/    # React + Vite + Tailwind, importado desde Figma Make
├── .env.example # Variables de entorno de referencia
└── AGENTS.md    # Convenciones del proyecto
```

## Estado implementado

- Catálogo público conectado a Django, con variantes de peso fijo, carrito único
  y revalidación de precio/disponibilidad antes de crear un pedido.
- Backoffice local y autenticado para categorías, productos, galería, inventario
  por presentación y ajustes de stock auditados.
- Pedidos persistentes con reservas transaccionales, tablero móvil por estado,
  seguimiento privado por enlace de email y coordinación manual por WhatsApp.

El backlog vigente está en [TODO.md](TODO.md). Las decisiones y límites de cada
área se documentan en [docs/](docs/README.md).

## Ejecutar el frontend

Requisitos: Node.js y pnpm.

```powershell
cd frontend
pnpm install --frozen-lockfile
pnpm dev
```

Vite inicia en `http://localhost:8443`. Para validar la compilación sin levantar el servidor:

```powershell
pnpm build
```

## Backoffice y pedidos

Con Django y Vite iniciados, abrir `http://localhost:8443/backoffice`.
Incluye productos, categorías, variantes por peso, múltiples imágenes y ajustes de stock con historial.
El catálogo público refleja los cambios al volver a la tienda.

Acceso por sesión de operador activo `is_staff`, manteniendo DEBUG, BACKOFFICE_ENABLED y protección
local. La API administrativa sigue bloqueada en producción y para conexiones remotas.
Crear el primer responsable con `backend/.venv/Scripts/python.exe backend/manage.py createsuperuser`.
No hay cuenta ni contraseña predeterminadas.

La etapa 2 incluye pedidos persistentes, reservas transaccionales, tablero móvil por estado y
seguimiento del cliente por enlace de email sin contraseña. DEBUG usa email por consola, no envío
real; configurar SMTP antes de utilizar enlaces por email. El vencimiento automático está deshabilitado
hasta confirmar calendario y scheduler.

Consultar [operación del catálogo](docs/backoffice.md), [pedidos y configuración de acceso](docs/pedidos.md)
y [contexto técnico](docs/context.md).

## Documentación de API

[Swagger local](http://localhost:8443/api/docs/swagger/) con Django y Vite iniciados.
Contrato [OpenAPI exportado](docs/openapi.yaml) y [guía de integración](docs/api.md).
Solo desarrollo local; “Try it out” de escrituras modifica datos reales.

## Verificación

```powershell
cd backend
.\.venv\Scripts\python.exe manage.py test
.\.venv\Scripts\python.exe manage.py check
.\.venv\Scripts\python.exe manage.py makemigrations --check --dry-run
```

Desde `frontend/`: `pnpm test`, `node node_modules/typescript/bin/tsc --noEmit` y `pnpm build`.
Las pruebas de alertas de stock utilizan el runner de Node con type stripping (Node 22.6+; entorno actual 24).
Las pruebas Django usan una base temporal; no recargan ni borran el catálogo local.

## Trabajo pendiente

Consultar [TODO.md](TODO.md) para las tareas operativas, de privacidad, calidad y
las ideas de producto que siguen sin implementar.
