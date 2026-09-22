# Diseño: plano unificado del huerto

**Estado:** propuesta para revisión del producto
**Fecha:** 2026-09-22
**Alcance:** mapa de `huerto-tracker` en iOS/Android con Expo Go

## Resumen

El mapa debe permitir dos trabajos complementarios sobre el mismo plano: organizar el espacio físico y planificar los cultivos por temporada. La geometría se define una sola vez; las plantas, temporadas, zonas y recomendaciones la reutilizan. El plano debe seguir disponible sin conexión y sincronizarse de forma segura con Supabase.

## Evidencia y situación actual

- `app/garden/map.tsx` ofrece croquis/lista, cuadrícula para cultivos y un lienzo libre usado en balcones y macetas.
- `app/garden/map-tools.tsx` ya permite colocar estructuras y zonas, guardar temporadas, preparar una temporada futura, estimar materiales y compartir.
- `src/models/garden-map-plan.ts` contiene estructuras, zonas, siembras previstas y snapshots de temporada. Las posiciones de objetos son relativas al lienzo y sus dimensiones físicas se guardan en centímetros.
- `src/hooks/useGardenMapPlan.ts` guarda ese plan en `AsyncStorage`; `src/sync/syncAll.ts` ya sube y descarga cuadrícula, posiciones libres y `mapPlan` juntos en la fila JSONB `garden_layouts`. La sincronización compara timestamps, pero no detecta de forma atómica dos ediciones concurrentes.
- `garden_layouts` permite escritura al propietario. Los colaboradores tienen rol `viewer` y reciben datos mediante `get_shared_garden_snapshot`, que elimina notas y fotos privadas; no se debe ampliar esa capacidad a escritura ni exponer la fila cruda.
- Ya hay modelos distintos para cuadrícula, posiciones libres y el plan de herramientas. La unificación debe adaptarlos sin descartar ni reinterpretar silenciosamente datos anteriores.

## Objetivos

1. Organizar huertos, terrazas y balcones con representaciones adecuadas a su uso.
2. Permitir colocar, mover y editar estructuras y vincular cultivos a ellas.
3. Planificar temporadas sobre la geometría existente y consultar avisos útiles y explicables.
4. Conservar los datos actuales, funcionar offline y sincronizar al recuperar conexión.
5. Mantener compatibilidad con Expo Go, accesibilidad táctil y las seis traducciones existentes.

## No objetivos de esta iniciativa

- Reconocer el plano mediante cámara, LiDAR, GPS o imagen generada por IA.
- Dibujar perímetros GIS o polígonos arbitrarios en la primera versión. Se admitirán objetos rectangulares y filas lineales, que cubren las organizaciones iniciales sin exigir otro motor gráfico.
- Añadir un proveedor de IA, nuevas cuotas, RevenueCat o nuevos niveles de pago.
- Presentar consejos como ciertos cuando falten datos de cultivo, ubicación, luz o riego.

## Modelo y comportamiento

### Un espacio, una geometría

Cada huerto seleccionado conserva un plano propio. Dentro de él se pueden añadir y organizar objetos: bancal, jardinera, maceta, fila, camino, pared/soporte vertical e invernadero. Las zonas de luz y riego siguen siendo capas informativas, no cultivos ni estructuras. Cada objeto conserva identificador estable, nombre, dimensiones físicas, posición, orientación y notas. Una fila es lineal y puede guardar separación entre plantas; no se modela como una cama rectangular.

El plano tiene medidas físicas opcionales. Las posiciones relativas existentes se mantienen como coordenadas normalizadas del espacio; al fijar las dimensiones, la interfaz las representa a escala. Si un plano antiguo no tiene medidas, se conserva su distribución relativa y no se inventa una escala: la app solicita medidas para activar cálculos que dependan de centímetros.

### Dos modos sobre la misma escena

**Organizar**

- Crear un objeto, colocarlo tocando el lienzo y moverlo mediante gesto.
- Rotar estructuras que lo permitan; para filas, editar orientación y separación entre plantas.
- Editar medidas y posición también con controles numéricos, como alternativa accesible al arrastre.
- Mostrar límites, medidas, cuadrícula opcional y capas de luz/riego.
- En macetas y balcones se prioriza el lienzo libre; en huertos con bancales se puede activar alineación a cuadrícula.
- Antes de eliminar objetos con cultivos asignados, mostrar el efecto y ofrecer reasignar o cancelar.

**Planificar cultivos**

- Elegir temporada/año y ver cultivos actuales o previstos sobre la misma escena.
- Colocar una planta o cultivo tocando un objeto o una posición libre; asociar la colocación al objeto y guardar cantidad, fecha y notas disponibles.
- Mantener el historial de temporadas y la preparación de futuras temporadas existentes.
- Mostrar avisos, no bloqueos, para incompatibilidad, separación, rotación, luz o riego. Cada aviso explica qué dato lo origina y permite descartarlo si el usuario conoce una excepción.

La lista actual seguirá disponible como vista alternativa para seleccionar, filtrar y editar elementos con precisión, especialmente en pantallas pequeñas o para usuarios que no puedan arrastrar.

## Reglas y procedencia de recomendaciones

