# Guía del proyecto — Rosana Frutos Secos

## Estructura y responsabilidad

- `frontend/` contiene la aplicación pública React + Vite + Tailwind. Sus instrucciones locales complementan este archivo.
- `backend/` alojará Django, Django REST Framework y la integración con PostgreSQL.
- `docs/` conserva decisiones de negocio, producto y arquitectura que no pertenecen a un paquete concreto.

## Reglas de negocio no negociables

- Todo producto se vende mediante variantes de peso fijo; cada variante tiene SKU, precio y stock propios.
- El estado `A_CONFIRMAR` no reserva unidades.
- `RESERVADO`, `PREPARANDO`, `LISTO_PARA_RETIRO` y `EN_REPARTO` mantienen unidades reservadas.
- El stock disponible se deriva de `stock_fisico - stock_reservado`.
- La confirmación de stock y los cambios de estado se validan en Django dentro de una transacción; el frontend solo refleja el resultado.
- Los pedidos enviados a WhatsApp deben comunicar que quedan pendientes de confirmación.

## Convenciones de desarrollo

- Mantener frontend y backend desacoplados por API; no acoplar componentes React a detalles internos de Django.
- Guardar secretos y números reales de WhatsApp solo en variables de entorno, nunca en archivos versionados.
- Para importes, usar `Decimal` o enteros en unidades menores en backend; nunca `float`.
- Mantener la experiencia mobile-first y controles accesibles de al menos 44 × 44 px.
- No hacer afirmaciones terapéuticas sobre hierbas ni promesas de salud no verificadas.
