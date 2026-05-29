# Launch Readiness — HuertoTracker

Evaluación franca de qué falta para lanzar en stores y competir de verdad
(referencia competidor: GrowIt). Estado base: arquitectura sólida, sync robusto
(soft-delete cross-device), i18n 6 locales. Pero NO listo para producción hoy.

Leyenda: 🚨 bloqueante · 🔴 crítico para competir · 🟡 crecimiento · 🟢 ya ganamos.

---

## 🚨 Bloqueantes de lanzamiento (no negociables)

### 1. API key de Anthropic en el cliente  ← EN CURSO
`EXPO_PUBLIC_ANTHROPIC_KEY` se empaqueta en el bundle (`pestIdentify.ts`,
`plantScan.ts`) y llama directo a `api.anthropic.com`. Cualquiera extrae la key
del IPA/APK y gasta tu cuenta sin límite. El gate Pro no protege (la key vive
fuera de la app).
**Fix:** Supabase Edge Function `ai-vision` con la key como secret + auth del
usuario + rate-limit. La app deja de ver la key.

### 2. Sin borrado de cuenta
Solo existe `deleteAllData` (borra datos, no la cuenta `auth.users`). Apple
Guideline 5.1.1(v) exige borrado de cuenta in-app si hay registro → rechazo.
**Fix:** Edge Function con service-role que llame `auth.admin.deleteUser(uid)`,
botón en settings.

### 3. Las fotos no sincronizan
`adapters.ts` salta los `file://` a propósito. Reinstalar o cambiar de móvil =
fotos perdidas. En una app de huerto la foto es el corazón emocional → reviews 1★.
**Fix:** subir a Supabase Storage al guardar entry/planta; sincronizar la URL.

---

## 🔴 Crítico para competir (sin esto no escalas)

### 4. Cero analytics y cero crash reporting
No hay Sentry/PostHog/nada. Al lanzar: sin visibilidad de crashes, funnel de
onboarding, ni conversión a Pro. GrowIt itera con datos; tú irías a ciegas.
**Fix:** Sentry (crashes) + PostHog o similar (eventos clave: onboarding step,
plant added, first harvest, paywall view, purchase).

### 5. Foso de contenido
65 cultivos vs cientos de GrowIt con 40 FAQ + calendarios + how-tos cada uno. No
se iguala a mano. Carta ganadora: **contenido IA on-demand cacheado, en español
regional + cultivos tradicionales españoles** (calçots, padrón, piquillo). El
plan ya lo tiene (recetas IA, Explore) pero está pausado → es diferenciador, no
opcional.

---

## 🟡 Palancas de crecimiento (baratas, alto ROI)

- **Rating prompt** (`expo-store-review`) tras momento de éxito (1ª cosecha). Sin
  reviews no hay ranking ASO.
- **Recetas IA + tab Explore** (Sprint 9 pausado) — tiempo en app + viralidad.
- **Reminders agrupados / Smart reminders** — retención.
- **Trial reminder** (notif 24h antes del cobro) — menos refunds, mejor rating.

---

## 🟢 Donde ya ganamos a GrowIt (amplificar en marketing)

- i18n 6 locales co-oficiales (GrowIt solo EN) — ventaja regional fuerte.
- Costes/ROI, heladas hiperlocales, multi-huerto con color/notas.
- Offline-first sólido (soft-delete cross-device).
- Cultivos tradicionales españoles como gancho.

---

## Orden de ataque recomendado

1. 🚨 Edge Function IA + key  ← **en curso**
2. 🚨 Borrado de cuenta (Apple)
3. 🔴 Sentry + analytics (lanzar sin esto = a ciegas)
4. 🚨 Sync de fotos (Supabase Storage)
5. 🟡 Rating prompt (1 día, mucho ROI)
6. 🔴 Recetas IA + Explore (foso de contenido)

1–4 = obligatorio para producción. El resto = pasar de "app que existe" a
"competencia real".

---

## Otros pendientes técnicos (de GROWIT_ANALYSIS.md / sesiones previas)

- Mover `EXPO_PUBLIC_DEV_PRO=false` confirmado para release.
- SMTP propio en Supabase (Resend) para emails de auth.
- AsyncStorage → expo-sqlite si hay usuarios con 500+ entradas (condicional).
- EAS Build profile production; Google/Apple Sign-in requieren build nativo.
