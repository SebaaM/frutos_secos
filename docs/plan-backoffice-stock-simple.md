# Plan — Inventario simple y alertas accionables en el backoffice

> Estado: implementado en la interfaz. Se reutilizan los endpoints y las validaciones transaccionales existentes.

## Objetivo

Convertir la gestión diaria de stock en una tarea corta y segura:

1. ver qué presentación requiere atención;
2. ajustar el conteo físico rápidamente;
3. habilitar o deshabilitar un producto de la tienda sin entrar al editor completo.

El objetivo no es crear un dashboard ni agregar métricas. Es una cola de trabajo de inventario, mobile-first, que muestra solo lo necesario para tomar una acción.

## Diagnóstico del backoffice actual

La base de datos y la API ya contienen las reglas correctas:

- Stock por presentación de peso fijo; disponible = físico − reservado.
- `0` disponible es agotado, `1–5` son últimas unidades y `6+` está disponible.
- Físico, reservado y disponible se diferencian; el reservado no se edita.
- El ajuste exige motivo, usa `expected_stock`, se registra como movimiento y Django impide bajar por debajo del reservado.
- Publicar requiere categoría activa, imagen y presentación activa con precio positivo.
- No se borran productos ni variantes.

La interfaz actual, sin embargo, está pensada para edición completa de catálogo:

| Tarea diaria | Situación actual | Fricción |
| --- | --- | --- |
| Detectar faltantes | Una franja de alertas resume productos y luego se debe interpretar cada peso. | “Stock parcial” y alertas de producto ocultan cuál presentación hay que reponer. |
| Cambiar stock | Abrir Productos → editar producto → localizar presentación → abrir panel → escribir delta y motivo. | Demasiados pasos para una reposición o un conteo. |
| Ver historial | Se carga junto con el panel de ajuste. | Añade información antes de la acción principal. |
| Ocultar o publicar | Abrir editor, cambiar checkbox y guardar el producto completo. | Una acción operativa sencilla se mezcla con textos, galería y precios. |

## Decisión de diseño

Agregar una sección **Inventario** al backoffice y mantener **Productos** como editor completo de catálogo.

La sección Inventario será la vista inicial para el trabajo de stock. No reemplaza el editor: cada producto seguirá teniendo un enlace “Editar datos” para cambios de nombre, precios, fotos, categorías o presentaciones.

La interfaz usará dos niveles claros:

- **Producto:** nombre, foto, estado “Visible en tienda” / “Oculto”, y sus presentaciones.
- **Presentación:** peso, SKU, disponible y acción de ajuste. Las alertas y los ajustes suceden aquí porque es donde realmente se vende y reserva el stock.

## Modelo de alerta simplificado

### Qué verá el operador

La vista abrirá en **Para atender** y listará únicamente presentaciones activas de productos publicados que están:

- **Agotadas:** 0 paquetes disponibles.
- **Últimas unidades:** 1 a 5 paquetes disponibles.

Las presentaciones se agruparán visualmente por producto para no repetir la foto y el nombre, pero cada fila indicará de forma inequívoca el peso que necesita acción: por ejemplo, “Almendras · 250 g · agotado”.

La vista tendrá solamente:

- buscador por nombre o SKU;
- pestañas o filtros: `Para atender`, `Agotadas`, `Últimas unidades`, `Todo`;
- un control secundario “Incluir borradores” desactivado por defecto.

No se mostrará “stock parcial” como tarea independiente. Internamente seguirá existiendo como resumen de producto y se conservarán sus pruebas, pero la persona verá directamente las presentaciones agotadas o bajas que lo causan.

### Decisiones que preservan simplicidad

- Se mantiene el umbral global actual de 5 paquetes. No se agregan mínimos diferentes por producto o variantes en esta etapa.
- “Reservado” no es una alerta de reposición ni una cantidad editable. Solo aparecerá como contexto en una fila que no pueda reducirse más.
- Los borradores no interrumpen la lista diaria porque aún no afectan la tienda. Se podrán incluir intencionalmente para preparar una publicación.
- No habrá polling, notificaciones externas ni gráficas; “Actualizar” vuelve a consultar el inventario cuando el operador lo necesita.

## Flujo de inventario propuesto

### 1. Lista de trabajo

Cada tarjeta de producto tendrá una o más filas de presentación:

