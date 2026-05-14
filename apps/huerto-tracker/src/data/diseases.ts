export type DiseaseType = 'plaga' | 'enfermedad' | 'deficiencia';

export interface Treatment {
  type: 'organico' | 'preventivo' | 'quimico';
  name: string;
  instructions: string;
}

export interface DiseaseInfo {
  id: string;
  name: string;
  type: DiseaseType;
  emoji: string;
  severity: 1 | 2 | 3;
  affectedCrops: string[];
  symptoms: string;
  visualSigns: string[];
  description: string;
  treatments: Treatment[];
  imageUrl?: string;
}

export const DISEASES: DiseaseInfo[] = [
  {
    id: 'mildiu',
    name: 'Mildiu',
    type: 'enfermedad',
    emoji: '🍂',
    severity: 2,
    affectedCrops: ['tomate', 'pimiento', 'pepino', 'zanahoria', 'lechuga'],
    symptoms: 'Manchas amarillas en el haz de las hojas, pelusa grisácea en el envés. Las hojas se secan y caen.',
    visualSigns: ['🟡 Manchas amarillas en haz', '🩶 Pelusa gris en envés', '🍂 Hojas que caen'],
    description: 'Enfermedad fúngica causada por Peronospora spp. Favorecida por humedad alta y temperaturas frescas.',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Downy_mildew_on_grape_leaf.jpg/640px-Downy_mildew_on_grape_leaf.jpg',
    treatments: [
      { type: 'organico', name: 'Caldo bordelés', instructions: 'Aplicar al inicio de síntomas. Repetir cada 7-10 días si persiste lluvia.' },
      { type: 'preventivo', name: 'Ventilación', instructions: 'Mejorar el espaciado entre plantas y regar al pie, nunca por encima.' },
      { type: 'quimico', name: 'Fungicida cúprico', instructions: 'Aplicar según ficha técnica, evitar en floración para proteger polinizadores.' },
    ],
  },
  {
    id: 'oidio',
    name: 'Oídio',
    type: 'enfermedad',
    emoji: '🤍',
    severity: 2,
    affectedCrops: ['calabacin', 'pepino', 'tomate', 'pimiento', 'judias'],
    symptoms: 'Polvillo blanco en hojas, tallos y frutos. Las hojas afectadas se enrollan y secan.',
    visualSigns: ['⚪ Polvillo blanco superficial', '🌀 Hojas enrolladas', '🔴 Frutos con manchas blancas'],
    description: 'Hongo superficial (Erysiphe spp.) que prospera con días cálidos y noches frías, con humedad ambiental alta.',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Powdery_mildew_on_a_cucumber_leaf.jpg/640px-Powdery_mildew_on_a_cucumber_leaf.jpg',
    treatments: [
      { type: 'organico', name: 'Leche diluida', instructions: 'Mezclar 1 parte de leche en 9 de agua y pulverizar semanalmente.' },
      { type: 'organico', name: 'Bicarbonato sódico', instructions: '5 g por litro de agua + unas gotas de jabón neutro. Pulverizar cada 7 días.' },
      { type: 'quimico', name: 'Azufre mojable', instructions: 'Aplicar a primera hora de la mañana. No usar con temperaturas > 30 °C.' },
    ],
  },
  {
    id: 'botrytis',
    name: 'Botrytis (Moho gris)',
    type: 'enfermedad',
    emoji: '🫁',
    severity: 3,
    affectedCrops: ['tomate', 'pimiento', 'fresa', 'lechuga', 'albahaca'],
    symptoms: 'Podredumbre blanda cubierta de pelusa gris-parda. Afecta tallos, hojas y frutos en condiciones húmedas.',
    visualSigns: ['🩶 Pelusa gris-parda visible', '🟤 Tejido blando podrido', '💧 Peor en zonas húmedas'],
    description: 'Botrytis cinerea es uno de los hongos más comunes en huertas. Muy activo en primavera-otoño con alta humedad.',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/Botrytis_cinerea_on_a_tomato.jpg/640px-Botrytis_cinerea_on_a_tomato.jpg',
    treatments: [
      { type: 'preventivo', name: 'Poda de partes afectadas', instructions: 'Eliminar y destruir (no compostar) tejido infectado inmediatamente.' },
      { type: 'organico', name: 'Trichoderma', instructions: 'Aplicar biofungicida a base de Trichoderma harzianum en preventivo.' },
      { type: 'quimico', name: 'Fungicida sistémico', instructions: 'Usar un rotando de materias activas para evitar resistencias.' },
    ],
  },
  {
    id: 'pulgon',
    name: 'Pulgón',
    type: 'plaga',
    emoji: '🐜',
    severity: 2,
    affectedCrops: ['tomate', 'pimiento', 'judias', 'habas', 'lechuga', 'col', 'brocoli', 'coliflor'],
    symptoms: 'Colonias de pequeños insectos (verdes, negros o grises) en brotes y envés de hojas. Hojas deformadas y presencia de melaza.',
    visualSigns: ['🐜 Colonias en brotes', '🍬 Melaza pegajosa', '🌀 Hojas deformadas', '🐜 Hormigas cerca'],
    description: 'Los pulgones chupan savia debilitando la planta y transmitiendo virus. Son atraídos por el exceso de nitrógeno.',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/Aphids_on_a_rose_bud.jpg/640px-Aphids_on_a_rose_bud.jpg',
    treatments: [
      { type: 'organico', name: 'Jabón potásico', instructions: 'Pulverizar directamente sobre las colonias, mojando bien el envés. Repetir 2-3 veces con 5 días de intervalo.' },
      { type: 'preventivo', name: 'Plantas repelentes', instructions: 'Plantar albahaca, lavanda o menta cerca para repeler pulgones.' },
      { type: 'organico', name: 'Aceite de neem', instructions: 'Mezclar 5 ml de aceite de neem emulsionado + 2 ml de jabón neutro por litro. Pulverizar al atardecer.' },
    ],
  },
  {
    id: 'mosca_blanca',
    name: 'Mosca blanca',
    type: 'plaga',
    emoji: '🦟',
    severity: 2,
    affectedCrops: ['tomate', 'pimiento', 'pepino', 'calabacin', 'col'],
    symptoms: 'Nubecitas de pequeñas moscas blancas al mover las plantas. Hojas con melaza y fumagina negra.',
    visualSigns: ['☁️ Nube blanca al mover', '⬛ Fumagina negra', '🍬 Melaza pegajosa'],
    description: 'Trialeurodes vaporariorum. Los adultos y larvas chupan savia. Ciclo corto en verano, muy difícil de erradicar.',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Whitefly_on_a_leaf.jpg/640px-Whitefly_on_a_leaf.jpg',
    treatments: [
      { type: 'organico', name: 'Trampas amarillas adhesivas', instructions: 'Colocar a la altura del follaje. Cambiar cuando estén llenas.' },
      { type: 'organico', name: 'Jabón potásico + aceite de neem', instructions: 'Mezcla sinérgica aplicada al atardecer para no perjudicar a insectos beneficiosos.' },
      { type: 'organico', name: 'Encarsia formosa', instructions: 'Parásito natural. Introducir en invernadero siguiendo las instrucciones del proveedor.' },
    ],
  },
  {
    id: 'araña_roja',
    name: 'Araña roja',
    type: 'plaga',
    emoji: '🕷️',
    severity: 3,
    affectedCrops: ['tomate', 'pimiento', 'pepino', 'fresa', 'judias'],
    symptoms: 'Punteado amarillento en hojas, telaraña fina en el envés. Hojas bronceadas y caída prematura.',
    visualSigns: ['🕸️ Telaraña fina en envés', '🟡 Punteado amarillo', '🟤 Hojas bronceadas'],
    description: 'Tetranychus urticae. Muy activa en verano con calor y sequía. Se multiplica rápidamente.',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/86/Tetranychidae_-_Tetranychus_urticae.jpg/640px-Tetranychidae_-_Tetranychus_urticae.jpg',
    treatments: [
      { type: 'preventivo', name: 'Aumentar humedad', instructions: 'Pulverizar agua en el ambiente al atardecer. No en las propias hojas.' },
      { type: 'organico', name: 'Aceite de neem', instructions: 'Aplicar en envés donde viven los ácaros. Repetir cada 5-7 días.' },
      { type: 'organico', name: 'Phytoseiulus persimilis', instructions: 'Ácaro predador. Efectivo en invernadero con temperatura > 20 °C.' },
    ],
  },
  {
    id: 'trips',
    name: 'Trips',
    type: 'plaga',
    emoji: '🪲',
    severity: 3,
    affectedCrops: ['pimiento', 'tomate', 'pepino', 'cebolla', 'ajo'],
    symptoms: 'Plateado o bronceado en hojas y frutos. Pequeños raspados. Transmite el virus del bronceado del tomate.',
    visualSigns: ['⚪ Zonas plateadas en hojas', '🟤 Frutos bronceados', '🔍 Insectos alargados < 1mm'],
    description: 'Frankiniella occidentalis. Muy difícil de controlar una vez establecido. Prefiere tiempo cálido y seco.',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/06/Thrips_tabaci_on_an_onion_leaf.jpg/640px-Thrips_tabaci_on_an_onion_leaf.jpg',
    treatments: [
      { type: 'preventivo', name: 'Trampas azules adhesivas', instructions: 'Monitorizar y detectar infestaciones tempranas.' },
      { type: 'organico', name: 'Spinosad', instructions: 'Producto de origen natural, autorizado en producción ecológica. Respetar periodos de espera.' },
      { type: 'organico', name: 'Amblyseius cucumeris', instructions: 'Ácaro predador de trips. Introducir en preventivo o al detectar primeros adultos.' },
    ],
  },
  {
    id: 'clorosis_ferrica',
    name: 'Clorosis férrica',
    type: 'deficiencia',
    emoji: '💛',
    severity: 1,
    affectedCrops: ['tomate', 'pimiento', 'fresa', 'pepino'],
    symptoms: 'Amarillamiento entre nervios de hojas jóvenes mientras los nervios permanecen verdes.',
    visualSigns: ['💛 Hoja amarilla con nervios verdes', '🌿 Solo hojas jóvenes', '🌱 Crecimiento lento'],
    description: 'Falta de hierro asimilable, normalmente por pH alto del sustrato o exceso de cal en el agua de riego.',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/Iron_chlorosis_on_a_lemon_tree.jpg/640px-Iron_chlorosis_on_a_lemon_tree.jpg',
    treatments: [
      { type: 'organico', name: 'Quelato de hierro', instructions: 'Aplicar al sustrato o foliarmente (0,5 g/L). Repetir a las 2 semanas si es necesario.' },
      { type: 'preventivo', name: 'Acidificar el riego', instructions: 'Añadir unas gotas de vinagre o ácido cítrico al agua de riego para bajar el pH a 6-6,5.' },
      { type: 'preventivo', name: 'Compost', instructions: 'La materia orgánica mejora la disponibilidad de micronutrientes en el suelo.' },
    ],
  },
  {
    id: 'carencia_calcio',
    name: 'Carencia de calcio',
    type: 'deficiencia',
    emoji: '🟤',
    severity: 2,
    affectedCrops: ['tomate', 'pimiento', 'lechuga', 'col'],
    symptoms: 'Pudrición apical en tomates y pimientos. Bordes de hojas interiores marrones en lechugas (tip burn).',
    visualSigns: ['🟤 Mancha oscura en punta del fruto', '🍅 Base del tomate negra', '🥬 Bordes marrones en lechuga'],
    description: 'La necrosis apical no es falta de calcio en el suelo, sino falta de transporte por riego irregular o exceso de potasio.',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/98/Blossom_end_rot_on_a_tomato.jpg/640px-Blossom_end_rot_on_a_tomato.jpg',
    treatments: [
      { type: 'preventivo', name: 'Riego regular', instructions: 'Mantener humedad constante en el sustrato evitando ciclos de sequía y encharcamiento.' },
      { type: 'organico', name: 'Foliar de calcio', instructions: 'Pulverizar nitrato cálcico diluido (0,2%) directamente sobre los frutos afectados.' },
      { type: 'preventivo', name: 'Acolchado', instructions: 'El mulching reduce la evaporación y estabiliza la humedad del suelo.' },
    ],
  },
];

export const DISEASES_BY_ID: Record<string, DiseaseInfo> = Object.fromEntries(
  DISEASES.map((d) => [d.id, d])
);
