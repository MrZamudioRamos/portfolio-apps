# Semilla — Documento funcional MVP

**Versión:** 1.0  
**Producto:** Semilla / `apps/huerto-tracker`  
**Objetivo del documento:** servir como fuente de verdad para diseño, implementación con OpenCode, QA y medición del MVP.  
**Audiencia:** personas que nunca han cultivado o que quieren empezar un pequeño huerto en balcón, terraza, patio o huerto urbano, con foco inicial en España.

---

## 1. Resumen ejecutivo

Semilla no debe posicionarse como un catálogo de plantas ni como otro planificador complejo de huertos. Debe ser un **coach de huerto para principiantes**: pregunta muy poco, recomienda qué cultivar según el contexto real de la persona y transforma el cultivo en una única acción clara cada día.

### Propuesta de valor

> **Empieza tu huerto sin tener ni idea. Semilla te dice qué plantar y te guía cada día hasta tu primera cosecha.**

### Problema que resolvemos

Quien quiere empezar a cultivar suele bloquearse antes de empezar:

- No sabe qué puede cultivar en su espacio, temporada o clima.
- No sabe cuánta luz tiene ni qué importancia tiene.
- No sabe cuándo sembrar, trasplantar, regar o cosechar.
- Se abruma con calendarios, tablas, catálogos, planos o consejos contradictorios.
- Tiene miedo de gastar dinero, matar las plantas y abandonar.

### Resultado prometido

En menos de 3 minutos, una persona debe:

1. Entender qué cultivo fácil puede empezar ahora.
2. Tener creada su primera planta o plan de cultivo.
3. Saber cuál es su siguiente acción.
4. Sentir que Semillita la acompañará en el proceso.

---

## 2. Decisión estratégica

### Usuario inicial prioritario

**Principiante urbano en España**, con balcón, terraza, patio o pocas macetas. Quiere cultivar alimentos o aromáticas, pero necesita acompañamiento y no un software profesional.

### No somos inicialmente

- Una herramienta de diseño 2D/3D para horticultores experimentados.
- Una enciclopedia completa de botánica.
- Una app cuya promesa principal sea identificar plantas mediante IA.
- Una app que dependa de notificaciones agresivas o de un paywall antes del primer resultado.

### Diferenciador defendible

La combinación de:

- Recomendación contextual por ubicación/clima, espacio, luz y experiencia.
- Lenguaje de principiante y acciones simples.
- Home proactiva de “Hoy en tu huerto”.
- Semillita como coach emocional y funcional, no mero adorno.
- Adaptación al mercado español y localización disponible en español y lenguas cooficiales.

---

## 3. Principios de producto

1. **Una pantalla, una decisión.** No ofrecer listas gigantes cuando el usuario aún no sabe qué hacer.
2. **Una acción principal al día.** La home prioriza; no actúa como un dashboard técnico.
3. **Explicar sin jerga.** Cada consejo responde: qué ocurre, por qué importa y qué hacer ahora.
4. **Orientar, no mandar.** Especialmente en riego: “comprueba la tierra” antes que “riega obligatoriamente”.
5. **Confiabilidad antes que IA.** La IA debe expresar incertidumbre, mostrar señales observables y permitir corrección.
6. **El valor antes del pago.** El usuario debe conseguir una primera victoria gratuita antes de ver una oferta de Pro.
7. **Complejidad progresiva.** Mapa, rotaciones, ROI, estadísticas, asociaciones y diagnósticos aparecen cuando ya son útiles.

---

## 4. Alcance del MVP

### Objetivo del MVP

Maximizar activación de principiantes:

> Usuario nuevo → recomendación contextual → primera planta creada → primer cuidado completado → regreso al día siguiente.

### Incluido

- Onboarding de 4 pantallas.
- Motor de recomendación inicial determinista basado en datos existentes de cultivos.
- Pantalla de recomendación con 3 opciones máximas.
- Creación guiada de primera planta con valores por defecto seguros.
- Home “Hoy en tu huerto”.
- Semillita animada y contextual.
- Checklist de activación.
- Tour corto y no repetible.
- Analítica de activación y conversión.
- Paywall contextual, nunca al inicio.

### Fuera de alcance de esta fase

- Rehacer el mapa avanzado.
- Rehacer calendario, diario, companions, costes, estadísticas o diagnóstico IA.
- Añadir chat IA como núcleo del onboarding.
- Comunidad/social feed.
- Automatización basada en sensores.
- Grandes ampliaciones del catálogo de cultivos.

---

## 5. Inventario reutilizable

Antes de crear nada nuevo, OpenCode debe inspeccionar y reutilizar estas piezas existentes en `apps/huerto-tracker`:

| Necesidad | Piezas existentes a inspeccionar/reutilizar |
|---|---|
| Mascota y tono | `src/components/Mascot.tsx`, `CoachBubble.tsx`, `CoachHeader.tsx`, `SemillitaTooltip.tsx` |
| Tours y spotlights | `CoachMark.tsx`, `SemillitaTourProvider.tsx`, `useCoachMark.ts`, `useTourAutoStart.ts`, `useCoachingLevel.ts` |
| Activación | `ActivationChecklist.tsx`, `useActivationChecklist.ts` |
| Éxito y tacto | `SuccessBurst.tsx`, `ScalePress.tsx` |
| Perfil | `useUserProfile` y modelo/almacenamiento asociado |
| Cultivos | `src/data/crops.ts`, `zones.ts`, `containers.ts`, `seasonalTips.ts`, `indoorStart.ts`, `varieties.ts` |
| Huerto y plantas | modelos `Garden`, `Plant`, `useActiveGarden`, creación existente en `app/plant/new.tsx` |
| Recordatorios | `usePlantNotifications.ts`, pantallas de reminders y notificaciones |
| Analítica | `src/analytics/index.ts` |
| Internacionalización | configuración y JSON/recursos i18n existentes |
| Monetización | `usePro.ts`, `app/paywall.tsx`, gates existentes |

