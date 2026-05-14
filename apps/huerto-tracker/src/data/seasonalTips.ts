import type { ClimateZone } from '../models/garden';

interface SeasonalTip {
  emoji: string;
  text: string;
}

// Tips indexed by [zone][month 1-12]
const TIPS: Record<ClimateZone, SeasonalTip[]> = {
  atlantica: [
    { emoji: '🧤', text: 'Aprovecha los días sin lluvia para labrar y preparar la tierra.' },
    { emoji: '🌱', text: 'Siembra patatas y coles en el exterior cuando el suelo supere los 5°C.' },
    { emoji: '🪴', text: 'Es el momento de trasplantar los semilleros de tomate y pimiento al interior.' },
    { emoji: '🌧️', text: 'Aprovecha la lluvia para plantar judías verdes y guisantes.' },
    { emoji: '🐝', text: 'Siembra calabacín y pepino al exterior; cuida los polinizadores.' },
    { emoji: '💧', text: 'Riega al atardecer para evitar la evaporación; protege los frutos del exceso de humedad.' },
    { emoji: '🍅', text: 'Recoge tomates y pimientos antes de que lleguen lluvias intensas.' },
    { emoji: '🧺', text: 'Mes de máxima cosecha: recoge regularmente para estimular más producción.' },
    { emoji: '🥬', text: 'Siembra espinacas, acelgas y lechugas de otoño.' },
    { emoji: '🧄', text: 'Planta ajos y cebollas de invierno antes de las primeras heladas.' },
    { emoji: '♻️', text: 'Incorpora compost al suelo para mejorar la estructura para el año siguiente.' },
    { emoji: '📋', text: 'Planifica el huerto de la próxima temporada y pide semillas por catálogo.' },
  ],
  mediterranea: [
    { emoji: '🫑', text: 'Siembra en semillero interior pimiento y berenjena; aún hay riesgo de heladas en el exterior.' },
    { emoji: '🌿', text: 'Trasplanta fresas y planta habas; el tiempo fresco las favorece.' },
    { emoji: '🌱', text: 'Siembra tomate en semillero; trasplanta lechugas y coles al exterior.' },
    { emoji: '🌸', text: 'Trasplanta el tomate y el pimiento al exterior cuando las noches superen los 10°C.' },
    { emoji: '💧', text: 'Instala goteo antes del calor; siembra judías verdes y calabacín.' },
    { emoji: '☀️', text: 'Recoge ajos y cebollas; acochala para conservar la humedad del suelo.' },
    { emoji: '🍅', text: 'Máxima producción de tomate: cosecha a diario para estimular nuevos frutos.' },
    { emoji: '🧺', text: 'Siembra judías de verano y prepara el bancal de otoño en zonas con sombra.' },
    { emoji: '🥬', text: 'Siembra acelgas, espinacas y lechugas de otoño; el calor remite.' },
    { emoji: '🧄', text: 'Planta ajos y cebollas; prepara bancales con abono para el invierno.' },
    { emoji: '🥦', text: 'Trasplanta brócoli y coliflor; las lluvias otoñales ayudan al arraigo.' },
    { emoji: '📋', text: 'Protege las plantas sensibles del frío y planifica la rotación de cultivos.' },
  ],
  continental: [
    { emoji: '🌡️', text: 'Prepara semilleros en interior; el frío todavía impide sembrar en exterior.' },
    { emoji: '🌱', text: 'Inicia semilleros de tomate, pimiento y berenjena bajo cubierta.' },
    { emoji: '🪴', text: 'Trasplanta lechugas y guisantes; espera a que no haya heladas.' },
    { emoji: '🌸', text: 'Siembra judías y acelgas en exterior; trasplanta tomate solo si no hay riesgo de helada.' },
    { emoji: '💧', text: 'Riega con regularidad: las noches todavía son frescas pero el día puede ser caluroso.' },
    { emoji: '☀️', text: 'Cosecha ajos y cebollas tempranas; mantén el riego en épocas de sequía.' },
    { emoji: '🍅', text: 'Recoge tomates y cucurbitáceas; extrema el riego en días de más de 35°C.' },
    { emoji: '🧺', text: 'Siembra espinacas y lechugas tardías; cosecha intensiva de verano.' },
    { emoji: '🥬', text: 'El calor remite: siembra coles, brócoli y acelgas.' },
    { emoji: '🧄', text: 'Planta ajos de invierno; limpia bancales y aplica compost.' },
    { emoji: '🥦', text: 'Cosecha tardía de coles; cubre con manta térmica si hay heladas.' },
    { emoji: '❄️', text: 'Protege las plantas más sensibles; planifica la rotación del año siguiente.' },
  ],
  subtropical: [
    { emoji: '🌿', text: 'Siembra tomates, pimientos y pepinos: las temperaturas son ideales.' },
    { emoji: '🍓', text: 'Planta fresas y siembra lechugas; el clima templado favorece el arraigo.' },
    { emoji: '🌱', text: 'Trasplanta cucurbitáceas; aprovecha las lluvias de primavera si las hay.' },
    { emoji: '💧', text: 'Aumenta el riego a medida que sube la temperatura; acochala para retener humedad.' },
    { emoji: '☀️', text: 'Protege los cultivos del exceso de sol con malla de sombreo.' },
    { emoji: '🌊', text: 'Temporada de lluvias: riega con moderación y vigila hongos.' },
    { emoji: '🌧️', text: 'Máximas precipitaciones: buen drenaje es clave; cosecha antes de podredumbres.' },
    { emoji: '🌤️', text: 'Siembra judías y maíz dulce; las noches cálidas favorecen la germinación.' },
    { emoji: '🧺', text: 'Cosecha de verano tardío; siembra lechugas y espinacas a la sombra.' },
    { emoji: '🌱', text: 'Tiempo fresco: ideal para crucíferas, zanahorias y remolachas.' },
    { emoji: '🥬', text: 'Siembra coles y brócoli; las temperaturas frescas mejoran el sabor.' },
    { emoji: '🌿', text: 'Cosecha y planifica: las plantas de verano terminan su ciclo.' },
  ],
};

export function getSeasonalTip(zone: ClimateZone, month: number): SeasonalTip {
  const tips = TIPS[zone];
  return tips[(month - 1) % 12];
}
