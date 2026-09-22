import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import type { GardenMapPlanV2, MapPlantPlacement, MapStructure, MapZone } from '../../models/garden-map-plan';

export interface GardenMapCanvasPlant {
  id: string;
  name: string;
  pestStatus?: string;
}

export interface GardenMapCanvasColors {
  background: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textSecondary: string;
  textDisabled: string;
  primary: string;
  warning: string;
  info: string;
}

export interface GardenMapCanvasLabels {
  north: string;
  empty: string;
  showList: string;
  hideList: string;
  listTitle: string;
  structures: string;
  plants: string;
  unknownScale: string;
  mapHint: string;
}

export interface GardenMapCanvasProps {
  scene: GardenMapPlanV2;
  mode: 'organize' | 'plan';
  plants: GardenMapCanvasPlant[];
  colors: GardenMapCanvasColors;
  labels: GardenMapCanvasLabels;
  onMoveStructure?: (structure: MapStructure, point: { x: number; y: number }) => void;
  onMovePlant?: (placement: MapPlantPlacement, point: { x: number; y: number }) => void;
  onSelectStructure?: (structure: MapStructure) => void;
  onSelectPlant?: (plant: GardenMapCanvasPlant) => void;
  onPressEmpty?: (point: { x: number; y: number }) => void;
  selectedPlantId?: string | null;
  selectedStructureId?: string | null;
  snapToGrid?: boolean;
  gridRows?: number;
  gridCols?: number;
  showOverlays?: boolean;
  aspectRatio?: number;
  readOnly?: boolean;
}