**Regla de implementación:** leer los archivos antes de cambiar código. No reconstruir funcionalidades que ya existan.

---

## 6. Onboarding de 4 pantallas

### Reglas globales

- Una pregunta por pantalla.
- Barra de progreso discreta: 1/4, 2/4, 3/4, 4/4.
- Selección por tarjetas grandes; sin teclado salvo provincia/búsqueda si se usa.
- Autoguardado al seleccionar; botón inferior “Continuar”.
- Botón “Atrás” desde la pantalla 2.
- Opción de ubicación manual y opción de omitir la detección de ubicación.
- No pedir registro obligatorio antes de entregar la recomendación; pedir cuenta solo si es necesaria para sincronización después de la primera victoria.
- Semillita visible en todas las pantallas, con una pose útil y texto corto.

### Pantalla 0 — Welcome

**Objetivo:** promesa de resultado, no lista de funcionalidades.

| Elemento | Contenido |
|---|---|
| Pose | `wave`, animada |
| Título | “Tu primer cultivo empieza hoy” |
| Subtítulo | “Dime dónde vas a cultivar y te recomendaré una planta fácil para empezar.” |
| CTA primaria | “Empezar mi huerto” |
| CTA secundaria | “Ya tengo cuenta” |
| Pie | “No necesitas saber nada de plantas.” |

**Texto Semillita:**

> “¡Hola! Soy Semillita. En menos de 3 minutos tendremos tu primer cultivo preparado.”

### Pantalla 1 — Espacio

**Pregunta:** “¿Dónde vas a cultivar?”

**Ayuda:** “Así elegiré plantas que de verdad quepan y puedan crecer bien.”

| Opción | Icono sugerido | Valor de perfil |
|---|---:|---|
| Balcón | 🪟 | `balcony` |
| Terraza | ☀️ | `terrace` |
| Patio o jardín | 🌿 | `patio` |
| Huerto o bancal | 🪴 | `garden` |
| Interior junto a ventana | 🏠 | `indoor` |

**Texto Semillita:**

> “Perfecto. No hace falta tener un jardín grande: una buena maceta puede ser un gran comienzo.”

### Pantalla 2 — Luz

**Pregunta:** “¿Cuánta luz directa recibe tu espacio?”

**Ayuda:** “Mira cuántas horas entra sol directo, no solo claridad.”

| Opción | Valor | Descripción |
|---|---|---|
| Mucha luz | `full_sun` | “6 horas o más al día” |
| Luz media | `partial_sun` | “Entre 3 y 6 horas” |
| Poca luz | `shade` | “Menos de 3 horas” |
| No estoy seguro/a | `unknown` | “Te recomendaré opciones más seguras” |

**Texto Semillita:**

> “La luz es una pista importante. Con ella puedo evitarte elegir una planta que lo tendrá difícil desde el principio.”

### Pantalla 3 — Experiencia

**Pregunta:** “¿Qué experiencia tienes cultivando?”

**Ayuda:** “No hay respuestas malas; usaré esto para adaptar los consejos.”

| Opción | Valor | Descripción |
|---|---|---|
| Nunca he cultivado | `beginner` | “Quiero que me guíes paso a paso” |
| He probado alguna vez | `some_experience` | “Necesito orden y recordatorios” |
| Ya tengo experiencia | `experienced` | “Quiero planificar mejor” |

**Texto Semillita para `beginner`:**

> “Genial. Empezaremos pequeño y fácil: yo me encargo de recordarte lo importante.”

**Texto Semillita para otros niveles:**

> “Perfecto. Ajustaré la cantidad de ayuda para no darte información de más.”

### Pantalla 4 — Zona / clima

**Pregunta:** “¿Dónde está tu huerto?”

**Ayuda:** “El clima cambia cuándo conviene sembrar y qué planta tendrá más opciones de salir bien.”

| Elemento | Comportamiento |
|---|---|
| CTA principal | “Usar mi ubicación” — solicitar permiso solo aquí |
| Alternativa | Campo de búsqueda: ciudad o provincia |
| Omitir | “Lo indicaré después” — usar zona conservadora y marcar perfil como incompleto |

**Texto Semillita:**

> “Con tu zona puedo decirte qué tiene sentido plantar ahora, no solo lo que se ve bonito en una foto.”

### Evento final del onboarding

Al pulsar “Ver mis recomendaciones”:

- Guardar perfil.
- Registrar `onboarding_completed` con: `space`, `sunlight`, `experience`, `location_method`, `climate_zone_known`.
- Navegar a `/first-crop` o ruta equivalente de recomendación.

---

## 7. Recomendación de primer cultivo

### Objetivo

Convertir los datos de onboarding en una decisión que el usuario pueda tomar inmediatamente. No abrir el catálogo general.

### Regla de salida

Mostrar máximo **3 cultivos**, ordenados por `matchScore`.

### Reglas iniciales de elegibilidad

Usar las fuentes existentes de `crops`, `containers`, `zones` y calendario. Implementar un motor simple y explicable; no usar IA generativa para la selección base.

