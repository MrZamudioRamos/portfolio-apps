# Semilla: brainstorming pantalla por pantalla

## Objetivo y criterio de éxito

Revisar cada ruta de la app como una tarea concreta de una persona que cultiva en casa y usa el móvil con una mano. Mantener la dirección visual de Stitch y las reglas de Semilla: mostrar información del huerto real, explicar la incertidumbre, proponer un paso útil y conservar los gestos y controles de iOS. Una acción visible debe producir su efecto anunciado; si falta un sensor, permiso, cuenta o dato, la pantalla lo explica y ofrece una salida útil.

El éxito de esta pasada es que las 50 rutas de pantalla y las tres rutas de composición tengan una decisión de UX explícita; que las discrepancias que presentan información falsa o dejan acciones sin efecto queden corregidas; y que los recorridos centrales sigan compilando y pasando sus comprobaciones automatizadas.

## Límites y supuestos

- La referencia de diseño aprobada sigue siendo el proyecto de Stitch ya guardado en `PRODUCT.md`.
- No se inventan perfiles, huertos, fechas, precios, lecturas de luz, plagas presentes ni actividad personal.
- Los catálogos locales son contenido editorial; los registros del usuario proceden de sus colecciones y del huerto activo.
- Se preservan las cuatro pestañas principales y la arquitectura Expo Router existente.
- “Guardar” implica persistencia. Una selección, etiqueta o aviso visual no sustituye guardar el valor asociado.
- El cultivo y la ubicación se recomiendan como orientación, no como garantía.

## Enfoques considerados

1. Rediseñar todas las pantallas de una vez. Se descarta porque aumentaría el riesgo de apartarse de Stitch y cambiaría demasiados flujos sin necesidad.
2. Añadir una función nueva a cada pantalla. Se descarta porque llenaría de controles las pantallas que ya hacen bien su trabajo.
3. Revisar cada ruta y corregir las fricciones demostrables, conservando las pantallas que ya cumplen su objetivo. Elegido: da cobertura completa sin añadir funciones ornamentales.

## Brainstorming por ruta

### Navegación y pestañas

| Ruta | Trabajo de la persona | Decisión de diseño |
|---|---|---|
| `app/_layout.tsx` | Abrir la app, volver de enlaces y recuperarse de un fallo | Mantener el arranque y los deep links; mensajes de error deben permitir reintentar sin perder datos. |
| `app/(tabs)/_layout.tsx` | Cambiar entre Hoy, Mapa, Plantas y Calendario | Mantener cuatro pestañas, estado seleccionado anunciado y área táctil mínima de 44 pt. |
| `app/crop/_layout.tsx` | Navegar por gestión de cultivos propios | Mantener navegación apilada; no mostrar una pestaña adicional. |
| `app/(tabs)/index.tsx` | Saber qué cuidado hacer hoy | Priorizar una acción basada en registros reales; conservar el estado sin plantas con una salida para crear la primera. |
| `app/(tabs)/map.tsx` | Orientarse en el espacio y llegar al plano editable | Conservar vista rápida, selector de huerto y acceso a plano/lista compartidos. |
| `app/(tabs)/plants.tsx` | Encontrar, abrir y añadir plantas | Diferenciar huerto vacío de búsqueda sin resultados y mantener el ámbito del huerto activo. |
| `app/(tabs)/calendar.tsx` | Ver cuidados y avisos por fecha | Distinguir calendario vacío de día sin tareas; abrir el flujo de recordatorio real. |
| `app/(tabs)/diary.tsx` | Consultar y corregir observaciones | Mantener filtros y edición sobre entradas guardadas; conservar búsqueda al volver del detalle. |
| `app/(tabs)/tools.tsx` | Encontrar herramientas disponibles | Mostrar rutas realmente implementadas y describir con honestidad capacidades ausentes, como sensores. |
| `app/(tabs)/settings.tsx` | Cambiar cuenta, huerto y preferencias | Cada fila debe cambiar una preferencia, abrir su pantalla o explicar un límite real; eliminar estados ficticios. |

### Inicio, cuenta y activación