export function GardenMapCanvas({
  scene,
  mode,
  plants,
  colors,
  labels,
  onMoveStructure,
  onMovePlant,
  onSelectStructure,
  onSelectPlant,
  onPressEmpty,
  selectedPlantId,
  selectedStructureId,
  snapToGrid = false,
  gridRows = 7,
  gridCols = 5,
  showOverlays = true,
  aspectRatio = 1.35,
  readOnly = false,
}: GardenMapCanvasProps) {
  const [showList, setShowList] = useState(false);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const plantById = useMemo(() => new Map(plants.map((plant) => [plant.id, plant])), [plants]);
  const placements = useMemo(() => scene.plantPlacements.filter((placement) => plantById.has(placement.plantId)), [plantById, scene.plantPlacements]);

  function normalizePoint(x: number, y: number) {
    const point = {
      x: size.width ? clamp(x / size.width) : clamp(x),
      y: size.height ? clamp(y / size.height) : clamp(y),
    };
    if (!snapToGrid) return point;
    return { x: Math.round(point.x * gridCols) / gridCols, y: Math.round(point.y * gridRows) / gridRows };
  }

  const emptyMap = scene.structures.length === 0 && scene.zones.length === 0 && placements.length === 0;
  return (
    <View>
      <View
        onLayout={(event) => setSize({ width: event.nativeEvent.layout.width, height: event.nativeEvent.layout.height })}
        style={[styles.canvas, { aspectRatio, backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={labels.mapHint}
          onPress={readOnly ? undefined : (event) => onPressEmpty?.(normalizePoint(event.nativeEvent.locationX, event.nativeEvent.locationY))}
          style={StyleSheet.absoluteFill}
        >
          <View pointerEvents="none" style={styles.gridGuides}>
            {Array.from({ length: 36 }, (_, index) => <View key={index} style={[styles.gridDot, { backgroundColor: colors.border }]} />)}
          </View>
          <Text pointerEvents="none" style={[styles.north, { color: colors.textSecondary }]}>{labels.north}</Text>
          {showOverlays && scene.zones.map((zone) => <ZoneOverlay key={`zone-${zone.id}`} zone={zone} scene={scene} colors={colors} />)}
          {scene.structures.map((structure) => {
            const width = scene.dimensions ? clamp(structure.widthCm / scene.dimensions.widthCm) : 0.28;
            const height = scene.dimensions ? clamp(structure.lengthCm / scene.dimensions.lengthCm) : 0.22;
            const center = { x: structure.x + width / 2, y: structure.y + height / 2 };
            return <DraggableCanvasItem
              key={`structure-${structure.id}`}
              center={center}
              onDrop={(point) => onMoveStructure?.(structure, normalizePoint(point.x, point.y))}
              onPress={() => onSelectStructure?.(structure)}
              style={{
                left: `${structure.x * 100}%`,
                top: `${structure.y * 100}%`,
                width: `${width * 100}%`,
                height: `${height * 100}%`,
                borderColor: structure.id === selectedStructureId ? colors.warning : colors.primary,
                backgroundColor: structure.kind === 'path' ? colors.textDisabled + '24' : colors.primary + '16',
                transform: [{ rotate: `${structure.rotationDegrees ?? 0}deg` }],
              }}
              markerColor={colors.primary}
              canvasSize={size}
              disabled={readOnly}
            >
              <Text numberOfLines={2} style={[styles.structureLabel, { color: colors.text }]}>{structure.name}</Text>
              {!scene.dimensions && <Text style={[styles.scaleHint, { color: colors.textSecondary }]}>{labels.unknownScale}</Text>}
            </DraggableCanvasItem>;
          })}
          {placements.map((placement) => {
            const plant = plantById.get(placement.plantId)!;
            return <DraggableCanvasItem
              key={`plant-${placement.plantId}`}
              center={{ x: placement.x, y: placement.y }}
              onDrop={(point) => onMovePlant?.(placement, normalizePoint(point.x, point.y))}
              onPress={() => onSelectPlant?.(plant)}
              style={{ left: `${placement.x * 100}%`, top: `${placement.y * 100}%` }}
              marker
              markerColor={plant.pestStatus === 'active' ? colors.warning : colors.primary}
              canvasSize={size}
              disabled={readOnly}
            >
              <View style={[styles.plantMarker, { backgroundColor: colors.surface, borderColor: plant.pestStatus === 'active' ? colors.warning : colors.primary }]}>
                <Ionicons name={plant.pestStatus === 'active' ? 'warning-outline' : 'leaf-outline'} size={15} color={plant.pestStatus === 'active' ? colors.warning : colors.primary} />
                <Text numberOfLines={1} style={[styles.plantLabel, { color: colors.text }]}>{plant.name}</Text>
              </View>
            </DraggableCanvasItem>;
          })}
          {emptyMap && <View pointerEvents="none" style={styles.empty}><Ionicons name="map-outline" size={26} color={colors.textDisabled} /><Text style={[styles.emptyText, { color: colors.textSecondary }]}>{labels.empty}</Text></View>}
        </Pressable>
      </View>

      <View style={styles.canvasFooter}>
        <Text style={[styles.hint, { color: colors.textSecondary }]}>{labels.mapHint}</Text>
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: showList }} onPress={() => setShowList((value) => !value)} style={[styles.listToggle, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <Ionicons name={showList ? 'map-outline' : 'list-outline'} size={16} color={colors.primary} />
          <Text style={[styles.listToggleText, { color: colors.primary }]}>{showList ? labels.hideList : labels.showList}</Text>
        </Pressable>
      </View>
      {showList && <View accessibilityLabel={labels.listTitle} style={[styles.accessibleList, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.listTitle, { color: colors.text }]}>{labels.listTitle}</Text>
        <Text style={[styles.listSection, { color: colors.textSecondary }]}>{labels.structures}</Text>
        {scene.structures.map((structure) => <Pressable key={structure.id} accessibilityRole="button" onPress={() => onSelectStructure?.(structure)} style={styles.listRow}><Ionicons name="grid-outline" size={17} color={colors.primary} /><Text style={[styles.listText, { color: colors.text }]}>{structure.name}</Text></Pressable>)}
        <Text style={[styles.listSection, { color: colors.textSecondary }]}>{labels.plants}</Text>
        {placements.map((placement) => <Pressable key={placement.plantId} accessibilityRole="button" onPress={() => onSelectPlant?.(plantById.get(placement.plantId)!)} style={styles.listRow}><Ionicons name="leaf-outline" size={17} color={colors.primary} /><Text style={[styles.listText, { color: colors.text }]}>{plantById.get(placement.plantId)?.name}</Text></Pressable>)}
      </View>}
    </View>
  );
}

function ZoneOverlay({ zone, scene, colors }: { zone: MapZone; scene: GardenMapPlanV2; colors: GardenMapCanvasColors }) {
  const width = scene.dimensions ? clamp(zone.widthCm / scene.dimensions.widthCm) : 0.32;
  const height = scene.dimensions ? clamp(zone.lengthCm / scene.dimensions.lengthCm) : 0.24;
  const color = zone.kind === 'light' ? colors.warning : colors.info;
  return <View pointerEvents="none" style={[styles.zone, { left: `${zone.x * 100}%`, top: `${zone.y * 100}%`, width: `${width * 100}%`, height: `${height * 100}%`, backgroundColor: color + '24', borderColor: color + '99' }]}><Text numberOfLines={1} style={[styles.zoneLabel, { color: colors.text }]}>{zone.name}</Text></View>;
}

function DraggableCanvasItem({ children, center, onDrop, onPress, style, marker = false, markerColor, disabled = false, canvasSize }: {
  children: React.ReactNode;
  center: { x: number; y: number };
  onDrop: (point: { x: number; y: number }) => void;
  onPress: () => void;
  style: object;
  marker?: boolean;
  markerColor: string;
  disabled?: boolean;
  canvasSize: { width: number; height: number };
}) {
  const start = useRef(center);
  const moved = useRef(false);
  const callbacks = useRef({ center, onDrop, onPress, disabled, canvasSize });
  callbacks.current = { center, onDrop, onPress, disabled, canvasSize };
  const responder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => !callbacks.current.disabled,
    onMoveShouldSetPanResponder: () => !callbacks.current.disabled,
    onPanResponderGrant: () => { start.current = callbacks.current.center; moved.current = false; },
    onPanResponderMove: (_, gesture) => { if (Math.abs(gesture.dx) + Math.abs(gesture.dy) > 4) moved.current = true; },
    onPanResponderRelease: (_, gesture) => {
      if (!moved.current) { callbacks.current.onPress(); return; }
      callbacks.current.onDrop({ x: start.current.x + gesture.dx / Math.max(1, callbacks.current.canvasSize.width), y: start.current.y + gesture.dy / Math.max(1, callbacks.current.canvasSize.height) });
    },
  })).current;
  return <View {...responder.panHandlers} accessibilityRole="button" accessibilityLabel={marker ? 'Cultivo en el plano' : 'Elemento del plano'} style={[styles.item, marker && styles.marker, style, { borderColor: markerColor }]}>{children}</View>;
}

