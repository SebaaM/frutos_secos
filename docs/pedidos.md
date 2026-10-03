# Pedidos y acceso — etapa 2

## Alcance implementado

Pedidos persistentes en Django, stock transaccional, tablero de operadores mobile-first,
seguimiento privado por enlace de email y autenticación del backoffice completo.
No hay agenda, franjas horarias, dashboards, analíticas, pagos online ni envío automático a WhatsApp.

## Compra y seguimiento

1. El carrito envía variantes, cantidades, precio esperado y un UUID de idempotencia a Django.
2. El servidor comprueba publicación, disponibilidad y precio actual, calcula el subtotal con
   `Decimal` y guarda el pedido como `A_CONFIRMAR`, **sin reservar paquetes**.
3. La pantalla muestra la referencia, el resumen y un enlace para enviarlo a WhatsApp.
   Guardar un pedido no demuestra que el cliente haya enviado el mensaje. Nunca se marca confirmado por abrir WhatsApp.
4. El cliente solicita un enlace en `/mis-pedidos` con el email utilizado en el pedido.
5. Abrir el enlace muestra “Confirmar acceso”; solo ese POST canjea el token y permite consultar los pedidos de ese email.

El email es obligatorio para seguimiento; el teléfono es opcional. La dirección es obligatoria
solo para reparto. Cobertura, costo de reparto y pago siguen coordinándose por WhatsApp.
El subtotal no incluye un costo de entrega confirmado.

Los precios, pesos, SKU y nombres se copian a las líneas del pedido para conservar el acuerdo
aunque se edite el catálogo. Un cambio de precio o stock durante checkout devuelve `409`:
revisar el catálogo y volver a confirmar, sin vaciar el carrito ni inventar un pedido local.
El mismo UUID y payload devuelve el pedido existente; otro payload con esa clave devuelve `409`.
El frontend conserva la clave al reintentar un fallo de red, mientras no se recargue o cambien los datos.

El catálogo estático es únicamente un fallback visual. No se pueden enviar pedidos con él.
Repetir selección usa precios, variantes activas y disponibilidad actuales, no los históricos.

## Estados e inventario

| Estado actual | Cambios permitidos | Stock |
| --- | --- | --- |
| `A_CONFIRMAR` | `RESERVADO`, `CANCELADO` | Sin reserva |
| `RESERVADO` | `PREPARANDO`, `CANCELADO`, `VENCIDO` | Mantiene reserva |
| `PREPARANDO` | `LISTO_PARA_RETIRO` o `EN_REPARTO`, `CANCELADO` | Mantiene reserva |
| `LISTO_PARA_RETIRO` | `TERMINADO`, `CANCELADO` | Mantiene reserva |
| `EN_REPARTO` | `TERMINADO`, `CANCELADO` | Mantiene reserva |
| `TERMINADO`, `CANCELADO`, `VENCIDO` | Ninguno | Pedido cerrado |

La modalidad decide entre retiro y reparto: no se permite cruzar esos recorridos.
Cada cambio incluye `expected_status`. Un tablero desactualizado recibe `409`, sin doble reserva ni consumo.

- Confirmar verifica **todas** las líneas antes de reservar. Si falta una, no se guarda ninguna modificación.
- Cancelar o vencer libera reservado, sin aumentar el físico: los paquetes ya existían.
- Terminar descuenta físico y reservado y registra movimientos negativos con la referencia del pedido.
- Las reservas anteriores existentes se conservan; no se recalculan ni reinician desde los pedidos nuevos.
- La transacción bloquea pedido, productos por ID y variantes por ID; mantiene el orden de bloqueo usado por catálogo.
- Cada transición guarda estado anterior/nuevo, fecha, operador y nota pública. Las notas internas no se exponen al cliente.
- Django admin de pedidos es de consulta, no una vía alternativa para editar estados o inventario.

## Tablero

`/backoffice` inicia en Pedidos. Columnas:

- A confirmar: `A_CONFIRMAR`.
- Próximos: `RESERVADO` y `PREPARANDO`, ordenados por antigüedad, sin fecha programada.
- A repartir / retirar: `EN_REPARTO` y `LISTO_PARA_RETIRO`.
- Entregados: `TERMINADO`.
- Cancelados / vencidos: `CANCELADO` y `VENCIDO`.

En móvil se selecciona una columna; en escritorio se muestra el tablero con desplazamiento horizontal.
Buscar por referencia o nombre y filtrar modalidad desde los filtros desplegables.
Cada columna consulta su propio grupo y página de 50 pedidos; un historial grande de entregados
no oculta los pendientes. “Cargar más” agrega páginas de las columnas que todavía tienen resultados.
Los contadores de tarjetas representan pedidos cargados, no un dashboard analítico.
Las fechas se muestran en la zona de Buenos Aires.

El detalle permite confirmar un cambio con aviso de su efecto sobre inventario, escribir una
nota visible para el cliente y guardar una nota interna separada. Las escrituras no se simulan
en React. “Actualizar tablero” y “Actualizar estado” consultan el servidor; no hay WebSockets ni polling automático.

## Autenticación y seguridad

Operadores usan las cuentas de Django activas con `is_staff=True`. No se crea usuario ni contraseña
predeterminados. Todas las operaciones administrativas, incluida la galería y el inventario,
exigen sesión de operador. Crear el primer responsable de forma interactiva:

```powershell
cd backend
.\.venv\Scripts\python.exe manage.py createsuperuser
```

El responsable escribe sus propias credenciales. Para operadores posteriores, administrar cuentas
desde Django admin; activar staff solo para personas autorizadas. El API de catálogo permite a
cualquier operador staff sus operaciones; todavía no hay roles separados de repartidor/editor.

