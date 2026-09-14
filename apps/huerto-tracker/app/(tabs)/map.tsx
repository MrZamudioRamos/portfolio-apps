import React from 'react';
import { GardenMapContent } from '../garden/map';

/**
 * The map keeps its existing Pro gate and drag/drop behaviour. This route only
 * gives it a first-class place in the visual navigation shown by the prototype.
 */
export default function MapTabScreen() {
  return <GardenMapContent embedded />;
}