Puntuación sugerida:

| Señal | Peso | Nota |
|---|---:|---|
| Apto para luz declarada | +35 | Penalizar fuerte incompatibilidades claras |
| Apto para contenedor/espacio | +25 | Prioridad para balcón/interior/terraza |
| En ventana de siembra/trasplante actual | +20 | Según zona/clima disponible |
| Dificultad baja | +15 | Priorizar principiantes |
| Cosecha o resultado temprano | +10 | Refuerza primera victoria |
| Requiere infraestructura compleja | -25 | Evitar tutorado, bancal grande o macetón si no encaja |
| Requiere sol no disponible | -100 | Excluir salvo que no haya alternativas |

### Primeras opciones por contexto

La app debe derivarlo de datos, pero estas guías sirven como control de UX:

| Contexto | Sugerencias típicas |
|---|---|
| Balcón con poca luz | Perejil, menta controlada, lechuga, rúcula, acelga según temporada |
| Balcón con luz media | Albahaca, lechuga, rabanito, rúcula, fresas si procede |
| Terraza con mucho sol | Tomate cherry en maceta adecuada, albahaca, pimiento, judías, rabanito según temporada |
| Interior con ventana | Aromáticas y hoja tolerante, con expectativas realistas |
| Patio / huerto | Cultivo fácil de temporada, con rotación y espacio simplificados |

**Importante:** no prometer resultados contraindicados por la temporada. Si no hay un cultivo adecuado para sembrar hoy, mostrar “prepara / planta un plantel” en lugar de “siembra”.

### Diseño de card

Cada cultivo muestra:

- Foto o ilustración.
- Nombre local.
- Badge: “Ideal para ti”, “Fácil” o “Rápido”.
- Razón personalizada en una frase.
- Dificultad visual de 1–5.
- Tiempo aproximado a primer resultado o cosecha, si hay dato fiable.
- Requisito de maceta claro si aplica: “Necesita una maceta de al menos X L”.
- CTA: **“Quiero cultivar esto”**.
- CTA secundaria: “Ver otra opción”.

### Copy de Semillita

> “He elegido opciones que encajan con tu espacio y la luz que tienes. Para empezar sin complicarte, yo elegiría esta.”

### Primera opción recomendada

La primera card debe tener etiqueta “Mi recomendación” y CTA reforzada.

---

## 8. Creación guiada de primera planta

### Principio

Nunca llevar al principiante a un formulario vacío ni a un mapa vacío.

### Flujo

1. Usuario elige cultivo.
2. Pantalla “Preparemos tu primera planta”.
3. Semilla rellena valores por defecto, visibles y editables.
4. Usuario confirma con un único CTA.
5. Se crea una planta y, si hace falta, un huerto/contenedor inicial.
6. Se muestra éxito y siguiente acción.

### Valores por defecto

| Campo | Comportamiento |
|---|---|
| Nombre | Nombre del cultivo; editable |
| Fecha | Hoy por defecto |
| Método | Semilla o plantel según recomendación de temporada |
| Ubicación | Espacio del perfil |
| Huerto | Crear “Mi primer huerto” si no existe |
| Contenedor | Sugerir tamaño mínimo y tipo; no obligar a dibujar mapa |
| Recordatorios | Proponer una revisión inicial; consentimiento explícito antes de notificaciones |
| Mapa | Opcional después de crear la planta |

### Copy

**Título:** “Tu [cultivo] ya tiene un plan”

**Resumen ejemplo:**

> “Te avisaré cuándo conviene revisarlo, regarlo o cambiar de fase. Siempre podrás ajustar el plan.”

**CTA:** “Crear mi primera planta”

### Éxito

- `SuccessBurst`.
- Mascota `celebrate`/`proud` durante 1–1,5 s.
- Haptic success si ya hay infraestructura.
- Registrar `plant_added`, `first_crop_picked` y `first_plant_created` si el evento aún no existe.

**Copy de éxito:**

> “¡Ya está! Tu primer cultivo está en marcha. El siguiente paso es muy sencillo.”

CTA: **“Ver mi plan de hoy”**.

---

## 9. Home “Hoy en tu huerto”

### Objetivo

Al abrir Semilla, una persona debe poder responder en menos de cinco segundos:

> “¿Qué debo hacer ahora?”

### Estado sin plantas

| Elemento | Contenido |
|---|---|
| Semillita | Pose `wave` o `point` |
| Título | “Tu huerto empieza con una planta” |
| Descripción | “Te recomendaré una opción fácil según tu espacio y la temporada.” |
| CTA | “Elegir mi primera planta” |

### Estado con planta nueva

Orden de bloques:

1. **Card principal: Hoy en tu huerto**
2. Mis plantas activas (máximo 3)
3. Siguiente paso / checklist
4. Acceso secundario a calendario, diario y mapa

### Card “Hoy en tu huerto”

| Situación | Mensaje | Acción primaria |
|---|---|---|
| Revisión de riego | “Comprueba la tierra de tu tomate” | “Ver cómo comprobarlo” / “Hecho” |
| Siembra | “Hoy es buen día para sembrar rúcula” | “Empezar” |
| Trasplante | “Tu albahaca necesita más espacio” | “Ver pasos” |
| Cosecha | “Tu rabanito puede estar listo para cosechar” | “Cómo comprobarlo” |
| Sin urgencias | “Tu huerto va bien hoy” | “Ver próximos pasos” |
| Riesgo meteorológico | “Esta noche puede hacer frío: protege tus plantas” | “Ver cómo hacerlo” |