- Calcular solamente reglas que tengan datos suficientes y una fuente/versionado de regla identificable.
- Diferenciar claramente “riesgo detectado”, “posible conflicto” y “dato desconocido”; desconocido nunca equivale a compatible.
- Reutilizar catálogo, rotaciones y utilidades ya presentes; no incorporar datos de ejemplo como si fueran del usuario.
- Si falta información fiable, explicar qué dato permitiría mejorar el aviso, sin bloquear el plano.

## Persistencia, sincronización y acceso

- Mantener caché local y edición offline. Las operaciones pendientes se sincronizan cuando vuelve la conexión.
- Reutilizar la fila `garden_layouts` asociada al `gardenId`, añadiendo columnas JSONB/revisión para la escena canónica v2. Mantener `layout` como puente de compatibilidad para clientes anteriores, de modo que un cliente viejo no pueda borrar campos v2 al reemplazar su JSONB; no crear otra tabla.
- Mantener edición exclusiva del propietario. Los miembros `viewer` solo reciben el snapshot saneado por RPC; actualizar esa proyección para que refleje la nueva geometría sin exponer notas, fotos ni campos privados.
- Aplicar Supabase Row Level Security y autorización del lado servidor. La app no concede acceso solo por ocultar botones.
- Evitar sobrescrituras silenciosas si dos dispositivos editan el mismo plano. Detectar revisiones concurrentes y permitir recargar o conservar una copia en conflicto; no usar “última escritura gana” sin aviso.
- No borrar la copia local antigua hasta que la conversión esté validada y sincronizada. Un fallo de red no debe perder cambios locales.

## Migración compatible

1. Leer y validar la versión actual del plan, posiciones libres y cuadrícula.
2. Convertir estructuras, zonas, plantas y snapshots a la representación unificada, conservando IDs y coordenadas relativas.
3. Retener temporalmente el original para recuperación; no aplicar dimensiones estimadas ni eliminar contenido no reconocido.
4. Escribir la versión nueva localmente y verificar su lectura antes de sincronizar.
5. Subirla con control de revisión; solo después confirmar la migración y retirar el respaldo temporal según la política de retención.

La migración debe ser idempotente. Un dato inválido se conserva en respaldo y produce un estado recuperable, no una sustitución por un plano vacío.

## Interfaz y plataforma

- Selector visible de modo **Organizar / Planificar** y controles de temporada/capa dentro del encabezado del mapa.
- Herramientas contextuales para añadir estructura, zona o cultivo; evitar que paneles tapen el área táctil del plano.
- Gestos implementados con APIs compatibles con Expo Go y controles equivalentes por formulario/lista.
- Diseñar estados de carga, guardado pendiente, offline, sincronización, conflicto y error recuperable.
- Etiquetas accesibles para cada elemento; selección y movimiento no dependerán solo del color.
- Toda cadena nueva pasa por `t()` y se incorpora a `ca`, `en`, `es`, `eu`, `gl` y `val`.

## Criterios de aceptación

1. Un usuario puede crear y reordenar bancales, filas y macetas en huertos de distinta configuración y editar sus dimensiones.
2. Puede alternar de Organizar a Planificar sin perder geometría ni tener que duplicar el mapa.
3. Puede asignar cultivos a estructuras, guardar una temporada y preparar otra; los avisos se basan en datos disponibles y explican su motivo.
4. Los planos existentes se actualizan sin perder posición, nombres, medidas, zonas, temporadas ni plantas; volver a ejecutar la migración no duplica datos.
5. Reiniciar la app offline conserva ediciones. Al recuperar red, el plano se sincroniza; fallos y conflictos no pisan silenciosamente el trabajo.
6. Las políticas de Supabase impiden leer o editar mapas de huertos no autorizados y respetan el nivel de acceso de cada miembro.
7. Las acciones críticas funcionan con controles accesibles además de gestos; pruebas de UI cubren crear, mover, reasignar, cancelar borrado y alternar temporadas.
8. Tests de modelo/migración/sync, `typecheck`, pruebas de la app y exportación Expo pasan; se prueba el flujo principal en iOS y Android.

## Riesgos y decisiones para el plan de implementación

- **Calibración:** las medidas del espacio pueden ser desconocidas; se conserva escala relativa hasta que el usuario introduzca medidas.
- **Representación de filas:** debe expresarse como objeto lineal con separación y orientación, sin forzarla a ser una cama rectangular.
- **Conflictos offline:** la primera versión debe evitar pérdida de datos; una resolución visual de fusiones complejas puede aplazarse, pero no la detección del conflicto.
- **Consejos de cultivo:** la cobertura y calidad dependen de datos locales y ubicación; cada regla debe indicar incertidumbre y procedencia.
- **Alcance backend:** la política RLS concreta y el mecanismo de sync deben cotejarse con el esquema y funciones de compartición existentes antes de definir migraciones.

## Fuera de la primera entrega

Perímetros irregulares dibujados a mano, detección automática del sol por brújula/cámara, previsiones de sombra 3D, automatización de riego, exportación CAD y edición simultánea en tiempo real. La arquitectura no debe impedirlas, pero no se implementan ni se simulan en esta entrega.
