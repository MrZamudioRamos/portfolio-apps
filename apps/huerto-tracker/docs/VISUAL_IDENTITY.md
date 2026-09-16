# Identidad visual — "Fresco y amable"

Dirección elegida para el lavado de cara: **fresco, alegre, redondeado, accesible**.
Verdes vivos + lima + sol, ilustraciones flat, tipografía redondeada (Nunito).
Objetivo: percepción de calidad alta y cercanía para principiantes, con sello
propio frente al verde americano de GrowIt.

## Paleta (implementada en `packages/ui/src/theme/colors.ts`)

| Rol            | Light      | Dark       |
|----------------|------------|------------|
| primary        | `#43A047`  | `#7CC47F`  |
| primaryLight   | `#8BC34A`  | `#A5D6A7`  |
| primaryDark    | `#2E7D32`  | `#43A047`  |
| accent (lima)  | `#C7E85B`  | `#D8F27A`  |
| secondary (sol)| `#FBC02D`  | `#FFD54F`  |
| background     | `#F7FBF1`  | `#0D160D`  |
| surface        | `#FFFFFF`  | `#162516`  |
| surfaceAlt     | `#EEF7DF`  | `#1C2E1C`  |
| border         | `#D6EBC2`  | `#2C402C`  |
| text           | `#16240F`  | `#ECF7E9`  |
| warning        | `#E65100`  | `#FFB74D`  |
| error          | `#E5533D`  | `#EF6E5B`  |

Notas:
- El **amarillo sol** es acento (badges, destacados), NO para texto sobre blanco
  (ilegible). Úsalo sobre fondos de color o en chips.
- El fondo light lleva una pizca de lima (`#F7FBF1`) para que las cards blancas
  resalten sin sombra dura.
- Dark mode verde-casi-negro se mantiene (se veía premium).
- El **acento lima** ya está modelado como `accent` en `AppColors` y se usa en
  tarjetas de consejo, selección y estados destacados. En dark mode se adapta a
  `#AED581` para conservar contraste.

## Roadmap del lavado de cara (por impacto)

1. ✅ **Paleta** refinada y aplicada como fuente de verdad.
2. ✅ **Tipografía Nunito** — cargada en `_layout` y aplicada a la interfaz.
3. ✅ **Estados vacíos** — las rutas revisadas usan `Illustration` o iconografía
   nativa; los emojis restantes son contenido agrícola, no placeholders genéricos.
4. ✅ **App icon + splash** con la marca Semilla en `app.json`.
5. ✅ **Nombre único + logo** — la app usa Semilla de forma consistente en la
   configuración y el shell principal.
6. ⬜ **Micro-interacciones**: animación/haptic al añadir planta, confeti en 1ª
   cosecha, transición de tabs. Sello de "app cuidada".
7. ✅ **Pase de consistencia**: jerarquía de títulos, espaciado, botones, chips,
   iconografía y objetivos táctiles revisados para el lenguaje de Stitch.

## Pendiente operativo

- Completar el smoke físico en iPhone/Expo Go.
- Aplicar la migración de catálogo de Supabase cuando se autorice.
- Valorar micro-interacciones adicionales después de cerrar la paridad funcional.
