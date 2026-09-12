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
- Segunda alta de berros con «Ya he sembrado» y pantalla de éxito. La revisión posterior detectó que la fecha introducida en web no actualizaba el estado del formulario. Corregido escuchando también `input`: nueva prueba independiente con «Cebollino QA fecha», fecha 2026-09-04, guardado y detalle mostrando «Sembrada 04/09/2026» con una única entrada de siembra.
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

## Segunda pasada crítica — 9 de septiembre de 2026

La revisión se hizo sobre la implementación de los commits `ffe8ddd` y `4789cc7`, con el servidor Expo Web propio en el puerto 8082. Para no alterar el almacenamiento de la pestaña del usuario, las pruebas nuevas usaron también `127.0.0.1:8082`; la diferencia de origen se tuvo en cuenta al comprobar persistencia.

### Problemas reproducidos y corregidos

| Prioridad | Reproducción | Corrección |
| --- | --- | --- |
| P0 | Dos pulsaciones rápidas en sembrar, cuidado diario o quick log podían crear escrituras repetidas o dejar una planta y su diario en estados distintos cuando fallaba una segunda escritura. | `careWrites.ts` serializa las escrituras del recorrido, vuelve a leer la entidad actual y compensa altas, siembras y quick log cuando falla la operación dependiente. Los controles quedan bloqueados mientras guardan. |
| P0 | Un plan sin `sowingDate` podía entrar en cálculos de riego o recibir una entrada de watering. | El plan exige confirmar siembra; `recordCare` y quick log rechazan watering en ese estado y no crean riego ficticio. Los ejemplares comprados no reciben una siembra implícita. |
| P0 | Una nota de tierra húmeda podía ocultar la necesidad de riego después del mismo día o contaminar la portada con entradas eliminadas. | El estado diario filtra eliminados, jardín y fechas futuras, y solo consume la comprobación húmeda del día actual. |
| P1 | El onboarding podía reutilizar un perfil o jardín capturado antes de una espera y repetir fechas de finalización al reintentar. | Los guardados leen el registro actual, actualizan el jardín existente y conservan la primera fecha persistida. |
| P1 | Fast Refresh reejecutaba la inicialización de Supabase y producía avisos de varias instancias de GoTrueClient. | El layout reutiliza el cliente compartido antes de llamar al inicializador. No se añadió un cliente, provider o sistema de auth nuevo. |
| P1 | Remontajes de portada/detalle duplicaban impresiones y el doble tap del recomendador podía navegar dos veces. | Impresiones semánticas deduplicadas por sesión, efectos ligados al foco y guardas de selección/escritura. |
| P1 | El calendario mostraba el mes como caracteres separados en el plan de portada y faltaban claves nuevas en idiomas secundarios. | Meses como arrays localizados y claves equivalentes en es, en, ca, eu, gl y val. |
| P1 | El fallo de guardar un recordatorio se mostraba como alerta nativa invisible en Web y podía perder el formulario. | Error inline, reintento seguro, botón local con contraste y título predeterminado que pide revisar la tierra. |

### Rutas y estados probados

- `/welcome`, onboarding completo como invitado, ubicación `malaga` y `Málaga`, resultados y estado sin resultados controlado, plan sin siembra y confirmación posterior.
- Portada vacía, con una planta y con dos plantas; plantas nuevas y existentes con fecha de siembra anterior; detalle, acción diaria seca/húmeda y pulsación repetida; quick log y diario.
- Calendario, recordatorio nuevo y recordatorio visible en detalle, ajustes, cambio de idioma, navegación atrás y recarga.
- Viewports 320, 390 y escritorio; se revisaron estados claro y oscuro. El tema temporal de QA fue retirado del layout antes de la validación final.
- La consola Web solo mostró avisos preexistentes de notificaciones Web, estilos RN obsoletos y `useNativeDriver`; no apareció un nuevo aviso de GoTrue en la sesión final.

### Pendiente

- No se pudo ejecutar una prueba física de iOS desde Windows. En Expo Go hay que comprobar: permisos de notificaciones y GPS, selector de fecha nativo, lector de pantalla, tutorial con gestos y programación/recuperación de recordatorios en segundo plano.
- La cola y las compensaciones protegen fallos aislados dentro del proceso; no son una transacción distribuida frente a cierre del proceso o fallo simultáneo del rollback.
- El hook de recordatorios compartido solicita permisos al montarse y puede ocultar fallos de programación nativa; requiere una revisión específica fuera de esta pasada.

