# Plan: mejoras UX de Semilla, ruta por ruta

> **Para ejecución:** seguir `superpowers:executing-plans` y `superpowers:test-driven-development`; completar en orden, escribir cada prueba primero, demostrar RED→GREEN y registrar las decisiones en el ledger SDD. No detenerse a pedir aprobaciones intermedias: el usuario aprobó esta ejecución completa.

**Objetivo:** aplicar una revisión de producto a las 50 pantallas y tres layouts inventariados, corrigiendo los fallos verificables que afectan a datos reales, acciones visibles o confianza, sin desplazar el lenguaje visual de Stitch ni inventar actividad de usuario.

**Arquitectura:** Expo Router y servicios/modelos actuales; lógica de dominio pura en `src/utils` con pruebas Vitest; preferencias locales por `gardenId` en AsyncStorage; sincronización Supabase compatible con registros heredados.

**Especificación:** `docs/superpowers/specs/2026-09-23-screen-by-screen-ux-design.md`.

**Restricciones globales**

- No cambiar el modelo de cuentas, RevenueCat, permisos ni migraciones remotas.
- No reescribir registros antiguos ni interpretar una cantidad heredada con una unidad que los datos no conservan.
- Una acción “Guardar” solo se confirma tras persistir. Las recetas de calculadora son locales al dispositivo y al huerto activo, y se rotulan como tales.
- Mantener navegación Expo Router, compatibilidad Expo Go e iOS, traducciones existentes cuando haya claves disponibles, y targets táctiles de al menos 44 pt.
- No añadir mocks, ejemplos personales ni valores de demostración en estados de producción.

## Task 1 — Normalizar el peso de cosecha con compatibilidad

**Archivos:** `apps/huerto-tracker/src/utils/harvestWeight.ts`, su test; `src/models/diary-entry.ts`; `src/sync/adapters.ts`; `app/entry/new.tsx`, `app/entry/edit.tsx`, `app/(tabs)/diary.tsx`, `app/plant/[id].tsx`, `app/stats.tsx`, `app/costs.tsx`, `src/hooks/usePdfReport.ts`, `src/hooks/useCsvExport.ts`.

**Produce:** `getHarvestWeightKg(data)` acepta el campo nuevo `weightKg`, el legado mal nombrado `weightGrams` (que históricamente contiene kg) y el legado textual `weight`; devuelve un número válido o `null`. `harvestWeightToGrams(data)` convierte kg a gramos enteros para la columna Supabase y excluye el recuento por unidades. Los formularios nuevos guardan `weightKg`; la edición lee ambos formatos; todas las cifras/exportaciones usan el helper. La columna `harvest_weight_g` recibe gramos. El JSON conserva la cantidad explícita en kg. Las filas remotas antiguas sin `entry_data` mantienen el valor que la app ya mostraba, sin migración.

1. Escribir tests para kilos nuevos, dos formatos heredados, ausencia/NaN/negativos, redondeo a gramos y unidad `units`; ejecutar el test y observar fallos por símbolo inexistente.
2. Implementar helper y añadir `weightKg` al modelo, documentando `weightGrams` como formato heredado expresado en kg.
3. Cambiar los formularios de alta/edición a persistir `weightKg`; en edición normalizar el valor mostrado con `getHarvestWeightKg`.
4. En el adaptador, convertir solo al campo SQL (`harvest_weight_g`) a gramos y conservar `entry_data`; al leer una fila sin JSON preservar el valor histórico mostrado por la app.
5. Sustituir lecturas aritméticas y exportaciones por el helper; conservar el texto de unidad kg y excluir cosechas por unidades de los totales en kg.
6. Ejecutar test nuevo, tests de sincronización relevantes y typecheck.

**Verificación esperada:** el test prueba `0.275 kg → 275 g`, una fila antigua JSON `weightGrams: 0.275` sigue apareciendo como `0.275 kg`, y ninguna ruta duplica ni divide el registro del usuario.

## Task 2 — Estadísticas reales y filtros que sí filtran

