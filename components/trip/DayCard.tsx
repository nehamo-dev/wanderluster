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
}

export function DayCard({ day, folio, theme: T, idx, defaultExpanded = false, onAskWayfinder }: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <View
      style={[styles.card, { backgroundColor: T.surface, borderColor: T.hair }]}
    >
      {/* Collapsible header / hero band */}
      <TouchableOpacity onPress={() => setExpanded(e => !e)} activeOpacity={0.85}>
        <View style={{ position: 'relative' }}>
          <DayBand folio={folio} height={expanded ? 110 : 78} idx={idx} />
          <View style={[StyleSheet.absoluteFill, styles.bandContent]}>
            <View>
              <Text style={styles.dayEyebrow}>
                Day {String(day.n).padStart(2, '0')} · {day.date}
              </Text>
              <Text style={[styles.dayLabel, { fontSize: expanded ? 22 : 18 }]}>{day.label}</Text>
            </View>
            <View style={styles.eventCountBadge}>
              <Text style={styles.eventCountText}>
                {day.empty ? 'Open' : `${day.events.length} ${day.events.length === 1 ? 'event' : 'events'}`}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>

      {/* Expanded content */}
      {expanded && (
        <View style={styles.body}>
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
                key={i}
                event={event}
                theme={T}
                isLast={i === day.events.length - 1}
              />
            ))
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14, borderWidth: 0.5, overflow: 'hidden',
  },
  bandContent: {
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  dayEyebrow: {
    color: '#f5efe2', fontSize: 9,
    letterSpacing: 3.5, textTransform: 'uppercase',
    fontFamily: 'monospace', opacity: 0.78, marginBottom: 6,
  },
  dayLabel: {
    color: '#f5efe2', letterSpacing: -0.6,
    fontWeight: '400', lineHeight: 24,
  },
  eventCountBadge: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(245,239,226,0.15)',
    borderWidth: 0.5,
    borderColor: 'rgba(245,239,226,0.2)',
  },
  eventCountText: {
    color: '#f5efe2', fontSize: 9,
    letterSpacing: 3.5, textTransform: 'uppercase', fontFamily: 'monospace',
  },
  body: { paddingVertical: 4 },
  emptyState: { padding: 20, paddingTop: 18, gap: 14 },
  emptyText: { fontSize: 13.5, letterSpacing: -0.15, lineHeight: 20 },
  askButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: 999, borderWidth: 0.5,
  },
  askButtonText: {
    fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase',
  },
});