### Regla de priorización

1. Riesgo (helada, calor extremo si está implementado).
2. Acción atrasada importante.
3. Acción de fase actual de planta.
4. Próximo hito de onboarding/activación.
5. Mensaje de tranquilidad.

No mostrar más de una acción “urgente” en la cabecera. Si hay más, agrupar bajo “También hoy”.

### Estado de planta simple

No usar métricas técnicas en la home de novato. Estados:

- `OK`: “Va bien”.
- `CHECK`: “Necesita una revisión”.
- `READY`: “Puede estar lista”.
- `RISK`: “Necesita atención”.

Mantener health dots existentes si ya existen, pero acompañarlos con texto.

---

## 10. Semillita: rol y copy

### Rol funcional

Semillita guía acciones, reduce ansiedad y celebra avances. No debe aparecer para narrar cada interfaz ni bloquear tareas sencillas.

### Presencia

| Momento | Pose sugerida | Mensaje máximo |
|---|---|---|
| Bienvenida | `wave` | Una promesa clara |
| Recomendación | `think` / `point` | Por qué encaja la sugerencia |
| Éxito | `celebrate` / `proud` | Celebrar y señalar el siguiente paso |
| Riesgo | `worried` | Explicar el riesgo y una acción |
| Sin tareas | `idle` / `sleep` | Tranquilizar sin crear trabajo artificial |

### Reglas de tono

- Tuteo en español de España, lenguaje inclusivo no forzado.
- Una o dos frases como máximo.
- Nunca culpa: no “has olvidado regar”; sí “parece que esta planta necesita una revisión”.
- Nunca certeza fingida en diagnósticos.
- Cerrar con una acción concreta cuando haya una tarea.

### Ejemplos

- “La tierra se seca antes en maceta. Toca comprobar los primeros 2 cm; si están secos, riega.”
- “Buena elección: esta planta tolera bien los primeros errores.”
- “No hay nada urgente. Mañana revisaré de nuevo tu plan.”
- “Veo señales que podrían ser pulgón. Mira el reverso de las hojas antes de tratarla.”

---

## 11. Tours y spotlights

### Regla general

Los tours enseñan solo controles que impiden avanzar. No son una visita guiada de toda la aplicación.

### Tour posterior a primera planta

Máximo 3 pasos, solo una vez.

| Paso | Objetivo | Copy |
|---:|---|---|
| 1 | Card “Hoy” | “Aquí encontrarás lo único importante para tu huerto hoy.” |
| 2 | Acción de registro rápido / QuickLog | “Cuando termines una tarea, márcala aquí. Así adapto tu plan.” |
| 3 | Planta activa | “Toca una planta para ver sus cuidados, calendario y progreso.” |

### Reglas técnicas

- Reutilizar `SemillitaTourProvider`, `CoachMark`, `useCoachMark` y `useTourAutoStart`.
- Persistir finalización por tour y no relanzar automáticamente.
- Respetar `useCoachingLevel`; en `full`, activar; en `light`, ofrecer manualmente; en `off`, no activar.
- Nunca más de 4 pasos en ningún tour.

---

## 12. Monetización

### Política

El primer éxito debe ser gratuito. No mostrar paywall durante el onboarding ni antes de crear la primera planta.

### Gratis

- Onboarding y primera recomendación.
- Primera planta o número razonable de plantas activas.
- Plan básico y acciones esenciales.
- Recordatorios básicos con consentimiento.
- Calendario base.
- Diario básico.

### Pro

Vender continuidad, personalización avanzada y tranquilidad, no un bloqueo arbitrario de lo básico.

| Valor Pro | Momento de mostrarlo |
|---|---|
| Más plantas y huertos | Al añadir plantas adicionales o crear otro huerto |
| Plan estacional completo | Cuando el usuario quiera planificar los próximos meses |
| Alertas climáticas y plan avanzado | Tras obtener valor de una alerta/recomendación básica |
| Diagnóstico por foto y plan de recuperación | Al entrar en identificación/enfermedades |
| Asociaciones completas, rotación y mapa avanzado | Al planificar más de un cultivo |
| Galería, análisis, exportación y costes | Cuando ya haya historial suficiente |
| Sincronización / backups avanzados | En contexto de dispositivo/cuenta |

### Triggers permitidos

- Usuario ha creado primera planta **y** ha completado al menos un cuidado.
- Día 3 de uso si ha abierto la app en al menos dos días.
- Usuario intenta una funcionalidad Pro explícita.

### Triggers prohibidos

- Primer minuto de uso.
- Antes de recomendación inicial.
- Tras permitir una notificación.
- Cada vez que el usuario cierre el paywall.

### Copy de paywall

**Título:** “Semillita Pro cuida tu huerto contigo”

**Subtítulo:** “Recibe un plan más completo, alertas útiles y ayuda para que tus plantas lleguen a cosecha.”

Mantener precios y trial ya configurados en la app; no introducir precios hardcoded nuevos en esta fase.

---

## 13. IA: política de confianza

### Usos recomendados

- Diagnóstico fotográfico con advertencias y señales a confirmar.
- Chat contextual que conoce plantas, fecha, clima y acciones ya registradas.
- Explicación de recomendaciones basadas en reglas/datos.
- Generación de recetas o resúmenes postcosecha, si ya existe infraestructura.

### Usos no recomendados como fuente única

- Determinar toxicidad o comestibilidad de una planta.
- Indicar tratamientos químicos sin contexto ni comprobaciones.
- Inventar compatibilidades, calendarios o recomendaciones locales.

