import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { Palette } from '../../constants/theme';
import { FilmGrain } from '../art/FilmGrain';

type ComposeMode = 'screenshots' | 'words' | 'link';

interface Row {
  kind: ComposeMode;
  title: string;
  sub: string;
}

const ROWS: Row[] = [
  { kind: 'screenshots', title: 'Drop screenshots & PDFs', sub: 'Boarding passes, hotel confirms, Notion pages' },
  { kind: 'words',       title: 'Describe it in your own words', sub: 'A week in Lisbon · slow mornings · cheap eats' },
  { kind: 'link',        title: 'Paste a link', sub: 'Airbnb · Google Doc · article you saved' },
];

interface Props {
  theme: Palette;
  onCreate: (kind: ComposeMode) => void;
}

export function CreateYourOwnCard({ theme: T, onCreate }: Props) {
  return (
    <View style={[styles.card, { backgroundColor: T.surface, borderColor: T.hair }]}>
      {/* Gradient header strip */}
      <View style={styles.strip}>
        <LinearGradient
          colors={[T.accent, T.ink]}
          start={{ x: 0, y: 0.2 }} end={{ x: 1, y: 0.8 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.glowBlob, { backgroundColor: T.accent }]} />
        <FilmGrain seed={7} opacity={0.22} />
        <View style={styles.stripContent}>
          <Text style={styles.stripEyebrow}>A blank folio</Text>
          <View>
            <Text style={styles.stripHeadline}>Throw it at me.</Text>
            <Text style={styles.stripSub}>I'll organise it into a trip.</Text>
          </View>
        </View>
      </View>

      {/* Entry rows */}
      {ROWS.map((row, i) => (
        <React.Fragment key={row.kind}>
          {i > 0 && <View style={[styles.hairline, { backgroundColor: T.hair }]} />}
          <TouchableOpacity
            onPress={() => onCreate(row.kind)}
            style={styles.row}
            activeOpacity={0.7}
          >
            <View style={[styles.iconBox, { borderColor: T.hair }]}>
              <Text style={[styles.iconGlyph, { color: T.ink }]}>
                {row.kind === 'screenshots' ? '⬆' : row.kind === 'words' ? '✎' : '⎋'}
              </Text>
            </View>
            <View style={styles.rowText}>
              <Text style={[styles.rowTitle, { color: T.ink }]}>{row.title}</Text>
              <Text style={[styles.rowSub, { color: T.muted }]} numberOfLines={1}>{row.sub}</Text>
            </View>
            <Text style={[styles.rowArrow, { color: T.muted }]}>›</Text>
          </TouchableOpacity>
        </React.Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 14, overflow: 'hidden', borderWidth: 0.5 },
  strip: { height: 96, position: 'relative', overflow: 'hidden' },
  glowBlob: {
    position: 'absolute', top: '-30%', left: '-10%',
    width: '70%', height: '160%', borderRadius: 999, opacity: 0.33,
  },
  stripContent: {
    position: 'absolute', inset: 0,
    padding: 16, justifyContent: 'space-between',
  },
  stripEyebrow: {
    color: '#f5efe2', fontSize: 9,
    letterSpacing: 3.5, textTransform: 'uppercase',
    fontFamily: 'monospace', opacity: 0.82,
  },
  stripHeadline: {
    color: '#f5efe2', fontSize: 20,
    letterSpacing: -0.5, lineHeight: 22, fontWeight: '400',
  },
  stripSub: {
    color: '#f5efe2', fontSize: 12, opacity: 0.78, marginTop: 4, letterSpacing: -0.1,
  },
  hairline: { height: 0.5, marginHorizontal: 18 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    gap: 14, paddingHorizontal: 18, paddingVertical: 14,
  },
  iconBox: {
    width: 32, height: 32, borderRadius: 16, borderWidth: 0.5,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  iconGlyph: { fontSize: 14 },
  rowText: { flex: 1 },
  rowTitle: { fontSize: 14, letterSpacing: -0.15 },
  rowSub: { fontSize: 11.5, marginTop: 3, letterSpacing: -0.05 },
  rowArrow: { fontSize: 20, flexShrink: 0 },
});
