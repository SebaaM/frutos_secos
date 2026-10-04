# TODO — Rosana Frutos Secos

> Backlog único del proyecto. Incluye únicamente ideas o tareas que continúan
> pendientes después de las etapas de catálogo, inventario, pedidos y acceso.
> Revisado el 3 de octubre de 2026.

## Antes de operar con clientes reales

- [ ] Definir y cargar el número definitivo de WhatsApp en
  `VITE_WHATSAPP_NUMBER`, sin guardarlo en archivos versionados; probar en móvil
  que se abra, se reenvíe y se copie el resumen correctamente.
- [ ] Configurar SMTP transaccional, `DEFAULT_FROM_EMAIL` y `FRONTEND_URL` de
  producción para que los enlaces de acceso lleguen por email real en lugar de
  la consola de Django.
- [ ] Crear operadores reales de Django sin credenciales predeterminadas y
  confirmar el procedimiento de alta/baja de acceso.
- [ ] Definir el calendario comercial definitivo y, solo entonces, decidir si
  se habilita un scheduler para `expire_reservations`. Implementar recordatorios
  al cliente y alertas internas previas si se confirma que son necesarios.
- [ ] Preparar PostgreSQL, HTTPS, proxy para API/medios y copias de seguridad de
  catálogo y pedidos. El backoffice debe conservar sus controles locales y no
  exponerse a clientes remotos.

## Privacidad y comunicación

- [ ] Acordar y publicar consentimiento breve sobre el uso de nombre, teléfono,
  email y dirección.
- [ ] Definir plazo de conservación, canal de solicitud y proceso de eliminación
  de datos personales del servidor.
- [ ] Diseñar notificaciones por email cuando cambie el estado de un pedido,
  evitando datos personales innecesarios y registrando errores de entrega de
  forma segura.

## Validación de experiencia y calidad

- [ ] Probar el recorrido de compra, retiro, entrega, enlace de acceso, reenvío
  de WhatsApp, sesiones vencidas y errores de red con casos reales o aislados.
- [ ] Hacer revisión de accesibilidad: teclado, lectores de pantalla, contraste
  WCAG AA, `prefers-reduced-motion`, objetivos táctiles y vistas de 320, 390,
  768, 1024 y 1440 px.
- [ ] Validar los bloqueos y transacciones de stock con PostgreSQL; SQLite no
  acredita concurrencia real de filas.
- [ ] Medir y, si hace falta, optimizar las imágenes públicas (formatos, pesos,
  placeholders y carga) sin afectar descripciones alternativas ni la galería
  existente.

## Mejoras de producto para priorizar en una etapa posterior

- [ ] Incorporar búsqueda por nombre en el catálogo y decidir si los filtros y
  el orden comercial deben persistir en la URL.
- [ ] Evaluar filtros en “Mis pedidos” y mejoras adicionales de seguimiento
  solo después de probar el flujo actual con clientes.
- [ ] Definir roles operativos separados y registrar qué operador realiza cada
  ajuste de stock; hoy las transiciones de pedidos sí guardan operador, pero los
  ajustes de stock aún no.
- [ ] Evaluar favoritos, productos estacionales, recomendaciones y métricas
  comerciales como iniciativas independientes, con una decisión explícita de
  alcance y privacidad.

## Fuera del alcance actual

No incorporar agendas o franjas horarias, pagos online, dashboards/analíticas,
ni automatización de WhatsApp como parte de cambios menores. Cualquiera de esas
iniciativas requiere una etapa y una decisión de producto separadas.