### Requisito de UX para diagnósticos

Cada resultado debe incluir:

1. Nivel de confianza o lenguaje equivalente (“podría ser”).
2. 2–3 señales que el usuario puede comprobar.
3. Acción de bajo riesgo inicial.
4. Opción “No coincide / Necesito otra ayuda”.
5. Aviso de prudencia cuando aplique.

---

## 14. Eventos y métricas

Reutilizar `src/analytics/index.ts`. Mantener los eventos existentes y añadir solo los necesarios.

### Eventos mínimos

| Evento | Propiedades |
|---|---|
| `onboarding_step_viewed` | `step`, `source` |
| `onboarding_step_completed` | `step`, `answer` |
| `onboarding_completed` | `space`, `sunlight`, `experience`, `location_method`, `climate_zone_known` |
| `first_crop_recommendations_shown` | `count`, `top_crop_id`, `context_complete` |
| `first_crop_picked` | `crop_id`, `rank`, `match_score` |
| `first_plant_created` | `crop_id`, `source: onboarding`, `space`, `sunlight` |
| `today_action_shown` | `action_type`, `plant_id?`, `priority` |
| `today_action_completed` | `action_type`, `plant_id?`, `days_since_onboarding` |
| `tour_completed` | `tour_id`, `steps_seen` |
| `notification_consent_answered` | `answer`, `context` |
| `paywall_viewed` | `trigger`, `days_since_onboarding`, `plants_count`, `actions_completed` |
| `purchase_completed` | `plan`, `trigger` |

### Métricas de éxito

| Métrica | Definición | Objetivo inicial |
|---|---|---:|
| Onboarding completion | Completan las 4 respuestas / inician onboarding | ≥ 70% |
| Recomendación → elección | Eligen un cultivo / ven recomendaciones | ≥ 55% |
| Elección → primera planta | Crean planta / eligen cultivo | ≥ 70% |
| Activación | Primera planta + primer cuidado en 72 h | ≥ 35% |
| D1 retention | Vuelven al día siguiente / instalaciones | ≥ 30% |
| D7 retention | Vuelven entre día 5–8 / instalaciones | ≥ 15% |
| Consentimiento notificaciones | Aceptan tras percibir valor | ≥ 35% |
| Paywall premature rate | Paywall antes de primera planta | 0% |
| Conversión inicial | Compra / usuarios activados | Medir; no optimizar antes de retención |

Estos objetivos son hipótesis de producto, no benchmarks universales. El primer objetivo es aprender dónde cae el flujo.

---

## 15. Validación de mercado en 14 días

### Restricción conocida

No se puede realizar una encuesta humana real sin participantes, distribución y consentimiento. La investigación pública y los hilos existentes sirven para formular hipótesis, pero no reemplazan respuestas de personas que prueben el flujo.

Por tanto, el plan combina:

1. Investigación secundaria ya realizada.
2. Test de concepto público de bajo coste.
3. Entrevistas remotas reclutadas sin red personal.
4. Instrumentación de prototipo o beta.

### Hipótesis a validar

| ID | Hipótesis | Señal que la confirma |
|---|---|---|
| H1 | El principiante quiere que la app le diga qué cultivar, no explorar un catálogo | ≥ 60% elige “recomendación personalizada” como beneficio principal |
| H2 | Espacio, luz y ubicación son suficientes para entregar una recomendación inicial percibida como útil | ≥ 60% califica la recomendación ≥ 4/5 |
| H3 | Una home con una tarea al día reduce sensación de agobio | ≥ 60% entiende su siguiente acción sin ayuda |
| H4 | El usuario aceptará pagar tras una primera victoria, no antes | Mayor intención de pago post-flujo que pre-flujo |
| H5 | IA es atractiva solo si explica límites y no reemplaza la guía fiable | Comentarios y selección de valor priorizan guía contextual sobre “IA” sola |

### Día 1 — Preparar activos

- Implementar o maqueta navegable del flujo: Welcome → 4 preguntas → 3 recomendaciones → crear planta → Home Hoy.
- Preparar 5 capturas o vídeo de 30–45 segundos.
- Crear formulario de concepto y un enlace de interés/beta.
- Instalar analítica de eventos de la sección 14 si hay build interactiva.

### Días 2–3 — Investigación y benchmark

- Revisar semanalmente búsquedas y conversaciones públicas: Reddit, comunidades de huerto, reseñas de App Store/Google Play y foros de horticultura.
- Catalogar 30 observaciones con formato: fuente, perfil, problema literal, solución actual, objeción a pagar, cita/resumen.
- Evaluar 10 reseñas de 1 estrella y 10 de 5 estrellas de tres competidores directos. Buscar patrones, no votos aislados.

### Días 4–7 — Reclutamiento sin red personal

Publicar una petición de feedback, no autopromoción, en canales donde esté permitido:

- Subreddits relevantes: `r/gardening`, `r/vegetablegardening`, `r/containergardening`, priorizando leer normas y solicitar permiso a moderación si es necesario.
- Grupos públicos de Facebook/Telegram/Discord de huerto urbano y cultivo en balcón de Madrid/España, siempre conforme a normas.
- Comunidades Maker/Indie Hackers / Product Hunt Upcoming para feedback de concepto.
- Plataformas de investigación remunerada: User Interviews, Respondent, Prolific o servicios de pruebas de usabilidad, filtrando por “beginner gardening”, “balcony/container gardening” y España cuando sea posible.
- Anuncio pequeño geolocalizado en Madrid dirigido a intereses de huerto urbano, solo para captar una lista de espera; no usarlo para medir intención de compra todavía.

