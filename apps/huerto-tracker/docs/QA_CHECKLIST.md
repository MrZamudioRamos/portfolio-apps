# QA / Polish checklist — pre-launch

Checklist para una pasada intensiva antes de lanzar. Marca lo que falle y
mándame el caso. Dividido por área. ⚠️ = punto que ya sospecho que puede fallar
o no tener sentido.

> Probar idealmente en **dev/production build (eas)**, no solo Expo Go: en Expo
> Go no funcionan Sign-in nativo (Google/Apple), crashes de Sentry, ni widgets.

---

## 1. Cuenta y sesión
- [ ] Registro con email + contraseña.
- [X] Login con contraseña.
- [ ] Login con OTP (código email).
- [ ] Login Google (⚠️ solo build nativo, no Expo Go).
- [ ] Login Apple (⚠️ solo build nativo).
- [X] Cerrar sesión → datos locales se borran, vuelve a /welcome.
- [ ] Re-login → vuelven SOLO los datos de esa cuenta (no de la anterior).
- [ ] Borrar cuenta → doble confirmación → cuenta y datos fuera de Supabase, va a welcome.
- [ ] ⚠️ Borrar cuenta / scan IA **primera llamada** puede tardar (cold start de Edge Function). ¿Acepta o da error la 1ª vez?
- [ ] Modo invitado (explorar) sin cuenta → ¿funciona todo salvo sync?
- [ ] Invitado que crea datos y luego se registra → ¿se suben sus datos a la nube?

## 2. Onboarding
- [ ] Flujo completo (espacio, método, sol, experiencia, zona, nombre, foto).
- [ ] Detección GPS de provincia (⚠️ en Expo Go el permiso no se pide).
- [ ] Crear huerto al final → aparece en dashboard.
- [ ] Invitado sin huerto tras wipe → te lleva a onboarding (recién arreglado).
- [ ] Volver atrás entre pasos sin perder datos.

## 3. Huertos (multi-huerto)
- [ ] Crear un huerto (free) → funciona.
- [ ] Intentar crear **2º huerto en free** → aparece paywall (límite = 1).
- [ ] ⚠️ Paywall al crear 2º huerto: ¿el mensaje/botón aparecen bien?
- [ ] Pro: crear múltiples huertos sin límite.
- [ ] Cambiar de huerto activo → dashboard/mapa/diario reflejan el correcto.
- [ ] Editar huerto (nombre, provincia, zona, tipo, foto).
- [ ] Tipo "maceta/pot" → el mapa cambia de modo.
- [ ] Borrar huerto → borra SUS plantas/entradas/recordatorios (no los de otros).

## 4. Plantas
- [ ] Añadir planta manual (cultivo, nombre, variedad, fecha siembra, estado, foto).
- [ ] Añadir vía **scan IA** → autorrellena → guardar → sale de la pantalla.
- [ ] Foto se ve **al instante** al añadirla.
- [ ] Editar planta (incl. cambiar foto).
- [ ] Borrar planta → borra sus entradas/recordatorios.
- [ ] Estados de planta (semillero→cosecha) y su color/emoji.
- [ ] Cultivos personalizados (crear, usar, borrar).
- [ ] Siembra escalonada (succession).
- [ ] **Límite 5 plantas en free** → al intentar crear la 6ª → paywall (`source: plant_limit`).
- [ ] Pro: plantas sin límite.
- [ ] ⚠️ Invitado: límite = 3 plantas (distinto de free registrado = 5). ¿Correcto?

## 5. Diario
- [ ] Crear entrada de cada tipo (riego, cosecha, abono, poda, plaga, tratamiento, nota, foto).
- [ ] Riego con litros/método. Cosecha con peso/unidades/calidad.
- [ ] Foto en entrada se ve al instante.
- [ ] Editar / borrar entrada.
- [ ] Filtros del diario por tipo.
- [ ] Selector de fecha: chips Hoy/Ayer/Hace 2 días funcionan. Botón calendario abre picker nativo (no TextInput).
- [ ] ⚠️ Android: picker de fecha abre diálogo del sistema. iOS: abre spinner en sheet. Ambos actualizan la fecha correctamente.

## 6. Mapa del huerto
- [ ] **Free: acceder al mapa → ve pantalla upsell** con botón "Ver planes Pro" (`source: map`).
- [ ] Pro: mapa carga correctamente.
- [ ] Drag & drop de plantas (long-press).
- [ ] Badge Nx por celda.
- [ ] Overlay compañeros/combativos (✓/✗) entre celdas adyacentes.
- [ ] Cambiar tamaño de cuadrícula (presets) → no se pierden plantas colocadas.

## 7. Recordatorios y notificaciones
- [ ] Crear recordatorio (diario / semanal / una vez) → llega la notificación a su hora.
- [ ] ⚠️ "Semanal" fijado a lunes — no se elige día. ¿Tiene sentido?
- [ ] Editar / borrar recordatorio → se cancela su notificación.
- [ ] **Free: 3 recordatorios por huerto máximo** → al intentar crear el 4º → paywall (`source: reminders`).
- [ ] Pro: recordatorios ilimitados.
- [ ] Alerta de helada (zona con frío) → llega 1 vez por evento (no spam).
- [ ] Alertas estacionales (siembra mensual) → texto en el idioma elegido.
- [ ] Notifs de planta (trasplante/cosecha/tratamiento) → idioma correcto.
- [ ] ⚠️ Notifs solo del huerto ACTIVO: al cambiar de huerto se reprograman.