### Validación segunda pasada

- `npm run typecheck`: correcto.
- `npm test`: 155 pruebas en 11 archivos, todas correctas.
- `npx expo export --platform web`: ejecutado en `.expo/qa-export-web`; Metro mostró solo avisos de configuración Sentry y `NO_COLOR`.
- `npx expo export --platform ios`: ejecutado en `.expo/qa-export-ios`; mismos avisos no bloqueantes.
- `git diff --check`: correcto; Git informó únicamente conversiones LF/CRLF de archivos modificados.

## Intervención acotada de recordatorios — 9 de septiembre de 2026

La auditoría siguió todos los lectores y escritores de recordatorios en la app y el paquete compartido `@portfolio/notifications`. `useReminders` se montaba en Home indirectamente a través de las pantallas de detalle, jardines y formularios, y su `useEffect` llamaba a `requestPermissions()` sin una acción de la persona. Además, Home, Diario y Calendario usan programación de alertas derivadas, pero no llaman directamente al permiso; los permisos explícitos de alertas estacionales, heladas, plantas y trial permanecen ligados a sus interruptores o acciones correspondientes.

Se eliminó la solicitud de montaje del hook compartido. Consultar, refrescar, cancelar o eliminar recordatorios no solicita permisos. Crear un recordatorio habilitado, activar uno existente o guardar cambios que lo dejan habilitado son las únicas rutas que llaman al permiso. Si la persona lo deniega, la operación no crea ni activa una notificación parcial y la pantalla conserva el formulario con un mensaje que indica activar notificaciones en Ajustes y reintentar. Los recordatorios y perfiles existentes mantienen sus datos y `notificationId`.

Se añadieron regresiones significativas al hook: montaje sin solicitud, creación explícita con permiso y denegación sin persistencia ni programación. El flujo Web se validó en Home, detalle, Diario, Calendario y Ajustes; los bundles Web e iOS se exportaron correctamente. La prueba física de permisos nativos queda para Expo Go.

## Auditoría posterior al merge — 9 de septiembre de 2026

Tras integrar el PR en `huerto`, la revisión visual de Home a 390 px en tema oscuro mostró una jerarquía clara para «Hoy en tu huerto», plantas y acciones. También confirmó una oportunidad lógica concreta: «Regar todo» escribía entradas directamente y evitaba la protección de tierra húmeda, la serialización y el guardado seguro usado por el cuidado individual. Se corrigió para reutilizar `recordCare`, conservar litros/método y omitir de forma segura plantas que ya tienen una revisión del día. Se añadió una regresión para metadatos de riego masivo y doble registro.

El resto de la auditoría estática no encontró otra regresión P0/P1 demostrable sin ampliar alcance. Los avisos restantes de Web corresponden a `expo-notifications` sin listener de push efectivo, estilos RN obsoletos y `useNativeDriver` no disponible en Web. Se mantienen como deuda técnica separada.

## Pulido UX posterior a la auditoría — 10 de septiembre de 2026

Se aplicó una intervención acotada sobre problemas de jerarquía, accesibilidad y recuperación:

- Home mantiene el checklist de activación visible durante los primeros días, y agrupa el resto de superficies secundarias bajo «Más de tu huerto». En 320 px las plantas pasan a una columna; a partir de 360 px mantienen dos.
- El diario distingue «sin entradas» de «sin resultados con este filtro» y ofrece borrar filtros directamente.
- Ajustes > Notificaciones lista los recordatorios existentes usando lectura pasiva de almacenamiento; consultar esa pantalla no solicita permisos. Las pantallas de alta y edición conservan el formulario ante una denegación y ofrecen abrir los ajustes del sistema en plataformas nativas.
- La bienvenida usa «Explorar la app» para el recorrido sin cuenta. Se mejoraron roles y etiquetas accesibles del menú inferior y del cierre de quick log, y se localizaron textos que seguían fijos en español.
- «Regar todo» pasó a expresar revisión/registro de varias plantas para no prometer una acción ficticia; el recomendador de «Sembra ahora» muestra como máximo tres opciones iniciales.