function clamp(value: number): number { return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0; }

const styles = StyleSheet.create({
  canvas: { width: '100%', borderWidth: 1, borderRadius: 18, overflow: 'hidden', position: 'relative' },
  gridGuides: { ...StyleSheet.absoluteFill, padding: 14, flexDirection: 'row', flexWrap: 'wrap', alignContent: 'space-between', justifyContent: 'space-between' },
  gridDot: { width: 3, height: 3, borderRadius: 2, opacity: 0.75 },
  north: { position: 'absolute', top: 10, right: 12, fontSize: 11, fontWeight: '700' },
  item: { position: 'absolute', borderWidth: 1.5, borderRadius: 12, alignItems: 'center', justifyContent: 'center', padding: 5, zIndex: 2 },
  marker: { minWidth: 72, minHeight: 42, marginLeft: -36, marginTop: -21, shadowColor: '#122b1a', shadowOpacity: 0.12, shadowRadius: 5, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  structureLabel: { fontSize: 11, fontWeight: '700', textAlign: 'center' },
  scaleHint: { fontSize: 8, marginTop: 2 },
  plantMarker: { minHeight: 34, borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 7, flexDirection: 'row', alignItems: 'center', gap: 4 },
  plantLabel: { fontSize: 10, fontWeight: '700', maxWidth: 88 },
  zone: { position: 'absolute', borderWidth: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  zoneLabel: { fontSize: 9, fontWeight: '600' },
  empty: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 34, gap: 7 },
  emptyText: { textAlign: 'center', fontSize: 11, lineHeight: 16 },
  canvasFooter: { marginTop: 8, gap: 8 },
  hint: { fontSize: 11, lineHeight: 16 },
  listToggle: { minHeight: 44, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  listToggleText: { fontSize: 12, fontWeight: '700' },
  accessibleList: { marginTop: 8, borderWidth: 1, borderRadius: 14, padding: 12, gap: 8 },
  listTitle: { fontSize: 14, fontWeight: '700' },
  listSection: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginTop: 4 },
  listRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8 },
  listText: { fontSize: 13, flex: 1 },
});