**Archivos:** `src/utils/statsPeriod.ts` y test; `app/stats.tsx`.

**Produce:** `filterEntriesByPeriod(entries, period, now)` para `last30Days`, `thisYear` y `all`; rango inclusivo desde medianoche local y comparación estable `YYYY-MM-DD`. Todos los agregados de actividad/cosecha usan la selección; el inventario de plantas sigue siendo una cifra actual, no histórica. El encabezado muestra el nombre del huerto activo o “Todos los huertos”, nunca un nombre ficticio.

1. Añadir pruebas con fechas antes/dentro/después del rango, cambio de año, historial completo y límites inclusivos; observar RED.
2. Implementar filtro puro.
3. Cambiar el estado inicial inventado y las opciones del control para actualizar el filtro; calcular métricas con las entradas filtradas. Mantener el gráfico claramente descrito como la actividad del período visible.
4. Añadir test + typecheck.

**Verificación esperada:** al cambiar un período cambian recuentos, cosechas, distribución y actividad mensual; cambiar el huerto cambia su etiqueta y sus datos.

## Task 3 — Guía de plagas con catálogo editorial real

**Archivos:** `src/utils/diseaseGuide.ts` y test; `app/disease-guide.tsx`.

**Produce:** helper de filtrado sobre `DISEASES` que busca nombre, síntomas, descripción, cultivos y signos traducidos cuando existan, y filtra por tipo. Mantener activa la composición Stitch, pero alimentarla con el catálogo y tratamientos existentes; elimina los cuatro ejemplos y el detalle inventado de oídio que actualmente sustituyen el catálogo. Etiquetar la ficha como referencia editorial, sin presentarla como una plaga hallada en el huerto del usuario. El escaneo sigue abriendo el flujo real de cámara.

1. Añadir tests con varios tipos, búsqueda por síntoma/cultivo y resultado vacío; observar RED.
2. Implementar helper y conectar query/chips/lista a la misma fuente `DISEASES`.
3. Eliminar listas/nombres y consejos estáticos de demostración en `StitchDiseaseScreen`; renderizar el catálogo filtrado, los signos y los tratamientos traducidos, añadir vacío con acción de limpiar, y mantener la navegación real de escaneo.
4. Ejecutar test + typecheck.

**Verificación esperada:** cada filtro reduce la lista canónica; ningún elemento indica que existe una infestación personal sin un registro/diagnóstico del usuario.

## Task 4 — Alta Stitch conserva cada dato que muestra

**Archivos:** `app/plant/new.tsx` y, si la selección se extrae, `src/components` solo para un control reutilizado en esta ruta.

**Produce:** el CTA y cabecera de Stitch llaman al `handleSave` ya usado por el flujo robusto, respetando límite del plan, variedad, fecha, estado, método de propagación, foto persistida, huerto activo, errores y accesibilidad. La especie solo se elige desde el catálogo real (incluidos cultivos propios), con búsqueda; no se intenta adivinar un `cropId` comparando texto libre. Eliminar de esta pantalla las opciones de maceta, horas de sol, recomendaciones, fechas y estados que no se persisten. Mantener la composición Stitch alrededor de controles con modelo real.

1. Primero añadir una prueba unitaria para un helper de selección/resumen de alta, si se extrae, que rechace cultivo no seleccionado y preserve variedad/método/fecha/foto; observar RED.
2. Refactorizar la pantalla Stitch para usar el selector del catálogo existente, mostrar solo datos persistidos y pasar el estado compartido a la UI; delegar guardar al `handleSave` original.
3. Comprobar que no queda ninguna ruta de guardado paralela ni valores “Hoy, 15 de Mayo”, `bought` o `transplanted` fijados.
4. Ejecutar prueba aplicable + typecheck.

**Verificación esperada:** una alta de semilla comprada/plantel/semilla conserva la opción elegida y una foto se refleja en el registro creado; especie ausente no guarda una planta huérfana.

## Task 5 — Confirmación del enlace mágico sin datos falsos

