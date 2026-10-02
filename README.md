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

## Backoffice de catálogo

Con Django y Vite iniciados, abrir `http://localhost:8443/backoffice`.
Incluye productos, categorías, variantes por peso, múltiples imágenes y ajustes de stock con historial.
El catálogo público refleja los cambios al volver a la tienda.

Acceso temporal **sin autenticación, exclusivamente local**: DEBUG y BACKOFFICE_ENABLED deben
estar habilitados. La API administrativa está bloqueada en producción y para conexiones remotas.
Pedidos y autenticación corresponden al segundo plan; no están implementados todavía.

Consultar [operación del backoffice](docs/backoffice.md) y [contexto técnico](docs/context.md).

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

Desde `frontend/`: `node node_modules/typescript/bin/tsc --noEmit` y `pnpm build`.
Las pruebas Django usan una base temporal; no recargan ni borran el catálogo local.

## Próximos pasos

1. Crear pedidos, movimientos de inventario y reservas de stock en el backend.
2. Implementar autenticación del backoffice y acceso del cliente por enlace de email sin contraseña.
3. Tablero móvil: pedidos a confirmar, próximos por antigüedad, listos, en reparto y entregados.
4. Configurar PostgreSQL, el número de WhatsApp y las variables reales fuera de Git.
