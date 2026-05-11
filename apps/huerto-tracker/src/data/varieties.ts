export interface VarietyInfo {
  id: string;
  cropId: string;
  name: string;
  daysToHarvest: [number, number];
  description: string;
}

export const VARIETIES: VarietyInfo[] = [
  // ── TOMATE ──────────────────────────────────────────────────────────────
  { id: 'tomate-cherry',        cropId: 'tomate', name: 'Cherry',          daysToHarvest: [55, 65],  description: 'Pequeños y muy dulces. Alta producción.' },
  { id: 'tomate-pera',          cropId: 'tomate', name: 'Pera / Roma',     daysToHarvest: [70, 80],  description: 'Carnoso, ideal para salsas y conservas.' },
  { id: 'tomate-raf',           cropId: 'tomate', name: 'Raf',             daysToHarvest: [75, 90],  description: 'Muy sabroso, piel rugosa. Requiere suelo frío.' },
  { id: 'tomate-kumato',        cropId: 'tomate', name: 'Kumato',          daysToHarvest: [65, 75],  description: 'Color marrón oscuro, sabor intenso y dulce.' },
  { id: 'tomate-corazon-buey',  cropId: 'tomate', name: 'Corazón de Buey', daysToHarvest: [80, 95],  description: 'Grande y carnoso, poco zumo. Para ensaladas.' },
  { id: 'tomate-rama',          cropId: 'tomate', name: 'En rama',         daysToHarvest: [60, 75],  description: 'Se cosecha en racimos. Larga vida post-cosecha.' },

  // ── PIMIENTO ────────────────────────────────────────────────────────────
  { id: 'pimiento-padron',      cropId: 'pimiento', name: 'Padrón',        daysToHarvest: [60, 70],  description: 'Pequeño, para freír. "Unos pican, otros no."' },
  { id: 'pimiento-italiano',    cropId: 'pimiento', name: 'Italiano',      daysToHarvest: [65, 80],  description: 'Alargado y dulce, muy productivo.' },
  { id: 'pimiento-california',  cropId: 'pimiento', name: 'California / Morrón', daysToHarvest: [70, 85], description: 'Grande y cuadrado, verde/rojo/amarillo.' },
  { id: 'pimiento-piquillo',    cropId: 'pimiento', name: 'Piquillo',      daysToHarvest: [75, 90],  description: 'Típico de Navarra, para asar y conservar.' },
  { id: 'pimiento-guindilla',   cropId: 'pimiento', name: 'Guindilla',     daysToHarvest: [65, 75],  description: 'Picante alargado. Ideal para encurtir.' },

  // ── BERENJENA ───────────────────────────────────────────────────────────
  { id: 'berenjena-negra',      cropId: 'berenjena', name: 'Negra Larga',  daysToHarvest: [65, 80],  description: 'La más común en España. Carne firme y suave.' },
  { id: 'berenjena-italiana',   cropId: 'berenjena', name: 'Italiana',     daysToHarvest: [60, 75],  description: 'Más pequeña y dulce, menos semillas.' },
  { id: 'berenjena-blanca',     cropId: 'berenjena', name: 'Blanca',       daysToHarvest: [70, 85],  description: 'Sabor más suave, sin amargor.' },
  { id: 'berenjena-rayada',     cropId: 'berenjena', name: 'Rayada',       daysToHarvest: [65, 80],  description: 'Piel morada y blanca, muy ornamental.' },

  // ── PEPINO ──────────────────────────────────────────────────────────────
  { id: 'pepino-espanol',       cropId: 'pepino', name: 'Largo español',   daysToHarvest: [50, 60],  description: 'Piel rugosa, el más común en mercados españoles.' },
  { id: 'pepino-holandes',      cropId: 'pepino', name: 'Holandés',        daysToHarvest: [45, 55],  description: 'Liso y fino, sin amargor. Para invernadero.' },
  { id: 'pepino-mini',          cropId: 'pepino', name: 'Mini / Snack',    daysToHarvest: [45, 55],  description: 'Pequeño y crujiente, ideal para picar.' },
  { id: 'pepino-encurtir',      cropId: 'pepino', name: 'Para encurtir',   daysToHarvest: [50, 60],  description: 'Corto y firme. Perfecto para pickles.' },

  // ── CALABACÍN ───────────────────────────────────────────────────────────
  { id: 'calabacin-verde',      cropId: 'calabacin', name: 'Verde italiano', daysToHarvest: [45, 55], description: 'El clásico. Alta productividad, cosechar joven.' },
  { id: 'calabacin-amarillo',   cropId: 'calabacin', name: 'Amarillo',     daysToHarvest: [48, 58],  description: 'Suave y ligeramente más dulce que el verde.' },
  { id: 'calabacin-redondo',    cropId: 'calabacin', name: 'Redondo',      daysToHarvest: [50, 60],  description: 'Ideal para rellenar. Aspecto decorativo.' },

  // ── CALABAZA ────────────────────────────────────────────────────────────
  { id: 'calabaza-cacahuete',   cropId: 'calabaza', name: 'Cacahuete (Butternut)', daysToHarvest: [100, 120], description: 'Muy dulce y cremosa. Excelente para sopas.' },
  { id: 'calabaza-hokkaido',    cropId: 'calabaza', name: 'Hokkaido',      daysToHarvest: [90, 110], description: 'Pequeña, piel comestible, sabor a castañas.' },
  { id: 'calabaza-halloween',   cropId: 'calabaza', name: 'Jack-o-Lantern', daysToHarvest: [100, 120], description: 'Grande y naranja. También comestible.' },

  // ── MELÓN ───────────────────────────────────────────────────────────────
  { id: 'melon-piel-sapo',      cropId: 'melon', name: 'Piel de Sapo',    daysToHarvest: [85, 100], description: 'El más popular en España. Blanco y dulce.' },
  { id: 'melon-cantalupo',      cropId: 'melon', name: 'Cantalupo',       daysToHarvest: [75, 90],  description: 'Anaranjado y muy aromático. Corto ciclo.' },
  { id: 'melon-galia',          cropId: 'melon', name: 'Galia',           daysToHarvest: [80, 95],  description: 'Piel reticulada verde-amarilla. Muy dulce.' },

  // ── SANDÍA ──────────────────────────────────────────────────────────────
  { id: 'sandia-sugar-baby',    cropId: 'sandia', name: 'Sugar Baby',     daysToHarvest: [70, 80],  description: 'Pequeña y redonda, ideal para jardín.' },
  { id: 'sandia-crimson-sweet', cropId: 'sandia', name: 'Crimson Sweet',  daysToHarvest: [80, 90],  description: 'Grande, roja intensa y muy dulce.' },
  { id: 'sandia-sin-pepitas',   cropId: 'sandia', name: 'Sin pepitas',    daysToHarvest: [75, 85],  description: 'Triploides, requieren polinizador cerca.' },

  // ── FRESA ───────────────────────────────────────────────────────────────
  { id: 'fresa-camarosa',       cropId: 'fresa', name: 'Camarosa',        daysToHarvest: [90, 120], description: 'La variedad más cultivada en Huelva. Gran sabor.' },
  { id: 'fresa-elsanta',        cropId: 'fresa', name: 'Elsanta',         daysToHarvest: [90, 110], description: 'Firme y brillante. Buena para mercado.' },
  { id: 'fresa-fresón',         cropId: 'fresa', name: 'Fresón',          daysToHarvest: [100, 130], description: 'Más grande que la fresa. Muy productivo.' },
  { id: 'fresa-silvestre',      cropId: 'fresa', name: 'Silvestre / Alpina', daysToHarvest: [60, 90], description: 'Pequeña y muy aromática. Remontante.' },

  // ── LECHUGA ─────────────────────────────────────────────────────────────
  { id: 'lechuga-batavia',      cropId: 'lechuga', name: 'Batavia',       daysToHarvest: [50, 65],  description: 'Hojas rizadas y crujientes. Resistente al calor.' },
  { id: 'lechuga-romana',       cropId: 'lechuga', name: 'Romana',        daysToHarvest: [65, 80],  description: 'Alargada, hoja firme. Ideal para César.' },
  { id: 'lechuga-iceberg',      cropId: 'lechuga', name: 'Iceberg',       daysToHarvest: [70, 85],  description: 'Muy crujiente y acogollada. Necesita frío.' },
  { id: 'lechuga-hoja-roble',   cropId: 'lechuga', name: 'Hoja de Roble', daysToHarvest: [45, 60],  description: 'Hojas decorativas, verde y roja. Suave.' },
  { id: 'lechuga-lollo-rosso',  cropId: 'lechuga', name: 'Lollo Rosso',   daysToHarvest: [45, 60],  description: 'Muy ornamental, hoja rizada morada.' },
  { id: 'lechuga-maravilla',    cropId: 'lechuga', name: 'Maravilla',     daysToHarvest: [55, 70],  description: 'Clásica española. Muy resistente y sabrosa.' },

  // ── ESPINACA ────────────────────────────────────────────────────────────
  { id: 'espinaca-giant-nobel', cropId: 'espinaca', name: 'Giant Nobel',  daysToHarvest: [40, 50],  description: 'Hojas grandes y lisas. Alta producción.' },
  { id: 'espinaca-viroflay',    cropId: 'espinaca', name: 'Viroflay',     daysToHarvest: [45, 55],  description: 'Hoja grande y oscura. Clásica para cocinar.' },
  { id: 'espinaca-baby',        cropId: 'espinaca', name: 'Baby',         daysToHarvest: [25, 35],  description: 'Cosecha en microgreens o baby leaf. Muy rápida.' },

  // ── ACELGA ──────────────────────────────────────────────────────────────
  { id: 'acelga-blanca',        cropId: 'acelga', name: 'Penca Blanca',   daysToHarvest: [50, 60],  description: 'La más común. Penca blanca y carnosa.' },
  { id: 'acelga-amarilla',      cropId: 'acelga', name: 'Amarilla',       daysToHarvest: [50, 65],  description: 'Penca amarilla, aspecto ornamental.' },
  { id: 'acelga-roja',          cropId: 'acelga', name: 'Roja (Ruby Chard)', daysToHarvest: [50, 65], description: 'Penca roja intensa. Muy decorativa.' },
  { id: 'acelga-rainbow',       cropId: 'acelga', name: 'Rainbow / Arcoíris', daysToHarvest: [50, 65], description: 'Mix de colores. Ideal para macetas.' },

  // ── ZANAHORIA ───────────────────────────────────────────────────────────
  { id: 'zanahoria-nantes',     cropId: 'zanahoria', name: 'Nantes',      daysToHarvest: [65, 75],  description: 'Cilíndrica y dulce. La más popular en España.' },
  { id: 'zanahoria-chantenay',  cropId: 'zanahoria', name: 'Chantenay',   daysToHarvest: [70, 80],  description: 'Corta y cónica. Buena para suelos pesados.' },
  { id: 'zanahoria-imperator',  cropId: 'zanahoria', name: 'Imperator',   daysToHarvest: [75, 90],  description: 'Larga y estrecha. Suelos profundos y sueltos.' },
  { id: 'zanahoria-baby',       cropId: 'zanahoria', name: 'Baby / Mini', daysToHarvest: [50, 60],  description: 'Muy pequeña, ideal para aperitivos.' },
  { id: 'zanahoria-morada',     cropId: 'zanahoria', name: 'Morada / Purple', daysToHarvest: [70, 85], description: 'Rica en antocianinas. Sabor intenso.' },

  // ── RÁBANO ──────────────────────────────────────────────────────────────
  { id: 'rabano-redondo-rojo',  cropId: 'rabano', name: 'Redondo Rojo',   daysToHarvest: [20, 30],  description: 'El más rápido. Ideal para principiantes.' },
  { id: 'rabano-largo-blanco',  cropId: 'rabano', name: 'Largo Blanco (Daikon)', daysToHarvest: [45, 60], description: 'Grande y suave. Muy popular en cocina asiática.' },
  { id: 'rabano-french-breakfast', cropId: 'rabano', name: 'French Breakfast', daysToHarvest: [22, 30], description: 'Alargado, rojo y blanco. Sabor suave.' },

  // ── REMOLACHA ───────────────────────────────────────────────────────────
  { id: 'remolacha-detroit',    cropId: 'remolacha', name: 'Detroit Red',  daysToHarvest: [55, 70],  description: 'La variedad clásica. Redonda y de color intenso.' },
  { id: 'remolacha-chioggia',   cropId: 'remolacha', name: 'Chioggia',     daysToHarvest: [55, 70],  description: 'Interior con anillos rojos y blancos.' },
  { id: 'remolacha-amarilla',   cropId: 'remolacha', name: 'Amarilla',     daysToHarvest: [55, 70],  description: 'Más dulce y suave. No mancha al cortarla.' },

  // ── PATATA ──────────────────────────────────────────────────────────────
  { id: 'patata-monalisa',      cropId: 'patata', name: 'Monalisa',        daysToHarvest: [90, 110], description: 'Semi-temprana, piel amarilla. La más vendida en España.' },
  { id: 'patata-kennebec',      cropId: 'patata', name: 'Kennebec',        daysToHarvest: [100, 120], description: 'Blanca, harinosa. Perfecta para freír.' },
  { id: 'patata-agria',         cropId: 'patata', name: 'Agria',           daysToHarvest: [95, 115], description: 'Amarilla y firme. Ideal para puré y horno.' },
  { id: 'patata-red-pontiac',   cropId: 'patata', name: 'Red Pontiac',     daysToHarvest: [95, 115], description: 'Piel roja, carne blanca. Muy productiva.' },
  { id: 'patata-ratte',         cropId: 'patata', name: 'Ratte',           daysToHarvest: [110, 130], description: 'Pequeña y alargada. Sabor muy fino, para chefs.' },

  // ── JUDÍA VERDE ─────────────────────────────────────────────────────────
  { id: 'judia-plana',          cropId: 'judia-verde', name: 'Plana (Perona)', daysToHarvest: [55, 65], description: 'La típica judía española, ancha y carnosa.' },
  { id: 'judia-redonda',        cropId: 'judia-verde', name: 'Redonda (Bobby)', daysToHarvest: [50, 60], description: 'Cilíndrica y fina. Muy tierna.' },
  { id: 'judia-boby',           cropId: 'judia-verde', name: 'Boby / Enana', daysToHarvest: [48, 58], description: 'Planta enana, no necesita tutor. Ideal en maceta.' },
  { id: 'judia-purple-queen',   cropId: 'judia-verde', name: 'Purple Queen', daysToHarvest: [50, 60], description: 'Vaina morada que vira al verde al cocinar.' },

  // ── GUISANTE ────────────────────────────────────────────────────────────
  { id: 'guisante-lincoln',     cropId: 'guisante', name: 'Lincoln',       daysToHarvest: [60, 75],  description: 'Alta producción, grano grande y dulce.' },
  { id: 'guisante-tirabuzón',   cropId: 'guisante', name: 'Tirabeque',     daysToHarvest: [55, 70],  description: 'Se come la vaina entera. Muy tierno.' },
  { id: 'guisante-sugar-snap',  cropId: 'guisante', name: 'Sugar Snap',    daysToHarvest: [60, 75],  description: 'Vaina gruesa y crujiente, muy dulce.' },

  // ── CEBOLLA ─────────────────────────────────────────────────────────────
  { id: 'cebolla-morada',       cropId: 'cebolla', name: 'Morada / Roja',  daysToHarvest: [100, 120], description: 'Sabor suave y dulce. Ideal en crudo.' },
  { id: 'cebolla-blanca',       cropId: 'cebolla', name: 'Blanca',         daysToHarvest: [90, 110], description: 'Sabor más suave. Buena para cocinar.' },
  { id: 'cebolla-amarilla',     cropId: 'cebolla', name: 'Amarilla (Babosa)', daysToHarvest: [100, 120], description: 'La más versátil. Larga conservación.' },
  { id: 'cebolla-calçot',       cropId: 'cebolla', name: 'Calçot',         daysToHarvest: [100, 120], description: 'Típico de Cataluña. Se asa y se come con romesco.' },
  { id: 'cebolla-cebolleta',    cropId: 'cebolla', name: 'Cebolleta / Spring', daysToHarvest: [60, 80], description: 'Cosecha temprana. Bulbo pequeño y verde.' },

  // ── AJO ─────────────────────────────────────────────────────────────────
  { id: 'ajo-blanco-comun',     cropId: 'ajo', name: 'Blanco común',       daysToHarvest: [150, 180], description: 'El más cultivado en España. Excelente conservación.' },
  { id: 'ajo-morado',           cropId: 'ajo', name: 'Morado',             daysToHarvest: [150, 180], description: 'De Las Pedroñeras (IGP). Sabor intenso.' },
  { id: 'ajo-rosado',           cropId: 'ajo', name: 'Rosado',             daysToHarvest: [160, 190], description: 'Tono rosado, sabor suave. Poca brotación.' },
  { id: 'ajo-negro',            cropId: 'ajo', name: 'Negro (fermentado)', daysToHarvest: [150, 180], description: 'Se fermenta tras la cosecha. Sabor umami.' },

  // ── BRÓCOLI ─────────────────────────────────────────────────────────────
  { id: 'brocoli-calabrese',    cropId: 'brocoli', name: 'Calabrese',      daysToHarvest: [60, 80],  description: 'El clásico brócoli verde de cabeza grande.' },
  { id: 'brocoli-romanesco',    cropId: 'brocoli', name: 'Romanesco',      daysToHarvest: [75, 95],  description: 'Fractal y verde claro. Sabor suave a nuez.' },
  { id: 'brocoli-morado',       cropId: 'brocoli', name: 'Morado',         daysToHarvest: [70, 90],  description: 'Rico en antocianinas. Más resistente al frío.' },

  // ── ALBAHACA ────────────────────────────────────────────────────────────
  { id: 'albahaca-genovesa',    cropId: 'albahaca', name: 'Genovesa',       daysToHarvest: [25, 35],  description: 'La clásica del pesto. Hojas grandes.' },
  { id: 'albahaca-morada',      cropId: 'albahaca', name: 'Morada / Purple', daysToHarvest: [25, 35], description: 'Ornamental y aromática. Sabor más picante.' },
  { id: 'albahaca-thai',        cropId: 'albahaca', name: 'Thai',           daysToHarvest: [25, 35],  description: 'Aroma anisado. Imprescindible en cocina asiática.' },
  { id: 'albahaca-limon',       cropId: 'albahaca', name: 'Limón',          daysToHarvest: [25, 35],  description: 'Fragancia cítrica. Para postres y bebidas.' },
];

export const VARIETIES_BY_CROP: Record<string, VarietyInfo[]> = {};
for (const v of VARIETIES) {
  if (!VARIETIES_BY_CROP[v.cropId]) VARIETIES_BY_CROP[v.cropId] = [];
  VARIETIES_BY_CROP[v.cropId].push(v);
}

export const VARIETIES_BY_ID: Record<string, VarietyInfo> = {};
for (const v of VARIETIES) {
  VARIETIES_BY_ID[v.id] = v;
}