**Meta:** 8–12 respuestas de encuesta y 5 entrevistas de 20 minutos. Si no llegan, usar un test no moderado con 10–15 participantes de una plataforma de testing.

### Días 8–10 — Entrevistas y pruebas de tarea

- Mostrar prototipo, no describir solo la idea.
- Pedir tareas: “Acabas de mudarte a Madrid, tienes balcón y 4 h de sol. Enséñame qué harías para empezar.”
- Observar sin ayudar durante los primeros 60 segundos.
- Registrar: confusión, dudas, palabras usadas, abandono, elección de cultivo, impresión de precio.

### Días 11–12 — Test de mensaje y precio

Probar dos propuestas, asignando respuestas aleatoriamente:

**A.** “Empieza tu huerto sin tener ni idea. Semilla te dice qué plantar y te guía cada día hasta tu primera cosecha.”

**B.** “Planifica tu huerto con calendario, mapa, recordatorios e IA.”

Medir cuál se entiende más rápido y cuál despierta más deseo de probar.

Probar disposición al pago solo después de mostrar valor:

- Gratis: primera planta + plan básico.
- Pro anual: 19,99 € como hipótesis actual.
- Preguntar: “¿Qué tendría que incluir para que te pareciera justo?” antes de “¿pagarías?”.

### Días 13–14 — Síntesis y decisión

Crear una tabla con:

- Problemas repetidos (≥ 3 participantes).
- Momentos de confusión.
- Funciones que nadie pide.
- Razones para no pagar.
- Lenguaje literal que debe pasar a la landing/copy.

Tomar una decisión por hipótesis: mantener, modificar o descartar.

---

## 16. Encuesta de concepto

**Duración:** 3–5 minutos.  
**Objetivo:** aprender problema y prioridad, no solicitar aprobación de la idea.

### Introducción

> Estoy investigando cómo ayudar a quienes quieren empezar un pequeño huerto o cultivar en macetas. No intento venderte nada: tus respuestas servirán para decidir qué construir. Tardarás unos 4 minutos.

### Preguntas

1. **¿Has cultivado alimentos o aromáticas en el último año?**
   - Nunca
   - Lo intenté una vez
   - Sí, de vez en cuando
   - Sí, con frecuencia

2. **¿Dónde podrías cultivar?**
   - Balcón
   - Terraza
   - Patio/jardín
   - Huerto/bancal
   - Interior junto a ventana
   - No tengo espacio ahora

3. **¿Qué te frena más para empezar o mantener un huerto?** (elige hasta 3)
   - No sé qué plantar según mi espacio
   - No sé cuándo sembrar o trasplantar
   - No sé cuánta luz necesitan las plantas
   - Me olvido de regar o cuidar
   - No sé detectar problemas/plagas
   - Me abruma toda la información
   - No tengo tiempo
   - Me preocupa gastar dinero y que se mueran
   - Otro: texto libre

4. **La última vez que tuviste una duda sobre una planta, ¿qué hiciste?**
   - Texto libre

5. **¿Qué te sería más útil al empezar?** (ordena 1–5)
   - Que me recomiende qué cultivar según mi espacio, luz y ciudad
   - Que me diga qué hacer hoy
   - Un calendario de siembra y cuidados
   - Un plano para organizar macetas o bancales
   - Detectar plagas mediante una foto
   - Registrar fotos y progreso

6. **Muestra el concepto/vídeo.**

   > “Semilla te hace cuatro preguntas sobre tu espacio, luz y ciudad. Después te recomienda una planta sencilla para empezar y cada día te muestra una única acción clara hasta la cosecha.”

   **¿Qué parte te parecería más valiosa?**
   - Texto libre

7. **¿Qué te generaría dudas o desconfianza?**
   - Texto libre

8. **¿Usas alguna app o método hoy?**
   - Papel/calendario
   - Notas del móvil
   - Google/YouTube/redes
   - Otra app de plantas/huerto
   - No uso nada
   - Si eliges app: ¿cuál y qué te gusta/no te gusta?

9. **Después de crear una primera planta gratis y recibir un plan útil, ¿qué valor adicional te parecería razonable pagar?** (elige hasta 3)
   - Más plantas y huertos
   - Plan por temporada y clima
   - Alertas inteligentes
   - Diagnóstico por foto
   - Ayuda de chat contextual
   - Mapa/rotación/asociaciones
   - Historial de fotos, estadísticas y exportación
   - No pagaría por esto
   - Otro: texto libre

10. **¿Qué precio anual te parecería razonable para una app que usaras de verdad durante la temporada?**
    - 0 €; solo la usaría gratis
    - Menos de 10 €/año
    - 10–20 €/año
    - 20–35 €/año
    - Más de 35 €/año
    - Depende de funciones; explicar

11. **¿Te interesaría probar una beta?**
    - Sí → email opcional y consentimiento explícito para contacto
    - No

### Segmentación mínima

Guardar: experiencia, tipo de espacio, ciudad/provincia opcional, dispositivo y fuente de llegada. No recoger datos personales innecesarios.

---

## 17. Guion de entrevista y prueba

**Duración:** 20 minutos.  
**Participante ideal:** persona en España que tiene un balcón/terraza/patio, le interesa cultivar alimentos/aromáticas y no se considera experta.

### Inicio — 2 min