| Ruta | Trabajo de la persona | Decisión de diseño |
|---|---|---|
| `app/welcome.tsx` | Entender Semilla y continuar | Conservar el diseño Stitch y diferenciar entrar, crear cuenta y continuar el onboarding. |
| `app/auth/index.tsx` | Autenticarse | Mantener acceso por correo y proveedores habilitados; preservar el correo y errores recuperables. |
| `app/auth/magic-sent.tsx` | Completar el acceso por correo | Mostrar solo el correo recibido por navegación; no rellenar un correo de demostración. |
| `app/onboarding.tsx` | Configurar espacio y contexto | Guardar únicamente respuestas elegidas y explicar por qué se solicita cada dato. |
| `app/first-crop.tsx` | Escoger el primer cultivo viable | Basar opciones en catálogo, estación y respuestas; mostrar el motivo y permitir cambiarlo. |
| `app/coach-demo.tsx` | Aprender el enfoque de cuidado | Evitar promesas de certeza; explicar que las recomendaciones dependen de observaciones y contexto. |
| `app/mascot-picker.tsx` | Escoger una mascota | Mostrar poses disponibles y persistir la elegida en el perfil/preferencia existente. |
| `app/paywall.tsx` | Entender y comprar Pro | Informar estado real de productos, compra y restauración; no simular una compra si RevenueCat no está configurado. |

### Cultivos, cuidados y registros

| Ruta | Trabajo de la persona | Decisión de diseño |
|---|---|---|
| `app/plant/new.tsx` | Registrar una planta | Los campos visibles deben llegar al registro; elegir cultivo del catálogo y persistir foto, variedad, estado y fecha correctos. |
| `app/plant/[id].tsx` | Entender una planta concreta | Mantener el detalle ligado a la planta y a su huerto; los CTA deben abrir registro, recordatorio o diagnóstico correctos. |
| `app/plant/edit.tsx` | Corregir los datos de una planta | Mantener valores al fallar, validar cambios y actualizar el registro original. |
| `app/plant/follow-up.tsx` | Revisar una identificación o seguimiento | Separar resultado real de IA de ausencia de proveedor; permitir corregir antes de crear datos. |
| `app/plant/identify.tsx` | Interpretar una foto | Explicar permisos, estado de cuenta y disponibilidad del proveedor antes de crear una planta. |
| `app/plant/scan.tsx` | Capturar una foto de cultivo/síntoma | Mantener alternativa ante permiso denegado y no afirmar diagnóstico antes de recibirlo. |
| `app/modal/add-plant.tsx` | Abrir alta rápida de planta | Mantenerlo como ruta de compatibilidad que conduce al flujo de alta completo, sin formulario duplicado. |
| `app/modal/check-soil-sheet.tsx` | Comprobar humedad antes del riego | Guardar “seco/húmedo” como observación; una comprobación húmeda nunca crea un riego. |
| `app/entry/new.tsx` | Anotar cuidado o cosecha | Validar campos según tipo y conservar la barrera de comprobación previa al riego. |
| `app/entry/edit.tsx` | Corregir un registro | Precargar valores del registro y aplicar borrado/actualización al ID correcto. |
| `app/care-plan.tsx` | Ver próximos cuidados | Ordenar tareas desde plantas y fechas reales; la comprobación de sustrato decide el riego. |
| `app/reminder/new.tsx` | Crear aviso | Validar fecha/hora futura, permiso y resultado real de programación. |
| `app/reminder/edit.tsx` | Cambiar aviso | Precargar, guardar y cancelar la notificación original sin duplicados. |
| `app/absence.tsx` | Preparar el huerto durante un viaje | Aclarar que es un plan y checklist; no insinuar riego automático si no se programa. |

### Espacio, mapa y colaboración

| Ruta | Trabajo de la persona | Decisión de diseño |
|---|---|---|
| `app/gardens.tsx` | Cambiar o crear espacio | Mostrar datos reales por huerto y límites de plan antes de cambiar el activo. |
| `app/garden/edit.tsx` | Configurar medidas y condiciones | Guardar dimensiones y orientación realmente; explicar los campos que afectan al mapa. |
| `app/garden/map.tsx` | Colocar plantas y estructuras | Seguir usando la escena compartida v2, guardado y alternativa de lista accesible. |
| `app/garden/map-tools.tsx` | Organizar y planificar el plano | Diferenciar planta activa de cultivo planificado; advertir sobre medidas desconocidas sin inventarlas. |
| `app/garden/share.tsx` | Conceder o retirar acceso | Explicar permisos y estado de la invitación; confirmar operaciones destructivas. |
| `app/garden/invite.tsx` | Aceptar una invitación | Comprobar token/sesión y conservar una recuperación clara para invitación caducada. |
| `app/garden/shared/[gardenId].tsx` | Ver un huerto compartido | Mantener lectura segura, datos reducidos y errores/reintento explícitos. |

### Catálogos y herramientas

