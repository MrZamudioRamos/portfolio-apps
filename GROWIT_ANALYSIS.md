# Análisis GrowIt → mejoras huerto-tracker

**Fecha:** 2026-05-19
**Fuente:** screenshots IMG_0527–IMG_0576 (Downloads), trial 7 días GrowIt activado.
**Objetivo:** extraer ideas de GrowIt para superar la app, sin clonar.

---

## 1. Lo que ya tenemos (mantener / pulir)

Reflejado en `memory/project_huerto_features.md` + `project_huerto_sprint6_done.md`:

- Multi-huerto con color personalizable y notas
- Drag & drop mapa (Reanimated, long-press 280 ms, ghost UI thread)
- Badge Nx por celda
- FAB añadir planta (esquina)
- Custom crops (modelo `CustomCrop` + screens `/crop/index`, `/crop/new`)
- Diagnóstico AI (gated Pro)
- Costes & ROI (gated Pro)
- CSV diary export (gated Pro)
- Badges/gamificación (gated Pro)
- i18n 6 locales (es, en, ca, gl, eu, val) — diferencial fuerte
- Notificaciones push por planta
- Heladas locales
- Share Instagram-ready (ViewShot con cabecera+footer)
- Health dot por planta (verde/naranja/rojo) en home
- 77/77 vitest tests
- Glass effect (iOS 26+) en tab bar/modales/menus
- Paywall (monthly 2,99€ / annual 19,99€), trial gratuito
- Gates Pro con paywall actualizado (9 features)

**Diferenciales propios vs GrowIt:** i18n (6 locales co-oficiales españolas), Costes/ROI, color huerto, notas huerto, share Instagram, drag&drop con Reanimated, heladas hiper-locales.

---

## 2. Gaps detectados en GrowIt — alto valor

### A. Onboarding wizard psicológico (IMG_0527–0539) ⭐⭐⭐
Flujo guiado de 7-9 pantallas que pregunta:
1. **Espacio** (jardín, balcón, indoor, finca, otro) — multiselect
2. **Método cultivo** (suelo, bancal elevado, contenedor indoor/outdoor) — multiselect
3. **Tamaño espacio** (<5m², 5-20, 20-50, >50)
4. **Horas sol diarias** (full >6h, parcial 3-6h, sombra <3h)
5. **Experiencia** (nunca / pasado / extensa) — con micro-mensaje empático ("50% de nuestros usuarios son nuevos")
6. **Companion planting interest** (sí / indiferente / no)
7. **Statements psicológicos** ("me agobia planificar layout", "abrumado por info") — yes/no
   → genera empatía + perfila al usuario para recomendar contenido

**Por qué importa:** activación 7 días free trial depende de hook emocional inicial. Sin onboarding fuerte, el usuario abandona antes del paywall.

**Nuestra propuesta:** wizard simplificado de 5 pasos al primer arranque, guarda en `UserProfile` (modelo nuevo), feed recomendaciones de cultivos + tutoriales contextuales basados en perfil.

### B. Plant detail rico con tabs (IMG_0548, 0550, 0551, 0554, 0555, 0556, 0557, 0558) ⭐⭐⭐
GrowIt: 8 tabs por cultivo → **Planting calendar | Difficulty | Suitable location | Growth timeline | How-tos | FAQ(40) | Benefits | Explore**

Componentes clave:
- **Calendario gantt anual** Feb-Feb con 3 bandas (Start indoors / Plant outside / Harvest) basadas en clima local (Madrid → frost dates)
- **Difficulty gauge** (semáforo)
- **Hardiness zone** (2-10), tolerance temp (0°–41°), preferred sunlight
- **Good neighbors / Bad neighbors** con fotos cards horizontales (no solo lista)
- **How-tos por growth stage**: Starting (métodos, spacing, depth, water freq), Seedling (transplanting), Vegetative (fertilize, water, support), Flowering, Harvest
- **FAQ 40 preguntas/cultivo** (contenido educativo enorme)
- **Benefits**: descripción, recetas integradas con foto, tabla nutricional (calorías, carbs, sugar, ...)
- **Explore**: artículos blog ("From Plot to Plate", "What Vegetables...")
- **Like/Dislike** para recomendaciones
- CTAs persistentes: "Plan to grow" / "Growing it"

**Nuestra propuesta:** primera fase añadir tabs **Calendar | Cuidados | Asociaciones | FAQ**. Calendario gantt es ganador visual. Recetas + nutrición se pueden generar con IA on-demand (cache).

