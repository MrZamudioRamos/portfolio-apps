import type { ClimateZone } from '../models/garden';

export const PROVINCE_ZONES: Record<string, ClimateZone> = {
  // Atlántica
  'A Coruña': 'atlantica',
  'Lugo': 'atlantica',
  'Pontevedra': 'atlantica',
  'Asturias': 'atlantica',
  'Cantabria': 'atlantica',
  'Vizcaya': 'atlantica',
  'Guipúzcoa': 'atlantica',

  // Continental
  'Ourense': 'continental',
  'Álava': 'continental',
  'Navarra': 'continental',
  'La Rioja': 'continental',
  'Madrid': 'continental',
  'Toledo': 'continental',
  'Ciudad Real': 'continental',
  'Cuenca': 'continental',
  'Guadalajara': 'continental',
  'Albacete': 'continental',
  'Ávila': 'continental',
  'Segovia': 'continental',
  'Soria': 'continental',
  'Burgos': 'continental',
  'Palencia': 'continental',
  'Valladolid': 'continental',
  'Zamora': 'continental',
  'Salamanca': 'continental',
  'León': 'continental',
  'Zaragoza': 'continental',
  'Huesca': 'continental',
  'Teruel': 'continental',
  'Lleida': 'continental',
  'Cáceres': 'continental',
  'Badajoz': 'continental',
  'Córdoba': 'continental',
  'Jaén': 'continental',

  // Mediterránea
  'Barcelona': 'mediterranea',
  'Tarragona': 'mediterranea',
  'Girona': 'mediterranea',
  'Valencia': 'mediterranea',
  'Alicante': 'mediterranea',
  'Castellón': 'mediterranea',
  'Murcia': 'mediterranea',
  'Almería': 'mediterranea',
  'Málaga': 'mediterranea',
  'Granada': 'mediterranea',
  'Baleares': 'mediterranea',
  'Sevilla': 'mediterranea',
  'Cádiz': 'mediterranea',
  'Huelva': 'mediterranea',
  'Ceuta': 'mediterranea',
  'Melilla': 'mediterranea',

  // Subtropical
  'Las Palmas': 'subtropical',
  'Santa Cruz de Tenerife': 'subtropical',

  // Argentina
  'Buenos Aires': 'mediterranea',
  'Córdoba (AR)': 'continental',
  'Mendoza': 'continental',
  'Santa Fe': 'continental',
  'Entre Ríos': 'continental',
  'Tucumán': 'subtropical',
  'Misiones': 'subtropical',
  'Formosa': 'subtropical',
  'Chaco': 'subtropical',
  'Corrientes': 'subtropical',
  'Salta': 'continental',
  'Jujuy': 'continental',
  'Patagonia (AR)': 'atlantica',
  'Neuquén': 'continental',
  'Río Negro': 'continental',

  // Chile
  'Región Metropolitana (Santiago)': 'mediterranea',
  'Valparaíso (CL)': 'mediterranea',
  "O'Higgins": 'mediterranea',
  'Maule': 'mediterranea',
  'Biobío': 'atlantica',
  'Araucanía': 'atlantica',
  'Los Lagos (CL)': 'atlantica',
  'Patagonia (CL)': 'atlantica',
  'Atacama': 'subtropical',
  'Antofagasta': 'subtropical',
  'Arica y Parinacota': 'subtropical',

  // Uruguay
  'Montevideo': 'mediterranea',
  'Canelones': 'mediterranea',
  'Interior (Uruguay)': 'continental',

  // Other LATAM
  'Ciudad de México': 'continental',
  'Bogotá': 'subtropical',
  'Lima': 'mediterranea',
  'São Paulo': 'subtropical',
  'Santiago de Cuba': 'subtropical',
};

export const PROVINCES: string[] = Object.keys(PROVINCE_ZONES).sort((a, b) =>
  a.localeCompare(b, 'es')
);

export const CLIMATE_ZONE_CONFIG: Record<ClimateZone, { label: string; emoji: string; description: string }> = {
  atlantica: {
    label: 'Atlántica',
    emoji: '🌧️',
    description: 'Veranos frescos, inviernos suaves, lluvia abundante todo el año',
  },
  continental: {
    label: 'Continental',
    emoji: '❄️',
    description: 'Veranos calurosos, inviernos fríos, pocas lluvias',
  },
  mediterranea: {
    label: 'Mediterránea',
    emoji: '☀️',
    description: 'Veranos secos y calurosos, inviernos suaves',
  },
  subtropical: {
    label: 'Subtropical',
    emoji: '🌴',
    description: 'Temperaturas cálidas todo el año, sin heladas',
  },
};