Validación posterior: npm run typecheck, 156 pruebas de la app en 11 archivos, 3 pruebas del hook compartido de recordatorios, export Web, export iOS y git diff --check. No se inició un servidor Expo adicional. La prueba física pendiente sigue siendo permisos, notificaciones en segundo plano, lector de pantalla y selector nativo en Expo Go.

## Verificación de estabilidad de recordatorios — 10 de septiembre de 2026

La prueba de regresión reprodujo un estado parcial en `useReminders.update` y `toggle(true)`: el código cancelaba la notificación anterior antes de pedir permiso o guardar el nuevo estado. Si la persona denegaba el permiso, el recordatorio seguía marcado como habilitado pero había perdido su notificación. La corrección programa primero, persiste después y cancela la notificación anterior solo cuando el guardado terminó; si el guardado falla, cancela únicamente la notificación nueva.

También se verificó la pantalla de Notificaciones en la build Web de la rama: `/welcome` no autenticado carga, `/settings/notifications` se puede consultar sin prompt y los cinco interruptores anuncian su nombre mediante accesibilidad. La pantalla conserva los estados de carga y de provincia incompleta sin bloquear la navegación.

Validación de esta intervención: `npx vitest run packages/notifications/src/useReminders.test.ts` (7 pruebas), `npm test --workspace apps/huerto-tracker` (156 pruebas en 11 archivos), `npm run typecheck --workspace apps/huerto-tracker`, `npx expo export --platform web`, `npx expo export --platform ios` y `git diff --check`, todos correctos. Persisten solo avisos conocidos de Sentry sin configuración de organización/proyecto, `NO_COLOR`, estilos RN obsoletos y listener de push no efectivo en Web.

## Pulido visual inspirado en la referencia — 11 de septiembre de 2026

La referencia compartida prioriza aire, una ilustración protagonista, progreso reducido a puntos y un único CTA ancho. La bienvenida de Semilla adopta esas reglas sin copiar recursos externos: composición centrada, Mascot SVG existente, decoración vegetal de bajo contraste, pasos agrupados en una tarjeta ligera y CTA con forma de pastilla. El onboarding usa el mismo indicador de puntos y conserva las cuatro preguntas, la selección accesible y el botón de vuelta.

Se corrigió también la incoherencia de identidad que hacía que la app raíz usara `bwPalette` mientras la Mascot y el contenido usaban verdes. Semilla pasa a `huertoPalette`, ya existente en el paquete UI, con modo claro y oscuro automático; no se cambió la paleta de otras aplicaciones.

Validación visual en Expo Web de la rama: `/welcome` sin cuenta y transición a `/onboarding`; se comprobó la jerarquía, el único CTA principal, el progreso y el árbol accesible en modo oscuro del entorno. TypeScript, las 156 pruebas de la app y las seis traducciones con las nuevas claves pasan. Queda pendiente comprobar en Expo Go el aspecto en modo claro del dispositivo, tamaños pequeños y lector de pantalla nativo.

## Pulido visual del detalle de planta — 11 de septiembre de 2026

La pantalla `/plant/[id]` tenía dos problemas de jerarquía para una persona principiante: el estado se podía cambiar tocando directamente cualquier etapa de una lista larga, y el diario vacío no ofrecía un siguiente paso. La cabecera ahora usa una imagen contenida con bordes redondeados, la paleta `huertoPalette` y superficies coherentes con la bienvenida; el estado muestra una única tarjeta de resumen con etapa actual, siguiente etapa y «Cambiar estado».

El selector de estado se abre bajo una acción explícita, marca la opción actual con radio accesible y se cierra al guardar o cancelar. Los estados de carga y planta no encontrada tienen Mascot, texto y recuperación visibles. El diario vacío incluye una explicación breve y «Nueva entrada». Se añadieron las claves equivalentes a es, en, ca, eu, gl y val.

Validación: detalle de rábano en Expo Web oscuro, apertura/cierre del selector sin salto accidental, typecheck, 156 pruebas, export Web, export iOS y `git diff --check`. Queda pendiente revisar el detalle en Expo Go con tema claro, VoiceOver/TalkBack y datos reales sin foto.

Durante la comprobación de edición se reprodujo y corrigió un aviso de Expo Web al dejar la fecha de siembra vacía: la condición de renderizado devolvía una cadena vacía como hijo de `Pressable`. Ahora devuelve `null`, por lo que `/plant/edit` carga sin el overlay de error y conserva el borrado de fecha.

