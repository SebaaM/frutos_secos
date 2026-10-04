# Plan de mejora del frontend — Rosana Frutos Secos

## Objetivo

Mejorar la tienda pública para que una persona que compra por primera vez pueda entender, sin ayuda externa, tres cosas en pocos segundos:

1. qué puede pedir y en qué presentación;
2. que el stock, el pago y la entrega se confirman con Rosana;
3. cómo enviar, revisar y volver a consultar su pedido.

La prioridad es quitar dudas y fricción del recorrido actual. No se agregarán pantallas, filtros o datos que compliquen la compra si no resuelven una necesidad concreta.

## Estado verificado del proyecto

El plan anterior describía un prototipo sin backend. Ya no representa el proyecto actual. La aplicación pública ya tiene:

| Área | Implementado | Pendiente para una experiencia más clara |
| --- | --- | --- |
| Navegación | SPA con History API, rutas de inicio, catálogo, producto, carrito, pedido y `Mis pedidos`. | Mantener filtros/búsqueda/orden en URL y mejorar los estados recuperables. |
| Catálogo | API pública con categorías, destacados, variantes de peso fijo, precio, stock e imágenes múltiples. | Búsqueda, orden opcional y carga de imágenes más liviana. |
| Producto | Selector de peso, límite de cantidad por variante, stock bajo y galería. | CTA visible en móvil, compartir y explicar los cambios de stock posteriores. |
| Carrito | Persistencia de líneas, límites de stock, subtotal y costo de entrega “A confirmar”. | Mostrar cambios de precio/disponibilidad, confirmar eliminaciones y mantener el formulario al volver al catálogo. |
| Pedido | API real, revalidación del servidor, clave de idempotencia y estado `A_CONFIRMAR`. | Mensaje de WhatsApp más completo y alternativa clara si no se abre. |
| Seguimiento | Acceso por email, listado, detalle, eventos e historial. | Progreso, siguiente paso, filtros y repetición con comparación visible. |
| Responsive y accesibilidad | Diseño mobile-first, controles de 44 px, foco visible y reducción de movimiento. | Auditoría real de teclado, contraste, lector de pantalla y anchos límite. |

## Alcance

Este documento cubre cambios de React, CSS, navegación, mensajes, estado local no sensible y consumo de los endpoints existentes. No propone simular confirmación de stock, costos, reservas, emails ni autenticación en el cliente.

Cuando una mejora necesite un dato o acción que el API actual no provee, se especificará como dependencia. Se implementará la interfaz solo después de acordar ese contrato; el frontend no inventará estados ni resultados.

## Principios de UX

- Un objetivo principal por pantalla: explorar, elegir, revisar, enviar o seguir el pedido.
- Lenguaje directo: “Enviar pedido”, “Pendiente de confirmación” y “A confirmar”; nunca “compra confirmada” antes de que Rosana confirme.
- Información progresiva: los detalles se muestran junto a la decisión que ayudan a tomar, no en bloques largos iniciales.
- Los errores se explican junto al campo o producto afectado y ofrecen una acción de recuperación.
- El stock mostrado es orientativo; el servidor es la única autoridad al crear el pedido.
- La información personal no se persistirá en `localStorage`; al volver del catálogo se mantendrá solamente durante la sesión activa de la SPA.

## Orden de implementación

### Fase 0 — Definiciones breves antes de cambiar el flujo

Confirmar estas decisiones para no construir una interfaz contradictoria:

- Si retiro local requiere dirección, barrio o ningún dato de ubicación.
- Si el email es obligatorio. Hoy lo es, porque habilita el acceso seguro a `Mis pedidos`; permitir solo teléfono requeriría cambiar el contrato del pedido y el seguimiento.
- Texto aprobado para el consentimiento y la explicación de privacidad.
- Número final configurado mediante `VITE_WHATSAPP_NUMBER`, sin incluirlo en código versionado.

### Fase 1 — Hacer inequívoco el envío de pedido

Archivos principales: `src/pages/CartPage.tsx`, `src/pages/SecureOrderPage.tsx`, `src/lib/order-message.ts`, `src/App.tsx` y `src/components/ui.tsx`.