| Ruta | Trabajo de la persona | Decisión de diseño |
|---|---|---|
| `app/catalog.tsx` | Aprender sobre cultivos | Distinguir contenido de catálogo de datos del usuario; mantener búsqueda y alta con cultivo precargado. |
| `app/crop/index.tsx` | Gestionar cultivos personalizados | Diferenciar catálogo global de especies propias y permitir editar/eliminar correctamente. |
| `app/crop/new.tsx` | Crear cultivo personalizado | Validar campos y guardar en el catálogo personal, no en la lista global. |
| `app/seeds.tsx` | Gestionar lotes de semillas | Mantener inventario por huerto y hacer explícita la caducidad/cantidad solo si se registró. |
| `app/companions.tsx` | Consultar compatibilidad | Etiquetar las asociaciones como guía editorial; mantener búsqueda y selección de ambas especies funcionales. |
| `app/disease-guide.tsx` | Buscar síntomas y tratamientos | Usar el catálogo `DISEASES` existente; filtros, búsqueda y apertura deben operar sobre la misma lista. |
| `app/rotation.tsx` | Revisar rotación por bancal | Basar alertas en plantas e historial reales; si faltan temporadas, declararlo en vez de mostrar ciclos de ejemplo. |
| `app/light-meter.tsx` | Entender la luz de un espacio | Mantener explícito que no hay sensor integrado y registrar solo observaciones manuales reales. |
| `app/volume-calculator.tsx` | Calcular mezcla de sustrato | Mostrar estimación derivada de volumen y hacer que guardar conserve la mezcla o cambiar el texto para no prometer persistencia. |
| `app/stats.tsx` | Entender actividad y cosechas | Todos los filtros deben cambiar los cálculos y el huerto mostrado debe ser el activo. |
| `app/costs.tsx` | Revisar inversión | Usar gastos/cosechas registrados; separar estimación editable de importe real. |
| `app/chat.tsx` | Resolver una duda | Mostrar disponibilidad y errores del proveedor; no presentar respuestas de ejemplo como datos propios. |

### Datos, permisos y recuperación

| Ruta | Trabajo de la persona | Decisión de diseño |
|---|---|---|
| `app/settings/backup.tsx` | Exportar o restaurar información | Mostrar formato, estado y alcance real de copia; proteger contra restauración parcial. |
| `app/settings/notifications.tsx` | Gestionar avisos | Reflejar permiso del sistema y programaciones reales; conducir a crear/editar el aviso correcto. |

## Decisiones de implementación prioritaria

La inspección encontró defectos con efecto directo en la confianza y en la tarea: el resumen estadístico empieza con un período/huerto inventados y su filtro solo cambia una etiqueta; la pantalla activa de plagas sustituye el catálogo mantenido por cuatro nombres ficticios y chips que no filtran; el alta Stitch de plantas presenta campos que no se guardan y fija la fecha/estado de compra; el acceso por enlace puede mostrar un correo de demostración y una caducidad exacta sin respaldo; y la cantidad de cosecha se guarda bajo un nombre que dice gramos aunque formularios, historial y totales la interpretan como kilos. Estas se corrigen primero, sin perder compatibilidad con los registros antiguos.

La auditoría del peso confirmó que `entry_data.weightGrams` se ha usado como kg desde la UI de cosechas, y que la sincronización lo copia sin conversión a `harvest_weight_g` (integer). Para las entradas nuevas se introduce `weightKg` como campo explícito y se sincroniza a gramos reales. Los consumidores continúan leyendo `weightGrams` heredado como kg. Si una fila antigua solo contiene la columna sin `entry_data`, se mantiene la interpretación visible previa (kg), porque no hay versión ni metadato que permita distinguir de forma segura los registros antiguos; no se migra ni reescribe ningún dato existente.

Las demás rutas conservan su diseño y lógica actual mientras cumplen su objetivo y no muestran datos falsos. En la revisión de todas las rutas se anotan fallos demostrables y se corrigen en el plan; no se añade una función nueva por cuota de pantalla. La calculadora solo anuncia “guardada” cuando conserva una receta real por huerto en este dispositivo.

## Datos, errores y accesibilidad

- Estado vacío, carga, error y permisos deben distinguirse cuando la pantalla accede a colecciones o hardware.
- Acciones primarias se pueden tocar con al menos 44 pt y muestran estado de guardado/carga.
- Search/filter debe filtrar los mismos datos que se muestran y el estado vacío debe ofrecer limpiar o continuar.
- Fecha, estación, clima, precios y contadores se derivan del reloj/datos de la persona; no usan valores de demostración.
- La información de cultivo es guía editorial y no garantiza cosecha, diagnóstico o ahorro.

## Verificación

Ejecutar los tests del workspace huerto-tracker, el chequeo TypeScript y revisar las rutas afectadas frente a los flujos descritos. Si el build Expo o las pruebas nativas dependen de servicios externos no disponibles, registrar el bloqueo con evidencia y verificar el bundle localmente en cuanto sea posible.
