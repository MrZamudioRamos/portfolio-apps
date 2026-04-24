export interface PestInfo {
  id: string;
  name: string;
  emoji: string;
  symptoms: string;
  affectedCrops: string[]; // crop IDs, empty = all
  treatments: TreatmentInfo[];
}

export interface TreatmentInfo {
  name: string;
  type: 'preventivo' | 'organico' | 'quimico';
  instructions: string;
}

export const PESTS: PestInfo[] = [
  {
    id: 'pulgon',
    name: 'Pulgón',
    emoji: '🐜',
    symptoms: 'Colonias de insectos pequeños (verde, negro o blanco) en brotes tiernos y envés de hojas. Hojas enrrolladas o deformadas. Excreción pegajosa (melaza).',
    affectedCrops: ['tomate', 'pimiento', 'berenjena', 'lechuga', 'judia-verde', 'guisante', 'haba', 'cebolla'],
    treatments: [
      { name: 'Jabón potásico', type: 'organico', instructions: 'Diluye 10 ml/L de agua. Pulveriza hojas y envés por la mañana, 2-3 veces por semana hasta eliminación.' },
      { name: 'Aceite de neem', type: 'organico', instructions: 'Mezcla 5 ml de aceite de neem con 1 L de agua y unas gotas de jabón. Aplica al atardecer para no dañar hojas con el sol.' },
      { name: 'Mariquitas', type: 'preventivo', instructions: 'Planta albahaca, caléndula o aneto cerca para atraer depredadores naturales del pulgón.' },
    ],
  },
  {
    id: 'arana-roja',
    name: 'Araña roja',
    emoji: '🕷️',
    symptoms: 'Puntos amarillos o blancos en el haz de las hojas. Tela fina en el envés. Hojas con aspecto bronceado o que caen prematuramente. Peor con calor y sequedad.',
    affectedCrops: ['tomate', 'pimiento', 'berenjena', 'pepino', 'fresa'],
    treatments: [
      { name: 'Aumentar humedad', type: 'preventivo', instructions: 'Pulveriza agua en el envés de las hojas a diario. La araña roja odia la humedad. Ventila el cultivo.' },
      { name: 'Aceite de neem', type: 'organico', instructions: 'Aplica al atardecer diluyendo 5 ml/L con jabón neutro. Repite cada 5 días hasta que desaparezca.' },
      { name: 'Predador Phytoseiulus', type: 'organico', instructions: 'Introduce el ácaro depredador Phytoseiulus persimilis en verano. Muy efectivo en invernadero.' },
    ],
  },
  {
    id: 'mosca-blanca',
    name: 'Mosca blanca',
    emoji: '🦟',
    symptoms: 'Nubecillas de insectos blancos que vuelan al sacudir las plantas. Hojas amarillas con melaza pegajosa. Fumagina (hongo negro) sobre la melaza.',
    affectedCrops: ['tomate', 'pimiento', 'pepino', 'berenjena', 'lechuga'],
    treatments: [
      { name: 'Trampas amarillas pegajosas', type: 'preventivo', instructions: 'Coloca trampas cromáticas amarillas a la altura del cultivo. Cambia cada 2 semanas.' },
      { name: 'Jabón potásico', type: 'organico', instructions: 'Pulveriza jabón potásico (15 ml/L) en el envés, especialmente en estadios juveniles. 3 veces/semana.' },
      { name: 'Aceite de neem', type: 'organico', instructions: 'Aplica al atardecer para interrumpir el ciclo de reproducción. Efectivo en todos los estadios.' },
    ],
  },
  {
    id: 'caracol',
    name: 'Caracol / Babosa',
    emoji: '🐌',
    symptoms: 'Mordiscos irregulares en hojas y frutos, especialmente en bordes. Rastro brillante de moco. Mayor actividad nocturna y en días húmedos.',
    affectedCrops: ['lechuga', 'espinaca', 'fresa', 'acelga', 'rucula', 'canonigos'],
    treatments: [
      { name: 'Trampas de cerveza', type: 'organico', instructions: 'Entierra recipientes pequeños con cerveza al ras del suelo. Los caracoles caen atraídos por el olor.' },
      { name: 'Ceniza o cáscara de huevo', type: 'preventivo', instructions: 'Rodea las plantas con ceniza de madera o cáscara de huevo machacada. Renuevar tras lluvia.' },
      { name: 'Recolección manual', type: 'organico', instructions: 'Busca caracoles por la noche con linterna. Colócalos lejos del huerto o en agua con sal.' },
    ],
  },
  {
    id: 'oruga',
    name: 'Oruga / Polilla',
    emoji: '🐛',
    symptoms: 'Hojas con agujeros grandes o parcialmente devoradas. Presencia de excrementos (bolitas negras). Orugas visibles en el interior de frutos o enrolladas en hojas.',
    affectedCrops: ['brocoli', 'col', 'coliflor', 'kale', 'tomate', 'pimiento'],
    treatments: [
      { name: 'Bacillus thuringiensis (Bt)', type: 'organico', instructions: 'Bactericida natural específico para orugas. Pulveriza en hojas al atardecer, las orugas lo ingieren al comer.' },
      { name: 'Malla antiinsectos', type: 'preventivo', instructions: 'Cubre las crucíferas con malla antiinsectos desde el trasplante para evitar la puesta de mariposas.' },
      { name: 'Recolección manual', type: 'organico', instructions: 'Revisa las plantas de mañana y tarde. Aplasta los huevos (grupos de escamas en el envés) y recoge orugas.' },
    ],
  },
  {
    id: 'trips',
    name: 'Trips',
    emoji: '🦗',
    symptoms: 'Plateado o bronceado en hojas y pétalos. Puntitos negros (excrementos). Flores deformadas. Insectos muy pequeños (1-2 mm) difíciles de ver a simple vista.',
    affectedCrops: ['pimiento', 'cebolla', 'ajo', 'fresa', 'tomate'],
    treatments: [
      { name: 'Trampas azules pegajosas', type: 'preventivo', instructions: 'Los trips se atraen por el color azul. Coloca trampas azules cromáticas a nivel de las flores.' },
      { name: 'Aceite de neem', type: 'organico', instructions: 'Aplica al atardecer con buena cobertura del envés. Repite cada 5-7 días durante 3 semanas.' },
      { name: 'Riego por aspersión', type: 'preventivo', instructions: 'Mojar bien las plantas con agua fría reduce la población de trips, que prefieren ambiente seco.' },
    ],
  },
  {
    id: 'minador',
    name: 'Minador de hojas',
    emoji: '🍃',
    symptoms: 'Galerías o túneles sinuosos de color blanco/amarillo en el interior de las hojas. Larvas visibles al trasluz dentro de la galería.',
    affectedCrops: ['tomate', 'pimiento', 'berenjena', 'espinaca', 'acelga'],
    treatments: [
      { name: 'Eliminar hojas afectadas', type: 'organico', instructions: 'Retira y destruye (no compostes) todas las hojas con galerías. Reduce la población de pupas.' },
      { name: 'Trampas amarillas', type: 'preventivo', instructions: 'Atrapa a los adultos con trampas cromáticas amarillas antes de que pongan huevos.' },
      { name: 'Aceite de neem preventivo', type: 'preventivo', instructions: 'Aplica en primavera antes de la aparición de síntomas para desincentivar la puesta.' },
    ],
  },
  {
    id: 'oidio',
    name: 'Oídio (hongo)',
    emoji: '🍄',
    symptoms: 'Polvo blanco harinoso en hojas y tallos, primero en manchas y luego cubriendo toda la hoja. Hojas que amarillean y caen. Más frecuente con calor y noches frescas.',
    affectedCrops: ['calabacin', 'pepino', 'calabaza', 'melon', 'tomate'],
    treatments: [
      { name: 'Bicarbonato sódico', type: 'organico', instructions: 'Diluye 1 cucharadita de bicarbonato + unas gotas de jabón en 1 L de agua. Pulveriza las hojas afectadas.' },
      { name: 'Leche + agua', type: 'organico', instructions: 'Mezcla 1 parte de leche con 9 partes de agua. Pulveriza en hojas. Algunos estudios muestran eficacia similar al fungicida.' },
      { name: 'Ventilación y espaciado', type: 'preventivo', instructions: 'Poda hojas basales para mejorar la circulación de aire. No mojes el follaje al regar.' },
    ],
  },
];

export const PESTS_BY_ID = Object.fromEntries(PESTS.map((p) => [p.id, p]));

export function getPestsForCrop(cropId: string): PestInfo[] {
  return PESTS.filter((p) => p.affectedCrops.length === 0 || p.affectedCrops.includes(cropId));
}

export const PEST_STATUS_CONFIG = {
  none:    { label: 'Sin plagas',    emoji: '✅', color: '#4CAF50' },
  active:  { label: 'Plaga activa',  emoji: '🐛', color: '#EF5350' },
  treated: { label: 'En tratamiento', emoji: '🧴', color: '#FF9800' },
} as const;