1. Reorganizar los datos del carrito en bloques cortos: modalidad, contacto y ubicación.
2. Separar “Indicaciones para la entrega” de “Contacto adicional”; el campo actual mezcla ambos casos.
3. Explicar junto al teléfono que se utiliza para coordinar recepción o retiro. Mantener una validación coherente con la decisión de email de la fase 0.
4. Añadir el consentimiento breve, con enlace a la futura explicación de privacidad, y validarlo de forma accesible. Si debe quedar registrado legalmente, requerirá que el API acepte versión y aceptación.
5. Elevar el borrador del formulario a `App` para conservarlo al visitar catálogo y regresar, pero vaciarlo al crear exitosamente el pedido o salir de la sesión.
6. Conservar el bloqueo actual por envío y la clave de idempotencia; mejorar el texto de carga y los errores de red para indicar qué puede hacer la persona sin volver a llenar el pedido.
7. Completar el mensaje de WhatsApp con fecha y hora del pedido, referencia, email y enlace a `Mis pedidos`. Mantener el aviso de que aún no se reservaron unidades.
8. Abrir WhatsApp desde una acción de usuario y detectar el bloqueo solo como heurística (`window.open` devuelve `null`); no es detectable con certeza en todos los navegadores. Ante falla, mostrar de inmediato el mensaje listo para copiar y el botón de reenvío.

**Resultado:** una persona entiende qué datos entrega, por qué se los piden y cómo finalizar incluso si WhatsApp no abre.

### Fase 2 — Hacer confiables carrito, precio y disponibilidad

Archivos principales: `src/App.tsx`, `src/pages/CartPage.tsx`, `src/components/product.tsx`.

1. Guardar en cada línea del carrito el precio que se vio al agregarla, además de la variante y cantidad.
2. Al recibir un catálogo actualizado, comparar cada línea contra precio y stock actuales en lugar de quitar variantes silenciosamente.
3. Mostrar una alerta por línea cuando una presentación se agotó, la cantidad fue ajustada o el precio cambió. La persona podrá quitarla o corregirla antes de enviar.
4. Mantener la validación definitiva al crear el pedido en Django y mostrar los errores de revalidación en el carrito, no como un fallo genérico.
5. Añadir una confirmación accesible al eliminar una línea cuando pueda resultar accidental, con foco controlado y posibilidad de cancelar.
6. Conservar visible “Entrega: A confirmar” y explicar que depende de la zona, sin estimar valores no definidos.
7. Añadir resumen imprimible/descargable del pedido solo después de validar que no revele más datos de los necesarios en un dispositivo compartido.

**Resultado:** el carrito no da una falsa sensación de disponibilidad ni oculta cambios relevantes.

### Fase 3 — Facilitar encontrar y elegir productos

Archivos principales: `src/pages/CatalogPage.tsx`, `src/pages/ProductPage.tsx`, `src/components/product.tsx`, `src/components/layout.tsx`.

1. Añadir una búsqueda por nombre, con resultado vacío explicativo y opción de limpiar.
2. Mantener categoría, búsqueda y orden en la URL para que atrás, adelante y enlaces compartidos preserven el contexto.
3. Incorporar orden solo si el catálogo ya tiene volumen suficiente: destacados como valor inicial; precio y disponibilidad como opciones secundarias. No sumar filtros que obliguen a pensar de más.
4. En el detalle, mantener el CTA principal visible en móvil sin cubrir el selector, el aviso de stock ni el contenido final. Ajustar el espacio inferior para convivir con la barra flotante del carrito.
5. Añadir “Compartir producto” mediante Web Share API y copia de enlace como alternativa.
6. Revisar que la cantidad exacta de stock bajo se comunique de manera consistente y que las variantes agotadas expliquen qué ocurre antes y después de agregarlas.
7. Revisar el texto alternativo de portada y galería: específico para la imagen útil, vacío en miniaturas repetidas o decorativas.
8. Usar el campo ya existente de destacado. Novedades y productos estacionales solo se mostrarán cuando el API exponga su dato, evitando etiquetas simuladas.

**Resultado:** elegir un producto y su peso es una tarea breve, predecible y compartible.

