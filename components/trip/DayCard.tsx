import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { Palette } from '../../constants/theme';
import type { TripDay, Folio } from '../../types';
import { DayBand } from '../art/DayBand';
import { EventRow } from './EventRow';

interface Props {
  day: TripDay;
  folio: Folio;
  theme: Palette;
  idx: number;
  defaultExpanded?: boolean;
  onAskWayfinder?: (q: string) => void;
  onConfirmEvent?: (eventIdx: number) => void;
  onRemoveEvent?: (eventIdx: number) => void;
  onRemoveConfirmedEvent?: (eventIdx: number, reason: 'incorrect_data' | 'change_of_plan') => void;
  loadingEventIdx?: number | null;
}

export function DayCard({
  day, folio, theme: T, idx,
  defaultExpanded = false,
  onAskWayfinder,
  onConfirmEvent,
  onRemoveEvent,
  onRemoveConfirmedEvent,
  loadingEventIdx,
}: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const confirmedCount = day.events.filter(e => !e.suggested).length;
  const suggestedCount = day.events.filter(e => e.suggested).length;
  const photoUrl = day.photoQuery
    ? `https://source.unsplash.com/800x300/?${encodeURIComponent(day.photoQuery)}`
    : undefined;

  return (
    <View style={[styles.card, { backgroundColor: T.surface, borderColor: T.hair }]}>
      <TouchableOpacity onPress={() => setExpanded(e => !e)} activeOpacity={0.85}>
        <View style={{ position: 'relative' }}>
          <DayBand folio={folio} height={expanded ? 110 : 78} idx={idx} photoUrl={photoUrl} />
          <View style={[StyleSheet.absoluteFill, styles.bandContent]}>
            <View style={styles.bandLeft}>
              <Text style={styles.dayEyebrow}>
                Day {String(day.n).padStart(2, '0')} · {day.date}
              </Text>
              <Text style={[styles.dayLabel, { fontSize: expanded ? 22 : 18 }]}>{day.label}</Text>
            </View>
            <View style={styles.badgeRow}>
              {confirmedCount > 0 && (
                <View style={styles.eventCountBadge}>
                  <Text style={styles.eventCountText}>{confirmedCount} confirmed</Text>
                </View>
              )}
              {suggestedCount > 0 && (
                <View style={[styles.eventCountBadge, styles.suggestedBadge]}>
                  <Text style={styles.eventCountText}>{suggestedCount} suggested</Text>
                </View>
              )}
              {day.empty && (
                <View style={styles.eventCountBadge}>
                  <Text style={styles.eventCountText}>Open</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.body}>
          {day.area && (
            <View style={[styles.areaRow, { borderBottomColor: T.hair }]}>
              <Text style={[styles.areaLabel, { color: T.muted }]}>Area</Text>
              <Text style={[styles.areaValue, { color: T.sub }]}>{day.area}</Text>
            </View>
          )}
          {day.empty ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: T.muted }]}>
                A blank day. Often the best ones.
              </Text>
              {onAskWayfinder && (
                <TouchableOpacity
                  onPress={() => onAskWayfinder(`What should I do on Day ${day.n} in ${folio.destination}?`)}
                  style={[styles.askButton, { borderColor: T.ink }]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.askButtonText, { color: T.ink }]}>Ask Wayfinder for ideas →</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            day.events.map((event, i) => (
              <EventRow
                key={`${i}-${event.title}`}
                event={event}
                theme={T}
                isLast={i === day.events.length - 1}
                onConfirm={event.suggested ? () => onConfirmEvent?.(i) : undefined}
                onRemove={event.suggested ? () => onRemoveEvent?.(i) : undefined}
                onRemoveConfirmed={!event.suggested ? (reason) => onRemoveConfirmedEvent?.(i, reason) : undefined}
                loadingAlternative={loadingEventIdx === i}
              />
            ))
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 14, borderWidth: 0.5, overflow: 'hidden' },
  bandContent: {
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  bandLeft: { flex: 1, gap: 0 },
  dayEyebrow: {
    color: '#f5efe2', fontSize: 9,
    letterSpacing: 3.5, textTransform: 'uppercase',
    fontFamily: 'monospace', opacity: 0.78, marginBottom: 6,
  },
  dayLabel: {
    color: '#f5efe2', letterSpacing: -0.6,
    fontWeight: '400', lineHeight: 24,
  },
  badgeRow: { flexDirection: 'column', gap: 4, alignItems: 'flex-end' },
  eventCountBadge: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(245,239,226,0.15)',
    borderWidth: 0.5,
    borderColor: 'rgba(245,239,226,0.2)',
  },
  suggestedBadge: {
    backgroundColor: 'rgba(245,239,226,0.08)',
    borderStyle: 'dashed',
  },
  eventCountText: {
    color: '#f5efe2', fontSize: 9,
    letterSpacing: 3, textTransform: 'uppercase', fontFamily: 'monospace',
  },
  body: { paddingVertical: 4 },
  areaRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 18, paddingVertical: 10,
    borderBottomWidth: 0.5,
  },
  areaLabel: {
    fontSize: 9, letterSpacing: 3, textTransform: 'uppercase',
    fontFamily: 'monospace',
  },
  areaValue: { fontSize: 12, letterSpacing: -0.1 },
  emptyState: { padding: 20, paddingTop: 18, gap: 14 },
  emptyText: { fontSize: 13.5, letterSpacing: -0.15, lineHeight: 20 },
  askButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: 999, borderWidth: 0.5,
  },
  askButtonText: { fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase' },
});