```text
Almendras naturales                         Visible en tienda
250 g · ALM-250       Agotado · 0 disponibles       [Reponer]
500 g · ALM-500       Quedan 3                       [Ajustar]
                                             [Ocultar producto] [Editar datos]
```

- El número de **disponibles** será el valor principal, grande y legible.
- Físico y reservado se revelarán debajo de “Ver detalle” o dentro del ajuste; no competirán con la decisión inmediata.
- El estado combinará texto, icono y color.
- En móvil, cada presentación conserva su propia acción de 44 × 44 px o mayor; no habrá tablas horizontales.

### 2. Reposición rápida

Al pulsar “Reponer” se abrirá una hoja o panel compacto, enfocado y accesible. Mostrará:

- presentación, disponible, físico y reservado actuales;
- campo “Nuevo stock físico contado”;
- resultado derivado: “disponible después del ajuste”;
- motivo preseleccionado `Reposición`, con opciones `Corrección de conteo` y `Merma`;
- nota opcional breve para aclarar el motivo;
- botón único `Guardar ajuste`.

El operador escribe el conteo físico final, no calcula deltas. El frontend calcula `delta = nuevo físico − físico actual` y llama al endpoint actual `adjust-stock` con `delta`, el motivo y `expected_stock`.

Como atajos seguros, el panel podrá ofrecer `+1` y `+5` solo para reposición. Las bajas se harán mediante el campo de conteo y motivo, evitando descuentos accidentales.

Django seguirá siendo la autoridad:

- no aceptará un conteo menor al reservado;
- rechazará datos obsoletos con `409`;
- creará el movimiento auditado;
- devolverá la presentación actualizada.

Ante un `409`, la interfaz mostrará “El stock cambió mientras lo estabas ajustando”, actualizará la fila y conservará el conteo propuesto para que el operador lo confirme de nuevo.

### 3. Historial bajo demanda

Después de un ajuste exitoso, la fila se actualiza de inmediato y aparece un aviso breve con el nuevo disponible. El historial no se carga por defecto.

`Ver historial` abrirá un panel secundario con los últimos movimientos de esa presentación. Así se conserva trazabilidad sin obstaculizar una reposición habitual.

### 4. Visibilidad rápida del producto

Cada producto tendrá una acción contextual:

- **Visible en tienda → Ocultar producto:** requiere confirmación breve: “Dejará de aparecer para nuevas compras. Los pedidos existentes no cambian.”
- **Oculto → Publicar producto:** se intenta publicar mediante la validación existente de Django. Si falta categoría activa, imagen o presentación válida, se muestra el motivo y un enlace a “Editar datos”.

La acción enviará solamente `PATCH { "is_published": boolean }`, contrato que el endpoint actual ya admite y valida. No enviará variantes ni sobrescribirá cambios de precio, galería o stock.

No se añadirá una habilitación rápida de variantes en esta fase: el pedido solicitado es habilitar/deshabilitar productos y mantener una única decisión de visibilidad fácil de entender. Las variantes permanecen en el editor avanzado, donde Django ya impide desactivarlas si tienen reservas.

## Secuencia de implementación

### Fase 1 — Reordenar la experiencia sin cambiar reglas de negocio

1. Agregar la pestaña `Inventario` en `frontend/src/backoffice/BackofficePage.tsx` y definirla como vista inicial del backoffice.
2. Extraer la lista de inventario a `frontend/src/backoffice/InventoryPage.tsx` y filas reutilizables a `InventoryProduct.tsx` / `InventoryVariantRow.tsx`.
3. Mantener `Productos` como catálogo completo y quitar de su listado las alertas que duplican la nueva cola de trabajo; conservar búsqueda y filtros de catálogo allí.
4. Adaptar `stock-status.ts` para entregar el conjunto de presentaciones que requieren atención, sin cambiar sus definiciones ni el cálculo por variante activa.
5. Conservar la franja de alertas solo si enlaza a Inventario; no debe repetir contadores y filtros dentro de Productos.

### Fase 2 — Ajuste rápido con el endpoint existente

1. Refactorizar `StockPanel.tsx` como `QuickStockAdjust.tsx`: entrada de físico final, cálculo visible de delta y resultado disponible.
2. Incluir motivos predefinidos y nota opcional. Para compatibilidad inicial, el texto enviado a `reason` será, por ejemplo, `Reposición` o `Merma: envase dañado`.
3. Reutilizar `adjustStock` y `getMovements` de `frontend/src/lib/backoffice-api.ts`; no hace falta un endpoint nuevo.
4. Actualizar optimistamente solo después de la respuesta de Django; después sincronizar la presentación, el producto y los contadores afectados.
5. Mantener el historial como carga explícita, con estado de carga, error recuperable y foco administrado.

