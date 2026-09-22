import { useColors } from '@portfolio/ui';
import { useCollection } from '@portfolio/storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { GardenReminder } from '../../src/models/reminder';
import { REMINDER_TYPE_CONFIG } from '../../src/models/reminder';
import type { DiaryEntry } from '../../src/models/diary-entry';
import { ENTRY_TYPE_CONFIG } from '../../src/models/diary-entry';
import type { Plant } from '../../src/models/plant';
import { useActiveGarden } from '../../src/hooks/useActiveGarden';
import { useGardenMapPlan } from '../../src/hooks/useGardenMapPlan';
import { CROPS_BY_ID } from '../../src/data/crops';
import { dateToStr } from '../../src/utils/dateStr';
import { buildGardenPlanCalendarTasks, estimateHarvestWindow } from '../../src/utils/gardenCalendar';

type CalendarTask = { id: string; title: string; meta: string; icon: keyof typeof Ionicons.glyphMap; color: string; route: string; reminderDate?: string };

function dateFromKey(value: string) {
  return new Date(`${value}T12:00:00`);
}

function reminderApplies(reminder: GardenReminder, date: Date) {
  if (!reminder.enabled) return false;
  if (reminder.frequency === 'daily') return true;
  const weekday = date.getDay() + 1;
  if (reminder.frequency === 'once') return dateToStr(date) === (reminder.dueDate ?? legacyOnceDate(reminder));
  if (reminder.frequency === 'weekly') return reminder.weekday === weekday;
  const created = new Date(reminder.createdAt ?? date.toISOString());
  const days = Math.floor((date.getTime() - new Date(created.getFullYear(), created.getMonth(), created.getDate()).getTime()) / 86_400_000);
  const interval = reminder.frequency === 'every_2_days' ? 2 : 3;
  return days >= 0 && days % interval === 0;
}

function legacyOnceDate(reminder: GardenReminder): string {
  const created = new Date(reminder.createdAt);
  if (Number.isNaN(created.getTime())) return '';
  const target = new Date(created);
  target.setHours(reminder.time.hour, reminder.time.minute, 0, 0);
  const createdWeekday = created.getDay() + 1;
  const daysUntil = ((reminder.weekday ?? createdWeekday) - createdWeekday + 7) % 7;
  target.setDate(target.getDate() + (daysUntil === 0 && target <= created ? 7 : daysUntil));
  return dateToStr(target);
}