### C. Plant scan AI con auto-fill (IMG_0567, 0571) ⭐⭐⭐
- "Snap Tips" antes de fotografiar (evitar: too young, blurry, multi-species) con ejemplos visuales
- Tras escanear → auto-rellena planting date, last watering, place, growth stage
- "AI auto-filled — can adjust anytime"
- Botón Add plant tiene 2 opciones: **Scan** | **Search by name**

**Nuestra propuesta:** reutilizar pipeline de diagnose (identifyPest API) para identificación de cultivo. Auto-rellenar formulario `plant/new.tsx`. Aumenta retención del usuario novato.

### D. Companion planting visual en grid (IMG_0564) ⭐⭐
Cuando dos celdas adyacentes tienen cultivos compatibles → muestra icono **↻** entre ellas (verde si compañeras, rojo si combativas).

**Nuestra propuesta:** ya tenemos asociaciones; añadir overlay visual entre celdas adyacentes en `app/garden/map.tsx`. Renderiza pequeño badge ↻ con color verde/rojo según relación.

### E. Reminders agrupados por tiempo + tipo (IMG_0572) ⭐⭐
Lista agrupada: "In 2 days → Water (2)" colapsable, "In 14 days → Progress (2)" colapsable. Cada item con foto + nombre + "Last: Today" + checkbox.

**Nuestra propuesta:** rediseñar `app/(tabs)/reminders.tsx` con grouping por bucket temporal (Hoy / Esta semana / Este mes) y subgrupo por acción (regar / abonar / cosechar).

### F. Plant card con month chips (IMG_0565) ⭐⭐
Cada card de cultivo muestra "Plant in: Mar, Apr, May, Jun, Jul, Aug" — chips compactos de meses cuando plantar. Visualmente muy efectivo.

**Nuestra propuesta:** añadir chips de meses ideales debajo del nombre en lista de cultivos (`crop/index`, plant picker). Datos derivables del calendario gantt.

### G. Garden planner tutorial (IMG_0543) ⭐
Modal "How to Use Garden Planner" con 5 steps numerados + ilustración por paso:
1. Hold and drag para colocar
2. Tap para info
3. Numbers = cuántos caben
4. Colors = compañeros/combativos
5. Cada celda = 1×1 ft (30cm)

**Nuestra propuesta:** modal welcome al abrir mapa por primera vez. Persist `seenMapTutorial` en AsyncStorage. Useful onboarding sin friction.

### H. Garden setup wizard al crear (IMG_0546) ⭐
Bottom sheet "Set up garden":
- **Location** (Madrid) — auto-detecta clima/heladas
- **Name** (Garden 1)
- **Size** con stepper cm/feet (60/90/120/150/180) lateral picker

**Nuestra propuesta:** mejorar pantalla `garden/new.tsx` con: detección automática ubicación (expo-location), stepper visual de dimensiones.

### I. Explore / categorías temáticas (IMG_0575) ⭐
Tab Explore con categorías de cultivos: **Cooking Spices | Regrow from Scraps | Grow Indoors | Hydroponics**. Cada categoría tiene grid de plantas.

**Nuestra propuesta:** nueva tab o sección Explore. Categorías propuestas (adaptadas):
- Hierbas aromáticas
- Cultivos balcón/interior
- Rebrote (regrow from scraps) — viral en redes
- Plantas mediterráneas
- Tradicionales españolas (caracteres regionales)

### J. Snap Tips pre-scan (IMG_0567) ⭐
Pantalla previa al scan con ejemplos de qué EVITAR (too young, blurry, multi-species). Mejora tasa de éxito del AI → baja frustración.

**Nuestra propuesta:** añadir modal pre-cámara en flow de diagnose y nuevo scan-identify.

### K. Difficulty meter visual ⭐
Gauge semicírculo en plant detail. Ahora mostramos string "easy/medium/hard"; un gauge es más memorable.

### L. Like/Dislike por cultivo ⭐
Bottom de plant detail: "Do You Like the Information about Tomato?" → 👍 / 👎. Feedback loop para recomendaciones.

**Nuestra propuesta:** guardar feedback por cultivo, usar para ranking en pantalla de recomendaciones.

### M. Trial reminder switch (IMG_0541) ⭐⭐
En paywall: toggle "Remind me before the trial ends" — reduce frustración de cobro sorpresa, mejora rating y reduce refunds.

