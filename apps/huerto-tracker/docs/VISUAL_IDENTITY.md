# Identidad visual — "Fresco y amable"

Dirección elegida para el lavado de cara: **fresco, alegre, redondeado, accesible**.
Verdes vivos + lima + sol, ilustraciones flat, tipografía redondeada (Nunito).
Objetivo: percepción de calidad alta y cercanía para principiantes, con sello
propio frente al verde americano de GrowIt.

## Paleta (implementada en `packages/ui/src/theme/colors.ts`)

| Rol            | Light      | Dark       |
|----------------|------------|------------|
| primary        | `#43A047`  | `#7CC47F`  |
| primaryLight   | `#76C77A`  | `#A5D6A7`  |
| primaryDark    | `#2E7D32`  | `#43A047`  |
| secondary (sol)| `#FBC02D`  | `#FFD54F`  |
| background     | `#F7FBF1`  | `#0D160D`  |
| surface        | `#FFFFFF`  | `#162516`  |
| surfaceAlt     | `#EEF7DF`  | `#1C2E1C`  |
| border         | `#D6EBC2`  | `#2C402C`  |
| text           | `#16240F`  | `#ECF7E9`  |
| warning        | `#FB8C00`  | `#FFB74D`  |
| error          | `#E5533D`  | `#EF6E5B`  |

Notas:
- El **amarillo sol** es acento (badges, destacados), NO para texto sobre blanco
  (ilegible). Úsalo sobre fondos de color o en chips.
- El fondo light lleva una pizca de lima (`#F7FBF1`) para que las cards blancas
  resalten sin sombra dura.
- Dark mode verde-casi-negro se mantiene (se veía premium).
- Falta un **acento lima** dedicado (`#AEEA00`) — hoy no hay campo `accent` en
  `AppColors`; si lo queremos como color propio habría que añadir el campo y
  mapearlo en las 5 paletas. Pendiente decidir.

## Roadmap del lavado de cara (por impacto)

1. ✅ **Paleta** refinada (este commit).
2. ⬜ **Tipografía Nunito** — `@expo-google-fonts/nunito` + `expo-font`, cargar en
   `_layout`, mapear pesos (Regular/SemiBold/Bold/ExtraBold) a familias y
   aplicarla globalmente. (Trabajo medio: el peso en RN necesita familia por
   peso, no `fontWeight`.)
3. ⬜ **Ilustraciones flat** para estados vacíos (hoy emoji pelado 🌱). El mayor
   salto de calidad percibida. Fuente: Storyset/unDraw recoloreado a la paleta,
   o set propio. Sustituir en: home empty, sin huertos, sin entradas, error scan,
   not-found, onboarding.
4. ⬜ **App icon + splash** con la marca (semilla/hoja) y color firma.
5. ⬜ **Nombre único + logo** — hoy baila (Mi Huerto / Semilla / HuertoTracker /
   semillaapp.app). Decidir UNO y aplicarlo en app.json, splash, store.
6. ⬜ **Micro-interacciones**: animación/haptic al añadir planta, confeti en 1ª
   cosecha, transición de tabs. Sello de "app cuidada".
7. ⬜ **Pase de consistencia**: jerarquía de títulos (más grandes/bold), ritmo de
   espaciado, estilo único de botones y chips.

## Decisiones abiertas para el usuario
- ¿Nombre definitivo? (afecta icon, splash, store, scheme).
- ¿Añadimos campo `accent` (lima) a la paleta para un pop extra?
- ¿Ilustraciones: banco gratis recoloreado vs encargar set propio?
