# Rosana Frutos Secos — Mejoras y evolución

Este documento reúne las mejoras sugeridas para convertir el prototipo actual en una tienda operativa, sincronizada y preparada para crecer.

## 1. Mejoras prioritarias

### WhatsApp

- [ ] Confirmar el número definitivo de Rosana.
- [ ] Guardar el número completo en formato internacional, sin `+`, espacios ni guiones.
- [ ] Configurar el número mediante `VITE_WHATSAPP_NUMBER`.
- [ ] Detectar si el navegador bloquea la apertura de WhatsApp.
- [ ] Mantener visibles las alternativas “Reenviar mensaje” y “Copiar mensaje”.
- [ ] Verificar que los mensajes iniciales y reenviados incluyan todos los datos del pedido.
- [ ] Mantener la fecha y hora en los mensajes reenviados.
- [ ] Incluir en el mensaje el enlace a “Mis pedidos”, el email y el número de pedido.

### Datos de entrega y contacto

- [ ] Confirmar si la dirección debe ser obligatoria también para retiro local.
- [ ] Para entrega local, mantener la dirección como dato obligatorio.
- [ ] Separar “Indicaciones para la entrega” de “Contacto adicional”.
- [ ] Explicar claramente que el teléfono se utiliza para coordinar la recepción del pedido.
- [ ] Solicitar al menos un medio de contacto: teléfono o email.
- [ ] Validar teléfonos y emails antes de crear el pedido.
- [ ] Agregar consentimiento breve sobre el uso de datos personales.

### Pedidos

- [ ] Revalidar precios y stock antes de repetir un pedido.
- [ ] Avisar cuando una variante anterior ya no esté disponible.
- [ ] Avisar cuando cambió el precio de un producto repetido.
- [ ] Evitar pedidos duplicados por múltiples pulsaciones del CTA.
- [ ] Agregar un estado de carga mientras se crea el pedido.
- [ ] Mantener una copia recuperable del carrito si falla la derivación a WhatsApp.

## 2. Mejoras de experiencia

### Inicio y catálogo

- [ ] Validar la jerarquía actual: hero, “Así funciona”, categorías y destacados.
- [ ] Probar el inicio con personas que nunca hayan comprado en Rosana.
- [ ] Incorporar búsqueda por nombre de producto.
- [ ] Mostrar filtros activos en la URL y conservarlos al volver desde un producto.
- [ ] Agregar orden por precio, disponibilidad o destacados si el catálogo crece.
- [ ] Incorporar productos estacionales o novedades sin aumentar la complejidad visual.

### Detalle de producto

- [ ] Mostrar con mayor claridad cuánto stock orientativo queda cuando hay pocas unidades.
- [ ] Explicar qué ocurre cuando una variante se agota después de agregarla al carrito.
- [ ] Mantener visible el CTA principal en mobile sin cubrir contenido.
- [ ] Permitir compartir el enlace de un producto.
- [x] Permitir múltiples fotografías por producto, portada y orden desde el backoffice.
- [ ] Revisar que todas las imágenes tengan texto alternativo específico.

### Carrito

- [ ] Mostrar una confirmación antes de eliminar una línea cuando sea necesario.
- [ ] Indicar visualmente los cambios de precio o disponibilidad.
- [ ] Mostrar el costo de entrega como “A confirmar” hasta validar la zona.
- [ ] Explicar por qué se solicita cada dato.
- [ ] Conservar los datos del formulario si el usuario vuelve al catálogo.
- [ ] Mostrar un aviso claro si WhatsApp no pudo abrirse.
- [ ] Agregar una opción para descargar o imprimir el resumen.

### Mis pedidos

- [ ] Mostrar fecha, modalidad, subtotal y última actualización.
- [ ] Incorporar filtros por estado.
- [ ] Agregar una línea de progreso del pedido.
- [ ] Mostrar el siguiente paso esperado.
- [ ] Permitir repetir pedidos completos o líneas individuales.
- [ ] Mostrar qué productos cambiaron de precio o stock antes de repetir.
- [ ] Permitir cerrar la cuenta temporal y borrar sus datos locales.
- [ ] Definir el tiempo de vigencia de una cuenta temporal.