**Nuestra propuesta:** añadir switch en `paywall.tsx`, schedula notificación local 24h antes del cobro.

### N. Smart Reminders config (IMG_0576) ⭐
Settings → "Smart Reminders" — sugiere frecuencias automáticas según cultivo + clima en lugar de manual.

**Nuestra propuesta:** ya tenemos notificaciones por planta; añadir modo "auto" que calcule frecuencia según `wateringDays` del cultivo + temperatura local.

### O. Clear cache con tamaño visible (IMG_0576) ⭐
Settings muestra "Clear Cache · 23.0MB". Transparente y útil.

**Nuestra propuesta:** en settings, botón "Limpiar caché (XMB)" — calcular peso de fotos + thumbnails + AI cache.

### P. Storage / propagation post-harvest (IMG_0556) ⭐
En tab How-tos / Harvest: cómo almacenar (tomate fresco 1-2 semanas a temperatura ambiente) + cómo guardar semillas para propagación.

**Nuestra propuesta:** sección "Después de cosechar" en plant detail. Datos pueden venir de IA o seed library.

### Q. Bottom tab bar con FAB central (IMG_0565) ⭐
5 tabs: Home | My Garden | (**FAB central elevado** scan/add) | Explore | Diagnose. Más accesible que FAB esquina.

**Nuestra propuesta:** considerar para v2. Cambio mayor de UX — evaluar A/B test.

### R. Recetas integradas por cultivo (IMG_0557) ⭐
Tab Benefits muestra recetas con foto + nombre ("Cauliflower Salad...", "Stacked Whole Grain Sandwich"). Aumenta tiempo en app.

**Nuestra propuesta:** generación on-demand con IA, cache local. Por idioma. Diferencial: recetas tradicionales españolas/regionales.

---

## 3. Roadmap propuesto (priorizado)

### Sprint 8 ✅ COMPLETO (2026-05-19)
1. ✅ **Onboarding wizard** 7 pasos → `UserProfile` + i18n
2. ✅ **Plant detail tabs**: Calendar gantt + Asociaciones + Cuidados por stage + DifficultyGauge
3. ✅ **Companion overlay en grid** (✓/✗ entre celdas adyacentes)
4. ✅ **Trial reminder switch** en paywall + notif 6d antes del cobro
5. ✅ **Month chips** en plant cards

### Sprint 9 — Contenido + IA (parcialmente iniciado 2026-05-20, pausado)
6. ✅ **Plant scan + auto-fill** (reutilizado pipeline diagnose)
7. ~~**Snap Tips** modal pre-cámara~~ — descartado (añade fricción sin valor claro)
8. ~~**FAQ por cultivo**~~ — descartado, contenido estático masivo sin ROI
9. **Recetas IA on-demand** con cache — PENDIENTE
10. **Tab Explore** con categorías temáticas — PENDIENTE

### Sesión polish 2026-05-20 (entre Sprint 9 y 10)
**Bugs críticos resueltos:**
- ✅ Delete resurrect: `syncFromCloud` resucitaba items borrados → `deleteRow` Supabase antes de `.remove()` local (5 pantallas)
- ✅ `cost_entries` sin sync → migración 006 + adapter + sync + backup v2
- ✅ 5 campos `plant` faltaban en adapter+DB → migración 007 + `plantToRow`/`rowToPlant`
- ✅ `harvest_weight_g` siempre null → `data.weight` (string) → `data.weightGrams` (number)
- ✅ Validación fecha en diary entries
- ✅ `initialStatus` cast `as any` en plant/new → validated array

**Auth mejorado:**
- ✅ Magic link → OTP 6 dígitos (funciona sin deep links, compatible Expo Go)
- ✅ Login con contraseña (para testing + producción)
- ✅ Scheme `huertotracker` → `semilla` (match app.json)
- ✅ Back navigation: welcome usaba `router.replace` → `router.push`
- ✅ Returning user: auth redirige a `/(tabs)` si onboarding ya completado
- ✅ Onboarding → plant/new → tabs: fix redirect loop por estado stale

**Otros:**
- ✅ GPS auto-detect provincia en create/edit garden (además de onboarding)
- ✅ Privacy policy URL → `https://semillaapp.app/privacy-policy.html`
- ✅ deleteAllData limpia Supabase + local + AsyncStorage extra keys
- ✅ Migraciones 004-007 aplicadas en Supabase Dashboard
- ✅ EXPO_PUBLIC_DEV_PRO=false para testing real