## 8. IA (Pro)
- [ ] Chat IA (Tools → Chat): responde con contexto del huerto (provincia, plantas, mes).
- [ ] Scan de planta → identifica y autorrellena.
- [ ] Diagnóstico de plaga (identify) → resultado coherente, en tu idioma.
- [ ] **Gate Pro en chat/scan/identify**: usuario free → paywall con `source` correcto (`ai_chat` / `scan` / `identify`).
- [ ] Sin red → error controlado (no crash).
- [ ] ⚠️ Primera llamada IA (cold start Edge Function) puede tardar ~3-5s. ¿Hay spinner visible?

## 9. Pro / Paywall / compras
- [ ] **Paywall muestra 5 features principales** (huertos, plantas, mapa, IA, recordatorios) siempre visibles.
- [ ] Toggle "Ver todo lo incluido" expande 3 features extra (export, logros, asociaciones).
- [ ] Backup/sync **NO aparece** en lista Pro (es gratis para usuarios registrados).
- [ ] Planes mensual/anual con precios correctos. Annual marcado "popular".
- [ ] Switch "Avisarme antes de que termine la prueba" → programa notif en D+6.
- [ ] Comprar en sandbox → desbloquea Pro → paywall muestra "¡Ya eres Pro!" con checkmarks.
- [ ] Restaurar compra.
- [ ] `paywallViewed` analytics tiene `source` correcto según desde dónde se abre (plant_limit / map / ai_chat / scan / identify / reminders / direct).
- [ ] ⚠️ **Verificar en dashboard RevenueCat** que products `monthly` y `annual` tienen introductory offer de 7 días configurada.
- [ ] ⚠️ `EXPO_PUBLIC_DEV_PRO` debe ser `false` en build de producción.

## 10. Sync multi-dispositivo
- [ ] Crear datos en móvil A → aparecen en móvil B tras sync.
- [ ] Borrar en A → desaparece en B (soft-delete cross-device).
- [ ] Editar offline → al reconectar se sube (no se pierde).
- [ ] Borrar offline → no "resucita" al reconectar.
- [ ] **Fotos** sincronizan: añadir foto en A → verla en B (tras sync).
- [ ] ⚠️ Fotos antiguas (file://) se suben en el próximo sync; offline la 1ª carga puede no verse si depende de red.

## 11. Backup / export
- [ ] **Sync/backup automático es gratis para usuarios registrados** (no requiere Pro) → confirmar que ocurre en background.
- [ ] Export JSON (backup) + import en otro dispositivo.
- [ ] Export CSV del diario (Pro) → `source: csvExport` → paywall si free.
- [ ] Borrar todos los datos → limpia local + nube + reinicia onboarding.

## 12. Costes (Pro)
- [ ] Free → pantalla de upsell, no los datos.
- [ ] Pro: añadir gasto manual → selector de categoría, **fecha con picker nativo** (no TextInput libre), importe, descripción, planta opcional.
- [ ] Picker de fecha en modal de costes: chips Hoy/Ayer/Hace 2 días + botón calendario.
- [ ] KPIs correctos: coste total, valor cosecha, ROI.
- [ ] Borrar entrada de coste → Alert de confirmación.

## 13. Idiomas (i18n)
- [ ] Cambiar entre es/en/ca/eu/gl/val → toda la UI traducida.
- [ ] Notificaciones (helada, estacional, planta) en el idioma elegido.
- [ ] ⚠️ Buscar textos hardcoded sin traducir.

## 14. Otras pantallas
- [ ] Stats (cosecha, kg/año, rachas, gráfico mensual).
- [ ] **Logros/badges** (Stats): solo visibles en Pro; el cómputo corre para todos.
- [ ] Calendario (siembra/cosecha, hemisferio sur).
- [ ] Catálogo de cultivos (imágenes, chips de meses).
- [ ] Guía de enfermedades / asociaciones / rotación (incluye plantas archivadas).
- [ ] Calendario lunar (coherencia de fase/día).
- [ ] **Medidor de luz** (Tools → Medidor): cámara + lux estimado + cultivos recomendados.
- [ ] **Guía semillero**: planta en estado semillero con cultivo que tiene INDOOR_WEEKS → card con fechas calculadas.

## 15. Cosas que ya sé que faltan / no tienen sentido (decidir antes de lanzar)
- [ ] **Rating prompt** — no existe. Añadir `expo-store-review` tras 1ª cosecha.
- [ ] **Recetas IA + tab Explore** — Sprint 9 pausado, NO construido. ¿Entra en v1 o v1.1?
- [ ] **Source maps de Sentry** — sin configurar; crashes salen con stack minificado.
- [ ] **Botón azul de Expo Go** — NO es bug; no sale en build publicado.
- [ ] **SMTP propio** en Supabase (Resend) para emails de auth en producción.
- [ ] **Migration 010** (propagation fields) — pendiente de correr en prod.
- [ ] **Edge Function ai-chat** — pendiente de deploy en prod.
- [ ] Revisar **assets de App Store**: icono, capturas, descripción, política de privacidad, URL de soporte.

---

## Cómo reportarme los fallos
Por cada caso raro: **pantalla + qué hiciste + qué esperabas + qué pasó** (captura si puedes). Los agrupo y arreglo por tandas.
