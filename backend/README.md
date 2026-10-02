# Backend

API de Django + Django REST Framework para catálogo, disponibilidad, pedidos e inventario. En producción usa PostgreSQL cuando `DATABASE_URL` está configurada; sin esa variable utiliza SQLite local para arrancar y probar el proyecto.

## Ejecutar localmente

```powershell
cd backend
.\.venv\Scripts\python.exe manage.py migrate
.\.venv\Scripts\python.exe manage.py loaddata sample_catalog
.\.venv\Scripts\python.exe manage.py runserver
```

Endpoints iniciales:

- `GET /api/v1/health/`
- `GET /api/v1/catalog/categories/`
- `GET /api/v1/catalog/products/`
- `GET /api/v1/catalog/products/?category=frutos-secos`

Los siguientes módulos serán pedidos, movimientos de inventario, reservas de 48 horas hábiles y el backoffice autenticado.

`sample_catalog` carga ocho productos de desarrollo y sus variantes, categorías e imágenes de galería. No debe utilizarse como importación de producción.
