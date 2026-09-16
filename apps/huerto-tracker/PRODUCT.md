# Product

<!-- impeccable:product-schema 1 -->

## Platform

ios

## Users

Personas que cultivan en huerto, terraza, balcón o interior y necesitan saber qué hacer hoy sin tener experiencia avanzada.

## Product Purpose

Semilla ayuda a planificar, registrar y cuidar cultivos de forma gradual. El éxito es que una persona pueda pasar de su espacio y primer cultivo a una acción de cuidado concreta, entendiendo por qué debe hacerla.

## Positioning

Su mecanismo diferencial es el cuidado basado en observación: la app prioriza comprobar el sustrato a 2 cm antes de recomendar riego y convierte esa observación en un seguimiento útil, en lugar de presentar recordatorios de riego como certezas.

## Operating Context

Se usa principalmente en el propio huerto, con una mano y sesiones breves. La persona consulta Hoy, revisa el mapa o una planta concreta, registra observaciones y vuelve a la app para calendario, recordatorios y seguimiento.

## Capabilities and Constraints

- React Native con Expo Router y Expo Go.
- Navegación principal de cuatro pestañas: Hoy, Mapa, Plantas y Calendario.
- Flujos de bienvenida, autenticación, onboarding, primer cultivo, cuidado diario, plantas, cultivos, jardines, diario, calendario, herramientas, ajustes y sus superficies Pro.
- El registro de riego requiere una comprobación previa del sustrato; una comprobación de humedad no se convierte en un riego ficticio.
- Deben conservarse los modelos, datos, almacenamiento, sincronización y servicios compatibles; la interfaz anterior no es una fuente de diseño.
- Los estados de carga, vacío, error y contenido forman parte de cada pantalla.

## Brand Commitments

- El producto se llama Semilla y la experiencia de huerto usa la identidad Huerto Fresco.
- La referencia visual y de contenido aprobada para esta migración es el proyecto `Semilla Gardening Mobile App` de Google Stitch.

## Evidence on Hand

- Proyecto Stitch generado y revisado por el usuario: `https://stitch.withgoogle.com/projects/1105888728653066463?pli=1`.
- Especificación técnica de Stitch con rutas, tokens, comportamiento care-first y requisitos de accesibilidad.
- Implementación existente en `apps/huerto-tracker`, que aporta lógica, modelos, datos y servicios reutilizables.

## Product Principles

- Observa antes de actuar.
- Da un siguiente paso claro, no una lista de obligaciones.
- Empieza pequeño y adapta la recomendación al contexto real.
- Haz visible el estado sin inventar certezas.
- La navegación y los controles deben sentirse nativos en iOS.

## Accessibility & Inclusion

- Controles táctiles principales de al menos 44 pt.
- Alternativa de lista para la información espacial del mapa.
- Etiquetas, estados seleccionados, estados de carga y errores anunciables para VoiceOver.
- Soporte existente de idiomas es/en/ca/val/eu/gl y de modo oscuro donde corresponda.
