# QA / Polish checklist — pre-launch

Checklist para una pasada intensiva antes de lanzar. Marca lo que falle y
mándame el caso. Dividido por área. ⚠️ = punto que ya sospecho que puede fallar
o no tener sentido.

> Probar idealmente en **dev/production build (eas)**, no solo Expo Go: en Expo
> Go no funcionan Sign-in nativo (Google/Apple), crashes de Sentry, ni widgets.

---

## 1. Cuenta y sesión
- [ ] Registro con email + contraseña.
- [ ] Login con contraseña.
- [ ] Login con OTP (código email).
- [ ] Login Google (⚠️ solo build nativo, no Expo Go).
- [ ] Login Apple (⚠️ solo build nativo).
- [ ] Cerrar sesión → datos locales se borran, vuelve a /welcome.
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
- [ ] Crear varios huertos.
- [ ] Cambiar de huerto activo → dashboard/mapa/diario reflejan el correcto.
- [ ] Editar huerto (nombre, provincia, zona, tipo, foto).
- [ ] Tipo "maceta/pot" → el mapa cambia de modo.
- [ ] Borrar huerto → borra SUS plantas/entradas/recordatorios (no los de otros).
- [ ] Límite gratis de huertos (2) → paywall al crear el 3º.
- [ ] ⚠️ Límite: ¿el mensaje/paywall aparece bien?

## 4. Plantas
- [ ] Añadir planta manual (cultivo, nombre, variedad, fecha siembra, estado, foto).
- [ ] Añadir vía **scan IA** → autorrellena → guardar → sale de la pantalla (arreglado).
- [ ] Foto se ve **al instante** al añadirla (recién arreglado).
- [ ] Editar planta (incl. cambiar foto).
- [ ] Borrar planta → borra sus entradas/recordatorios.
- [ ] Estados de planta (semillero→cosecha) y su color/emoji.
- [ ] Cultivos personalizados (crear, usar, borrar).
- [ ] Siembra escalonada (succession).

## 5. Diario
- [ ] Crear entrada de cada tipo (riego, cosecha, abono, poda, plaga, tratamiento, nota, foto).
- [ ] Riego con litros/método. Cosecha con peso/unidades/calidad.
- [ ] Foto en entrada se ve al instante.
- [ ] Editar / borrar entrada.
- [ ] Filtros del diario por tipo.
- [ ] ⚠️ Fechas de entrada (hoy/ayer/manual) → formato y validación.

## 6. Mapa del huerto
- [ ] Drag & drop de plantas (long-press).
- [ ] Badge Nx por celda.
- [ ] Overlay compañeros/combativos (✓/✗) entre celdas adyacentes.
- [ ] Cambiar tamaño de cuadrícula (presets) → no se pierden plantas colocadas.
- [ ] Tutorial del mapa (si existe) primera vez.

## 7. Recordatorios y notificaciones
- [ ] Crear recordatorio (diario / semanal / una vez) → llega la notificación a su hora.
- [ ] ⚠️ "Semanal" está fijado a un día concreto (lunes) — no se elige día. ¿Tiene sentido?
- [ ] Editar / borrar recordatorio → se cancela su notificación.
- [ ] Alerta de helada (zona con frío) → llega 1 vez por evento (no spam).
- [ ] Alertas estacionales (siembra mensual) → texto en el idioma elegido.
- [ ] Notifs de planta (trasplante/cosecha/tratamiento) → idioma correcto.
- [ ] ⚠️ Notifs solo del huerto ACTIVO: al cambiar de huerto se reprograman; los del otro huerto se pierden. ¿Esperado?

## 8. IA (Pro)
- [ ] Scan de planta → identifica y autorrellena.
- [ ] Diagnóstico de plaga → resultado coherente, en tu idioma.
- [ ] Gate Pro: usuario free → paywall.
- [ ] Sin red → error controlado (no crash).

## 9. Pro / Paywall / compras
- [ ] Ver features bloqueadas (costes, CSV, IA, gamificación, etc.).
- [ ] Paywall: planes mensual/anual, precios correctos.
- [ ] Comprar (sandbox) → desbloquea Pro.
- [ ] Restaurar compra.
- [ ] Switch "recuérdame antes de que acabe la prueba" → programa notif.
- [ ] ⚠️ `EXPO_PUBLIC_DEV_PRO` debe ser `false` en el build de producción.

## 10. Sync multi-dispositivo
- [ ] Crear datos en móvil A → aparecen en móvil B tras sync.
- [ ] Borrar en A → desaparece en B (soft-delete cross-device).
- [ ] Editar offline → al reconectar se sube (no se pierde).
- [ ] Borrar offline → no "resucita" al reconectar.
- [ ] **Fotos** sincronizan: añadir foto en A → verla en B (tras sync).
- [ ] ⚠️ Fotos antiguas (file://) se suben en el próximo sync; offline la 1ª carga puede no verse si depende de red.

## 11. Backup / export
- [ ] Export JSON (backup) + import en otro dispositivo.
- [ ] Auto-backup al ir a background.
- [ ] Export CSV del diario (Pro).
- [ ] Export PDF (Pro) → datos y formato correctos.
- [ ] Borrar todos los datos → limpia local + nube + reinicia onboarding.

## 12. Idiomas (i18n)
- [ ] Cambiar entre es/en/ca/eu/gl/val → toda la UI traducida.
- [ ] Notificaciones (helada, estacional, planta) en el idioma elegido.
- [ ] ⚠️ Buscar textos hardcoded sin traducir (etiquetas de estado de planta, configs).

## 13. Otras pantallas
- [ ] Stats (cosecha, kg/año, rachas).
- [ ] Costes / ROI (Pro).
- [ ] Calendario (siembra/cosecha, hemisferio sur).
- [ ] Catálogo de cultivos (imágenes, chips de meses).
- [ ] Guía de enfermedades / asociaciones / rotación.
- [ ] Calendario lunar (coherencia de fase/día).

## 14. Cosas que ya sé que faltan / no tienen sentido (decidir antes de lanzar)
- [ ] **Rating prompt** — no existe. Añadir `expo-store-review` tras 1ª cosecha (palanca ASO).
- [ ] **Recetas IA + tab Explore** — planeado (Sprint 9) pero NO construido. ¿Entra en v1 o v1.1?
- [ ] **Source maps de Sentry** — sin configurar; los crashes saldrán con stack minificado hasta configurarlo en eas build.
- [ ] **Botón azul de Expo Go** — NO es bug, es el menú de dev; no sale en build publicado.
- [ ] **SMTP propio** en Supabase (Resend) para emails de auth en producción.
- [ ] **Clear cache con tamaño** (idea de GrowIt) — no existe.
- [ ] Revisar **assets de App Store**: icono, capturas, descripción, política de privacidad, URL de soporte.

---

## Cómo reportarme los fallos
Por cada caso raro: **pantalla + qué hiciste + qué esperabas + qué pasó** (captura si puedes). Los agrupo y arreglo por tandas.