### Fase 3 — Publicar u ocultar sin abrir el editor

1. Agregar `setProductPublication(id, isPublished)` en `backoffice-api.ts`, que haga PATCH parcial con un solo campo.
2. Incorporar el control de visibilidad en Inventario y Productos, con confirmación solamente para ocultar.
3. Mostrar los errores de requisitos de publicación devueltos por Django junto al producto, sin adivinar qué requisito falló.
4. Tras el cambio exitoso, actualizar la fila y eliminar/agregar sus presentaciones a la cola `Para atender` según corresponda.

### Fase 4 — Retirar complejidad y validar operación real

1. Dejar el ajuste avanzado y el historial accesibles desde el editor mediante el mismo componente, evitando dos implementaciones de stock.
2. Simplificar la documentación de alertas en `docs/backoffice.md` para que la tarea se describa por presentación, no por estados agregados difíciles de accionar.
3. Regenerar `docs/openapi.yaml` solo si se modifica un endpoint o esquema; no editarlo manualmente.
4. Validar la experiencia con una operación real de reposición y una de corrección de conteo antes de cambiar el umbral o sumar más automatización.

## Archivos previstos

| Archivo | Cambio |
| --- | --- |
| `frontend/src/backoffice/BackofficePage.tsx` | Nueva entrada Inventario, navegación y sincronización de datos. |
| `frontend/src/backoffice/InventoryPage.tsx` | Cola simple, filtros mínimos y agrupación por producto. |
| `frontend/src/backoffice/InventoryVariantRow.tsx` | Estado y acción rápida por presentación. |
| `frontend/src/backoffice/QuickStockAdjust.tsx` | Ajuste de físico final, motivos y recuperación de conflicto. |
| `frontend/src/backoffice/StockPanel.tsx` | Reutilizar, renombrar o eliminar tras migrar su responsabilidad. |
| `frontend/src/backoffice/stock-status.ts` | Selectores de presentaciones para atención, conservando reglas actuales. |
| `frontend/src/backoffice/StockBadge.tsx` | Etiquetas enfocadas en la acción diaria. |
| `frontend/src/lib/backoffice-api.ts` | PATCH parcial de publicación; los ajustes de stock reutilizan el contrato actual. |
| `frontend/tests/stock-status.test.mjs` | Casos de cola por presentación, borradores y umbral. |
| `docs/backoffice.md` | Flujo simplificado y criterios de alerta actualizados. |

## Casos que deben probarse

- Producto publicado con una presentación agotada y otra disponible: ambas se ven agrupadas, pero la fila agotada es la acción pendiente.
- Producto publicado con todas las presentaciones agotadas: cada presentación se puede reponer; no se pierde la distinción de pesos.
- Borrador con stock bajo: no aparece por defecto y aparece al activar “Incluir borradores”.
- Reposición `+1` y `+5`, conteo físico manual, merma y corrección de conteo.
- Intento de bajar el físico por debajo de lo reservado: Django lo rechaza y la interfaz explica el límite.
- Conflicto `409`: se actualiza el dato sin perder el conteo escrito.
- Ocultar un producto publicado, republicar uno válido e intentar publicar uno incompleto.
- Navegación por teclado, foco al abrir/cerrar paneles, lectura de disponible/reservado, móvil de 320 px y escritorio.
- Ejecutar Django tests/check/migraciones pendientes, `pnpm test`, TypeScript sin emisión y `pnpm build`. Las pruebas de bloqueo concurrente se validan con PostgreSQL, no con SQLite.

## Fuera de alcance

- Cambiar el modelo de reservas, el cálculo disponible o las validaciones transaccionales existentes.
- Edición directa de stock reservado, eliminación de productos/variantes o reposición automática.
- Alertas externas, notificaciones, analíticas, predicción de demanda o dashboard.
- Umbrales personalizados por producto, hasta comprobar que el umbral global de cinco paquetes es insuficiente.

## Criterio de cierre

Una persona operadora puede entrar al backoffice, identificar una presentación agotada, registrar el nuevo conteo físico con motivo y ver el resultado actualizado en menos de un minuto. También puede ocultar o publicar un producto con una acción clara, sin tocar por accidente precios, fotos, reservas ni otras presentaciones.