### Accesibilidad y responsive

- [ ] Revisar manualmente el recorrido completo usando solo teclado.
- [ ] Validar contraste WCAG AA en botones, badges y texto secundario.
- [ ] Probar lectores de pantalla en formulario, carrito y mensajes de error.
- [ ] Verificar objetivos táctiles de al menos 44 × 44 px.
- [ ] Probar vistas de 320, 390, 768, 1024 y 1440 px.
- [ ] Verificar nombres largos, precios grandes y mensajes extensos.
- [ ] Confirmar que ninguna barra flotante cubra contenido.
- [ ] Respetar `prefers-reduced-motion`.

## 3. Persistencia y sincronización

### Backend

- [x] Backend definido: Django + Django REST Framework, PostgreSQL y SQLite solo para arranque local.
- [ ] Crear una tabla de pedidos.
- [ ] Crear una tabla de líneas de pedido.
- [ ] Crear una tabla o vista de estados e historial.
- [x] Centralizar productos, variantes, precios y stock; catálogo público y backoffice conectados por API.
- [ ] Guardar fecha de creación y última actualización.
- [ ] Implementar políticas de seguridad para aislar los pedidos de cada cliente.
- [ ] Evitar guardar datos personales sensibles en `localStorage`.

### Estados del pedido

- [ ] Definir el ciclo operativo definitivo.
- [ ] Implementar inicialmente estos estados:
  - [ ] Pendiente de revisión.
  - [ ] Confirmado.
  - [ ] Esperando pago.
  - [ ] En preparación.
  - [ ] Listo para retirar.
  - [ ] En reparto.
  - [ ] Entregado.
  - [ ] Cancelado.
- [ ] Registrar quién cambió cada estado y cuándo.
- [ ] Notificar al cliente cuando el estado cambie.
- [ ] Evitar comunicar una reserva hasta que Rosana confirme el stock.

### Cuenta temporal

- [ ] Reemplazar el acceso local por una sesión temporal real.
- [x] Definir acceso mediante enlace enviado por email, sin contraseña (implementación pendiente de etapa 2).
- [ ] Evaluar código de seis dígitos con vencimiento.
- [ ] Implementar enlaces firmados y de duración limitada.
- [ ] Permitir consultar pedidos desde diferentes dispositivos.
- [ ] Agregar cierre automático de sesión.
- [ ] Evitar usar únicamente email + número de pedido como seguridad definitiva.

## 4. Emails y notificaciones

- [ ] Elegir un proveedor de email transaccional.
- [ ] Evaluar Resend, Postmark u otro servicio equivalente.
- [ ] Conectar `VITE_ORDER_EMAIL_ENDPOINT` a una función segura del backend.
- [ ] Enviar el email desde el servidor, nunca directamente desde el navegador.
- [ ] Enviar un email al crear el pedido con:
  - [ ] Número de pedido.
  - [ ] Productos y presentaciones.
  - [ ] Subtotal.
  - [ ] Modalidad de entrega.
  - [ ] Dirección cuando corresponda.
  - [ ] Estado actual.
  - [ ] Enlace seguro al resumen.
- [ ] Enviar una notificación cuando cambie el estado.
- [ ] Agregar versión de texto plano a los emails.
- [ ] Evitar incluir información personal innecesaria.
- [ ] Registrar errores de entrega de emails sin exponer datos sensibles.

## 5. Panel interno para Rosana

