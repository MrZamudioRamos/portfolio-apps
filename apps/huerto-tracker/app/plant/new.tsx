import { useColors, useTheme, type Theme } from '@portfolio/ui';
import { Button } from '../../src/components/ActionButton';
import { createStore, useCollection } from '@portfolio/storage';
import { useSession } from '@portfolio/supabase';
import { usePro as usePurchases } from '../../src/hooks/usePro';
import { useActiveGarden } from '../../src/hooks/useActiveGarden';
import { usePickPhoto } from '../../src/hooks/usePickPhoto';
import { GlassView, isLiquidGlassAvailable } from '../../src/utils/glassEffect';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CROPS_BY_ID, CROPS_BY_CATEGORY, CATEGORY_CONFIG, CROP_DIFFICULTY, CROP_CONTAINER_MIN, type CropInfo } from '../../src/data/crops';
import { CROP_IMAGES } from '../../src/data/cropImages';
import { useCustomCrops } from '../../src/hooks/useCustomCrops';
import { useUserProfile } from '../../src/hooks/useUserProfile';
import { createPlantWithSowing } from '../../src/utils/careWrites';
import { dateToStr, todayStr } from '../../src/utils/dateStr';
import { VARIETIES_BY_CROP, type VarietyInfo } from '../../src/data/varieties';
import { getCompanions } from '../../src/data/companions';
import { PLANT_STATUS_CONFIG, type Plant, type PropagationMethod } from '../../src/models/plant';
import type { DiaryEntry } from '../../src/models/diary-entry';
import { track, EVENTS } from '../../src/analytics';
import { successHaptic, tapHaptic } from '../../src/utils/haptics';
import { ScalePress } from '../../src/components/ScalePress';
import { Mascot } from '../../src/components/Mascot';
import { SuccessBurst } from '../../src/components/SuccessBurst';
import { WebDatePicker } from '../../src/components/WebDatePicker';
import { buildNewPlantDraft, getPlantNameAfterCropChange } from '../../src/utils/plantDraft';

const glassAvailable = Platform.OS === 'ios' && isLiquidGlassAvailable();

const STATIC_SECTIONS = (Object.keys(CATEGORY_CONFIG) as Array<keyof typeof CATEGORY_CONFIG>).map((cat) => ({
  title: cat,
  data: CROPS_BY_CATEGORY[cat],
}));

// 4 key milestones for the visual stage picker (matching GrowIt's Inicio/Plántula/Floración/Cosecha)
const QUICK_STAGES: Plant['status'][] = ['seedling', 'growing', 'flowering', 'harvesting'];
const FIRST_WEEK_CHECKS_KEY = '@huerto/first_week_checks/';

type CropSelectionSection = { title: string; data: CropInfo[] };
type StitchNewPlantScreenProps = {
  colors: ReturnType<typeof useColors>;
  router: ReturnType<typeof useRouter>;
  sections: CropSelectionSection[];
  selectedCropId: string | null;
  selectedCropLabel: string;
  cropSearch: string;
  showCropPicker: boolean;
  onCropSearchChange: (value: string) => void;
  onOpenCropPicker: () => void;
  onCloseCropPicker: () => void;
  onSelectCrop: (crop: CropInfo) => void;
  plantName: string;
  onPlantNameChange: (value: string) => void;
  variety: string;
  varietyId: string | null;
  varieties: VarietyInfo[];
  onVarietyChange: (value: string) => void;
  onSelectVariety: (variety: VarietyInfo | null) => void;
  photoUri: string | null;
  onPickPhoto: (fromCamera: boolean) => void;
  onRemovePhoto: () => void;
  pickingPhoto: boolean;
  sowingDate: string;
  onSowingDateChange: (value: string) => void;
  showDatePicker: boolean;
  onShowDatePicker: (visible: boolean) => void;
  propagationMethod: PropagationMethod;
  onPropagationMethodChange: (value: PropagationMethod) => void;
  selectedStatus: Plant['status'];
  onStatusChange: (value: Plant['status']) => void;
  guided: boolean;
  started: boolean;
  onStartedChange: (value: boolean) => void;
  showAllDetails: boolean;
  onShowAllDetailsChange: (value: boolean) => void;
  recommendationAction?: string;
  gardenLabel?: string;
  canScan: boolean;
  canSave: boolean;
  saving: boolean;
  saveError: boolean;
  onSave: () => void;
  onBack: () => void;
};

