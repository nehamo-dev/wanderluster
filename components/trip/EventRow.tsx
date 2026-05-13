import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { Palette } from '../../constants/theme';
import type { TripEvent } from '../../types';

const KIND_LABEL: Record<string, string> = {
  flight: 'Transit', hotel: 'Stay', food: 'Table',
  activity: 'Walk', flag: 'Flag', transport: 'Move',
};

interface Props {
  event: TripEvent;
  theme: Palette;
  isLast?: boolean;
}

export function EventRow({ event, theme: T, isLast }: Props) {
  const label = KIND_LABEL[event.kind] ?? 'Note';

  return (
    <View style={styles.row}>
      {/* time gutter */}
      <View style={styles.timeGutter}>
        <Text style={[styles.time, { color: T.sub }]}>{event.time ?? '—'}</Text>
      </View>

      {/* status dot */}
      <View style={styles.dotCol}>
        <View style={[
          styles.dot,
          event.alert
            ? { backgroundColor: T.accent }
            : event.confirmed
              ? { backgroundColor: T.ink }
              : { backgroundColor: 'transparent', borderWidth: 0.5, borderColor: T.muted },
        ]} />
      </View>

      {/* content */}
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: event.alert ? T.accent : T.ink }]} numberOfLines={1}>
            {event.title}
          </Text>
          <Text style={[styles.kindLabel, { color: T.muted }]}>{label}</Text>
        </View>
        <Text style={[styles.meta, { color: T.muted }]}>{event.meta}</Text>
      </View>

      {!isLast && (
        <View style={[styles.divider, { backgroundColor: T.hair }]} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingHorizontal: 18,
    paddingVertical: 14,
    position: 'relative',
    gap: 14,
  },
  timeGutter: { width: 44, paddingTop: 2, flexShrink: 0 },
  time: {
    fontSize: 12, letterSpacing: -0.15,
    fontVariantNumeric: 'tabular-nums',
  } as any,
  dotCol: { width: 8, paddingTop: 7, flexShrink: 0 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  content: { flex: 1, minWidth: 0 },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 8,
  },
  title: { fontSize: 14.5, letterSpacing: -0.15, lineHeight: 19, flex: 1 },
  kindLabel: {
    fontSize: 9, letterSpacing: 3.5,
    textTransform: 'uppercase', fontFamily: 'monospace',
    flexShrink: 0,
  },
  meta: { fontSize: 12, letterSpacing: -0.05, marginTop: 4 },
  divider: {
    position: 'absolute',
    bottom: 0, left: 76, right: 18, height: 0.5,
  },
});