export default function CalendarTabScreen() {
  const colors = useColors();
  const router = useRouter();
  const { activeGarden } = useActiveGarden();
  const { plan } = useGardenMapPlan(activeGarden?.id);
  const reminders = useCollection<GardenReminder>('reminders');
  const entries = useCollection<DiaryEntry>('diary_entries');
  const plants = useCollection<Plant>('plants');
  const todayKey = dateToStr(new Date());
  const [selected, setSelected] = useState(todayKey);
  const [monthOffset, setMonthOffset] = useState(0);
  const monthDate = new Date(new Date().getFullYear(), new Date().getMonth() + monthOffset, 1);
  const monthLabel = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(monthDate);
  const gardenReminders = useMemo(() => reminders.items.filter((item) => !item.deletedAt && (!activeGarden?.id || item.gardenId === activeGarden.id)), [activeGarden?.id, reminders.items]);
  const gardenEntries = useMemo(() => entries.items.filter((item) => !item.deletedAt && (!activeGarden?.id || item.gardenId === activeGarden.id)), [activeGarden?.id, entries.items]);
  const plantById = useMemo(() => new Map(plants.items.map((plant) => [plant.id, plant])), [plants.items]);
  const week = useMemo(() => {
    const base = monthOffset === 0 ? new Date() : new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    base.setHours(12, 0, 0, 0);
    base.setDate(base.getDate() - base.getDay());
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(base);
      date.setDate(base.getDate() + index);
      const key = dateToStr(date);
      const weekday = new Intl.DateTimeFormat('es-ES', { weekday: 'short' }).format(date).replace('.', '');
      return { key, date: date.getDate(), day: key === todayKey ? 'Hoy' : weekday.charAt(0).toUpperCase() + weekday.slice(1) };
    });
  }, [monthDate, monthOffset, todayKey]);
  const selectedDate = dateFromKey(selected);
  const tasks = useMemo<CalendarTask[]>(() => {
    const diaryTasks = gardenEntries.filter((entry) => entry.date === selected).map((entry) => {
      const plantName = entry.plantId ? plantById.get(entry.plantId)?.name : undefined;
      const config = ENTRY_TYPE_CONFIG[entry.type];
      return { id: entry.id, title: `${config.label}${plantName ? ` · ${plantName}` : ''}`, meta: entry.notes ?? 'Entrada de bitácora registrada', icon: entry.type === 'watering' ? ('water-outline' as const) : ('leaf-outline' as const), color: config.color, route: entry.plantId ? `/plant/${entry.plantId}` : '/(tabs)/diary' };
    });
    const reminderTasks = gardenReminders.filter((reminder) => reminderApplies(reminder, selectedDate)).map((reminder) => {
      const config = REMINDER_TYPE_CONFIG[reminder.type];
      const plantName = reminder.plantId ? plantById.get(reminder.plantId)?.name : undefined;
      const time = `${String(reminder.time.hour).padStart(2, '0')}:${String(reminder.time.minute).padStart(2, '0')}`;
      return { id: reminder.id, title: `${reminder.title}${plantName ? ` · ${plantName}` : ''}`, meta: `${time} · ${config.label}`, icon: 'notifications-outline' as const, color: colors.primary, route: `/reminder/edit?id=${reminder.id}` };
    });
    const plannedTasks = buildGardenPlanCalendarTasks(plan, selected, CROPS_BY_ID, activeGarden?.climateZone).map((task) => ({
      id: task.id,
      title: task.title,
      meta: task.meta,
      icon: task.kind === 'planting' ? 'calendar-outline' as const : 'time-outline' as const,
      color: task.kind === 'planting' ? colors.info : colors.warning,
      route: '/garden/map-tools?tab=season',
      reminderDate: task.reminderDate,
    }));
    return [...diaryTasks, ...reminderTasks, ...plannedTasks];
  }, [activeGarden?.climateZone, colors.info, colors.primary, colors.warning, gardenEntries, gardenReminders, plan, plantById, selected, selectedDate]);
  const activityDates = useMemo(() => {
    const dates = new Set(gardenEntries.map((entry) => entry.date));
    for (const planting of plan.plannedPlantings) {
      dates.add(planting.plannedDate);
      const crop = CROPS_BY_ID[planting.cropId];
      if (planting.action === 'sowing' && crop) {
        const estimate = estimateHarvestWindow(planting.plannedDate, crop.daysToHarvest);
        if (estimate) dates.add(estimate.reviewDate);
      }
    }
    for (const reminder of gardenReminders) {
      if (reminder.frequency === 'once') dates.add(reminder.dueDate ?? legacyOnceDate(reminder));
    }
    return dates;
  }, [gardenEntries, gardenReminders, plan.plannedPlantings]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}><View><Text style={[styles.kicker, { color: colors.primary }]}>SEMILLA · ORGANIZA TUS CUIDADOS</Text><Text style={[styles.title, { color: colors.text }]}>Calendario</Text></View><Pressable accessibilityRole="button" onPress={() => router.push('/reminder/new' as any)} style={[styles.addButton, { backgroundColor: colors.primaryDark }]}><Ionicons name="add" size={18} color="#fff" /><Text style={styles.addText}>Nuevo</Text></Pressable></View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.monthRow}><Pressable accessibilityRole="button" accessibilityLabel="Mes anterior" onPress={() => setMonthOffset((value) => value - 1)} style={styles.monthButton}><Ionicons name="chevron-back" size={20} color={colors.textSecondary} /></Pressable><View><Text style={[styles.month, { color: colors.text }]}>{monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}</Text><Text style={[styles.monthSub, { color: colors.textSecondary }]}>{activeGarden ? `${activeGarden.name} · ${activeGarden.province}` : 'Sin huerto seleccionado'}</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Mes siguiente" onPress={() => setMonthOffset((value) => value + 1)} style={styles.monthButton}><Ionicons name="chevron-forward" size={20} color={colors.textSecondary} /></Pressable></View>
        <View style={[styles.week, { backgroundColor: colors.surface, borderColor: colors.border }]}>{week.map((item) => <Pressable key={item.key} onPress={() => setSelected(item.key)} style={[styles.day, selected === item.key && { backgroundColor: colors.primary }]}><Text style={[styles.dayName, { color: selected === item.key ? '#fff' : colors.textSecondary }]}>{item.day}</Text><Text style={[styles.dayNumber, { color: selected === item.key ? '#fff' : colors.text }]}>{item.date}</Text>{activityDates.has(item.key) && <View style={[styles.dayDot, { backgroundColor: selected === item.key ? '#fff' : colors.warning }]} />}</Pressable>)}</View>
        <View style={[styles.tip, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}><Ionicons name="leaf-outline" size={21} color={colors.primary} /><View style={{ flex: 1 }}><Text style={[styles.tipTitle, { color: colors.text }]}>Tu huerto, en calendario</Text><Text style={[styles.tipText, { color: colors.textSecondary }]}>Tus registros, recordatorios y siembras planificadas. Las revisiones de cosecha son estimaciones del catálogo, no fechas garantizadas.</Text></View></View>
        <View style={styles.sectionRow}><Text style={[styles.section, { color: colors.text }]}>{selected === todayKey ? 'Hoy' : new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).format(selectedDate)}</Text><Text style={[styles.count, { color: colors.primary }]}>{tasks.length} {tasks.length === 1 ? 'cuidado' : 'cuidados'}</Text></View>
        {tasks.length === 0 ? <View style={[styles.empty, { backgroundColor: colors.surface, borderColor: colors.border }]}><Ionicons name="calendar-outline" size={29} color={colors.primary} /><Text style={[styles.emptyTitle, { color: colors.text }]}>Nada programado para este día</Text><Text style={[styles.emptyText, { color: colors.textSecondary }]}>Puedes añadir un recordatorio o registrar lo que hayas hecho en el huerto.</Text><Pressable onPress={() => router.push('/reminder/new' as any)} style={[styles.emptyButton, { backgroundColor: colors.primary }]}><Text style={styles.addText}>Añadir recordatorio</Text></Pressable></View> : tasks.map((task) => <View key={task.id} style={{ gap: 6 }}><Pressable accessibilityRole="button" onPress={() => router.push(task.route as any)} style={[styles.task, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={[styles.taskIcon, { backgroundColor: task.color + '20' }]}><Ionicons name={task.icon} size={20} color={task.color} /></View><View style={{ flex: 1 }}><Text style={[styles.taskTitle, { color: colors.text }]}>{task.title}</Text><Text style={[styles.taskMeta, { color: colors.textSecondary }]}>{task.meta}</Text></View><Ionicons name="chevron-forward" size={18} color={colors.textSecondary} /></Pressable>{task.reminderDate && <Pressable accessibilityRole="button" accessibilityLabel={`Crear aviso para ${task.title}`} onPress={() => router.push((`/reminder/new?title=${encodeURIComponent(task.title)}&type=custom&frequency=once&date=${task.reminderDate}`) as any)} style={({ pressed }) => [styles.remindButton, { backgroundColor: colors.surface, borderColor: colors.primary, opacity: pressed ? 0.7 : 1 }]}><Ionicons name="notifications-outline" size={16} color={colors.primary} /><Text style={[styles.remindText, { color: colors.primary }]}>Avisarme</Text></Pressable>}</View>)}
        <View style={styles.sectionRow}><Text style={[styles.section, { color: colors.text }]}>Próximos registros</Text><Text style={[styles.count, { color: colors.textSecondary }]}>{gardenReminders.length} recordatorios</Text></View>
        <View style={[styles.upcoming, { backgroundColor: colors.surface, borderColor: colors.border }]}>{gardenReminders.length === 0 ? <Text style={[styles.upcomingMeta, { color: colors.textSecondary }]}>Todavía no tienes recordatorios activos.</Text> : gardenReminders.slice(0, 4).map((reminder) => <View key={reminder.id} style={styles.upcomingRow}><Ionicons name="notifications-outline" size={17} color={colors.primary} /><View style={{ flex: 1 }}><Text style={[styles.upcomingText, { color: colors.text }]}>{reminder.title}</Text><Text style={[styles.upcomingMeta, { color: colors.textSecondary }]}>{REMINDER_TYPE_CONFIG[reminder.type].label} · {String(reminder.time.hour).padStart(2, '0')}:{String(reminder.time.minute).padStart(2, '0')}</Text></View></View>)}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, header: { minHeight: 76, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1 }, kicker: { fontSize: 10, fontWeight: '900', letterSpacing: 1 }, title: { fontSize: 25, fontWeight: '900', marginTop: 2 }, addButton: { minHeight: 42, paddingHorizontal: 15, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 5 }, addText: { color: '#fff', fontSize: 13, fontWeight: '800' }, content: { padding: 16, gap: 13, paddingBottom: 100 }, monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, month: { textAlign: 'center', fontSize: 19, fontWeight: '900' }, monthSub: { textAlign: 'center', fontSize: 12, marginTop: 2 }, monthButton: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }, week: { borderRadius: 18, borderWidth: 1, paddingVertical: 10, paddingHorizontal: 5, flexDirection: 'row', justifyContent: 'space-around' }, day: { width: 40, minHeight: 55, borderRadius: 13, alignItems: 'center', justifyContent: 'center', gap: 3 }, dayName: { fontSize: 10, fontWeight: '700' }, dayNumber: { fontSize: 16, fontWeight: '900' }, dayDot: { width: 5, height: 5, borderRadius: 3 }, tip: { borderRadius: 17, borderWidth: 1, padding: 13, flexDirection: 'row', gap: 10 }, tipTitle: { fontSize: 14, fontWeight: '800' }, tipText: { fontSize: 12, lineHeight: 17, marginTop: 3 }, sectionRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 3 }, section: { fontSize: 18, fontWeight: '900', flex: 1 }, count: { fontSize: 12, fontWeight: '800' }, task: { minHeight: 73, borderRadius: 17, borderWidth: 1, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }, taskIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }, taskTitle: { fontSize: 14, fontWeight: '800' }, taskMeta: { fontSize: 11, lineHeight: 16, marginTop: 3 }, remindButton: { alignSelf: 'flex-end', minHeight: 44, paddingHorizontal: 14, borderRadius: 13, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }, remindText: { fontSize: 12, fontWeight: '800' }, upcoming: { borderRadius: 18, borderWidth: 1, padding: 14, gap: 12 }, upcomingRow: { flexDirection: 'row', alignItems: 'center', gap: 9 }, upcomingText: { fontSize: 14, fontWeight: '800' }, upcomingMeta: { fontSize: 12, lineHeight: 17, marginTop: 2 }, empty: { minHeight: 190, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center', padding: 20, gap: 8 }, emptyTitle: { fontSize: 16, fontWeight: '800', textAlign: 'center' }, emptyText: { fontSize: 12, lineHeight: 18, textAlign: 'center' }, emptyButton: { minHeight: 44, paddingHorizontal: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 5 },
});