### Sprint 10 — Refinamiento
11. **Reminders agrupados** por bucket + tipo
12. **Smart Reminders auto**
13. **Difficulty gauge** visual
14. **Like/Dislike** por cultivo + ranking
15. **Tutorial mapa** modal welcome
16. **Garden setup wizard** mejorado (auto-location + stepper)
17. **Storage/propagation** sección post-harvest
18. **Clear cache** con tamaño

### Sprint 11 — UX mayor (opcional)
19. **Bottom tab + FAB central** (A/B test)
20. Pulido visual general

---

## 4. Diferenciadores a mantener / amplificar

Para superar a GrowIt sin copiar:

- **i18n 6 locales** (es, en, ca, gl, eu, val) — GrowIt es solo EN. **VENTAJA REGIONAL ENORME**.
- **Costes & ROI** — GrowIt no tiene. Útil para huertos productivos.
- **Multi-huerto con color/notas** — más personal que GrowIt.
- **Heladas hiper-locales** — clima regional España.
- **Share Instagram-ready** — viral potential.
- **Cultivos tradicionales españoles** (calçots, pimientos del piquillo, padrón, etc.) en seed library.
- **Drag & drop nativo con Reanimated** — más fluido que GrowIt.

---

## 5. Notas técnicas

- GrowIt usa lo que parece ser **Lottie/illustraciones SVG estandarizadas** estilo flat → posible Storyset / Freepik.
- Plant scan: probablemente Vision API (Google) o modelo custom.
- Climate data: parecen tener tabla de zonas USDA + override por ciudad.
- 40 FAQ por cultivo → DB enorme. Para nosotros, IA on-demand con cache mejora UX sin pre-poblar.
- Onboarding usa progress bar arriba (3 segmentos), buen patrón.

---

## 6. Estado actual y pendiente próxima sesión

**Base técnica sólida (post-polish):**
- 0 errores TypeScript
- Sync Supabase 8 tablas (gardens, plants, diary_entries, reminders, user_profiles, custom_crops, cost_entries, garden_layouts)
- Backup v2 completo
- Auth: password + OTP + Google/Apple (producción)
- Migraciones 001-007 aplicadas en Supabase

**Pendiente Sprint 9 (continuar):**
- Recetas IA on-demand con cache local
- Tab Explore con categorías temáticas

**Pendiente Sprint 10:**
- Reminders agrupados por bucket temporal
- Smart Reminders auto (frecuencia según cultivo + clima)
- Difficulty gauge visual
- Like/Dislike por cultivo
- Tutorial mapa (modal welcome primer uso)
- Clear cache con tamaño visible
- Storage/propagation post-harvest

**Nota Expo Go vs producción:**
- Permisos ubicación no preguntan en Expo Go (Expo Go ya tiene el permiso). En build de producción sí pedirá permiso al usuario.
- Google Sign-in y Apple Sign-in requieren build nativo (no funcionan en Expo Go).
- OTP y password login funcionan en Expo Go.

**Para publicar en stores:**
- Configurar SMTP propio en Supabase (Resend recomendado)
- Mover `EXPO_PUBLIC_ANTHROPIC_KEY` a Supabase Edge Function (no en cliente)
- `EXPO_PUBLIC_DEV_PRO=false` ya está correcto
- EAS Build con `eas build --profile production`

---

## 7. Decisiones arquitecturales pendientes

### AsyncStorage → expo-sqlite (Sprint 10-11, condicional)

**Situación actual:** `@portfolio/storage` usa AsyncStorage. Cada colección = un JSON blob en una key. `useCollection` carga TODO en memoria y filtra en JS.

**Límite:** ~1.000-2.000 items por colección sin degradación notable. Con usuarios muy activos (3+ años, 3+ entradas/día) `diary_entries` puede llegar a 2-3MB → parse lento en dispositivos gama baja.

**Migración propuesta (si analytics lo justifica):**
- Backend: `expo-sqlite` + `Drizzle ORM` (WAL mode, transacciones, índices)
- La interfaz de `useCollection` (`items`, `create`, `remove`, `refresh`) no cambia → componentes sin tocar
- Migración sólo dentro de `@portfolio/storage`
- Prioridad: `diary_entries` primero (mayor volumen), resto después

**Decisión:** Ship con AsyncStorage. Revisar en Sprint 10-11 si hay usuarios activos con 500+ entradas. Supabase es la fuente de verdad → datos seguros aunque AsyncStorage sea lento.
