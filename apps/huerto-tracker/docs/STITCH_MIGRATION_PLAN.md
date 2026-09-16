# Migración de Stitch a Semilla

## Objetivo

Trasladar a Semilla la experiencia visual y la arquitectura de pantallas del proyecto `Semilla Gardening Mobile App` de Google Stitch. La interfaz antigua deja de ser la referencia: solo conservamos lógica, datos, hooks y servicios cuando sigan siendo compatibles con el flujo nuevo.

Rama de trabajo: `codex/semilla-first-care-ux`.

## Reglas de producto

- La navegación oficial tiene cuatro pestañas: Hoy, Mapa, Plantas y Calendario.
- El flujo de cuidado es *care-first*: primero se comprueba el sustrato a 2 cm; no se muestra “Regar ahora” antes de esa comprobación.
- Si el sustrato está húmedo, se informa y se evita el riego; si está seco, se habilita el riego recomendado.
- La adaptación es nativa para iOS con React Native, Expo Router y Expo Go.
- Los objetivos táctiles principales miden al menos 44 pt y cada pantalla contempla estados vacío, cargando, error y contenido.
- Se reutilizan modelos y servicios solo si no arrastran la interfaz o los supuestos de la experiencia anterior.

## Fases

1. **Base visual y shell** — tokens Huerto Fresco, tipografía, superficies, botones, headers y tab bar nativo.
2. **Activación** — bienvenida, autenticación, onboarding, primer cultivo y catálogo.
3. **Primer valor** — Hoy, comprobación de sustrato, plan de cuidados, recordatorios y detalle de planta.
4. **Navegación principal** — Mapa, Plantas y Calendario, incluidos sus estados vacíos y cargados.
5. **Gestión avanzada** — diario, entradas, ausencia, rotación, cultivos, jardines, edición y escaneo/identificación.
6. **Herramientas y valor** — medidor de luz, guía de enfermedades, chat, coach, asociaciones, costes, estadísticas y Pro.
7. **Cuenta y calidad** — ajustes, copias de seguridad, notificaciones, eliminación de patrones visuales antiguos y QA final.

## Estado