> “Gracias. No estamos evaluándote a ti; estamos evaluando el producto. Por favor, piensa en voz alta. Si algo no se entiende, es culpa de la app.”

Pedir consentimiento antes de grabar pantalla/audio.

### Contexto — 5 min

1. “Cuéntame la última vez que intentaste cultivar algo.”
2. “¿Qué salió bien y qué fue frustrante?”
3. “Cuando no sabes qué hacer con una planta, ¿a dónde recurres?”
4. “¿Qué espacio y luz tienes realmente?”

### Prueba de tarea — 8 min

Dar escenario:

> “Imagina que quieres empezar esta semana. Vives en Madrid, tienes balcón, unas cuatro horas de sol directo y nunca has cultivado. Haz lo que harías para decidir qué plantar y empezar.”

Observar:

- ¿Entiende las preguntas?
- ¿Sabe elegir una opción de luz?
- ¿Entiende por qué recibe una recomendación?
- ¿Llega a crear la planta sin asistencia?
- ¿Identifica la acción principal de la Home?

Preguntas solo después de observar:

- “¿Qué crees que ocurrirá después de pulsar esto?”
- “¿Por qué elegirías esa planta y no las otras?”
- “¿Qué información echas de menos antes de crearla?”
- “¿Qué harías mañana al abrir la app?”

### Valor y precio — 4 min

1. “¿Qué parte te resolvería un problema real?”
2. “¿Qué sobra o te haría abandonar?”
3. “¿En qué momento sería razonable ofrecerte una versión de pago?”
4. “¿Qué tendría que hacer por ti para que pagaras unos 20 € al año?”

### Cierre — 1 min

> “Si te interesa probar una versión cuando esté lista, ¿te parece bien que te contacte?”

No prometer fechas ni funciones no comprometidas.

---

## 18. Benchmark de competidores

Los precios cambian por país, tienda y promoción; comprobar en la fuente oficial antes de publicarlos o tomar decisiones financieras.

| Producto | Posicionamiento | Funciones visibles | Modelo/precio publicado | Fortaleza | Hueco para Semilla |
|---|---|---|---|---|---|
| **Planter** | Planificador accesible de jardines | Calendario, cultivos/variedades, seed box, plano; 1 jardín gratis | Gratis; Premium publicado a 24,99 USD/año; Lifetime 99,99 USD | Propuesta clara, bajo coste relativo y layout | Convertir la planificación en guía diaria para personas que no saben qué elegir |
| **GrowVeg** | Planificador de huerto serio | Plano, espaciado, fechas de heladas, calendario, rotación, recordatorios y diario | Trial 7 días; 35 USD/año auto-renovable publicado | Muy consolidado en planificación | Más móvil, emocional, guiado y localizado para principiantes españoles |
| **Fryd** | Planificador de bancales y calendario de cultivo | Plano, calendario, cuidados y comunidad/contenido según plan | Web: 10 €/mes o 40 €/año; App Store: 11,99 USD/mes o 49,99 USD/año; lifetime superior | Producto cuidado con capacidad de cobrar precio alto | Menos coste/menos complejidad y foco específico en “mi primera cosecha” |
| **VegPlotter** | Planner digital de temporada | Diseños, organización y planificación de temporada | Marketing público: más de 100.000 jardineros | Valida layout + organización de temporada | Acción diaria, onboarding y coach para cero experiencia |
| **BioGarden365 / PlantDays** | Huerto orgánico con calendario e IA | Calendario, tareas, microclima, fases lunares, plagas por IA, asociaciones | Freemium según tienda | Oferta en español y enfoque ecológico | No vender “IA”; vender confianza, sencillez y guías accionables |
| **Planificador Huerto IA** | Planificación apoyada por IA | Detalle variable; IAP y enfoque IA | Gratis con compras integradas | Confirma que IA ya es categoría competida | IA contextual, prudente y acoplada a datos de cultivo reales |
| **Potago** | Diario de huerto local y sencillo | Plano, siembra, cosecha, diario, calendario regional; límite de cultivos gratis | Freemium; 10 cultivos activos en plan gratis reportados | UX local y enfoque emocional reciente | Proactividad: no solo diario, sino qué hacer hoy y primera recomendación |
| **Planta / Blossom** | Cuidado de plantas, muy orientado a interior | Recordatorios, identificación, luz, cuidados | Freemium/suscripción variable por país | Conocidos por recordatorios y cuidados individuales | Especialización en comestibles, estación, cosecha y huerto urbano |

### Implicación competitiva

No competir por “más funcionalidades”. Competir por el resultado mensurable:

> “La persona que no tenía ni idea logra empezar y volver cada día sin sentirse torpe ni abrumada.”

---

## 19. Fuentes de investigación secundaria

Los hallazgos siguientes se usan como hipótesis y dirección de producto; no sustituyen investigación con usuarios propios.

- En conversaciones de Reddit, los principiantes de balcón remarcan que luz, tamaño del recipiente, riego y empezar con poco son las decisiones críticas; aromáticas y hojas se perciben como opciones más tolerantes que ambiciones como tomates sin el contexto adecuado.
- Los usuarios piden herramientas que conviertan ubicación/zona/fecha de helada y cultivos deseados en un calendario de siembra.
- Las conversaciones sobre apps de cuidado muestran valor en recordatorios flexibles, pero rechazo a agendas rígidas, alertas excesivas y paywalls invasivos.
- La IA de identificación/desdiagnóstico despierta interés, pero los usuarios resaltan errores y recomiendan verificar resultados, especialmente en cuestiones comestibles.

