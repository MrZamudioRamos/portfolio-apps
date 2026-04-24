// Crops suitable for container/balcony growing, with minimum pot volume in liters
export const CONTAINER_CROPS: Record<string, { minLiters: number; tip: string }> = {
  tomate:      { minLiters: 20, tip: 'Usa variedades cherry o de mata baja. Maceta de al menos 20 L.' },
  pimiento:    { minLiters: 15, tip: 'Ideal en terraza orientada al sur. Maceta de 15 L.' },
  berenjena:   { minLiters: 20, tip: 'Necesita calor. Mejor en terraza con mucho sol. Maceta de 20 L.' },
  fresa:       { minLiters: 5,  tip: 'Perfecta en jardineras o bolsas de cultivo. 5 L por planta.' },
  lechuga:     { minLiters: 5,  tip: 'Crece rápido en jardineras poco profundas. 5 L.' },
  espinaca:    { minLiters: 5,  tip: 'Tolera algo de sombra. Ideal para interior luminoso. 5 L.' },
  acelga:      { minLiters: 8,  tip: 'Jardinera de 20 cm de profundidad mínima. 8 L.' },
  rucula:      { minLiters: 3,  tip: 'Muy fácil en interior. Cosecha hoja por hoja. 3 L.' },
  canonigos:   { minLiters: 3,  tip: 'Tolera poca luz. Perfecto para ventanas al norte. 3 L.' },
  rabano:      { minLiters: 5,  tip: 'Listo en 3-4 semanas. Ideal para macetas pequeñas. 5 L.' },
  zanahoria:   { minLiters: 10, tip: 'Usa variedades redondas tipo Parisienne. Profundidad 25 cm mínimo.' },
  'judia-verde': { minLiters: 10, tip: 'Variedades enanas no necesitan tutor. Maceta de 10 L.' },
  pepino:      { minLiters: 15, tip: 'Variedades compactas. Pon tutor o cuelga en barandilla. 15 L.' },
  albahaca:    { minLiters: 2,  tip: 'Muy fácil en interior. Aleja las plagas de tomates y pimientos.' },
  perejil:     { minLiters: 2,  tip: 'Crece bien en ventana con luz. Deja secar entre riegos.' },
  cilantro:    { minLiters: 2,  tip: 'Siembra cada 3 semanas para tener siempre. 2 L.' },
  romero:      { minLiters: 3,  tip: 'Muy resistente. Poco riego. Ideal en terraza soleada.' },
  tomillo:     { minLiters: 2,  tip: 'Aguanta bien la sequía. Maceta pequeña en ventana.' },
  menta:       { minLiters: 3,  tip: 'Crece de forma agresiva. Plántala en su propia maceta.' },
  ajo:         { minLiters: 5,  tip: 'Planta dientes individuales en otoño. Jardinera poco profunda.' },
  cebolla:     { minLiters: 5,  tip: 'Variedades de cebolleta crecen rápido en maceta. 5 L.' },
};

export const CONTAINER_CROP_IDS = new Set(Object.keys(CONTAINER_CROPS));

export function isContainerFriendly(cropId: string): boolean {
  return CONTAINER_CROP_IDS.has(cropId);
}

export function getContainerInfo(cropId: string) {
  return CONTAINER_CROPS[cropId] ?? null;
}
