import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { DEFAULT_PALETTE as T } from '../../../constants/theme';
import { FOLIOS, WAYFINDER_GREETINGS } from '../../../data/mock';
import { DestinationArt } from '../../../components/art/DestinationArt';
import { DayCard } from '../../../components/trip/DayCard';

function SmallCaps({ children, color, size = 10 }: { children: string; color: string; size?: number }) {
  return (
    <Text style={[styles.smallCaps, { color, fontSize: size }]}>{children}</Text>
  );
}

export default function TripScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const folio = FOLIOS[id ?? 'tokyo'];

  const [activeDay, setActiveDay] = useState(1);
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set([1, 2]));

  if (!folio) {
    router.back();
    return null;
  }

  const toggleDay = (n: number) => {
    setExpandedDays(prev => {
      const next = new Set(prev);
      next.has(n) ? next.delete(n) : next.add(n);
      return next;
    });
  };

  return (
    <View style={[styles.root, { backgroundColor: T.bg }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Hero */}
        <View style={{ position: 'relative' }}>
          <DestinationArt folio={folio} height={420} />

          {/* Nav overlay */}
          <SafeAreaView edges={['top']} style={StyleSheet.absoluteFill} pointerEvents="box-none">
            <View style={styles.navRow} pointerEvents="auto">
              <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                <Text style={styles.backChevron}>‹</Text>
              </TouchableOpacity>
              <View style={styles.folioBadge}>
                <Text style={styles.folioBadgeText}>Folio · Draft</Text>
              </View>
            </View>
          </SafeAreaView>

          {/* Hero text */}
          <View style={styles.heroText}>
            <SmallCaps color="rgba(245,239,226,0.78)" size={10}>
              {`${folio.destination} · ${folio.country}`}
            </SmallCaps>
            <Text style={styles.heroTitle}>{folio.title}</Text>
            <View style={styles.heroPills}>
              <Text style={styles.heroPillText}>{folio.dates}</Text>
              <View style={styles.heroDot} />
              <Text style={styles.heroPillText}>{folio.duration}</Text>
              <View style={styles.heroDot} />
              <Text style={styles.heroPillText}>{folio.vibe}</Text>
            </View>
          </View>
        </View>

        {/* Wayfinder note */}
        <View style={styles.px}>
          <View style={[styles.wayfinderNote, { backgroundColor: T.surface, borderColor: T.hair }]}>
            <View style={[styles.wfNoteAvatar, { backgroundColor: T.accent }]}>
              <Text style={[styles.wfNoteAvatarText, { color: '#f5efe2' }]}>W</Text>
            </View>
            <View style={styles.wfNoteBody}>
              <SmallCaps color={T.muted} size={9}>Wayfinder · just now</SmallCaps>
              <Text style={[styles.wfNoteText, { color: T.ink }]}>
                {WAYFINDER_GREETINGS[folio.id] ?? folio.teaser}
              </Text>
            </View>
          </View>
        </View>

        {/* Day strip */}
        <View style={styles.dayStripSection}>
          <View style={styles.sectionHeader}>
            <SmallCaps color={T.muted}>Itinerary</SmallCaps>
            <SmallCaps color={T.muted} size={9}>{`${folio.days.length} days`}</SmallCaps>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayStrip}>
            {folio.days.map(d => (
              <TouchableOpacity
                key={d.n}
                onPress={() => {
                  setActiveDay(d.n);
                  setExpandedDays(prev => new Set(prev).add(d.n));
                }}
                style={[
                  styles.dayPill,
                  {
                    borderColor: activeDay === d.n ? T.ink : T.hair,
                    backgroundColor: activeDay === d.n ? T.ink : 'transparent',
                  },
                ]}
              >
                <Text style={[styles.dayPillText, { color: activeDay === d.n ? T.bg : T.sub }]}>
                  Day {d.n}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Day cards */}
        <View style={[styles.px, styles.dayCards]}>
          {folio.days.map((day, idx) => (
            <DayCard
              key={day.n}
              day={day}
              folio={folio}
              theme={T}
              idx={idx}
              defaultExpanded={expandedDays.has(day.n)}
              onAskWayfinder={(q) => {
                // Wayfinder dock will handle this via the layout's state
              }}
            />
          ))}
        </View>

        {/* Documents */}
        <View style={styles.sectionHeader}>
          <SmallCaps color={T.muted}>Documents</SmallCaps>
          <TouchableOpacity>
            <Text style={[styles.uploadLink, { color: T.sub }]}>+ Upload</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.px}>
          <View style={[styles.docsList, { backgroundColor: T.surface, borderColor: T.hair }]}>
            {folio.docs.map((doc, i) => (
              <React.Fragment key={i}>
                {i > 0 && <View style={[styles.docDivider, { backgroundColor: T.hair }]} />}
                <View style={styles.docRow}>
                  <View style={styles.docLeft}>
                    <Text style={[styles.docName, { color: T.ink }]}>{doc.name}</Text>
                    <Text style={[styles.docState, { color: T.muted }]}>{doc.state}</Text>
                  </View>
                  <View style={[
                    styles.docStatus,
                    { backgroundColor: doc.state.includes('attached') ? T.ink : 'transparent',
                      borderColor: T.muted,
                      borderWidth: doc.state.includes('attached') ? 0 : 0.5,
                      borderStyle: 'dashed',
                    },
                  ]}>
                    <Text style={[styles.docStatusIcon, { color: doc.state.includes('attached') ? T.bg : T.muted }]}>
                      {doc.state.includes('attached') ? '✓' : '+'}
                    </Text>
                  </View>
                </View>
              </React.Fragment>
            ))}
          </View>
        </View>

        <View style={{ height: 160 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrollContent: {},
  navRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 56,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(245,239,226,0.18)',
    borderWidth: 0.5, borderColor: 'rgba(245,239,226,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  backChevron: { color: '#f5efe2', fontSize: 24, marginTop: -2 },
  folioBadge: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999,
    backgroundColor: 'rgba(245,239,226,0.18)',
    borderWidth: 0.5, borderColor: 'rgba(245,239,226,0.25)',
  },
  folioBadgeText: {
    color: '#f5efe2', fontSize: 10,
    letterSpacing: 3, textTransform: 'uppercase', fontFamily: 'monospace',
  },
  heroText: {
    position: 'absolute', left: 24, right: 24, bottom: 26,
  },
  heroTitle: {
    color: '#f5efe2', fontSize: 40, lineHeight: 40,
    letterSpacing: -1.6, fontWeight: '400', marginTop: 12,
  },
  heroPills: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginTop: 14, opacity: 0.85,
  },
  heroPillText: { color: '#f5efe2', fontSize: 12, letterSpacing: 0.6 },
  heroDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: '#f5efe2', opacity: 0.6 },
  px: { paddingHorizontal: 16 },
  wayfinderNote: {
    flexDirection: 'row', gap: 12,
    borderRadius: 12, borderWidth: 0.5,
    padding: 14, marginTop: 20,
  },
  wfNoteAvatar: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  wfNoteAvatarText: { fontSize: 11, fontWeight: '500' },
  wfNoteBody: { flex: 1, gap: 4 },
  wfNoteText: { fontSize: 13.5, lineHeight: 20, letterSpacing: -0.15 },
  dayStripSection: { paddingTop: 24 },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline',
    paddingHorizontal: 24, paddingBottom: 12,
  },
  smallCaps: {
    fontFamily: 'monospace', letterSpacing: 3.5, textTransform: 'uppercase',
  },
  dayStrip: { paddingHorizontal: 24, gap: 8, paddingBottom: 16 },
  dayPill: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 999, borderWidth: 0.5,
  },
  dayPillText: {
    fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase',
  },
  dayCards: { gap: 14 },
  uploadLink: { fontSize: 12 },
  docsList: {
    borderRadius: 12, borderWidth: 0.5, overflow: 'hidden', marginTop: 4,
  },
  docRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  docLeft: { flex: 1 },
  docName: { fontSize: 14, letterSpacing: -0.15 },
  docState: { fontSize: 11, marginTop: 3, letterSpacing: 0.3 },
  docStatus: {
    width: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
  },
  docStatusIcon: { fontSize: 11 },
  docDivider: { height: 0.5, marginHorizontal: 16 },
});
