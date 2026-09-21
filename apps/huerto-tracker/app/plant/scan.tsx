import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColors, useTheme, type Theme } from '@portfolio/ui';
import { usePickPhoto } from '../../src/hooks/usePickPhoto';

/** Stitch's native camera frame. Capture is still delegated to Expo Go's picker. */
export default function PlantScanScreen() {
  const colors = useColors();
  const { spacing, fontSize, fontWeight, radii } = useTheme();
  const router = useRouter();
  const [diagnosisMode, setDiagnosisMode] = useState(false);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [cameraType, setCameraType] = useState<ImagePicker.CameraType>(ImagePicker.CameraType.back);
  const { pickFromCamera, pickFromGallery, picking } = usePickPhoto({
    aspect: [4, 3],
    quality: 0.8,
    cameraType,
    i18nNamespace: 'plantScan',
  });

  const s = useMemo(
    () => makeStyles(colors, spacing, fontSize, fontWeight, radii),
    [colors, spacing, fontSize, fontWeight, radii]
  );

  async function capture(fromCamera: boolean) {
    const result = fromCamera ? await pickFromCamera() : await pickFromGallery();
    if (result.kind === 'success') {
      router.push({ pathname: '/plant/identify', params: { photo: result.uri } });
    }
  }

  return (
    <View style={s.container}>
      <View style={s.cameraSurface}>
        <SafeAreaView style={s.safeArea} edges={['top', 'bottom']}>
          <View style={s.topBar}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cerrar escáner"
              hitSlop={12}
              onPress={() => router.back()}
              style={s.iconButton}
            >
              <Ionicons name="close" size={26} color="#fff" />
            </Pressable>
            <View style={s.modeTabs} accessibilityRole="tablist">
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected: !diagnosisMode }}
                onPress={() => setDiagnosisMode(false)}
                style={[s.modeTab, !diagnosisMode && s.modeTabActive]}
              >
                <Text style={s.modeTabText}>Identificar</Text>
              </Pressable>
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected: diagnosisMode }}
                onPress={() => setDiagnosisMode(true)}
                style={[s.modeTab, diagnosisMode && s.modeTabActive]}
              >
                <Text style={s.modeTabText}>Diagnóstico</Text>
              </Pressable>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Control de linterna"
              accessibilityState={{ checked: flashEnabled }}
              hitSlop={12}
              onPress={() => setFlashEnabled((value) => !value)}
              style={[s.iconButton, flashEnabled && s.iconButtonActive]}
            >
              <Ionicons name={flashEnabled ? 'flash' : 'flash-off-outline'} size={22} color="#fff" />
            </Pressable>
          </View>

          <View style={s.cameraContent}>
            <View style={s.lightNotice}>
              <Ionicons name="sunny" size={17} color="#FBC02D" />
              <Text style={s.lightNoticeText}>Buena luz solar detectada · Enfocando hojas</Text>
            </View>

            <View style={s.focusFrame} accessibilityLabel="Encuadre de cámara">
              <View style={[s.corner, s.cornerTopLeft]} />
              <View style={[s.corner, s.cornerTopRight]} />
              <View style={[s.corner, s.cornerBottomLeft]} />
              <View style={[s.corner, s.cornerBottomRight]} />
              <Ionicons name={diagnosisMode ? 'leaf-outline' : 'flower-outline'} size={44} color="rgba(255,255,255,0.72)" />
              <Text style={s.focusHint}>Centra las hojas o el sustrato en el recuadro</Text>
            </View>

            <View style={s.permissionBadge} accessibilityRole="text">
              <Ionicons name="checkmark-circle" size={17} color="#B8E986" />
              <Text style={s.permissionText}>Permiso de cámara concedido</Text>
            </View>

            <View style={s.tipCard}>
              <View style={s.tipIcon}>
                <Ionicons name="leaf" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.tipTitle}>Consejo de Semillita</Text>
                <Text style={s.tipText}>Fotografía las hojas de cerca y con luz natural para un diagnóstico exacto.</Text>
              </View>
            </View>
          </View>

          <View style={s.bottomControls}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Abrir galería de fotos"
              hitSlop={12}
              onPress={() => capture(false)}
              disabled={picking}
              style={({ pressed }) => [s.galleryButton, pressed && s.pressed, picking && s.disabled]}
            >
              <Ionicons name="images-outline" size={26} color="#fff" />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Capturar fotografía de planta"
              hitSlop={12}
              onPress={() => capture(true)}
              disabled={picking}
              style={({ pressed }) => [s.shutterOuter, pressed && s.pressed, picking && s.disabled]}
            >
              <View style={s.shutterInner} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cambiar cámara"
              hitSlop={12}
              onPress={() => setCameraType((value) => value === ImagePicker.CameraType.back ? ImagePicker.CameraType.front : ImagePicker.CameraType.back)}
              style={({ pressed }) => [s.switchButton, pressed && s.pressed]}
            >
              <Ionicons name="camera-reverse-outline" size={29} color="#fff" />
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    </View>
  );
}

const makeStyles = (
  colors: ReturnType<typeof useColors>,
  spacing: Record<string, number>,
  fontSize: Record<string, number>,
  fontWeight: Theme['fontWeight'],
  radii: Record<string, number>
) => StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D120E' },
  cameraSurface: { flex: 1, backgroundColor: '#101510' },
  safeArea: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  iconButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.35)' },
  iconButtonActive: { backgroundColor: colors.primary + '88' },
  modeTabs: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: radii.full, padding: 3 },
  modeTab: { minHeight: 38, paddingHorizontal: spacing.md, borderRadius: radii.full, alignItems: 'center', justifyContent: 'center' },
  modeTabActive: { backgroundColor: 'rgba(255,255,255,0.18)' },
  modeTabText: { color: '#fff', fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  cameraContent: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg, paddingHorizontal: spacing.xl },
  lightNotice: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radii.full, backgroundColor: 'rgba(24,35,22,0.82)' },
  lightNoticeText: { color: '#F5F8EC', fontSize: fontSize.xs, fontWeight: fontWeight.medium },
  focusFrame: { width: '88%', aspectRatio: 0.9, maxHeight: 360, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  corner: { position: 'absolute', width: 38, height: 38, borderColor: '#B8E986' },
  cornerTopLeft: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 10 },
  cornerTopRight: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 10 },
  cornerBottomLeft: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 10 },
  cornerBottomRight: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 10 },
  focusHint: { color: 'rgba(255,255,255,0.82)', fontSize: fontSize.sm, textAlign: 'center', maxWidth: 220 },
  permissionBadge: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radii.full, backgroundColor: 'rgba(32,65,38,0.76)' },
  permissionText: { color: '#E5F5D8', fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
  tipCard: { width: '100%', maxWidth: 360, flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radii.lg, backgroundColor: 'rgba(247,251,241,0.96)' },
  tipIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt },
  tipTitle: { color: colors.text, fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  tipText: { color: colors.textSecondary, fontSize: fontSize.xs, lineHeight: 17, marginTop: 2 },
  bottomControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingBottom: spacing.lg },
  galleryButton: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.4)' },
  shutterOuter: { width: 78, height: 78, borderRadius: 39, borderWidth: 4, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  shutterInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#fff' },
  switchButton: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.4)' },
  pressed: { transform: [{ scale: 0.96 }], opacity: 0.82 },
  disabled: { opacity: 0.5 },
});