### Fase 4 — Dar seguimiento entendible y permitir recomprar con control

Archivos principales: `src/pages/SecureOrdersPage.tsx`, `src/pages/SecureOrderPage.tsx`, `src/lib/order-status.ts`, `src/App.tsx`.

1. En cada pedido, destacar modalidad, subtotal, fecha de creación y última actualización; los datos ya están disponibles.
2. Traducir los estados actuales a una línea de progreso simple y mostrar un único “siguiente paso esperado” según modalidad y estado. El historial completo seguirá disponible debajo.
3. Añadir filtros por estado en `Mis pedidos`. Se aplicarán localmente a los pedidos cargados hasta que se acuerde filtrado paginado en el API.
4. Cambiar “Repetir selección” por una revisión: comparar cada línea histórica con la variante actual y explicar precio, falta de stock o cantidad reducida antes de llegar al carrito.
5. Añadir “Borrar datos locales de este dispositivo” para carrito y estado de interfaz. El cierre de cuenta y la eliminación real de datos quedan fuera: requieren endpoint y política de retención.

**Resultado:** el cliente no necesita interpretar códigos internos ni confiar en una repetición ciega.

### Fase 5 — Accesibilidad, responsive y rendimiento de imágenes

Archivos principales: `src/index.css`, `src/components/ui.tsx`, páginas públicas, `src/lib/catalog-api.ts` y galería de backoffice cuando corresponda.

1. Recorrer Inicio → Catálogo → Producto → Carrito → Pedido → Mis pedidos solo con teclado; corregir orden de foco, menú, diálogos, campos y avisos vivos.
2. Verificar contraste WCAG AA en CTA, texto secundario, badges, estados deshabilitados y errores.
3. Probar lector de pantalla en selector de peso, cantidad, validaciones, carrito y confirmaciones de WhatsApp.
4. Revisar 320, 390, 768, 1024 y 1440 px, más nombres de producto, precios y errores largos. Ninguna barra flotante podrá ocultar la acción o el contenido final.
5. Añadir `loading="lazy"` y `decoding="async"` fuera de la imagen principal visible, mantener proporciones para evitar saltos de layout y presentar placeholders discretos.
6. Preparar `srcset` y `sizes` cuando el backend entregue derivados de imagen. La compresión y generación de tamaños debe ocurrir al cargar o servir imágenes, no depender solo del navegador; el frontend consumirá las URLs optimizadas.
7. Verificar que las transiciones existentes respeten `prefers-reduced-motion`.

**Resultado:** la tienda se mantiene legible y ágil en teléfonos modestos, pantallas pequeñas y tecnologías asistivas.

## Dependencias que no resolverá el frontend

- Registro legal de consentimiento, eliminación de cuenta/datos, retención y privacidad: política y endpoints de servidor.
- Filtros paginados de pedidos, novedades/estacionales y derivados de imagen: contratos del catálogo/pedidos.
- Envío de emails, costos de reparto, reservas, cambios de estado y revalidación definitiva: Django y sus procesos operativos.
- Una detección infalible de bloqueadores de pop-ups: no existe una API web confiable para ello; se implementará recuperación visible.

## Verificación de cada fase

- Tests unitarios para plantilla de WhatsApp, persistencia no sensible del borrador, normalización del carrito, cambios de precio/stock, filtros URL y repetición de pedido.
- Prueba manual de envío con WhatsApp configurado, sin número y con apertura bloqueada.
- Prueba de pedido con variante agotada, precio modificado, error de red y doble pulsación del CTA.
- Revisión manual de teclado, lector de pantalla y los cinco anchos definidos.
- Ejecutar `pnpm test`, `node node_modules/typescript/bin/tsc --noEmit` y `pnpm build` antes de marcar un ítem como terminado en `ToDo.md`.

## Criterio de cierre

El frontend estará listo cuando una persona nueva pueda encontrar un producto, elegir una presentación, entender por qué deja sus datos, enviar un pedido pendiente, recuperarse de un fallo de WhatsApp y volver a interpretar su estado sin recibir instrucciones. Ningún texto o estado de interfaz debe afirmar que hay reserva, pago, entrega o confirmación si Django y Rosana todavía no lo validaron.