**Archivos:** `app/auth/magic-sent.tsx` y test de helper textual si se extrae.

**Produce:** mostrar solo el email que llegó en los parámetros; cuando falta, copy neutral sin correo de ejemplo. Quitar el contador “43 segundos” no respaldado y sustituirlo por una instrucción honesta de caducidad limitada. Mantener verificación OTP, volver a corregir email y navegación actual.

1. Añadir test del texto presentado con email real y ausente; observar RED.
2. Eliminar el correo demo y la duración inventada del componente Stitch; pasar `email` opcional y mostrar copy neutral si falta.
3. Ejecutar test + typecheck.

**Verificación esperada:** nunca aparece un correo de otra persona ni una caducidad numérica no confirmada por el servicio.

## Task 6 — Guardar receta de sustrato de forma persistente

**Archivos:** `src/utils/volumeMix.ts` y test; `app/volume-calculator.tsx`.

**Produce:** función pura de cálculo/validación y adaptador pequeño de almacenamiento AsyncStorage con clave por `gardenId`. Guardar/restaurar mezcla y volumen del huerto activo entre aperturas; estado vacío si no hay huerto; mensaje de guardado únicamente tras confirmar `setItem`; errores recuperables si falla el dispositivo. Rotular que se guarda en este dispositivo. No subir recetas ni datos al backend.

1. Probar cálculo determinista, volumen vacío/inválido, aislamiento entre jardines, JSON malformado y round-trip AsyncStorage con almacenamiento falso; observar RED.
2. Implementar modelo y almacenamiento.
3. Cargar al cambiar el huerto (ignorando resultados de un efecto cancelado), restaurar preset/volumen, y conectar guardar al almacenamiento real; desactivar guardar sin huerto o durante guardado.
4. Ejecutar tests + typecheck.

**Verificación esperada:** al volver a la herramienta reaparece la última receta del huerto activo; otra huerta no la ve; un error nunca se presenta como guardado.

## Task 7 — Repaso final del alcance completo

**Archivos:** solo correcciones Critical/Important encontradas por los tests o diff en las seis tareas anteriores.

1. Revisar la matriz de 50 rutas y 3 layouts contra las pantallas activas y registrar qué rutas se mantuvieron porque su acción/datos ya cumplen.
2. Revisar el diff y los call sites: condiciones vacías, estados guardados, límites y accesibilidad; aplicar fixes Critical/Important con test RED→GREEN.
3. Ejecutar `npm test`, `npm run typecheck` en `apps/huerto-tracker` y `npm run build` si el entorno permite Expo export sin credenciales. Registrar toda limitación real.
4. Preparar paquete de revisión independiente del diff completo, revisar y corregir issues Critical/Important una sola vez.

**Verificación esperada:** todos los tests pasan, TypeScript no reporta errores, y el bundle Expo termina o deja un error reproducible atribuible al entorno.

## Interfaces compartidas y riesgo

- Task 1 toca entradas de diario y exportaciones; los filtros de Task 2 y pantalla de enfermedad de Task 3 usan colecciones distintas: sin interfaces compartidas salvo el uso paralelo de `DiaryEntry` en estadísticas. El helper de peso de Task 1 se debe consumir en estadísticas y costes sin copiar conversiones.
- Las pantallas nuevas dependen de modelos actuales y no cambian la estructura Supabase; `entry_data` mantiene respaldo de kg explícitos para no depender de la columna heredada.
- La preferencia de Task 6 es local por huerto; no compartir estado global ni introducir una sincronización accidental.

## Revisión final

Buscar especialmente: conversiones dobles de cosecha en los exports/detalle, desbordamientos por fechas/locales, rutas de `plant/new` que aún usen guardados alternativos, estado de huerto que llega asíncrono en la calculadora y cualquier mensaje que declare éxito antes de la persistencia. Los cambios de pixel-perfect fuera de estas rutas no forman parte de esta pasada; la especificación registra el análisis individual de todas las pantallas.