- [x] Crear panel de catálogo independiente en `/backoffice`, solo local sin autenticación.
- [x] Alta/edición de productos, categorías y presentaciones por peso fijo.
- [x] Imágenes múltiples con archivos/URLs, descripción, crédito, portada y orden.
- [x] Ajustes auditados de stock físico, reservado de solo lectura.
- [ ] Autenticación de operadores y protección del backoffice en producción (etapa 2).
- [ ] Tablero móvil con “Próximos” por antigüedad, sin agenda ni franjas horarias (etapa 2).
- [ ] Mostrar pedidos nuevos y pendientes.
- [ ] Permitir buscar por número, nombre, teléfono o email.
- [ ] Permitir cambiar el estado del pedido.
- [ ] Permitir corregir disponibilidad y subtotal.
- [ ] Permitir confirmar el costo de entrega.
- [ ] Abrir la conversación de WhatsApp desde cada pedido.
- [ ] Registrar notas internas.
- [ ] Mostrar alertas por pedidos sin responder.
- [ ] Permitir marcar pedidos como preparados, entregados o cancelados.
- [ ] Incorporar filtros por fecha, modalidad y estado.

## 6. Privacidad y seguridad

- [ ] Publicar una explicación breve del uso de teléfono, email y dirección.
- [ ] Definir cuánto tiempo se conservan los pedidos y datos personales.
- [ ] Permitir solicitar la eliminación de datos.
- [ ] No incluir secretos ni credenciales en el frontend.
- [ ] Validar todas las entradas también en el servidor.
- [ ] Limitar intentos de acceso a “Mis pedidos”.
- [ ] Proteger enlaces temporales con vencimiento.
- [ ] Evitar exponer pedidos mediante URLs predecibles.
- [ ] Revisar requisitos legales y de privacidad aplicables al comercio.

## 7. Calidad y operación

- [ ] Agregar pruebas para cálculos de subtotales y límites de stock.
- [ ] Agregar pruebas para la plantilla de WhatsApp.
- [ ] Probar retiro y entrega de punta a punta.
- [ ] Probar creación, consulta, repetición y reenvío de pedidos.
- [ ] Verificar rutas desconocidas y sesiones vencidas.
- [ ] Registrar errores de red y creación de pedidos.
- [ ] Optimizar las imágenes y evitar depender únicamente de URLs externas.
- [ ] Definir copias de seguridad de pedidos y catálogo.
- [ ] Documentar variables de entorno necesarias.

## 8. Recomendación de evolución

### Etapa 1 — Cerrar el MVP

- [ ] Confirmar el número internacional de WhatsApp.
- [ ] Ajustar las reglas de dirección para retiro y entrega.
- [ ] Detectar bloqueos al abrir WhatsApp.
- [ ] Revisar accesibilidad y responsive.
- [ ] Hacer pruebas con clientes reales.
- [ ] Corregir fricciones antes de agregar más funcionalidades.

### Etapa 2 — Persistencia real

- [ ] Incorporar backend y base de datos.
- [ ] Sincronizar pedidos entre dispositivos.
- [ ] Implementar cuentas temporales seguras.
- [ ] Enviar emails transaccionales.
- [ ] Permitir consultar estados reales.
- [ ] Migrar la información personal fuera del almacenamiento local.

### Etapa 3 — Operación interna

- [ ] Construir el panel de Rosana.
- [ ] Centralizar stock, precios y pedidos.
- [ ] Gestionar estados y costos de entrega.
- [ ] Automatizar notificaciones.
- [ ] Incorporar búsqueda y métricas básicas.

### Etapa 4 — Optimización comercial

- [ ] Agregar pedidos frecuentes y favoritos.
- [ ] Recuperar carritos abandonados con consentimiento.
- [ ] Mostrar recomendaciones relacionadas.
- [ ] Incorporar productos estacionales.
- [ ] Medir vistas, productos añadidos y pedidos enviados.
- [ ] Analizar recompra, productos más elegidos y conversión.

## 9. Principio de producto recomendado

Antes de agregar nuevas pantallas, priorizar que pedido, stock, estado, email e historial sean datos reales y sincronizados. La infraestructura operativa aportará más valor que ampliar el catálogo o sumar complejidad visual.

## 10. Compresion de imagenes al cargar

optimizacion de imagenes para mostrar la web, utilizar placeholders.
realizar algun tipo de optimizacion de imagens para que sean mas livianas al cargar.