Ver las URLs recopiladas en el informe de investigación de esta conversación y verificar información de mercado antes de usos públicos.

---

## 20. Backlog de implementación por fases

### Fase A — Base de experiencia (P0)

1. Auditar `Mascot`, coach, perfil, onboarding, home y creación de planta.
2. Implementar animaciones de Semillita de forma incremental.
3. Crear/ajustar las 4 pantallas del onboarding.
4. Persistir datos de perfil faltantes sin romper datos existentes.
5. Crear motor explicable de recomendaciones con datos ya disponibles.
6. Crear pantalla de tres recomendaciones.
7. Encadenar la elección a creación guiada de primera planta.
8. Instrumentar eventos.

### Fase B — Activación (P0)

1. Rediseñar estado vacío de home.
2. Implementar card “Hoy en tu huerto” y prioridades.
3. Mostrar checklist de activación tras primera planta.
4. Activar tour máximo 3 pasos solo después de éxito.
5. Pedir permiso de notificaciones en contexto de valor.

### Fase C — Retención y Pro (P1)

1. Ajustar tareas/riegos a comportamiento flexible.
2. Añadir feedback “útil/no útil” a recomendaciones.
3. Añadir trigger de paywall post-valor.
4. Validar pricing, trial y mensajes con beta.
5. Ofrecer herramientas avanzadas progresivamente.

### Fase D — IA confiable (P2)

1. Diagnóstico con incertidumbre, evidencias y revisión.
2. Chat contextual con datos de planta y perfil.
3. Guardar feedback para evaluar exactitud percibida.

---

## 21. Criterios de aceptación globales

- [ ] Una persona sin experiencia puede crear una primera planta sin salir de la app.
- [ ] El onboarding tiene cuatro decisiones o menos, salvo login opcional.
- [ ] La recomendación muestra como máximo tres cultivos y explica por qué.
- [ ] No se exige mapa ni catálogo para crear la primera planta.
- [ ] La home ofrece una acción principal clara.
- [ ] Los recordatorios enseñan a revisar, no ordenan riegos ciegos.
- [ ] Semillita aporta contexto o feedback en cada momento clave, sin saturar.
- [ ] No se muestra paywall antes de crear la primera planta.
- [ ] Tours de máximo cuatro pasos y persistentes.
- [ ] Se mantienen i18n, Pro gates, almacenamiento y rutas existentes.
- [ ] Typecheck y pruebas relevantes pasan antes de entregar cada fase.

---

## 22. Prompt de arranque para OpenCode

Pegar desde la raíz del repositorio:

```text
Lee primero `SEMILLA_DOCUMENTO_FUNCIONAL_MVP.md` en la raíz del repositorio y úsalo como especificación funcional vinculante para el trabajo.

Estamos trabajando en `apps/huerto-tracker`. Objetivo de esta sesión: implementar únicamente la Fase A del apartado 20, de forma incremental y sin reconstruir funcionalidad existente.

Antes de editar:
1. Lee los archivos existentes relacionados: onboarding, welcome, home tabs, Mascot, CoachBubble, useUserProfile, modelos de perfil/planta/huerto, crops/zones/containers, creación de planta y analytics.
2. Escribe un plan breve que indique qué componentes y rutas existentes reutilizarás.
3. Identifica incompatibilidades entre el documento y el código actual; resuélvelas con el cambio mínimo compatible.

Implementa:
- Mascota animada solo si aún no existe, reutilizando Reanimated y manteniendo la API existente.
- Onboarding de 4 preguntas descrito en el documento, preservando datos actuales y i18n.
- Un motor determinista y explicable para recomendar hasta tres primeros cultivos usando los datos existentes.
- Una pantalla o paso de recomendaciones y la navegación hacia la creación guiada de la primera planta.
- Eventos de analítica mínimos del documento, siguiendo el patrón de `src/analytics/index.ts`.

Restricciones:
- No crear un segundo sistema de perfil, cultivos, notificaciones ni plantas.
- No cambiar pricing ni Pro gates en esta fase.
- No usar IA generativa para la recomendación base.
- No hacer refactors masivos ni eliminar flujos existentes.
- Mantener tipos estrictos, rutas de Expo Router e i18n.

Al final:
- Ejecuta typecheck/tests relevantes disponibles.
- Resume archivos modificados, decisiones de compatibilidad, eventos añadidos y pasos manuales para probar el flujo.
```

---

## 23. Decisión tras validación

Al terminar los 14 días, decidir con evidencia:

| Si ocurre | Decisión |
|---|---|
| La mayoría entiende y completa el flujo, pero no vuelve | Mejorar utilidad de Home, recordatorios y hábito; no añadir features |
| Se bloquean al elegir luz/espacio | Simplificar preguntas y ofrecer “no lo sé” con recomendación conservadora |
| Les gusta el plano, pero no el inicio | Mantener mapa como profundización, no como onboarding |
| Valoran diagnóstico IA más que el plan | Comprobar si es demanda real repetida; mantener política de confianza |
| Quieren todo gratis antes de tener resultado | Mejorar aha moment y freemium; no subir agresividad del paywall |
| Pagarían por plan estacional/alertas/plantas ilimitadas | Priorizar el Pro contextual después de retención |

---

## 24. Definición de éxito

Semilla estará encaminada cuando un principiante pueda decir:

> “No sabía qué plantar ni cuándo hacerlo. La app me recomendó algo que encajaba en mi balcón y ahora cada día sé exactamente qué tengo que hacer.”