## Adaptación de referencias externas — 11 de septiembre de 2026

Las capturas de referencia se analizaron como patrones de interacción, no como recursos para replicar: progreso visible, tarjetas de selección grandes, estados marcados fáciles de reconocer, una acción primaria por pantalla, navegación por píldoras y acceso directo a añadir contenido. La adaptación queda integrada en el sistema visual y los textos de Semilla:

- El onboarding conserva las cuatro preguntas, pero presenta cada respuesta como una tarjeta de 68–76 px con icono contenido, check de selección y progreso acumulado. La opción de principiante muestra el mensaje de tranquilidad que ya existía en las traducciones.
- Home incorpora «Añadir planta» en el encabezado y mantiene la búsqueda disponible desde la primera planta; la acción sigue usando el flujo existente de alta o recomendación.
- La información de cultivo del detalle usa pestañas horizontales con forma de píldora, para que las cuatro vistas sigan siendo legibles en pantallas estrechas.

No se copiaron ilustraciones, textos, precios ni arquitectura de la app de referencia. La validación de esta pasada mantiene typecheck, 156 pruebas, exportaciones Web/iOS y `git diff --check` correctos.

## Descubrimiento estacional en Home — 11 de septiembre de 2026

La recomendación «Siembra ahora» deja de estar escondida dentro de «Más de tu huerto» cuando ya existen plantas. Se muestra después del cuidado de hoy, con el mes y la zona en el encabezado, tres cultivos priorizados para principiantes, fotografías existentes, etiqueta de dificultad y acción directa para iniciar la alta. Se reutiliza `SowNowCard`, `getSowingNow`, el catálogo y las rutas de alta actuales; no se añade una segunda fuente de recomendaciones.

## Revisión del resto de pantallas — 11 de septiembre de 2026

Se revisaron Diario, Herramientas, Ajustes, Catálogo, Calendario, alta de planta, alta de entrada, recordatorios, Asociaciones, Rotación, Medidor de luz, Estadísticas, Guía de enfermedades, diagnóstico, mapa y gestión de huertos. La jerarquía, los estados Pro y la navegación inferior mantienen un lenguaje coherente. Calendario y Catálogo son las superficies más densas; se mantienen como siguiente área de trabajo si las pruebas en móvil confirman que el contenido requiere más agrupación.

La revisión encontró además una regresión de contenido: algunos cultivos añadidos recientemente no tienen todavía una clave de traducción y mostraban `crops.<id>.name` en Asociaciones, Estadísticas, alta de planta y diagnóstico. Las pantallas ahora usan el nombre del catálogo como fallback para etiquetas, búsquedas, consejos y cultivos afectados por una enfermedad, evitando exponer claves técnicas y manteniendo el contenido legible aunque falte una traducción.

## Auditoría de usabilidad y lavado de cara — 11 de septiembre de 2026

Para comprobar que la app tiene sentido se revisan tareas completas, no pantallas aisladas. Cada tarea debe tener una acción principal evidente, explicar el dato que pide, confirmar el resultado y ofrecer una salida recuperable si algo falla:

| Tarea | Evidencia que buscamos | Estado en Web |
| --- | --- | --- |
| Entender qué hacer hoy | La portada prioriza una instrucción concreta y un siguiente paso | Verificado |
| Añadir una planta | La pantalla explica la decisión antes de abrir el catálogo y no deja un estado ambiguo | Pulido en esta pasada |
| Registrar un cuidado | La acción distingue comprobar la tierra de regar y actualiza la tarjeta al volver | Verificado |
| Decidir qué sembrar | La recomendación muestra mes, zona, dificultad y acción directa | Verificado |
| Recuperarse de un error | El formulario conserva la información y el error explica cómo reintentar | Verificado |

El lavado de cara sigue cuatro reglas: una jerarquía clara, una sola acción primaria por paso, estados visibles y textos que describen el resultado. En `plant/new`, el primer paso ahora presenta a Semillita, la pregunta «¿Qué quieres cultivar?», una explicación breve y después la selección del catálogo; el comportamiento de guardado y los límites no cambian.

La prueba Web cubre navegación, árbol accesible, estados vacíos, filtros, reintentos y recarga. Queda pendiente la comprobación física en Expo Go de tamaños pequeños, modo claro, permisos, lector de pantalla y gestos nativos.