Clientes son una identidad separada de los usuarios staff. Tener el email de un operador nunca
permite ingresar al backoffice mediante un enlace de cliente. Ni la referencia ni el UUID del pedido
son credenciales. Consultar un pedido de otro cliente devuelve `404`.

- Token aleatorio de un uso, guardado únicamente como SHA-256, vigencia predeterminada de 15 minutos.
- Un enlace nuevo invalida los anteriores. Verificación y consumo atómicos.
- Token en el fragmento `#token=`, no en la query enviada al servidor; se retira de la URL al abrir la pantalla.
- Respuesta homogénea para emails conocidos/desconocidos y límites por IP/email. No se devuelve el token por API.
- Sesiones HttpOnly, SameSite Lax; cookies Secure fuera de DEBUG. La verificación del cliente vence en 7 días.
- Toda escritura, incluso login, enlace y checkout anónimo, exige CSRF. `GET /auth/session/` entrega el token en JSON.
- Rotación de sesión y CSRF al autenticar/cerrar acceso. No hay JWT ni credenciales guardadas en localStorage.
- Cerrar sesión de operador cierra la sesión compartida del navegador, incluido un acceso de cliente en esa sesión.
  Cerrar acceso de cliente quita solo esa identidad.
- Respuestas de sesiones y pedidos usan `Cache-Control: no-store`.

El backoffice **conserva además** DEBUG, BACKOFFICE_ENABLED, loopback y comprobación del origen/IP
del proxy. La autenticación no habilita administración remota ni producción automáticamente.
Swagger y esquema conservan su guard local independiente. Un despliegue necesita configuración
explícita de HTTPS, proxies confiables, orígenes, secretos y política de administración.

Las claves viejas `rosana-last-order-v1` y `rosana-order-history-v1` del prototipo se dejan intactas,
pero ya no se leen, sobrescriben ni aceptan como identidad. No se importan porque no acreditan propiedad.
Solo el carrito mantiene almacenamiento local. El resumen recién creado vive en memoria hasta recargar;
después se requiere el acceso verificado para consultar datos privados.

## Email y configuración

Django lee variables del proceso, no carga `.env` automáticamente. Consultar `.env.example`.
En DEBUG el backend de email predeterminado es consola: **no se envía un email real**;
el enlace aparece en la terminal de Django. Los enlaces reales son credenciales: no copiarlos a logs públicos.
Para envío real configurar SMTP y un remitente válido:

- `EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend`
- `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `EMAIL_USE_TLS`
- `DEFAULT_FROM_EMAIL`, `FRONTEND_URL` (origen público HTTPS en producción).
- `CUSTOMER_LINK_MINUTES=15`, `CUSTOMER_SESSION_DAYS=7`.
- `VITE_WHATSAPP_NUMBER`, solo en el entorno de Vite. Sin número se ofrece copiar el resumen, no un destino inventado.

El envío de enlaces es síncrono con timeout SMTP; revisar errores de configuración en servidor.
Los límites actuales usan caché de Django por proceso: para múltiples workers, agregar caché compartida
y límites en el proxy antes de publicar. No confiar en un `X-Forwarded-For` arbitrario.

## Reservas y vencimiento

Al pasar a RESERVADO se calcula un vencimiento de 48 **horas de apertura**, configurables.
El calendario provisional es lunes a sábado de 9 a 19, sin feriados automáticos, en Buenos Aires.
No significa “dos días corridos”. Confirmar el calendario comercial antes de automatizar.

- `ORDER_RESERVATION_HOURS=48`
- `ORDER_BUSINESS_DAYS=0,1,2,3,4,5` (lunes=0, domingo=6).
- `ORDER_BUSINESS_OPEN_HOUR=9`, `ORDER_BUSINESS_CLOSE_HOUR=19`.
- `ORDER_AUTO_EXPIRE_ENABLED=false` por defecto.

Al iniciar preparación se cierra el plazo de reserva pendiente, **sin liberar paquetes**.
No se vencen automáticamente pedidos en preparación, listos para retiro ni en reparto.
Los vencimientos ya guardados no se recalculan al cambiar el calendario.

```powershell
# No modifica datos:
.\.venv\Scripts\python.exe manage.py expire_reservations --dry-run
# Solo tras habilitar la bandera y confirmar calendario:
.\.venv\Scripts\python.exe manage.py expire_reservations
```

El comando puede ejecutarse periódicamente con un scheduler de despliegue; no se instaló ni
activó una tarea sobre la base de trabajo. El tablero muestra el vencimiento y permite cierre manual.
Recordatorios a las 24 horas hábiles y alertas internas previas siguen pendientes de automatización.

## Verificación

- Django: 52 pruebas, incluyendo checkout/idempotencia, retiro/reparto, devolución/consumo,
  atomicidad, CSRF anónimo, operadores, enlaces de un uso, expiración y aislamiento entre clientes.
- Dos pruebas de concurrencia con threads se omiten en SQLite y deben ejecutarse con PostgreSQL.
- Frontend: 16 pruebas de estados, columnas, CSRF, mensaje WhatsApp, importes y alertas de stock.
- TypeScript y build de Vite; UI verificada en 390 px y 1280 px con base aislada y datos ficticios.
- Migraciones aditivas de accounts/orders. La huella de categorías/productos/variantes/galería
  antes y después coincide; no se ejecutaron fixtures sobre el catálogo de trabajo.

Referencias: [API](api.md), [catálogo](backoffice.md), [contexto](context.md).
