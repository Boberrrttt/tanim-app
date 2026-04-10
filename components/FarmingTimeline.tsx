import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  type LayoutChangeEvent,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';
import { addDays, type CropPhaseDef } from '@/constants/crop-cycle';
import { colors, fontFamily, fontSize, radius, spacing, shadow } from '@/constants/design-tokens';

const WEEK_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;

const PHASE_BG: string[] = [
  colors.primaryAlpha30,
  colors.infoLight,
  colors.warningLight,
  colors.primaryAlpha20,
  colors.successLight,
];

const CELL_GAP = 2;

function stripTime(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function formatShort(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatMonthYear(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function phaseForCycleDay(dayInCycle: number, phases: CropPhaseDef[]): number {
  for (let i = 0; i < phases.length; i++) {
    const p = phases[i];
    if (dayInCycle >= p.dayStart && dayInCycle <= p.dayEnd) return i;
  }
  return Math.max(0, phases.length - 1);
}

/** 1-based cycle day for this calendar date, or null if outside [cycleStart, cycleEnd]. */
function dayInCycleForDate(date: Date, cycleStart: Date, cycleEnd: Date): number | null {
  const d = stripTime(date);
  const s = stripTime(cycleStart);
  const e = stripTime(cycleEnd);
  if (d < s || d > e) return null;
  return Math.floor((d.getTime() - s.getTime()) / 86400000) + 1;
}

type MonthPageData = { year: number; month: number };

function monthsSpannedByCycle(cycleStart: Date, cycleEnd: Date): MonthPageData[] {
  const s = stripTime(cycleStart);
  const e = stripTime(cycleEnd);
  const list: MonthPageData[] = [];
  let y = s.getFullYear();
  let m = s.getMonth();
  const endY = e.getFullYear();
  const endM = e.getMonth();
  while (y < endY || (y === endY && m <= endM)) {
    list.push({ year: y, month: m });
    m += 1;
    if (m > 11) {
      m = 0;
      y += 1;
    }
  }
  return list;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

type MonthPageProps = {
  width: number;
  year: number;
  month: number;
  cycleStartDate: Date;
  cycleEndDate: Date;
  phases: CropPhaseDef[];
  cycleDay: number;
  inCycle: boolean;
};

function MonthCalendarPage({
  width,
  year,
  month,
  cycleStartDate,
  cycleEndDate,
  phases,
  cycleDay,
  inCycle,
}: MonthPageProps) {
  const first = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0).getDate();
  const lead = first.getDay();

  const dayCells = useMemo(() => {
    const cells: { key: string; node: React.ReactNode }[] = [];

    for (let i = 0; i < lead; i++) {
      cells.push({
        key: `pad-${year}-${month}-${i}`,
        node: <View style={[styles.dayCell, styles.dayCellMuted]} />,
      });
    }

    for (let d = 1; d <= lastDay; d++) {
      const date = stripTime(new Date(year, month, d));
      const dInC = dayInCycleForDate(date, cycleStartDate, cycleEndDate);

      if (dInC === null) {
        cells.push({
          key: `o-${year}-${month}-${d}`,
          node: (
            <View style={[styles.dayCell, styles.dayCellOutside]}>
              <Text style={styles.dayCellNumMuted}>{d}</Text>
            </View>
          ),
        });
      } else {
        const phaseIndex = phaseForCycleDay(dInC, phases);
        const bg = PHASE_BG[phaseIndex % PHASE_BG.length];
        const isActive = inCycle && dInC === cycleDay;
        cells.push({
          key: `c-${year}-${month}-${d}`,
          node: (
            <View style={[styles.dayCell, { backgroundColor: bg }, isActive && styles.dayCellCurrent]}>
              <Text style={styles.dayCellNum}>{d}</Text>
            </View>
          ),
        });
      }
    }

    let t = 0;
    while (cells.length % 7 !== 0) {
      cells.push({
        key: `trail-${year}-${month}-${t}`,
        node: <View style={[styles.dayCell, styles.dayCellMuted]} />,
      });
      t += 1;
    }

    return cells;
  }, [year, month, lead, lastDay, cycleStartDate, cycleEndDate, phases, cycleDay, inCycle]);

  const rows = chunk(dayCells, 7);

  return (
    <View style={[styles.monthPage, { width }]}>
      <Text style={styles.monthPageTitle}>{formatMonthYear(first)}</Text>
      <View style={styles.weekHeaderRow}>
        {WEEK_LABELS.map((label, i) => (
          <View key={`${label}-${i}`} style={styles.weekHeaderCell}>
            <Text style={styles.weekHeaderText}>{label}</Text>
          </View>
        ))}
      </View>
      {rows.map((row, ri) => (
        <View key={`row-${year}-${month}-${ri}`} style={styles.weekRow}>
          {row.map((c) => (
            <React.Fragment key={c.key}>{c.node}</React.Fragment>
          ))}
        </View>
      ))}
    </View>
  );
}

export interface FarmingTimelineProps {
  cropName: string;
  cycleStartDate: Date;
  cycleEndDate: Date;
  totalDays: number;
  currentDay: number;
  phases: CropPhaseDef[];
  plantingWindowNote?: string;
  /** Optional note under the header (e.g. model metadata). If omitted, no footnote line is shown. */
  timelineFootnote?: string;
}

const FarmingTimeline: React.FC<FarmingTimelineProps> = ({
  cropName,
  cycleStartDate,
  cycleEndDate,
  totalDays,
  currentDay,
  phases,
  plantingWindowNote,
  timelineFootnote,
}) => {
  const cycleDay = currentDay;
  const isPrePlant = cycleDay < 1;
  const isComplete = cycleDay > totalDays;
  const inCycle = cycleDay >= 1 && cycleDay <= totalDays;
  const pct =
    isPrePlant ? 0 : isComplete ? 100 : Math.min(Math.round((cycleDay / totalDays) * 100), 100);

  const [carouselWidth, setCarouselWidth] = useState(0);
  const [pageIndex, setPageIndex] = useState(0);
  const monthListRef = useRef<FlatList<MonthPageData>>(null);

  const monthPages = useMemo(
    () => monthsSpannedByCycle(cycleStartDate, cycleEndDate),
    [cycleStartDate, cycleEndDate]
  );

  useEffect(() => {
    setPageIndex(0);
    monthListRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [cycleStartDate.getTime(), cycleEndDate.getTime()]);

  const onCarouselLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && Math.abs(w - carouselWidth) > 1) {
      setCarouselWidth(w);
    }
  }, [carouselWidth]);

  const onScrollEnd = useCallback((ev: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = ev.nativeEvent.contentOffset.x;
    const w = carouselWidth;
    if (w <= 0) return;
    const i = Math.round(x / w);
    setPageIndex(Math.max(0, Math.min(i, monthPages.length - 1)));
  }, [carouselWidth, monthPages.length]);

  const phaseSchedule = useMemo(() => {
    const start = stripTime(cycleStartDate);
    return phases.map((p, i) => {
      const from = addDays(start, p.dayStart - 1);
      const to = addDays(start, p.dayEnd - 1);
      return {
        ...p,
        phaseIndex: i,
        rangeLabel: `${formatShort(from)} – ${formatShort(to)}`,
      };
    });
  }, [cycleStartDate, phases]);

  const currentPhase = inCycle
    ? phases.find((p) => cycleDay >= p.dayStart && cycleDay <= p.dayEnd)
    : undefined;

  const statusSubtitle = isPrePlant
    ? `Not started — cycle begins ${formatShort(stripTime(cycleStartDate))} · today ${formatShort(stripTime(new Date()))}`
    : isComplete
      ? `Past planned cycle end (${formatShort(stripTime(cycleEndDate))})`
      : `Day ${cycleDay} of ${totalDays} · ${pct}% through cycle`;

  const rangeBanner = useMemo(() => {
    const s = stripTime(cycleStartDate);
    const e = stripTime(cycleEndDate);
    if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) {
      return formatMonthYear(s);
    }
    return `${formatMonthYear(s)} → ${formatMonthYear(e)}`;
  }, [cycleStartDate, cycleEndDate]);

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: carouselWidth,
      offset: carouselWidth * index,
      index,
    }),
    [carouselWidth]
  );

  const renderMonth = useCallback(
    ({ item }: { item: MonthPageData }) => (
      <MonthCalendarPage
        width={carouselWidth}
        year={item.year}
        month={item.month}
        cycleStartDate={cycleStartDate}
        cycleEndDate={cycleEndDate}
        phases={phases}
        cycleDay={cycleDay}
        inCycle={inCycle}
      />
    ),
    [carouselWidth, cycleStartDate, cycleEndDate, phases, cycleDay, inCycle]
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{cropName} — crop calendar</Text>
        <Text style={styles.monthBanner}>{rangeBanner}</Text>
        <Text style={styles.subtitle}>{statusSubtitle}</Text>
        {timelineFootnote ? (
          <Text style={styles.estimateNote}>{timelineFootnote}</Text>
        ) : null}
        {plantingWindowNote ? <Text style={styles.windowNote}>{plantingWindowNote}</Text> : null}
      </View>

      <View style={styles.datePillsRow}>
        <View style={styles.datePill}>
          <Text style={styles.datePillLabel}>Planned plant</Text>
          <Text style={styles.datePillValue}>{formatShort(stripTime(cycleStartDate))}</Text>
        </View>
        <View style={styles.datePill}>
          <Text style={styles.datePillLabel}>Harvest by</Text>
          <Text style={styles.datePillValue}>{formatShort(stripTime(cycleEndDate))}</Text>
        </View>
      </View>

      <Text style={styles.gridSectionTitle}>Monthly calendar</Text>
      <View style={styles.carouselHint}>
        <Text style={styles.carouselHintText}>Swipe ← → · {monthPages.length} month{monthPages.length === 1 ? '' : 's'}</Text>
      </View>

      <View style={styles.carouselOuter} onLayout={onCarouselLayout}>
        {carouselWidth > 0 && monthPages.length > 0 ? (
          <>
            <FlatList
              ref={monthListRef}
              data={monthPages}
              keyExtractor={(item) => `${item.year}-${item.month}`}
              horizontal
              pagingEnabled
              nestedScrollEnabled
              showsHorizontalScrollIndicator
              decelerationRate="fast"
              snapToInterval={carouselWidth}
              snapToAlignment="start"
              disableIntervalMomentum
              getItemLayout={getItemLayout}
              onMomentumScrollEnd={onScrollEnd}
              onScrollEndDrag={onScrollEnd}
              renderItem={renderMonth}
            />
            <View style={styles.pageIndicator}>
              <Text style={styles.pageIndicatorText}>
                {pageIndex + 1} / {monthPages.length}
              </Text>
              <View style={styles.dotRow}>
                {monthPages.map((_, i) => (
                  <View
                    key={`dot-${i}`}
                    style={[styles.dot, i === pageIndex && styles.dotActive]}
                  />
                ))}
              </View>
            </View>
          </>
        ) : (
          <Text style={styles.carouselPlaceholder}>Loading calendar…</Text>
        )}
      </View>

      <Text style={styles.gridSectionTitle}>Phase schedule</Text>
      <View style={styles.phaseGrid}>
        {phaseSchedule.map((p) => (
          <View
            key={`${p.name}-${p.dayStart}`}
            style={[
              styles.phaseTile,
              { borderLeftColor: PHASE_BG[p.phaseIndex % PHASE_BG.length] },
            ]}
          >
            <Text style={styles.phaseTileName}>{p.name}</Text>
            <Text style={styles.phaseTileDates}>{p.rangeLabel}</Text>
            <Text style={styles.phaseTileDesc} numberOfLines={2}>
              {p.description}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.legendRow}>
        {phases.map((p, i) => (
          <View key={`leg-${p.name}`} style={styles.legendItem}>
            <View style={[styles.legendSwatch, { backgroundColor: PHASE_BG[i % PHASE_BG.length] }]} />
            <Text style={styles.legendText} numberOfLines={1}>
              {p.name}
            </Text>
          </View>
        ))}
      </View>

      <View
        style={[
          styles.currentPhaseCard,
          isPrePlant && styles.currentPhaseCardPre,
          isComplete && styles.currentPhaseCardDone,
        ]}
      >
        <Text
          style={[
            styles.currentPhaseLabel,
            isPrePlant && styles.currentPhaseLabelPre,
            isComplete && styles.currentPhaseLabelDone,
          ]}
        >
          {isPrePlant ? 'NOT STARTED' : isComplete ? 'CYCLE COMPLETE' : 'NOW IN CYCLE'}
        </Text>
        <Text style={styles.currentPhaseName}>
          {isPrePlant
            ? 'Waiting for planting date'
            : isComplete
              ? 'Past modeled harvest window'
              : (currentPhase?.name ?? '—')}
        </Text>
        <Text style={styles.currentPhaseDesc}>
          {isPrePlant
            ? `Today is before your planned plant day. Phase names below apply after ${formatShort(stripTime(cycleStartDate))}.`
            : isComplete
              ? 'Your calendar is past the last day of this reference cycle. Verify in the field before acting.'
              : (currentPhase?.description ?? '—')}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md + 2,
    gap: spacing.sm,
    ...(shadow.sm ?? {}),
  },
  header: {
    gap: 4,
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.bold,
    color: colors.foreground,
  },
  monthBanner: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semibold,
    color: colors.primary,
  },
  subtitle: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.mutedForeground,
  },
  estimateNote: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    color: colors.mutedForeground,
    fontStyle: 'italic',
  },
  windowNote: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    color: colors.foreground,
    marginTop: 2,
    lineHeight: 16,
  },
  datePillsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  datePill: {
    flex: 1,
    backgroundColor: colors.muted,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  datePillLabel: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.semibold,
    color: colors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  datePillValue: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.bold,
    color: colors.foreground,
    marginTop: 2,
  },
  gridSectionTitle: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semibold,
    color: colors.foreground,
    marginTop: spacing.sm,
  },
  carouselHint: {
    marginTop: 2,
  },
  carouselHintText: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.medium,
    color: colors.mutedForeground,
  },
  carouselOuter: {
    marginTop: spacing.xs,
    minHeight: 280,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  carouselPlaceholder: {
    padding: spacing.lg,
    textAlign: 'center',
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    fontFamily: fontFamily.regular,
  },
  monthPage: {
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
  },
  monthPageTitle: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.bold,
    color: colors.foreground,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  weekHeaderRow: {
    flexDirection: 'row',
    gap: CELL_GAP,
  },
  weekHeaderCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  weekHeaderText: {
    fontSize: 10,
    fontFamily: fontFamily.semibold,
    color: colors.mutedForeground,
  },
  weekRow: {
    flexDirection: 'row',
    gap: CELL_GAP,
    marginBottom: CELL_GAP,
  },
  dayCell: {
    flex: 1,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  dayCellMuted: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  dayCellOutside: {
    backgroundColor: colors.muted,
    opacity: 0.55,
  },
  dayCellCurrent: {
    borderWidth: 2,
    borderColor: colors.warning,
  },
  dayCellNum: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.semibold,
    color: colors.foreground,
  },
  dayCellNumMuted: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    color: colors.mutedForeground,
  },
  pageIndicator: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  pageIndicatorText: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.semibold,
    color: colors.mutedForeground,
  },
  dotRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
  },
  dotActive: {
    backgroundColor: colors.primary,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  phaseGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  phaseTile: {
    width: '48%',
    flexGrow: 1,
    minWidth: '46%',
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.sm,
    borderLeftWidth: 4,
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderTopColor: colors.border,
    borderRightColor: colors.border,
    borderBottomColor: colors.border,
  },
  phaseTileName: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.bold,
    color: colors.foreground,
  },
  phaseTileDates: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.semibold,
    color: colors.primary,
    marginTop: 2,
  },
  phaseTileDesc: {
    fontSize: 10,
    fontFamily: fontFamily.regular,
    color: colors.mutedForeground,
    marginTop: 4,
    lineHeight: 14,
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: '48%',
  },
  legendSwatch: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  legendText: {
    fontSize: 10,
    fontFamily: fontFamily.medium,
    color: colors.mutedForeground,
    flex: 1,
  },
  currentPhaseCard: {
    backgroundColor: colors.warningLight,
    borderRadius: radius.md,
    padding: spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.warning,
    gap: 2,
    marginTop: spacing.sm,
    ...(shadow.sm ?? {}),
  },
  currentPhaseCardPre: {
    backgroundColor: colors.infoLight,
    borderLeftColor: colors.info,
  },
  currentPhaseCardDone: {
    backgroundColor: colors.successLight,
    borderLeftColor: colors.success,
  },
  currentPhaseLabel: {
    fontSize: 10,
    fontFamily: fontFamily.semibold,
    color: colors.warning,
    letterSpacing: 0.5,
  },
  currentPhaseLabelPre: {
    color: colors.info,
  },
  currentPhaseLabelDone: {
    color: colors.success,
  },
  currentPhaseName: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.bold,
    color: colors.foreground,
  },
  currentPhaseDesc: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.mutedForeground,
    lineHeight: 16,
  },
});

export default FarmingTimeline;