## Acción directa desde «Hoy» — 11 de septiembre de 2026

La tarjeta de cuidado de la portada ya no obliga a abrir el detalle para completar la tarea principal. Cuando toca revisar la tierra, muestra las mismas dos decisiones explícitas que el detalle: regar si estaba seca o registrar que sigue húmeda. La tarjeta conserva un segundo botón para abrir la ficha completa y refresca la portada y la lista de plantas después de guardar, de modo que la siguiente planta pendiente aparece sin navegación adicional.

Validación en Expo Web: se registró «Sigue húmeda, hoy no riego» desde la portada y la tarjeta pasó a la siguiente planta pendiente; el botón «Ver ficha completa» siguió disponible. `npm run typecheck`, `npm test`, JSON de traducciones y `git diff --check` pasan.

## Fechas relativas coherentes — 11 de septiembre de 2026

La utilidad compartida de fechas se usaba en Diario, Detalle de planta y Copias de seguridad con textos fijos en español y sin singularización. Ahora acepta el idioma activo y usa `Intl.RelativeTimeFormat`: «hace 1 semana»/«hace 2 semanas», equivalentes en inglés, catalán, euskera, gallego y valenciano, además de fechas futuras legibles como «mañana». La corrección evita que una pantalla cambie de idioma a medias y elimina textos como «Hace 1 semanas».

Validación en Web: el Diario muestra «HACE 1 SEMANA» y «Siembra hace 1 semana» con los datos de QA. Se añadieron regresiones de español, catalán, inglés y fechas futuras; la app queda con 160 pruebas correctas.

## Accesibilidad en Catálogo y Diario — 11 de septiembre de 2026

Los filtros del Catálogo ahora anuncian que son botones y cuál está seleccionado; cada ficha anuncia si sus detalles están abiertos. La búsqueda tiene etiqueta accesible. En el Diario se etiquetaron las tarjetas editables, la búsqueda, la exportación CSV, el borrado de búsqueda y el botón flotante de nueva entrada. Esto deja las acciones principales disponibles también para navegación asistida, sin cambiar el recorrido visual.

## Prueba de Uncodixfy en navegación — 11 de septiembre de 2026

Se instaló la skill pública [Uncodixfy](https://github.com/cyxzdev/Uncodixfy) como criterio para detectar patrones genéricos de UI. La primera aplicación se hizo en la navegación inferior: se sustituyó la cápsula flotante por una barra de ancho completo con geometría más contenida, borde superior y sombra mínima. El efecto glass sigue activo en iOS, con blur o superficie sólida como fallback según la plataforma. El estado activo usa el verde de Semilla con un fondo discreto, y el modo compacto durante el scroll conserva una acción clara para recuperar la barra.

La skill se aplica como guía, no como una migración visual automática: se mantienen las formas redondeadas cuando comunican una acción táctil o un filtro, y se conserva la identidad vegetal de la app. La prueba visual en Calendario confirmó que el contenido sigue teniendo contraste y que las cuatro pestañas se pueden identificar y activar.

## Aplicación global de Uncodixfy — 11 de septiembre de 2026

El mismo criterio se extendió al resto de superficies para que el producto no cambie de lenguaje según la ruta:

- El sistema compartido pasa a una escala de radios más contenida (6/8/12/16 px). Cards, campos, hojas y botones mantienen jerarquía sin convertirse en cápsulas decorativas.
- Las pantallas de Inicio, Herramientas, Ajustes, Costes, Mapa, detalle de planta y los flujos de añadir/editar mantienen overlays de glass en iOS, con una superficie sólida de fallback y contraste estable en Web y Android.
- Las acciones primarias de Bienvenida, Chat, Coach, Compartir y estados de bloqueo usan la misma forma rectangular suave. Los radios completos se reservan para indicadores circulares, avatares y controles que comunican estado.
- Se redujo el uso de mayúsculas y letter-spacing en etiquetas de contenido para mejorar lectura y escaneo. La información funcional, la navegación y los nombres accesibles se conservaron.

Validación del lote: preview comprobado en Bienvenida, Calendario, Diario, Catálogo, Herramientas, Ajustes y el flujo de nueva planta; `npm test` (160 pruebas), typecheck de la app y del paquete compartido, y export web de Expo completados.
