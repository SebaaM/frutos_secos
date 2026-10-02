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

## Próximos pasos

1. Crear pedidos, movimientos de inventario y reservas de stock en el backend.
2. Reemplazar los datos de ejemplo del frontend por la API.
3. Configurar PostgreSQL, el número de WhatsApp y las variables reales fuera de Git.
