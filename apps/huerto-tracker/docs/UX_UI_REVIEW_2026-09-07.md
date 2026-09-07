# Revisión UX/UI de Semilla — 7 de septiembre de 2026

## Alcance y resultado

Implementación centrada en el recorrido de una persona principiante: bienvenida → cuatro respuestas → recomendación → primera planta → cuidado de hoy. Se conserva el almacenamiento, el catálogo y el recomendador determinista existentes. Trabajo limitado a `apps/huerto-tracker`; sin cambios de dependencias, precios, RevenueCat, restricciones Pro o stitch-tally.

## Hallazgos y cambios

| Prioridad | Problema | Resultado implementado |
| --- | --- | --- |
| P0 | Guardar la primera planta podía equivaler a declarar una siembra todavía no realizada. | Alta guiada como plan sin fecha ni entrada de siembra. La persona confirma cuándo ha sembrado; también puede declarar una siembra previa y elegir la fecha. |
| P0 | Registrar agua era más directo que comprobar si hacía falta. | Tarjeta compartida de cuidado en portada y detalle. Diferencia entre haber regado tierra seca y haber comprobado que sigue húmeda. El segundo caso guarda una nota, nunca un riego ficticio. |
| P0 | El tutorial podía bloquear Expo Web por `setNativeProps` de SVG y `findNodeHandle`. | Máscara View y sin desplazamiento nativo en web; SVG y desplazamiento se mantienen en plataformas nativas. La portada presenta dos pasos visibles: cuidado de hoy y añadir planta. |
| P1 | Bienvenida y alta presentaban decisiones secundarias antes del primer resultado. | Bienvenida orientada al resultado, inicio como invitado, cuatro preguntas, formulario guiado con opciones adicionales plegadas. |
| P1 | Ubicación difícil de encontrar y lista incompleta. | Búsqueda sin distinguir tildes, todas las provincias existentes, selección manual alternativa al GPS y errores recuperables. |
| P1 | Incertidumbre sobre luz y recomendaciones poco explicadas. | Opción «No lo sé» con interpretación conservadora explícita; recomendaciones con contexto, motivos, rango orientativo de cosecha y distinción entre sembrar y preparar. |
| P1 | Portada con demasiados bloques antes de la acción útil. | Cuidado de hoy y plantas primero; checklist, avisos semanales, cosechas y herramientas después. Portada vacía con entrada directa a recomendaciones. |
| P1 | Estado de cuidado y checklist desactualizados al volver. | Refresco al recuperar foco, cuidado completado persistente, siguiente planta pendiente y protección frente a pulsaciones repetidas en el formulario y la tarjeta. |
| P1 | Contraste insuficiente y controles pequeños en el recorrido inicial. | Botón local adaptado a la paleta clara/oscura, texto multilínea, objetivos de 44–48 px, roles y estados accesibles, navegación de vuelta visible. |
| P1 | Detalles web y textos inconsistentes. | Selector HTML de fecha en web, recordatorios nativos excluidos de web, mes correctamente localizado, texto meteorológico que pide comprobar la tierra, claves nuevas en seis idiomas. |

## Decisiones de compatibilidad

- Un plan usa el modelo Plant existente: semillero de semillas sin `sowingDate`. Los ejemplares comprados y las plantas antiguas ya en crecimiento no se reinterpretan como planes.
- La comprobación húmeda usa `DiaryEntry.type = note` y `data.soilCheck = moist`. Los adaptadores actuales conservan ese JSON; no requiere migración de base de datos.
- La prioridad diaria es determinista: plaga activa, necesidad estimada de agua, plan pendiente y comprobación de suelo pendiente. Las heladas ajustan la instrucción de la planta seleccionada. Los avisos de trasplante, cosecha y tratamientos permanecen en «Esta semana».
- No se añaden servicios de IA ni aleatoriedad al recomendador. La estimación de cosecha se expresa como intervalo desde la siembra.
- El alcance de accesibilidad es el recorrido modificado, no una certificación integral de la aplicación.

## Validación realizada

- Expo Web propio en `http://localhost:8082`, como invitado. Recorrido completo: `/welcome`, `/onboarding`, `/first-crop`, portada vacía, `/plant/new`, confirmación, portada y `/plant/[id]`.
- Perfil de prueba: balcón, luz parcial, principiante, Málaga; búsqueda «malaga» encuentra Málaga. Recomendaciones observadas: rábano, berros y cebollino.
- Plan de rábano sin siembra ficticia → confirmación de siembra → comprobación de tierra húmeda → vuelta a portada. El cuidado y el checklist 3/5 persistieron tras recargar.
- Segunda alta de berros con «Ya he sembrado», selector «Otra fecha», fecha 2026-09-05 y pantalla de éxito.
- Reproducción manual del tutorial desde Ajustes, avance, finalización y recarga sin repetición. Desaparecieron los dos fallos web observados durante ese recorrido.
- Inspección visual a 390 px y 320 px. Portada oscura y detalle/formulario claro; la selección temporal de tema para QA se retiró al terminar.
- `npm run typecheck`: correcto. `npm test`: 144 pruebas, 9 archivos, todas correctas. Incluye planes sin siembra, compatibilidad de plantas anteriores, nota húmeda, prioridad diaria, fechas, sincronización y recomendación estable al cambiar de año.
- Comparación de las 69 claves modificadas/nuevas de español con en, ca, eu, gl y val: sin claves ausentes ni diferencias de interpolaciones. `git diff --check`: correcto.

## Límites y seguimiento

- Pendiente prueba en dispositivos iOS/Android: GPS y permisos reales, lector de pantalla, selector de fecha nativo, notificaciones y tutorial nativo. No se atribuye a la prueba web cobertura de esos comportamientos.
- El onboarding todavía no guarda un borrador por pregunta ni permite finalizar sin provincia. «No lo sé» se guarda como sombra conservadora porque el perfil actual no representa incertidumbre separadamente.
- El cuidado diario no sustituye un motor agronómico completo: no ordena todas las plantas por riesgo de helada ni convierte todos los avisos de cosecha/trasplante en la acción principal. Los avisos existentes siguen disponibles.
- Las comprobaciones de guardado cubren pulsaciones repetidas y reintentos locales; no constituyen una transacción distribuida entre dispositivos.
- Las seis traducciones tienen cobertura estructural; conviene revisión lingüística humana, especialmente euskera y variantes regionales.

## Archivos principales

- Pantallas: `app/welcome.tsx`, `app/onboarding.tsx`, `app/first-crop.tsx`, `app/plant/new.tsx`, `app/plant/[id].tsx`, `app/(tabs)/index.tsx`.
- Componentes: `PlantCareCard`, `ActionButton`, `WebDatePicker`, `ActivationChecklist`, `SemillitaTourProvider`, `SemillitaTooltip`, `SowNowCard`.
- Lógica: `dailyCare`, `wateringStatus`, `wateringUtils`, hooks de checklist, tutorial y recordatorios, modelo de diario y eventos de analítica.
- Idiomas: `src/i18n/locales/{es,en,ca,eu,gl,val}.json`; pruebas en `src/utils/__tests__`.