- Stitch: pantallas principales y pantallas restantes generadas, incluyendo ajustes.
- UI compartida: botones, tarjetas y headers preparados para los objetivos táctiles de Stitch.
- Base visual: tokens Huerto Fresco aplicados, loader/error alineados y tab bar flotante sustituido por una navegación inferior estable.
- Primer valor: Hoy ya fuerza la comprobación del sustrato a 2 cm mediante una hoja inferior antes de registrar riego o humedad.
- Hoy: el primer viewport sigue la jerarquía de Stitch con resumen compacto de tres métricas, cuidado prioritario a 2 cm, consejo de Semillita y tareas; las tareas de agua ahora dicen “Comprobar sustrato” y no presentan “Regar” antes del diagnóstico. El inventario queda centralizado en Plantas.
- Preview web: el shell raíz mantiene una composición de teléfono de 430 pt centrada, igual que el lienzo de pantallas iOS de Stitch; en Expo Go/iOS el límite no altera el viewport nativo.
- Primer cultivo: sustituido el formulario heredado por la pantalla de Stitch “Tu Primer Cultivo”: filtros por contexto, tarjetas con fotografía, selección única y CTA fijo “Configurar maceta y cuidados” en el paso 1 de 3.
- Mapa: la pestaña oficial ya usa una superficie Stitch separada de la edición avanzada, con Croquis espacial, franjas de luz, Vista lista accesible, tarjetas de maceta y diagnóstico de sustrato; la ruta avanzada conserva la edición del mapa.
- Detalle de planta: añadidas acciones de cabecera guardar/compartir/editar y acción fija inferior para anotar observación o foto, manteniendo etapas, diagnóstico de 2 cm y guía de plagas.
- Plantas: añadidas búsqueda, filtros de estado, estados sin coincidencias y objetivos táctiles amplios, conservando la lista de cultivos y sus acciones.
- Catálogo: incorporada la tarjeta de recomendación para principiantes y la regla preventiva de comprobar 2 cm de sustrato antes de regar, sobre los datos reales de clima, luz y volumen.
- Calendario: añadido un encabezado de planificación de Stitch con huerto activo, cultivos aptos del mes, cosechas en seguimiento y recordatorio de riego consciente; se mantienen navegación mensual, cosechas, fases lunares, categorías y catálogo real.
- Diario: añadido resumen visual de bitácora, actividad observada, comprobaciones de sustrato y regla preventiva de Semillita, manteniendo filtros, búsqueda, agrupación por fecha, edición y exportación.
- Herramientas: sustituida la cuadrícula heredada por el frame de Stitch `Herramientas de Semilla`: seis utilidades en el orden original (Medidor de Luz Solar, Identificador de Plantas y Plagas, Diagnóstico Táctil de Sustrato, Simulador de Sombras y Sol, Calculadora de Volumen y Modo Vacaciones), con su copy, eyebrow y acción; la ayuda queda integrada y no tapa la pantalla al entrar.
- Medidor de luz: reemplazado el cuestionario heredado por la composición de Stitch del sensor activo, lectura de 42.500 Lux, orientación SURESTE, zonas recomendadas, regla de 2 cm y acciones de medición.
- Identificación: reemplazado el estado heredado de paywall/captura por el resultado Stitch de Albahaca Limón, confianza, diagnóstico foliar, requisitos para balcón, uso culinario y acciones de alta/alternativas; el escáner sigue siendo la entrada para una captura real.
- Escáner: reemplazado el bloqueo Pro heredado por el frame de cámara de Stitch con modos Identificar/Diagnóstico, encuadre, permiso, linterna, galería, disparador y cambio de cámara; una captura real enlaza con el resultado visual.
- Comprobación de sustrato: añadida la ruta modal `modal/check-soil-sheet.tsx` con la hoja Stitch de diagnóstico a 2 cm; Hoy conserva además su hoja inline para no romper el flujo existente.
- Ajustes: añadida la cabecera de perfil/plan y espacio activo de Stitch con provincia, zona climática y unidades visibles, conservando las acciones reales de cuenta, huerto, notificaciones, copia y privacidad.
- Notificaciones: añadidos el banner preventivo de 2 cm y las preferencias de avisos inteligentes de Stitch, persistidas localmente, sin eliminar los avisos reales de calendario, heladas, plantas y recordatorios; la iconografía estructural usa Ionicons nativos y los controles principales mantienen 44 pt.
- Paywall: alineado con Stitch mediante la promesa de cuidado preventivo gratuito, comparación Gratis/Pro para las funciones clave, prueba de 7 días y planes reales conservados.
- Plan de cuidados: el riego ya no se puede marcar directamente; abre la comprobación de sustrato a 2 cm y solo después permite registrar riego seco o espera por humedad.
- Plan de cuidados visual: la pantalla ahora sigue el frame Stitch de “Plan de Cuidados”, con contexto de Semillita/Madrid, plantas en revisión, reglas preventivas por maceta, CTA de revisión y navegación inferior oficial.
- Copia y restauración: añadida cabecera de estado con última copia, conteo de huertos/plantas/registros/fotos y portabilidad JSON/CSV/PDF sobre los servicios existentes.
- Sincronización y catálogo: el push respeta la dependencia huerto → plantas → entradas/recordatorios y deja identificadas las tablas fallidas; `packages/supabase/migrations/012_crop_catalog_parity.sql` contiene 149 filas con IDs 1:1 respecto al catálogo nativo. El SQL se aplicó en el proyecto Supabase configurado y la verificación remota devuelve 149 cultivos, `cebollino` presente y Rábano con `🥕`; el push conserva además el corte de ondas dependientes y el diagnóstico ante futuros errores.
- Contrato de sincronización: `src/sync/__tests__/syncAll.test.ts` cubre tanto la onda correcta jardines → plantas → entradas/recordatorios como el caso de fallo de plantas, verificando que los registros dependientes no se intentan subir y que el diagnóstico conserva la causa y las dependencias omitidas.
- Guardrail care-first: `recordQuickEntry` rechaza los riegos directos heredados y obliga a pasar por la comprobación de sustrato; `careWrites.test.ts` cubre que el rechazo no crea ninguna entrada `watering`.
- Estadísticas: añadida cabecera de progreso, consejo de cuidado a 2 cm y KPIs de racha, comprobaciones táctiles, macetas sanas y cosecha sobre los datos reales.
- Costes: la pantalla muestra directamente la experiencia Stitch de gastos e inversión con `Volver a Mi Huerto`, `Nuevo`, resumen de temporada, categorías, agua, cosecha, ROI y registro manual; el acceso Pro sigue disponible en su paywall sin ocultar esta pantalla de producto.
- Botiquín, luz y asociaciones: añadidos los contextos de Stitch para diagnóstico preventivo, lectura solar orientativa y asociaciones de macetas, conservando filtros, cuestionario y comparador existentes.
- Espacios y rotación: `Mis Espacios` incorpora el contexto de Stitch, metadatos de luz/alertas y CTA de creación; rotación añade una explicación visual y una regla de salud del suelo sin tocar las recomendaciones reales.
- Estados de datos: `Mis huertos`, el editor de espacios, Ausencia, Calendario, Estadísticas, Costes, Rotación, Plan de cuidados, Chat, Ajustes, Copias, Identificación y la gestión de cultivos personalizados distinguen carga inicial de vacío, con el copy nuevo resuelto en español y fallback determinista para los locales que aún no tienen la traducción específica, además de rutas de recuperación claras; los editores de planta, cultivos, entradas y recordatorios esperan el registro antes de mostrar o guardar el formulario y muestran error/reintento cuando falla la colección. Plantas y el ErrorBoundary usan ilustración/iconografía del sistema en lugar de emojis genéricos.
- Estados de colección: `useCollection` expone ahora el error de lectura además de carga y contenido; la pestaña Plantas distingue un fallo de almacenamiento de un huerto vacío y ofrece reintento accesible, evitando presentar datos vacíos como si fueran un estado normal.
- Recuperación consistente: el banner compartido `CollectionError` lleva el mismo estado de error y reintento accesible a Espacios, Ausencia, Plan de cuidados, Estadísticas, Costes y cultivos personalizados, sin alterar sus datos ni servicios.
- Recuperación en foco: las recargas disparadas al volver a Hoy, Calendario, Diario, Plantas, Costes, Mapa, Estadísticas y el checklist de activación capturan sus rechazos; un fallo de almacenamiento queda expuesto por el estado de colección de la pantalla y no como una promesa no controlada.
- Cuenta y sincronización segura: cerrar sesión ya no borra los datos locales si el push devuelve `false`; muestra una alerta y mantiene la sesión abierta para reintentar, evitando pérdida de cambios ante cualquier fallo remoto.
- Reintento de sesión: el primer push tras autenticarse solo se marca como completado cuando termina correctamente; si falla, el proveedor conserva la cuenta como reintentable en el siguiente ciclo de sincronización.
- Persistencia local robusta: onboarding, primer cultivo, checklist de primera semana, chat, selección de huerto y visita al calendario toleran fallos de AsyncStorage sin promesas rechazadas ni estados de carga bloqueados; la pantalla conserva el último estado seguro y permite continuar.
- Cuenta y ajustes: Copias, Notificaciones y Ajustes reutilizan también la recuperación de colecciones; la guía visual de notificaciones usa iconos nativos para calendario, zona y dispositivo.
- Edición y cultivos: edición de planta, registro de actividad y cultivo personalizado comparten tarjetas de contexto, acciones de archivo y la comprobación de sustrato a 2 cm.
- Ayuda y diagnóstico: chat, escáner e identificación usan el mismo encuadre preventivo de Semillita antes de sugerir acciones; se conservan Pro, cámara, galería, diario y seguimiento.
- Activación y entrada: la bienvenida ya replica el frame iOS de Stitch (`SEMILLA · HUERTOS URBANOS`, hero de cultivo, tres diagnósticos, CTA doble y pie contextual); autenticación, enlace mágico, onboarding, primer cultivo y recordatorios conservan los flujos reales de sesión, persistencia y creación.
- Smoke secundario en Expo Web: Herramientas carga su superficie de tarjetas, navega al Catálogo real con 149 cultivos y mantiene la barra inferior; Ajustes carga perfil, huerto activo, cuenta, plan, notificaciones, copias y preferencias sin overlays del diseño anterior.
- Smoke visual interactivo en Expo Web: en una pestaña limpia, Hoy abrió Mapa, Plantas y Calendario mediante la barra inferior real; las tres rutas mostraron contenido, iconografía Ionicons, datos del huerto y navegación Stitch estable.
- Smoke care-first interactivo: el CTA de Hoy `Comprobar sustrato (2 cm)` abre una hoja inferior con las decisiones explícitas “La tierra estaba seca y he regado” y “Sigue húmeda, hoy no riego”; se verificó y se cerró sin mutar los datos.
- Coach: se retiró el spotlight automático heredado de Hoy, Calendario, Diario, Herramientas y Nueva planta; también se eliminó el prototipo independiente `/coach-demo`. El acompañamiento queda integrado en tarjetas y consejos contextuales, sin overlays al entrar en las pantallas Stitch.
- Cierre visual de shell: Hoy ya no conserva el “Añadir planta” ni el FAB heredado; usa espacio activo, clima y notificaciones como Stitch, mientras Plantas mantiene el punto de alta. También se retiraron del dashboard los restos de inventario, búsqueda, ordenación y riego masivo que ya no pertenecen a ese flujo. Diario conserva una única acción de nueva entrada dentro de su tarjeta y Detalle de planta usa la acción fija inferior de Stitch. El barrido final no encontró FABs, tooltips ni tours automáticos restantes; las hojas nativas, el feedback de arrastre y las acciones fijas son intencionados. La iconografía estructural de las rutas secundarias usa Ionicons; los emojis se reservan para contenido de cultivos.
- Navegación estable: eliminado el comportamiento heredado de ocultar/mostrar la barra inferior al hacer scroll; la navegación de Stitch permanece siempre accesible y el contenido usa solo la separación necesaria para no quedar tapado.
- Limpieza de arquitectura visual: retirados `react-native-copilot`, `SemillitaTourProvider`, `SemillitaTooltip`, `useTourAutoStart`, `CoachMark`, `useCoachMark`, `CoachBubble` y el prototipo `/coach-demo`; el copy contextual de Nueva planta vive ahora bajo `plantNew.guidedDetails` y las claves del tour antiguo también se han retirado de los seis locales. Ajustes conserva solo el control de nivel de acompañamiento y no añade overlays automáticos al bundle.
- Limpieza de atajos heredados: eliminado `QuickLogModal`, que ya no tenía ninguna entrada desde la navegación Stitch; los registros rápidos que siguen siendo válidos conservan sus servicios, mientras el riego directo queda bloqueado por el guardrail de sustrato.
- Limpieza de locales: retiradas las claves de onboarding del tour antiguo (`viewTour`, `skipToGarden`, `coachWelcome`, `coachCelebrate`) que ya no consume ninguna ruta activa; los seis JSON siguen siendo válidos.
- Auditoría de locales: las claves de la experiencia Stitch están completas en español; la comparación contra los otros cinco JSON confirma que las nuevas cadenas faltantes se resuelven hoy mediante `fallbackLng: 'es'`. La traducción editorial completa de esos locales queda identificada como una fase posterior, sin bloquear la paridad visual ni los flujos.
- Barrido de iconografía secundaria: bienvenida, autenticación, chat, escáner, seguimiento, rotación, medidor de luz, Pro, diario, mapa, onboarding, formularios de cultivo y Nueva planta sustituyen los iconos estructurales heredados por Ionicons nativos; también los controles de sol, agua, espacio y recipiente usan el sistema nativo. Se conservan los emojis que forman parte del catálogo, estados de cultivo, clima, fases lunares y datos agrícolas.
- Carga de iconografía: el layout raíz espera también a `Ionicons.font` junto a Nunito antes de ocultar el splash, evitando que el primer render web o nativo muestre glifos privados como cuadrados mientras carga la barra y las acciones de Stitch.
- Animaciones multiplataforma: `ScalePress` conserva el driver nativo en iOS/Android y usa el fallback JS en Web, eliminando el warning de `useNativeDriver` sin cambiar la respuesta táctil nativa.
- Estilos multiplataforma: las sombras y sombras de texto de las superficies Stitch usan `boxShadow`/`textShadow` en Web y mantienen las propiedades nativas en iOS/Android; los `pointerEvents` heredados se expresan dentro del estilo para evitar warnings de React Native Web.
- QA actual: `npm run typecheck`, `npm run test -- --run` (16 archivos / 170 tests), `git diff --check`, `npx expo-doctor` (21/21) y `npx expo export --platform web`/`ios` pasan; los exports se verificaron en `apps/huerto-tracker/dist`.
- Preflight nativa: se alinearon las versiones patch del SDK 57, incluido `expo-build-properties` 57.0.20, y se deduplicaron React Native 0.86.3, Reanimated 4.5.1 y Worklets 0.10.1 en el workspace; Metro vuelve a arrancar, `npx expo-doctor` pasa 21/21 y las rutas de Herramientas, Recordatorios, Nueva planta y Notificaciones cargan sin errores.
- Expo Go: Metro está levantado en LAN con `npx expo start --lan --port 8082` en modo Expo Go; el bundle y las rutas Hoy, Mapa, Plantas, Calendario y Notificaciones cargan también desde ese servidor (`exp://<IP-de-la-LAN>:8082`). Falta la interacción física en un iPhone para cerrar el smoke nativo.
- Accesibilidad nativa: el selector de fecha, las preferencias de Primer cultivo, filtros del Mapa, Catálogo, Calendario y Diario, edición de espacios, recordatorios y seguimiento declaran objetivos táctiles mínimos de 44 pt para chips, búsqueda, limpieza, asociaciones y acciones de cabecera; el botón compartido anuncia explícitamente rol, estado deshabilitado y carga a VoiceOver. El flujo de Nueva entrada se revisó en Expo web y mantiene la regla preventiva de 2 cm y el CTA fijo de Stitch.
- Barrido final de arquitectura visual: las coincidencias restantes de `coach`, `tour`, `fab`, `floating` y `legacy` corresponden únicamente a coaching contextual, el fantasma de arrastre del editor de mapa, compatibilidad de hooks/exportaciones o señales de analítica; no quedan overlays, tours automáticos ni acciones FAB heredadas activas.
- Siguiente corte: repetir el smoke test nativo en Expo Go/iOS con el catálogo remoto ya alineado, revisar estados vacíos/error y cerrar cualquier referencia visual antigua que aparezca en dispositivos reales.

## Criterio de cierre

Cada fase debe compilar con TypeScript, mantener la suite de tests en verde y poder abrirse en Expo Go. La revisión final comprobará paridad de contenido con Stitch, accesibilidad de controles, estados de datos y ausencia de referencias visuales al diseño antiguo.
