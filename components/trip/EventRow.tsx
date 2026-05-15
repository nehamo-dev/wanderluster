import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Linking, StyleSheet } from 'react-native';
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
  onConfirm?: () => void;
  onRemove?: () => void;
  loadingAlternative?: boolean;
}

export function EventRow({ event, theme: T, isLast, onConfirm, onRemove, loadingAlternative }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [reasonVisible, setReasonVisible] = useState(false);
  const label = KIND_LABEL[event.kind] ?? 'Note';
  const isSuggested = event.suggested === true;
  const hasTips = event.tips && event.tips.length > 0;
  const hasDetails = hasTips || event.rating != null || event.location != null;

  function openMap() {
    if (!event.location) return;
    const query = encodeURIComponent(event.location);
    Linking.openURL(`https://maps.google.com/?q=${query}`);
  }

  if (loadingAlternative) {
    return (
      <View style={[styles.row, styles.loadingRow]}>
        <View style={styles.timeGutter} />
        <View style={styles.dotCol}>
          <View style={[styles.dot, { borderColor: T.hair, borderWidth: 0.5, backgroundColor: 'transparent' }]} />
        </View>
        <View style={styles.loadingContent}>
          <ActivityIndicator size="small" color={T.accent} />
          <Text style={[styles.loadingText, { color: T.muted }]}>Finding an alternative…</Text>
        </View>
        {!isLast && <View style={[styles.divider, { backgroundColor: T.hair }]} />}
      </View>
    );
  }

  return (
    <View>
      <TouchableOpacity
        activeOpacity={hasDetails ? 0.75 : 1}
        onPress={hasDetails ? () => setExpanded(e => !e) : undefined}
      >
        <View style={[styles.row, isSuggested && styles.suggestedRow]}>
          {/* time gutter */}
          <View style={styles.timeGutter}>
            <Text style={[styles.time, { color: isSuggested ? T.muted : T.sub }]}>
              {event.time ?? '—'}
            </Text>
          </View>

          {/* status dot */}
          <View style={styles.dotCol}>
            {isSuggested ? (
              <View style={[styles.dot, styles.suggestedDot, { borderColor: T.accent }]} />
            ) : (
              <View style={[
                styles.dot,
                event.alert
                  ? { backgroundColor: T.accent }
                  : event.confirmed
                    ? { backgroundColor: T.ink }
                    : { backgroundColor: 'transparent', borderWidth: 0.5, borderColor: T.muted },
              ]} />
            )}
          </View>

          {/* content */}
          <View style={styles.content}>
            <View style={styles.titleRow}>
              <Text
                style={[styles.title, { color: isSuggested ? T.sub : (event.alert ? T.accent : T.ink) }]}
                numberOfLines={1}
              >
                {event.title}
              </Text>
              {isSuggested ? (
                <View>
                  <TouchableOpacity
                    onPress={() => setReasonVisible(v => !v)}
                    activeOpacity={0.7}
                    // @ts-ignore – web only
                    onMouseEnter={() => setReasonVisible(true)}
                    onMouseLeave={() => setReasonVisible(false)}
                  >
                    <View style={[styles.suggestedBadge, { borderColor: reasonVisible ? T.accent : T.hair }]}>
                      <Text style={[styles.suggestedBadgeText, { color: reasonVisible ? T.accent : T.muted }]}>
                        Suggested {event.reason ? '?' : ''}
                      </Text>
                    </View>
                  </TouchableOpacity>
                  {reasonVisible && event.reason && (
                    <View style={[styles.reasonTooltip, { backgroundColor: T.ink }]}>
                      <Text style={[styles.reasonText, { color: T.bg }]}>{event.reason}</Text>
                    </View>
                  )}
                </View>
              ) : (
                <Text style={[styles.kindLabel, { color: T.muted }]}>{label}</Text>
              )}
            </View>
            {event.meta ? (
              <View style={styles.metaRow}>
                <Text style={[styles.meta, { color: T.muted }]}>{event.meta}</Text>
                {event.rating != null && (
                  <Text style={[styles.rating, { color: T.sub }]}>
                    {event.rating.toFixed(1)} ★
                  </Text>
                )}
              </View>
            ) : event.rating != null ? (
              <Text style={[styles.rating, { color: T.sub }]}>{event.rating.toFixed(1)} ★</Text>
            ) : null}
          </View>

          {/* + / × actions for suggested events */}
          {isSuggested && (
            <View style={styles.actions}>
              <TouchableOpacity
                onPress={onConfirm}
                style={[styles.actionBtn, { backgroundColor: T.ink }]}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}
              >
                <Text style={[styles.actionText, { color: T.bg }]}>+</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onRemove}
                style={[styles.actionBtn, { backgroundColor: T.surface, borderWidth: 0.5, borderColor: T.hair }]}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
              >
                <Text style={[styles.actionText, { color: T.muted }]}>×</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* expand chevron */}
          {hasDetails && !isSuggested && (
            <Text style={[styles.chevron, { color: T.muted }]}>{expanded ? '∧' : '∨'}</Text>
          )}
        </View>
      </TouchableOpacity>

      {/* expanded details */}
      {expanded && hasDetails && (
        <View style={[styles.details, { borderTopColor: T.hair }]}>
          {hasTips && (
            <View style={styles.tipsSection}>
              {event.tips!.map((tip, i) => (
                <View key={i} style={styles.tipRow}>
                  <Text style={[styles.tipBullet, { color: T.accent }]}>·</Text>
                  <Text style={[styles.tipText, { color: T.sub }]}>{tip}</Text>
                </View>
              ))}
            </View>
          )}
          {event.location && (
            <TouchableOpacity onPress={openMap} style={styles.mapRow} activeOpacity={0.7}>
              <Text style={[styles.mapIcon, { color: T.muted }]}>↗</Text>
              <Text style={[styles.mapText, { color: T.sub }]}>{event.location}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {!isLast && <View style={[styles.divider, { backgroundColor: T.hair }]} />}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingHorizontal: 18,
    paddingVertical: 14,
    position: 'relative',
    gap: 12,
    alignItems: 'center',
  },
  suggestedRow: { opacity: 0.88 },
  loadingRow: { paddingVertical: 16 },
  timeGutter: { width: 44, flexShrink: 0 },
  time: { fontSize: 12, letterSpacing: -0.15 },
  dotCol: { width: 8, flexShrink: 0, alignItems: 'center' },
  dot: { width: 6, height: 6, borderRadius: 3 },
  suggestedDot: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  content: { flex: 1, minWidth: 0 },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  title: { fontSize: 14.5, letterSpacing: -0.15, lineHeight: 19, flex: 1 },
  kindLabel: {
    fontSize: 9, letterSpacing: 3.5,
    textTransform: 'uppercase', fontFamily: 'monospace', flexShrink: 0,
  },
  suggestedBadge: {
    borderWidth: 0.5, borderRadius: 999,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  suggestedBadgeText: {
    fontSize: 9, letterSpacing: 2,
    textTransform: 'uppercase', fontFamily: 'monospace',
  },
  reasonTooltip: {
    position: 'absolute',
    right: 0,
    top: 26,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    maxWidth: 220,
    zIndex: 99,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  reasonText: { fontSize: 12, letterSpacing: -0.1, lineHeight: 17 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  meta: { fontSize: 12, letterSpacing: -0.05, flex: 1 },
  rating: { fontSize: 11, letterSpacing: 0.2, flexShrink: 0, marginLeft: 8 },
  actions: { flexDirection: 'row', gap: 6, flexShrink: 0 },
  actionBtn: {
    width: 26, height: 26, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
  },
  actionText: { fontSize: 15, lineHeight: 17, fontWeight: '400' },
  chevron: { fontSize: 10, flexShrink: 0, marginLeft: 4 },
  loadingContent: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  loadingText: { fontSize: 12, letterSpacing: -0.1, fontStyle: 'italic' },
  divider: {
    marginHorizontal: 76,
    height: 0.5,
  },
  details: {
    marginLeft: 82,
    marginRight: 18,
    paddingTop: 4,
    paddingBottom: 14,
    borderTopWidth: 0,
    gap: 6,
  },
  tipsSection: { gap: 5 },
  tipRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  tipBullet: { fontSize: 16, lineHeight: 18, marginTop: -1 },
  tipText: { fontSize: 12.5, letterSpacing: -0.1, lineHeight: 18, flex: 1 },
  mapRow: { flexDirection: 'row', gap: 6, alignItems: 'center', marginTop: 2 },
  mapIcon: { fontSize: 12 },
  mapText: { fontSize: 12, letterSpacing: -0.1, textDecorationLine: 'underline' },
});