function StitchNewPlantScreen(props: StitchNewPlantScreenProps) {
  const { t } = useTranslation();
  const { spacing, fontSize, fontWeight } = useTheme();
  const { colors } = props;
  const selectedVariety = props.varietyId;
  const today = dateToStr(new Date());
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = dateToStr(yesterdayDate);
  const dateChoices = [
    { value: today, label: t('entryNew.today') },
    { value: yesterday, label: t('entryNew.yesterday') },
  ];
  const methods: Array<{ value: PropagationMethod; emoji: string; label: string }> = [
    { value: 'seed', emoji: '🌱', label: t('plantNew.propSeed') },
    { value: 'cutting', emoji: '✂️', label: t('plantNew.propCutting') },
    { value: 'division', emoji: '🌿', label: t('plantNew.propDivision') },
    { value: 'bought', emoji: '🛒', label: t('plantNew.propBought') },
  ];
  const saveDisabled = !props.canSave || props.saving;
  const cropButtonLabel = props.selectedCropLabel || t('plantNew.selectCrop');

  const photoPicker = (
    <View style={stitchPlant.photoActions}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('plantNew.photoGallery')}
        accessibilityState={{ disabled: props.pickingPhoto }}
        disabled={props.pickingPhoto}
        onPress={() => props.onPickPhoto(false)}
        style={[stitchPlant.outlineButton, { borderColor: colors.border, opacity: props.pickingPhoto ? 0.55 : 1 }]}
      >
        <Ionicons name="images-outline" size={18} color={colors.primary} />
        <Text style={[stitchPlant.buttonText, { color: colors.text }]}>{t('plantNew.photoGallery')}</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('plantNew.photoCamera')}
        accessibilityState={{ disabled: props.pickingPhoto }}
        disabled={props.pickingPhoto}
        onPress={() => props.onPickPhoto(true)}
        style={[stitchPlant.outlineButton, { borderColor: colors.border, opacity: props.pickingPhoto ? 0.55 : 1 }]}
      >
        <Ionicons name="camera-outline" size={18} color={colors.primary} />
        <Text style={[stitchPlant.buttonText, { color: colors.text }]}>{t('plantNew.photoCamera')}</Text>
      </Pressable>
    </View>
  );

  function openScan() {
    props.router.push('/plant/scan' as any);
  }

  function renderDatePicker() {
    if (!props.showDatePicker) return null;
    if (Platform.OS === 'web') {
      return <WebDatePicker label={t('plantNew.startDate')} value={props.sowingDate} onChange={props.onSowingDateChange} />;
    }
    if (Platform.OS === 'android') {
      return (
        <DateTimePicker
          value={new Date(`${props.sowingDate}T12:00:00`)}
          mode="date"
          display="default"
          onChange={(_, date) => {
            props.onShowDatePicker(false);
            if (date) props.onSowingDateChange(dateToStr(date));
          }}
        />
      );
    }
    return (
      <Modal transparent animationType="slide" visible onRequestClose={() => props.onShowDatePicker(false)}>
        <Pressable style={stitchPlant.dateOverlay} onPress={() => props.onShowDatePicker(false)}>
          <Pressable style={[stitchPlant.dateSheet, { backgroundColor: colors.surface }]} onPress={() => {}}>
            <View style={[stitchPlant.modalHandle, { backgroundColor: colors.border }]} />
            <DateTimePicker
              value={new Date(`${props.sowingDate}T12:00:00`)}
              mode="date"
              display="spinner"
              onChange={(_, date) => { if (date) props.onSowingDateChange(dateToStr(date)); }}
              style={{ width: '100%' }}
            />
            <Button title={t('common.save')} onPress={() => props.onShowDatePicker(false)} size="lg" style={{ margin: spacing.lg }} />
          </Pressable>
        </Pressable>
      </Modal>
    );
  }

  return (
    <SafeAreaView style={[stitchPlant.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[stitchPlant.header, { borderBottomColor: colors.border }]}>
          <Pressable accessibilityRole="button" accessibilityLabel={t('common.cancel')} onPress={props.onBack} hitSlop={8} style={stitchPlant.headerButton}>
            <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>{t('common.cancel')}</Text>
          </Pressable>
          <Text accessibilityRole="header" style={[stitchPlant.headerTitle, { color: colors.text }]}>{t('plantNew.title')}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.save')}
            accessibilityState={{ disabled: saveDisabled, busy: props.saving }}
            disabled={saveDisabled}
            onPress={props.onSave}
            style={[stitchPlant.headerButton, { opacity: saveDisabled ? 0.5 : 1 }]}
          >
            <Text style={{ color: colors.primary, fontWeight: '900' }}>{t('common.save')}</Text>
          </Pressable>
        </View>

        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={stitchPlant.content} showsVerticalScrollIndicator={false}>
          <View style={[stitchPlant.photo, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
            {props.photoUri ? (
              <Image source={{ uri: props.photoUri }} resizeMode="cover" style={stitchPlant.photoImage} />
            ) : (
              <View style={stitchPlant.photoEmpty}>
                <Ionicons name="leaf-outline" size={30} color={colors.primary} />
                <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>{t('plantNew.addPhoto')}</Text>
              </View>
            )}
            {props.photoUri && (
              <Pressable accessibilityRole="button" accessibilityLabel={t('plantNew.photoRemove')} onPress={props.onRemovePhoto} style={[stitchPlant.removePhoto, { backgroundColor: colors.surface }]}>
                <Ionicons name="close" size={18} color={colors.text} />
              </Pressable>
            )}
          </View>
          <Text style={[stitchPlant.photoTitle, { color: colors.text }]}>{t('plantNew.photoTitle')}</Text>
          <Text style={[stitchPlant.body, { color: colors.textSecondary }]}>{t('plantNew.photoHint')}</Text>
          {photoPicker}

          <Text style={[stitchPlant.section, { color: colors.textSecondary }]}>{t('plantNew.speciesAndVariety')}</Text>
          {props.canScan && (
            <Pressable accessibilityRole="button" onPress={openScan} style={[stitchPlant.identify, { borderColor: colors.primary, backgroundColor: `${colors.primary}12` }]}>
              <Ionicons name="scan-outline" size={20} color={colors.primary} />
              <Text style={{ color: colors.primary, fontWeight: '900', flex: 1 }}>{t('plantNew.scanTitle')}</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.primary} />
            </Pressable>
          )}
          <Text style={[stitchPlant.label, { color: colors.textSecondary }]}>{t('plantNew.cropLabel')}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${t('plantNew.selectCrop')}: ${cropButtonLabel}`}
            accessibilityState={{ expanded: props.showCropPicker }}
            onPress={props.onOpenCropPicker}
            style={[stitchPlant.inputButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <Ionicons name="leaf-outline" size={18} color={colors.primary} />
            <Text numberOfLines={1} style={{ color: props.selectedCropLabel ? colors.text : colors.textDisabled, flex: 1 }}>{cropButtonLabel}</Text>
            <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
          </Pressable>
          <Text style={[stitchPlant.label, { color: colors.textSecondary }]}>{t('plantNew.nameLabel')}</Text>
          <TextInput
            accessibilityLabel={t('plantNew.nameLabel')}
            value={props.plantName}
            onChangeText={props.onPlantNameChange}
            placeholder={t('plantNew.namePlaceholder')}
            placeholderTextColor={colors.textDisabled}
            style={[stitchPlant.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
          />

          {props.guided && (
            <View style={[stitchPlant.guidedCard, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
              <Text style={[stitchPlant.body, { color: colors.text }]}>{t(props.recommendationAction === 'prepare' ? 'guidedPlant.prepareBody' : 'guidedPlant.body')}</Text>
              {props.gardenLabel ? <Text style={[stitchPlant.body, { color: colors.textSecondary }]}>{props.gardenLabel}</Text> : null}
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: props.started }}
                onPress={() => props.onStartedChange(!props.started)}
                style={stitchPlant.startedToggle}
              >
                <View style={[stitchPlant.checkbox, { borderColor: props.started ? colors.primary : colors.border, backgroundColor: props.started ? colors.primary : 'transparent' }]}>
                  {props.started && <Ionicons name="checkmark" size={16} color={colors.surface} />}
                </View>
                <Text style={{ color: colors.text, flex: 1 }}>{t('guidedPlant.alreadySown')}</Text>
              </Pressable>
              <Text style={[stitchPlant.body, { color: colors.textSecondary }]}>{t(props.started ? 'guidedPlant.dateToday' : 'guidedPlant.noDate')}</Text>
            </View>
          )}

          {(!props.guided || props.showAllDetails) && (
            <>
              <Text style={[stitchPlant.label, { color: colors.textSecondary }]}>{t('plantNew.varietyLabel')}</Text>
              {props.varieties.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={stitchPlant.varietyRow}>
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{ checked: !selectedVariety }}
                    onPress={() => props.onSelectVariety(null)}
                    style={[stitchPlant.choice, { backgroundColor: !selectedVariety ? colors.accent : colors.surface, borderColor: !selectedVariety ? colors.primary : colors.border }]}
                  >
                    <Text style={{ color: !selectedVariety ? colors.primary : colors.textSecondary }}>{t('plantNew.varietyGeneric')}</Text>
                  </Pressable>
                  {props.varieties.map((item) => {
                    const active = selectedVariety === item.id;
                    return (
                      <Pressable
                        key={item.id}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: active }}
                        onPress={() => props.onSelectVariety(item)}
                        style={[stitchPlant.choice, { backgroundColor: active ? colors.accent : colors.surface, borderColor: active ? colors.primary : colors.border }]}
                      >
                        <Text style={{ color: active ? colors.primary : colors.text }}>{t(`varieties.${item.id}`, { defaultValue: item.name })}</Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              )}
              <TextInput
                accessibilityLabel={t('plantNew.varietyLabel')}
                value={props.variety}
                onChangeText={props.onVarietyChange}
                placeholder={t('plantNew.varietyPlaceholder')}
                placeholderTextColor={colors.textDisabled}
                style={[stitchPlant.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              />
            </>
          )}

          {(!props.guided || props.started) && (!props.guided || props.showAllDetails) && (
            <>
              <Text style={[stitchPlant.section, { color: colors.textSecondary }]}>{t('plantNew.stageLabel')}</Text>
              <View style={stitchPlant.stageRow}>
                {QUICK_STAGES.map((stage) => {
                  const config = PLANT_STATUS_CONFIG[stage];
                  const active = props.selectedStatus === stage;
                  return (
                    <Pressable
                      key={stage}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: active }}
                      onPress={() => props.onStatusChange(stage)}
                      style={[stitchPlant.stageChoice, { backgroundColor: active ? `${config.color}20` : colors.surface, borderColor: active ? config.color : colors.border }]}
                    >
                      <Text style={{ fontSize: 23 }} accessible={false}>{config.emoji}</Text>
                      <Text numberOfLines={1} style={{ color: active ? config.color : colors.textSecondary, fontSize: 11, fontWeight: '700' }}>{t(`plantStatus.${stage}`)}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={[stitchPlant.section, { color: colors.textSecondary }]}>{t('plantNew.propagationLabel')}</Text>
              <View style={stitchPlant.methodRow}>
                {methods.map((method) => {
                  const active = props.propagationMethod === method.value;
                  return (
                    <Pressable
                      key={method.value}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: active }}
                      onPress={() => props.onPropagationMethodChange(method.value)}
                      style={[stitchPlant.methodChoice, { backgroundColor: active ? colors.accent : colors.surface, borderColor: active ? colors.primary : colors.border }]}
                    >
                      <Text style={{ fontSize: 16 }} accessible={false}>{method.emoji}</Text>
                      <Text numberOfLines={1} style={{ color: active ? colors.primary : colors.textSecondary, fontSize: 11, fontWeight: '700' }}>{method.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}

          {(!props.guided || props.started) && (
            <>
              <Text style={[stitchPlant.section, { color: colors.textSecondary }]}>{t('plantNew.startDate')}</Text>
              <View style={stitchPlant.dateRow}>
                {dateChoices.map((choice) => {
                  const active = props.sowingDate === choice.value;
                  return (
                    <Pressable
                      key={choice.value}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: active }}
                      onPress={() => props.onSowingDateChange(choice.value)}
                      style={[stitchPlant.dateChoice, { backgroundColor: active ? colors.accent : colors.surfaceAlt, borderColor: active ? colors.primary : colors.border }]}
                    >
                      <Text style={{ color: active ? colors.primary : colors.textSecondary, fontWeight: '700' }}>{choice.label}</Text>
                    </Pressable>
                  );
                })}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('plantNew.otherDate')}
                  onPress={() => props.onShowDatePicker(true)}
                  style={[stitchPlant.dateChoice, { backgroundColor: props.sowingDate !== today && props.sowingDate !== yesterday ? colors.accent : colors.surfaceAlt, borderColor: props.sowingDate !== today && props.sowingDate !== yesterday ? colors.primary : colors.border }]}
                >
                  <Text numberOfLines={1} style={{ color: colors.textSecondary, fontWeight: '700' }}>{props.sowingDate !== today && props.sowingDate !== yesterday ? props.sowingDate : t('plantNew.otherDate')}</Text>
                </Pressable>
              </View>
              {renderDatePicker()}
            </>
          )}

          {props.guided && (
            <Button
              title={t(props.showAllDetails ? 'guidedPlant.less' : 'guidedPlant.more')}
              variant="ghost"
              onPress={() => props.onShowAllDetailsChange(!props.showAllDetails)}
              style={{ marginTop: spacing.md, minHeight: 48 }}
            />
          )}

          {props.saveError && <Text accessibilityRole="alert" style={{ color: colors.error, marginTop: spacing.md }}>{t('guidedPlant.saveError')}</Text>}
          <Button
            title={t(props.guided ? 'guidedPlant.save' : 'plantNew.addPlant')}
            onPress={props.onSave}
            disabled={saveDisabled}
            loading={props.saving}
            size="lg"
            style={{ marginTop: spacing.xl }}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={props.showCropPicker} animationType="slide" presentationStyle="pageSheet" onRequestClose={props.onCloseCropPicker}>
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
          <View style={[stitchPlant.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[stitchPlant.modalTitle, { color: colors.text }]}>{t('plantNew.cropPickerTitle')}</Text>
            <Pressable accessibilityRole="button" onPress={props.onCloseCropPicker} hitSlop={8}>
              <Text style={{ color: colors.primary, fontSize: fontSize.md, fontWeight: fontWeight.semibold }}>{t('common.close')}</Text>
            </Pressable>
          </View>
          <View style={[stitchPlant.searchBox, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
            <Ionicons name="search" size={16} color={colors.textSecondary} />
            <TextInput
              accessibilityLabel={t('plantNew.cropSearch')}
              value={props.cropSearch}
              onChangeText={props.onCropSearchChange}
              placeholder={t('plantNew.cropSearch')}
              placeholderTextColor={colors.textDisabled}
              style={{ flex: 1, color: colors.text, fontSize: fontSize.md, minHeight: 44 }}
              autoFocus
            />
          </View>
          <SectionList
            sections={props.sections}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={<Text style={{ color: colors.textSecondary, textAlign: 'center', padding: spacing.xl }}>{t('plantNew.noCropResults')}</Text>}
            renderSectionHeader={({ section }) => (
              <View style={[stitchPlant.categoryHeader, { backgroundColor: colors.background }]}>
                <Text style={[stitchPlant.categoryTitle, { color: colors.textSecondary }]}>
                  {section.title === '__mycrops__' ? t('customCrop.mycrops').toUpperCase() : `${(CATEGORY_CONFIG as any)[section.title]?.emoji ?? ''} ${t(`cropCategory.${section.title}`).toUpperCase()}`}
                </Text>
              </View>
            )}
            renderItem={({ item }) => (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: item.id === props.selectedCropId }}
                onPress={() => props.onSelectCrop(item)}
                style={({ pressed }) => [stitchPlant.cropRow, { backgroundColor: pressed ? colors.surfaceAlt : colors.surface, borderBottomColor: colors.border }]}
              >
                <View style={[stitchPlant.cropEmoji, { backgroundColor: colors.surfaceAlt }]}><Text style={{ fontSize: 23 }}>{item.emoji}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: '700' }}>{item.isCustom ? item.name : t(`crops.${item.id}.name`, { defaultValue: item.name })}</Text>
                  {!item.isCustom && item.daysToHarvest && <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{item.daysToHarvest[0]}–{item.daysToHarvest[1]}d</Text>}
                </View>
                {item.id === props.selectedCropId && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
              </Pressable>
            )}
            ListFooterComponent={
              <Pressable
                accessibilityRole="button"
                onPress={() => { props.onCloseCropPicker(); props.router.push('/crop/new' as any); }}
                style={[stitchPlant.customCropButton, { borderColor: colors.border }]}
              >
                <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
                <Text style={{ color: colors.primary, fontWeight: '800' }}>{t('customCrop.create')}</Text>
              </Pressable>
            }
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const stitchPlant = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 18, paddingBottom: 36 },
  header: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: 18 },
  headerButton: { minWidth: 76, minHeight: 44, justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '900' },
  photo: { height: 170, borderRadius: 16, borderWidth: 1, marginTop: 18, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  photoImage: { width: '100%', height: '100%' },
  photoEmpty: { alignItems: 'center', gap: 8 },
  removePhoto: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', position: 'absolute', right: 10, top: 10 },
  photoTitle: { fontSize: 16, fontWeight: '900', marginTop: 14 },
  body: { fontSize: 13, lineHeight: 19, marginTop: 4 },
  photoActions: { flexDirection: 'row', gap: 8, marginTop: 13 },
  outlineButton: { flex: 1, minHeight: 48, borderWidth: 1, borderRadius: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  buttonText: { fontWeight: '800' },
  section: { fontSize: 11, fontWeight: '900', letterSpacing: 0.7, marginTop: 23, marginBottom: 9 },
  identify: { minHeight: 50, borderWidth: 1, borderRadius: 12, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 9 },
  label: { fontSize: 12, fontWeight: '800', marginTop: 13 },
  input: { minHeight: 50, borderWidth: 1, borderRadius: 11, paddingHorizontal: 13, fontSize: 14 },
  inputButton: { minHeight: 50, borderWidth: 1, borderRadius: 11, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 9 },
  guidedCard: { borderWidth: 1, borderRadius: 12, padding: 13, gap: 7, marginTop: 18 },
  startedToggle: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  varietyRow: { gap: 8, paddingVertical: 3 },
  choice: { minHeight: 44, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  stageRow: { flexDirection: 'row', gap: 7 },
  stageChoice: { flex: 1, minHeight: 68, borderWidth: 1, borderRadius: 11, alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 4 },
  methodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  methodChoice: { flexGrow: 1, flexBasis: '45%', minHeight: 48, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  dateRow: { flexDirection: 'row', gap: 7 },
  dateChoice: { flex: 1, minWidth: 0, minHeight: 46, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 7 },
  modalHeader: { minHeight: 58, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth },
  modalTitle: { fontSize: 18, fontWeight: '900' },
  searchBox: { minHeight: 48, borderRadius: 11, borderWidth: 1, margin: 14, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  categoryHeader: { paddingHorizontal: 18, paddingVertical: 10 },
  categoryTitle: { fontSize: 11, fontWeight: '900', letterSpacing: 0.7 },
  cropRow: { minHeight: 64, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  cropEmoji: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  customCropButton: { minHeight: 52, borderTopWidth: StyleSheet.hairlineWidth, marginTop: 8, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 9 },
  dateOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  dateSheet: { borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingTop: 9 },
  modalHandle: { width: 38, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 4 },
});

export default function NewPlantScreen() {
  const colors = useColors();
  const { spacing, fontSize, fontWeight, radii, shadows } = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const { cropId: paramCropId, scan: scanParam, status: statusParam, fromOnboarding, recommendationAction } = useLocalSearchParams<{ cropId?: string; scan?: string; status?: string; fromOnboarding?: string; recommendationAction?: string }>();
  const guided = fromOnboarding === '1' && Boolean(paramCropId);
  const [showAllDetails, setShowAllDetails] = useState(false);
  const [started, setStarted] = useState(false);
  const [createdPlant, setCreatedPlant] = useState<Plant | null>(null);
  const [showSuccessBurst, setShowSuccessBurst] = useState(false);
  const [firstWeekChecks, setFirstWeekChecks] = useState<boolean[]>([false, false, false, false]);
  const [saveError, setSaveError] = useState(false);
  const pendingPlant = useRef<Plant | null>(null);
  const submitting = useRef(false);
  useEffect(() => {
    if (!showSuccessBurst) return;
    const timer = setTimeout(() => setShowSuccessBurst(false), 1200);
    return () => clearTimeout(timer);
  }, [showSuccessBurst]);
  useEffect(() => {
    if (!createdPlant) return;
    let mounted = true;
    void AsyncStorage.getItem(FIRST_WEEK_CHECKS_KEY + createdPlant.id).then((stored) => {
      if (!mounted) return;
      try {
        const parsed = stored ? JSON.parse(stored) : null;
        if (Array.isArray(parsed) && parsed.length === 4 && parsed.every((value) => typeof value === 'boolean')) setFirstWeekChecks(parsed);
      } catch {
        // Ignore malformed local state and show a fresh checklist.
      }
    }).catch(() => {});
    return () => { mounted = false; };
  }, [createdPlant]);

  function toggleFirstWeekCheck(index: number) {
    if (!createdPlant) return;
    setFirstWeekChecks((current) => {
      const next = current.map((checked, itemIndex) => itemIndex === index ? !checked : checked);
      void AsyncStorage.setItem(FIRST_WEEK_CHECKS_KEY + createdPlant.id, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }

  const { activeGarden } = useActiveGarden();
  const { profile } = useUserProfile();
  const plants = useCollection<Plant>('plants');
  const diaryStore = useMemo(() => createStore<DiaryEntry>('diary_entries'), []);
  const { isGuest } = useSession();
  const { isPro, loading: proLoading } = usePurchases();

  const plantLimit = isGuest ? 3 : isPro ? Infinity : 5;
  const gardenPlantCount = activeGarden?.id
    ? plants.items.filter((p) => p.gardenId === activeGarden.id).length
    : plants.count;
  const atLimit = !proLoading && gardenPlantCount >= plantLimit;

  const { collection: customCropsCollection, customCropsById } = useCustomCrops();

  // 2-step flow: 'select' → 'details'. Skip step 1 if crop pre-selected (scan / SowNow)
  const [step, setStep] = useState<'select' | 'details'>(paramCropId ? 'details' : 'select');

  const [selectedCropId, setSelectedCropId] = useState<string | null>(paramCropId ?? null);
  const [showCropPicker, setShowCropPicker] = useState(false);
  const [cropSearch, setCropSearch] = useState('');
  const [pickerImgErr, setPickerImgErr] = useState<Record<string, boolean>>({});
  const [plantName, setPlantName] = useState(() => {
    if (!paramCropId) return '';
    const staticCrop = CROPS_BY_ID[paramCropId];
    return staticCrop ? t('crops.' + paramCropId + '.name', { defaultValue: staticCrop.name }) : '';
  });
  const autoFilledPlantName = useRef<string | null>(plantName || null);

  const [variety, setVariety] = useState('');
  const [varietyId, setVarietyId] = useState<string | null>(null);
  const [sowingDate, setSowingDate] = useState(todayStr());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const { pickFromGallery, pickFromCamera, picking: pickingPhoto } = usePickPhoto({ aspect: [4, 3], quality: 0.8 });
  const [propagationMethod, setPropagationMethod] = useState<PropagationMethod>('seed');
  // Stage selector — replaces the hidden initialStatus param
  const [selectedStatus, setSelectedStatus] = useState<Plant['status']>(() => {
    const VALID: Plant['status'][] = ['seedling','transplanted','growing','flowering','fruiting','harvesting','finished'];
    return (VALID.includes(statusParam as Plant['status']) ? statusParam : 'seedling') as Plant['status'];
  });
  const [saving, setSaving] = useState(false);
  const isAiFilled = scanParam === '1';

  const selectedCrop = selectedCropId
    ? (CROPS_BY_ID[selectedCropId] ?? customCropsById[selectedCropId] ?? null)
    : null;

  useEffect(() => {
    if (!selectedCrop || plantName.trim()) return;
    const label = selectedCrop.isCustom ? selectedCrop.name : t(`crops.${selectedCrop.id}.name`, { defaultValue: selectedCrop.name });
    autoFilledPlantName.current = label;
    setPlantName(label);
  }, [selectedCrop, plantName, t]);

  const filteredSections = useMemo(() => {
    const q = cropSearch.trim().toLowerCase();
    const staticSections = STATIC_SECTIONS.map((sec) => ({
      ...sec,
      data: q
        ? sec.data.filter(
            (c) =>
              c.name.toLowerCase().includes(q) ||
              t('crops.' + c.id + '.name', { defaultValue: c.name }).toLowerCase().includes(q)
          )
        : sec.data,
    })).filter((sec) => sec.data.length > 0);

    const customMatches = customCropsCollection.items.filter((cc) =>
      !q || cc.name.toLocaleLowerCase().includes(q)
    );
    const mycropsSection =
      customMatches.length > 0
        ? [{ title: '__mycrops__' as any, data: customMatches.map((cc) => customCropsById[cc.id]).filter(Boolean) as CropInfo[] }]
        : [];

    return [...mycropsSection, ...staticSections];
  }, [cropSearch, t, customCropsCollection.items, customCropsById]);

  const cropVarieties = selectedCropId ? (VARIETIES_BY_CROP[selectedCropId] ?? []) : [];

  function handleSelectCrop(crop: CropInfo) {
    setSelectedCropId(crop.id);
    const label = crop.isCustom ? crop.name : t('crops.' + crop.id + '.name', { defaultValue: crop.name });
    const currentName = plantName;
    const isAutoName = !currentName.trim()
      || (autoFilledPlantName.current !== null && currentName === autoFilledPlantName.current);
    setPlantName(getPlantNameAfterCropChange(currentName, autoFilledPlantName.current, label));
    autoFilledPlantName.current = isAutoName ? label : null;
    setShowCropPicker(false);
    setCropSearch('');
    setVarietyId(null);
    setVariety('');
    setStep('details'); // advance to form step
  }

  function handleSelectVariety(v: VarietyInfo | null) {
    if (v === null) {
      setVarietyId(null);
      setVariety('');
    } else {
      setVarietyId(v.id);
      setVariety(v.name);
    }
  }

  async function pickPhoto(fromCamera = false) {
    const result = await (fromCamera ? pickFromCamera() : pickFromGallery());
    if (result.kind === 'success') setPhotoUri(result.uri);
  }

  function handlePlantNameChange(value: string) {
    autoFilledPlantName.current = null;
    setPlantName(value);
  }

  async function handleSave() {
    if (submitting.current) return;
    if (!selectedCrop || !plantName.trim()) {
      setSaveError(true);
      return;
    }
    if (atLimit && !pendingPlant.current) {
      router.push('/paywall?source=plant_limit' as any);
      return;
    }
    const gardenId = activeGarden?.id;
    if (!gardenId) {
      setSaveError(true);
      return;
    }
    const draft = buildNewPlantDraft({
      gardenId,
      cropId: selectedCrop.id,
      name: plantName,
      variety,
      varietyId,
      sowingDate,
      status: selectedStatus,
      propagationMethod,
      photoUri,
      guided,
      started,
    });
    if (!draft) {
      setSaveError(true);
      return;
    }
    submitting.current = true;
    setSaving(true);
    setSaveError(false);
    try {
      const wasFirstPlant = plants.items.length === 0;
      const newPlant = pendingPlant.current ?? await createPlantWithSowing(draft);
      pendingPlant.current = newPlant;
      track(EVENTS.plantAdded, { cropId: selectedCropId, fromScan: isAiFilled });
      if (fromOnboarding === '1' && wasFirstPlant) {
        track(EVENTS.firstPlantCreated, {
          crop_id: selectedCropId,
          source: 'onboarding',
          space: profile?.spaceTypes[0],
          sunlight: profile?.sunlight,
        });
      }
      successHaptic();
      if (guided) { setCreatedPlant(newPlant); setShowSuccessBurst(true); }
      else if (fromOnboarding === '1') router.replace('/(tabs)');
      else if (isAiFilled && router.canGoBack()) router.dismissAll();
      else if (router.canGoBack()) router.back();
      else router.replace('/(tabs)');
    } catch {
      setSaveError(true);
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  }

  const s = useMemo(
    () => makeStyles(colors, spacing, fontSize, fontWeight, radii),
    [colors, spacing, fontSize, fontWeight, radii]
  );

  function goBack() {
    if (step === 'details' && !paramCropId) {
      setStep('select');
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  }

  const cropName = selectedCrop
    ? (selectedCrop.isCustom ? selectedCrop.name : t('crops.' + selectedCrop.id + '.name', { defaultValue: selectedCrop.name }))
    : '';

  if (createdPlant) return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: spacing.xl }}>
        <View style={{ alignSelf: 'center', width: '100%', maxWidth: 560, alignItems: 'center', gap: spacing.lg }}>
          <Mascot pose="celebrate" size={120} />
          <Text accessibilityRole="header" style={{ color: colors.text, fontSize: fontSize['2xl'], fontWeight: fontWeight.bold, textAlign: 'center' }}>{t('guidedPlant.success', { name: createdPlant.name })}</Text>
          <Text style={{ color: colors.textSecondary, lineHeight: 24, textAlign: 'center' }}>{t('guidedPlant.successBody')}</Text>
          <View style={[s.firstWeekPanel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={{ gap: spacing.xs }}>
              <Text accessibilityRole="header" style={[s.firstWeekTitle, { color: colors.text }]}>{t('firstWeek.title')}</Text>
              <Text style={[s.firstWeekSubtitle, { color: colors.textSecondary }]}>{t('firstWeek.subtitle', { name: cropName })}</Text>
            </View>
            <View style={{ gap: spacing.xs }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs }}>{t('firstWeek.progress', { done: firstWeekChecks.filter(Boolean).length, total: 4 })}</Text>
                {firstWeekChecks.every(Boolean) && <Text style={{ color: colors.primary, fontSize: fontSize.xs, fontWeight: fontWeight.bold }}>{t('firstWeek.completed')}</Text>}
              </View>
              <View style={{ height: 6, borderRadius: radii.full, overflow: 'hidden', backgroundColor: colors.surfaceAlt }}>
                <View style={{ width: `${(firstWeekChecks.filter(Boolean).length / 4) * 100}%`, height: '100%', backgroundColor: colors.primary }} />
              </View>
            </View>
            {[
              {
                icon: 'flower-outline' as const,
                title: t('firstWeek.spaceTitle'),
                body: typeof (selectedCropId ? CROP_CONTAINER_MIN[selectedCropId] : null) === 'number'
                  ? t('firstWeek.spaceContainer', { liters: CROP_CONTAINER_MIN[selectedCropId!] })
                  : t('firstWeek.spaceGround'),
              },
              { icon: 'water-outline' as const, title: t('firstWeek.observeTitle'), body: t('firstWeek.observeBody') },
              { icon: 'construct-outline' as const, title: t('firstWeek.materialTitle'), body: t('firstWeek.materialBody') },
              { icon: 'search-outline' as const, title: t('firstWeek.checkTitle'), body: t('firstWeek.checkBody') },
            ].map((item, index) => {
              const checked = firstWeekChecks[index] ?? false;
              return (
                <Pressable
                  key={item.title}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked }}
                  accessibilityLabel={`${item.title}. ${item.body}`}
                  onPress={() => toggleFirstWeekCheck(index)}
                  style={({ pressed }) => [s.firstWeekItem, { opacity: pressed ? 0.75 : 1 }]}
                >
                  <View style={[s.firstWeekCheck, { borderColor: checked ? colors.primary : colors.border, backgroundColor: checked ? colors.primary : 'transparent' }]}>
                    {checked && <Text style={{ color: colors.background, fontSize: 14, fontWeight: fontWeight.bold }}>✓</Text>}
                  </View>
                  <View style={[s.firstWeekIcon, { backgroundColor: checked ? colors.primary + '18' : colors.surfaceAlt }]}>
                    <Ionicons name={item.icon} size={20} color={checked ? colors.primary : colors.textSecondary} accessible={false} />
                  </View>
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text style={[s.firstWeekItemTitle, { color: checked ? colors.textSecondary : colors.text, textDecorationLine: checked ? 'line-through' : 'none' }]}>{item.title}</Text>
                    <Text style={[s.firstWeekItemBody, { color: colors.textSecondary }]}>{item.body}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
          <Button title={t('guidedPlant.today')} size="lg" onPress={() => router.replace('/(tabs)')} style={{ width: '100%' }} />
        </View>
      </ScrollView>
      <SuccessBurst visible={showSuccessBurst} />
    </SafeAreaView>
  );

  if (process.env.EXPO_PUBLIC_STITCH_CLONE !== 'false') {
    return (
      <StitchNewPlantScreen
        colors={colors}
        router={router}
        sections={filteredSections}
        selectedCropId={selectedCrop?.id ?? null}
        selectedCropLabel={cropName}
        cropSearch={cropSearch}
        showCropPicker={showCropPicker}
        onCropSearchChange={setCropSearch}
        onOpenCropPicker={() => setShowCropPicker(true)}
        onCloseCropPicker={() => { setShowCropPicker(false); setCropSearch(''); setPickerImgErr({}); }}
        onSelectCrop={handleSelectCrop}
        plantName={plantName}
        onPlantNameChange={handlePlantNameChange}
        variety={variety}
        varietyId={varietyId}
        varieties={cropVarieties}
        onVarietyChange={(value) => { setVariety(value); setVarietyId(null); }}
        onSelectVariety={handleSelectVariety}
        photoUri={photoUri}
        onPickPhoto={(fromCamera) => { void pickPhoto(fromCamera); }}
        onRemovePhoto={() => setPhotoUri(null)}
        pickingPhoto={pickingPhoto}
        sowingDate={sowingDate}
        onSowingDateChange={setSowingDate}
        showDatePicker={showDatePicker}
        onShowDatePicker={setShowDatePicker}
        propagationMethod={propagationMethod}
        onPropagationMethodChange={setPropagationMethod}
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
        guided={guided}
        started={started}
        onStartedChange={setStarted}
        showAllDetails={showAllDetails}
        onShowAllDetailsChange={setShowAllDetails}
        recommendationAction={recommendationAction}
        gardenLabel={activeGarden?.name}
        canScan={isPro}
        canSave={Boolean(selectedCrop && plantName.trim() && activeGarden && !plants.loading)}
        saving={saving}
        saveError={saveError}
        onSave={() => { void handleSave(); }}
        onBack={goBack}
      />
    );
  }

  return (
    <>
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={[s.header, { borderBottomColor: colors.border }]}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('onboarding.back')} onPress={goBack} hitSlop={12} style={{ minWidth: 44, minHeight: 44, justifyContent: 'center' }}>
          <Ionicons
            name={step === 'details' && !paramCropId ? 'arrow-back' : 'close'}
            size={24}
            color={colors.textSecondary}
          />
        </Pressable>
        <Text style={[s.headerTitle, { color: colors.text }]}>{t(guided ? 'guidedPlant.title' : 'plantNew.title')}</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* ── STEP 1: Choose how to add ── */}
      {step === 'select' && (
        <View style={s.entryContainer}>
          <View style={s.entryIntro}>
            <Mascot pose="wave" size={96} />
            <Text accessibilityRole="header" style={[s.entryTitle, { color: colors.text }]}>
              {t('plantNew.selectTitle')}
            </Text>
            <Text style={[s.entrySubtitle, { color: colors.textSecondary }]}>
              {t('plantNew.selectDesc')}
            </Text>
          </View>

          {isPro && (
            <ScalePress
              onPress={() => router.push('/plant/scan' as any)}
              style={[s.entryBtn, { backgroundColor: colors.accent, ...shadows.md }]}
            >
              <View style={[s.entryBtnIcon, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <Ionicons name="scan-outline" size={26} color={colors.primaryDark} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.entryBtnTitle, { color: colors.primaryDark }]}>{t('plantNew.scanTitle')}</Text>
                <Text style={[s.entryBtnDesc, { color: colors.primaryDark + 'BF' }]}>{t('plantNew.scanDesc')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.primaryDark} />
            </ScalePress>
          )}

          <ScalePress
            onPress={() => setShowCropPicker(true)}
            style={[s.entryBtn, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1.5, ...shadows.sm }]}
          >
            <View style={[s.entryBtnIcon, { backgroundColor: colors.surfaceAlt }]}>
              <Ionicons name="search-outline" size={26} color={colors.primaryDark} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.entryBtnTitle, { color: colors.text }]}>{t('plantNew.cropPickerTitle')}</Text>
              <Text style={[s.entryBtnDesc, { color: colors.textSecondary }]}>{t('catalog.title')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textDisabled} />
          </ScalePress>
        </View>
      )}

      {/* ── STEP 2: Plant details ── */}
      {step === 'details' && (
        <>
          {fromOnboarding === '1' && !guided && !isAiFilled && (
            <View style={{ backgroundColor: colors.primary + '10', borderBottomWidth: 1, borderBottomColor: colors.primary + '30', paddingHorizontal: spacing.xl, paddingVertical: spacing.md }}>
              <Text style={{ color: colors.primary, fontSize: fontSize.sm, lineHeight: 20 }}>{t('plantNew.guidedDetails')}</Text>
            </View>
          )}
          {isAiFilled && (
            <View style={[s.aiBanner, { backgroundColor: colors.primary + '18', borderBottomColor: colors.primary + '33' }]}>
              <Text style={[s.aiBannerText, { color: colors.primary }]}>{t('plantScan.aiFilled')}</Text>
            </View>
          )}

          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 40 }}
            >
              {/* Photo hero — 180px at top (FIX 2) */}
              {(!guided || showAllDetails) && <Pressable
                onPress={() => { void pickPhoto(false); }}
                style={[s.photoHero, { backgroundColor: colors.surfaceAlt }]}
              >
                {photoUri ? (
                  <>
                    <Image source={{ uri: photoUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                    <View style={s.photoHeroChangeBadge}>
                      <Ionicons name="camera" size={14} color="#fff" />
                      <Text style={{ color: '#fff', fontSize: fontSize.xs, fontWeight: fontWeight.semibold }}>
                        {t('plantNew.changePhoto')}
                      </Text>
                    </View>
                  </>
                ) : selectedCrop ? (
                  <>
                    <Text style={{ fontSize: 64 }}>{selectedCrop.emoji}</Text>
                    <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm, marginTop: spacing.xs }}>
                      {t('plantNew.addPhoto')}
                    </Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="camera-outline" size={40} color={colors.primary} />
                    <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm, marginTop: spacing.xs }}>
                      {t('plantNew.addPhoto')}
                    </Text>
                  </>
                )}
              </Pressable>}

              {/* Crop hero — prominent image + name + change link */}
              {selectedCrop && (
                <View style={[s.cropHero, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                  <View style={[s.cropHeroImg, { backgroundColor: colors.surfaceAlt }]}>
                    {CROP_IMAGES[selectedCrop.id] && !pickerImgErr[selectedCrop.id] ? (
                      <Image
                        source={{ uri: CROP_IMAGES[selectedCrop.id] }}
                        style={StyleSheet.absoluteFill}
                        resizeMode="cover"
                        onError={() => setPickerImgErr(p => ({ ...p, [selectedCrop.id]: true }))}
                      />
                    ) : (
                      <Text style={{ fontSize: 38 }}>{selectedCrop.emoji}</Text>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.cropHeroName, { color: colors.text }]}>{cropName}</Text>
                    <Text style={[s.cropHeroCategory, { color: colors.textSecondary }]}>
                      {t('cropCategory.' + selectedCrop.category)}
                    </Text>
                  </View>
                  <Pressable accessibilityRole="button" onPress={() => guided ? goBack() : setShowCropPicker(true)} hitSlop={8}>
                    <Text style={[s.changeText, { color: colors.primaryDark }]}>{t('plantNew.changeCrop')}</Text>
                  </Pressable>
                </View>
              )}

              <View style={s.formContainer}>
                {guided && <View style={{ gap: spacing.md }}>
                  <Text style={{ color: colors.textSecondary, lineHeight: 23 }}>{t(recommendationAction === 'prepare' ? 'guidedPlant.prepareBody' : 'guidedPlant.body')}</Text>
                  <Text style={{ color: colors.text, fontWeight: fontWeight.semibold }}>{activeGarden?.name} · {activeGarden?.province}</Text>
                  {selectedCropId && typeof CROP_CONTAINER_MIN[selectedCropId] === 'number' && <Text style={{ color: colors.textSecondary }}>{t('firstCrop.reasons.container', { liters: CROP_CONTAINER_MIN[selectedCropId] })}</Text>}
                  <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: started }} onPress={() => setStarted(!started)} style={{ minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: spacing.md }}>
                    <Text style={{ color: started ? colors.primaryDark : colors.textSecondary, fontSize: 24 }} accessible={false}>{started ? '☑' : '☐'}</Text>
                    <Text style={{ color: colors.text, flex: 1 }}>{t('guidedPlant.alreadySown')}</Text>
                  </Pressable>
                  <Text style={{ color: colors.textSecondary, lineHeight: 20 }}>{t(started ? 'guidedPlant.dateToday' : 'guidedPlant.noDate')}</Text>
                </View>}
                {/* Companion hint */}
                {!guided && selectedCrop && (() => {
                  const companions = getCompanions(selectedCrop.id).slice(0, 4);
                  if (!companions.length) return null;
                  return (
                    <View style={[s.companionHint, { backgroundColor: '#4CAF5012', borderColor: '#4CAF5055' }]}>
                      <Text style={[s.companionHintText, { color: '#2E7D32' }]}>
                        <Ionicons name="people-outline" size={15} color="#2E7D32" /> {t('plantNew.goodWith')}{' '}
                        {companions.map((c) => `${c.emoji} ${t('crops.' + c.id + '.name', { defaultValue: c.name })}`).join('  ')}
                      </Text>
                    </View>
                  );
                })()}

                {/* Plant name */}
                <Text style={[s.label, { color: colors.textSecondary, marginTop: spacing.lg }]}>{t('plantNew.nameLabel')}</Text>
                <TextInput
                  accessibilityLabel={t('plantNew.nameLabel')}
                  value={plantName}
                  onChangeText={handlePlantNameChange}
                  placeholder={t('plantNew.namePlaceholder')}
                  placeholderTextColor={colors.textDisabled}
                  style={[s.input, { backgroundColor: colors.surface, borderColor: plantName ? colors.primary : colors.border, color: colors.text }]}
                />

                {guided && <Button title={t(showAllDetails ? 'guidedPlant.less' : 'guidedPlant.more')} variant="ghost" onPress={() => setShowAllDetails(!showAllDetails)} style={{ marginTop: spacing.md, minHeight: 48 }} />}
                {(!guided || showAllDetails) && <>
                {/* Variety */}
                <Text style={[s.label, { color: colors.textSecondary, marginTop: spacing.lg }]}>
                  {t('plantNew.varietyLabel')}
                </Text>
                {cropVarieties.length > 0 && (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={{ marginBottom: spacing.sm }}
                    contentContainerStyle={{ gap: spacing.sm, paddingBottom: 2 }}
                  >
                    <Pressable
                      onPress={() => handleSelectVariety(null)}
                      style={[s.varietyChip, { backgroundColor: !varietyId ? colors.accent : colors.surface, borderColor: !varietyId ? colors.accent : colors.border }]}
                    >
                      <Text style={[s.varietyChipText, { color: !varietyId ? colors.primary : colors.textSecondary }]}>
                        <Ionicons name="leaf-outline" size={14} color={!varietyId ? colors.primary : colors.textSecondary} /> {t('plantNew.varietyGeneric')}
                      </Text>
                    </Pressable>
                    {cropVarieties.map((v) => {
                      const active = varietyId === v.id;
                      return (
                        <Pressable
                          key={v.id}
                          onPress={() => handleSelectVariety(v)}
                          style={[s.varietyChip, { backgroundColor: active ? colors.accent : colors.surface, borderColor: active ? colors.accent : colors.border }]}
                        >
                          <Text style={[s.varietyChipText, { color: active ? colors.primaryDark : colors.text }]}>
                            {t('varieties.' + v.id, { defaultValue: v.name })}
                          </Text>
                          <Text style={[s.varietyChipDays, { color: colors.textSecondary }]}>
                            {v.daysToHarvest[0]}–{v.daysToHarvest[1]}d
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                )}
                <TextInput
                  value={variety}
                  onChangeText={(text) => { setVariety(text); setVarietyId(null); }}
                  placeholder={t('plantNew.varietyPlaceholder')}
                  placeholderTextColor={colors.textDisabled}
                  style={[s.input, { backgroundColor: colors.surface, borderColor: variety ? colors.primary : colors.border, color: colors.text }]}
                />

                {(!guided || started) && <>
                {/* Growth stage — visual 4-chip picker */}
                <Text style={[s.label, { color: colors.textSecondary, marginTop: spacing.xl }]}>{t('plantNew.stageLabel')}</Text>
                <View style={s.stageRow}>
                  {QUICK_STAGES.map((stage) => {
                    const cfg = PLANT_STATUS_CONFIG[stage];
                    const active = selectedStatus === stage;
                    return (
                      <Pressable
                        key={stage}
                        onPress={() => { setSelectedStatus(stage); tapHaptic(); }}
                        style={[s.stageChip, { backgroundColor: active ? cfg.color + '20' : colors.surface, borderColor: active ? cfg.color : colors.border }]}
                      >
                        <Text style={{ fontSize: 26 }}>{cfg.emoji}</Text>
                        <Text style={[s.stageLabel, { color: active ? cfg.color : colors.textSecondary }]} numberOfLines={1}>
                          {t('plantStatus.' + stage)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Propagation method — 4 chips in one row */}
                <Text style={[s.label, { color: colors.textSecondary, marginTop: spacing.xl }]}>{t('plantNew.propagationLabel')}</Text>
                <View style={s.methodRow}>
                  {([
                    { value: 'seed',     emoji: '🌱', key: 'plantNew.propSeed' },
                    { value: 'cutting',  emoji: '✂️', key: 'plantNew.propCutting' },
                    { value: 'division', emoji: '🌿', key: 'plantNew.propDivision' },
                    { value: 'bought',   emoji: '🛒', key: 'plantNew.propBought' },
                  ] as const).map((opt) => {
                    const active = propagationMethod === opt.value;
                    return (
                      <Pressable
                        key={opt.value}
                        onPress={() => { setPropagationMethod(opt.value); tapHaptic(); }}
                        style={[s.methodChip, { backgroundColor: active ? colors.accent : colors.surface, borderColor: active ? colors.accent : colors.border }]}
                      >
                        <Text style={{ fontSize: 16 }}>{opt.emoji}</Text>
                        <Text style={[s.methodLabel, { color: active ? colors.primaryDark : colors.textSecondary }]} numberOfLines={1}>
                          {t(opt.key)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                </>}
                </>}

                {(!guided || started) && <>
                {/* Sowing date */}
                <Text style={[s.label, { color: colors.textSecondary, marginTop: spacing.xl }]}>{t('plantNew.sowingDate')}</Text>
                <View style={[s.dateBtnsRow, { marginBottom: spacing.sm }]}>
                  {([0, 1] as const).map((days) => {
                    const d = new Date();
                    d.setDate(d.getDate() - days);
                    const dateStr = dateToStr(d);
                    const active = sowingDate === dateStr;
                    return (
                      <Pressable
                        key={days}
                        onPress={() => setSowingDate(dateStr)}
                        style={[s.dateBtn, { backgroundColor: active ? colors.accent : colors.surfaceAlt, borderColor: active ? colors.accent : colors.border }]}
                      >
                        <Text style={[s.dateBtnText, { color: active ? colors.primaryDark : colors.textSecondary }]}>
                          {days === 0 ? t('entryNew.today') : t('entryNew.yesterday')}
                        </Text>
                      </Pressable>
                    );
                  })}
                  {(() => {
                    const today = dateToStr(new Date());
                    const d1 = new Date(); d1.setDate(d1.getDate() - 1);
                    const yesterday = dateToStr(d1);
                    const isOther = sowingDate !== today && sowingDate !== yesterday;
                    return (
                      <Pressable
                        onPress={() => setShowDatePicker(true)}
                        style={[s.dateBtn, { backgroundColor: isOther ? colors.accent : colors.surfaceAlt, borderColor: isOther ? colors.accent : colors.border }]}
                      >
                        <Text style={[s.dateBtnText, { color: isOther ? colors.primaryDark : colors.textSecondary }]} numberOfLines={1}>
                          {isOther ? sowingDate : t('plantNew.otherDate')}
                        </Text>
                      </Pressable>
                    );
                  })()}
                </View>

                {showDatePicker && Platform.OS === 'web' && <WebDatePicker label={t('plantNew.sowingDate')} value={sowingDate} onChange={setSowingDate} />}
                {showDatePicker && Platform.OS === 'android' && (
                  <DateTimePicker
                    value={new Date(sowingDate)}
                    mode="date"
                    display="default"
                    onChange={(_, date) => { setShowDatePicker(false); if (date) setSowingDate(dateToStr(date)); }}
                  />
                )}
                {showDatePicker && Platform.OS === 'ios' && (
                  <Modal transparent animationType="slide" visible>
                    <Pressable style={s.dateModalOverlay} onPress={() => setShowDatePicker(false)}>
                      <Pressable style={[s.dateModalSheet, { backgroundColor: glassAvailable ? 'transparent' : colors.surface, overflow: 'hidden' }]} onPress={() => {}}>
                        {glassAvailable && <GlassView style={StyleSheet.absoluteFill} glassEffectStyle="regular" />}
                        <View style={[s.dateModalHandle, { backgroundColor: colors.border }]} />
                        <DateTimePicker
                          value={new Date(sowingDate)}
                          mode="date"
                          display="spinner"
                          onChange={(_, date) => { if (date) setSowingDate(dateToStr(date)); }}
                          style={{ width: '100%' }}
                        />
                        <Button
                          title={t('common.save')}
                          onPress={() => setShowDatePicker(false)}
                          size="lg"
                          style={{ margin: spacing.xl, marginTop: 0 }}
                        />
                      </Pressable>
                    </Pressable>
                  </Modal>
                )}
                </>}

                {/* Save */}
                {saveError && <Text accessibilityRole="alert" style={{ color: colors.error, marginTop: spacing.md }}>{t('guidedPlant.saveError')}</Text>}
                <Button
                  title={t(guided ? 'guidedPlant.save' : 'plantNew.addPlant')}
                  onPress={handleSave}
                  disabled={!selectedCropId || !plantName.trim() || !activeGarden || plants.loading}
                  loading={saving}
                  size="lg"
                  style={{ marginTop: spacing.xl }}
                />
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </>
      )}

      {/* Crop picker modal — available from both steps */}
      <Modal visible={showCropPicker} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
          <View style={[s.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[s.modalTitle, { color: colors.text }]}>{t('plantNew.cropPickerTitle')}</Text>
            <Pressable onPress={() => { setShowCropPicker(false); setCropSearch(''); setPickerImgErr({}); }}>
              <Text style={{ color: colors.primary, fontSize: fontSize.md, fontWeight: fontWeight.semibold }}>
                {t('common.close')}
              </Text>
            </Pressable>
          </View>

          <View style={[s.searchBox, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
            <Ionicons name="search" size={16} color={colors.textSecondary} />
            <TextInput
              value={cropSearch}
              onChangeText={setCropSearch}
              placeholder={t('plantNew.cropSearch')}
              placeholderTextColor={colors.textDisabled}
              style={{ flex: 1, color: colors.text, fontSize: fontSize.md }}
              autoFocus
            />
          </View>

          <SectionList
            sections={filteredSections}
            keyExtractor={(item) => item.id}
            renderSectionHeader={({ section }) => (
              <View style={[s.categoryHeader, { backgroundColor: colors.background }]}>
                {section.title === '__mycrops__' ? (
                  <Text style={[s.categoryTitle, { color: colors.textSecondary }]}>
                    ⭐ {t('customCrop.mycrops').toUpperCase()}
                  </Text>
                ) : (
                  <Text style={[s.categoryTitle, { color: colors.textSecondary }]}>
                    {(CATEGORY_CONFIG as any)[section.title]?.emoji} {t('cropCategory.' + section.title).toUpperCase()}
                  </Text>
                )}
              </View>
            )}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => handleSelectCrop(item)}
                style={({ pressed }) => [
                  s.cropRow,
                  {
                    backgroundColor: item.id === selectedCropId ? colors.surfaceAlt : pressed ? colors.surfaceAlt : colors.surface,
                    borderBottomColor: colors.border,
                  },
                ]}
              >
                {CROP_IMAGES[item.id] && !pickerImgErr[item.id] ? (
                  <Image
                    source={{ uri: CROP_IMAGES[item.id] }}
                    style={s.pickerThumb}
                    resizeMode="cover"
                    onError={() => setPickerImgErr(p => ({ ...p, [item.id]: true }))}
                  />
                ) : (
                  <View style={[s.pickerThumb, { backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' }]}>
                    <Text style={{ fontSize: 24 }}>{item.emoji}</Text>
                  </View>
                )}
                <View style={{ flex: 1, marginLeft: spacing.md }}>
                  <Text style={{ color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.medium }}>
                    {item.isCustom ? item.name : t('crops.' + item.id + '.name', { defaultValue: item.name })}
                  </Text>
                  {!item.isCustom && (CROP_DIFFICULTY[item.id] || item.daysToHarvest) && (
                    <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs, marginTop: 2 }}>
                      {[
                        CROP_DIFFICULTY[item.id] ? t('plantDetail.difficulty.' + CROP_DIFFICULTY[item.id]) : null,
                        item.daysToHarvest ? `${item.daysToHarvest[0]}–${item.daysToHarvest[1]}d` : null,
                      ].filter(Boolean).join(' · ')}
                    </Text>
                  )}
                </View>
                {item.id === selectedCropId && (
                  <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                )}
              </Pressable>
            )}
            ListFooterComponent={
              <Pressable
                onPress={() => router.push('/crop/new' as any)}
                style={[s.cropRow, { borderBottomWidth: 0, justifyContent: 'center', gap: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}
              >
                <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
                <Text style={{ color: colors.primary, fontSize: fontSize.md, fontWeight: fontWeight.medium }}>
                  {t('customCrop.addNew')}
                </Text>
              </Pressable>
            }
            contentContainerStyle={{ paddingBottom: 40 }}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
    </>
  );
}

const makeStyles = (
  colors: ReturnType<typeof useColors>,
  spacing: Record<string, number>,
  fontSize: Record<string, number>,
  fontWeight: Theme['fontWeight'],
  radii: Record<string, number>
) =>
  StyleSheet.create({
    container: { flex: 1 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: spacing.lg,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    headerTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
    aiBanner: {
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    aiBannerText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, textAlign: 'center' },

    // Step 1 — entry
    entryContainer: {
      flex: 1,
      width: '100%',
      maxWidth: 560,
      alignSelf: 'center',
      padding: spacing.xl,
      gap: spacing.lg,
      justifyContent: 'flex-start',
      paddingTop: spacing['2xl'],
    },
    entryIntro: {
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: spacing.sm,
    },
    entryTitle: {
      fontSize: fontSize['2xl'],
      lineHeight: 32,
      fontWeight: fontWeight.bold,
      textAlign: 'center',
    },
    entrySubtitle: {
      fontSize: fontSize.md,
      textAlign: 'center',
      lineHeight: 22,
      maxWidth: 420,
    },
    entryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.lg,
      borderRadius: radii.xl,
      gap: spacing.md,
    },
    entryBtnIcon: {
      width: 52,
      height: 52,
      borderRadius: radii.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    entryBtnTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
    entryBtnDesc: { fontSize: fontSize.xs, marginTop: 2 },

    // First-week guide shown immediately after the first plant is saved.
    firstWeekPanel: {
      width: '100%',
      borderRadius: radii.xl,
      borderWidth: 1,
      padding: spacing.lg,
      gap: spacing.lg,
    },
    firstWeekTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
    firstWeekSubtitle: { fontSize: fontSize.sm, lineHeight: 20 },
    firstWeekItem: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
    firstWeekCheck: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
    firstWeekIcon: { width: 40, height: 40, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
    firstWeekItemTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
    firstWeekItemBody: { fontSize: fontSize.sm, lineHeight: 20 },

    // Step 2 — crop hero
    cropHero: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.lg,
      gap: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    cropHeroImg: {
      width: 72,
      height: 72,
      borderRadius: radii.lg,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
    },
    cropHeroName: { fontSize: fontSize.xl, fontWeight: fontWeight.bold },
    cropHeroCategory: { fontSize: fontSize.xs, marginTop: 2 },
    changeText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },

    // Form
    formContainer: { padding: spacing.xl, gap: 0 },
    label: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, letterSpacing: 0.8, marginBottom: spacing.sm },
    input: {
      borderWidth: 1.5,
      borderRadius: radii.md,
      padding: spacing.lg,
      fontSize: fontSize.md,
    },

    // Stage selector — 4 chips equal width
    stageRow: { flexDirection: 'row', gap: spacing.sm },
    stageChip: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: spacing.md,
      paddingHorizontal: 4,
      borderRadius: radii.md,
      borderWidth: 1.5,
      gap: 4,
    },
    stageLabel: { fontSize: 9, fontWeight: fontWeight.semibold, textAlign: 'center' },

    // Propagation — 4 equal chips in one row
    methodRow: { flexDirection: 'row', gap: spacing.sm },
    methodChip: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: spacing.md,
      paddingHorizontal: 4,
      borderRadius: radii.md,
      borderWidth: 1.5,
      gap: 3,
    },
    methodLabel: { fontSize: 9, fontWeight: fontWeight.medium, textAlign: 'center' },

    // Date
    dateBtnsRow: { flexDirection: 'row', gap: spacing.sm },
    dateBtn: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: spacing.sm,
      borderRadius: radii.full,
      borderWidth: 1.5,
    },
    dateBtnText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
    dateModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    dateModalSheet: { borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, paddingTop: spacing.sm, alignItems: 'center' },
    dateModalHandle: { width: 40, height: 4, borderRadius: 2, marginBottom: spacing.md },

    // Photo hero
    photoHero: {
      height: 180,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    photoHeroChangeBadge: {
      position: 'absolute',
      bottom: 12,
      right: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: 'rgba(0,0,0,0.55)',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 99,
    },
    // Variety
    varietyChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radii.full,
      borderWidth: 1.5,
      gap: 4,
    },
    varietyChipText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium },
    varietyChipDays: { fontSize: 10 },

    // Companion hint
    companionHint: { padding: spacing.md, borderRadius: radii.md, borderWidth: 1, marginBottom: spacing.md },
    companionHintText: { fontSize: fontSize.xs, lineHeight: 18 },

    // Crop picker modal
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: spacing.lg,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    modalTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
    searchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      margin: spacing.lg,
      padding: spacing.md,
      borderRadius: radii.md,
      borderWidth: 1,
    },
    categoryHeader: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.xs },
    categoryTitle: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, letterSpacing: 0.8 },
    cropRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    pickerThumb: { width: 52, height: 52, borderRadius: radii.md, overflow: 'hidden' },
  });
