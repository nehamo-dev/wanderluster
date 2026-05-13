import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FilmGrain } from '../components/art/FilmGrain';
import { DEFAULT_PALETTE as T } from '../constants/theme';

const LINES = [
  'A flight forwarded becomes a trip held together.',
  'A screenshot at midnight becomes a Tuesday in May.',
  'A sentence becomes a folio that knows itself.',
];

export default function SplashScreen() {
  const [lineIdx, setLineIdx] = useState(0);
  const fadeAnim = useState(new Animated.Value(1))[0];

  useEffect(() => {
    const interval = setInterval(() => {
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
      setLineIdx(i => (i + 1) % LINES.length);
    }, 4200);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={[styles.root, { backgroundColor: T.bg }]}>
      {/* Atmospheric backdrop */}
      <LinearGradient
        colors={[T.bg, T.surface, T.bg]}
        start={{ x: 0, y: 0.17 }} end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.glow1, { backgroundColor: T.accent }]} />
      <View style={[styles.glow2, { backgroundColor: T.ink }]} />
      <View style={[styles.glow3, { backgroundColor: T.accent }]} />
      <FilmGrain seed={11} opacity={0.18} />

      <SafeAreaView style={styles.safe}>
        {/* Wordmark */}
        <View style={styles.wordmark}>
          <LinearGradient
            colors={[T.accent, T.ink]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.logoOrb}
          />
          <Text style={[styles.logoText, { color: T.ink }]}>Wanderluster</Text>
        </View>

        {/* Editorial center */}
        <View style={styles.center}>
          <Text style={[styles.eyebrow, { color: T.muted }]}>№ 01 · Welcome</Text>
          <Text style={[styles.headline, { color: T.ink }]}>
            {'Your\ntravel\n'}
            <Text style={[styles.headlineItalic, { color: T.accent }]}>concierge.</Text>
          </Text>
          <Animated.Text style={[styles.rotatingLine, { color: T.sub, opacity: fadeAnim }]}>
            {LINES[lineIdx]}
          </Animated.Text>
        </View>

        {/* CTA */}
        <View style={styles.cta}>
          <TouchableOpacity
            style={[styles.ctaButton, { backgroundColor: T.ink }]}
            onPress={() => router.push('/login')}
            activeOpacity={0.85}
          >
            <Text style={[styles.ctaText, { color: T.bg }]}>Step inside</Text>
          </TouchableOpacity>
          <Text style={[styles.version, { color: T.muted }]}>v1.0 · Est. 2026</Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  glow1: {
    position: 'absolute', top: '8%', right: '-15%',
    width: '85%', height: '55%', borderRadius: 999, opacity: 0.22,
  },
  glow2: {
    position: 'absolute', bottom: '8%', left: '-20%',
    width: '85%', height: '50%', borderRadius: 999, opacity: 0.13,
  },
  glow3: {
    position: 'absolute', top: '35%', left: '20%',
    width: '60%', height: '40%', borderRadius: 999, opacity: 0.09,
  },
  wordmark: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingTop: 76,
  },
  logoOrb: {
    width: 24, height: 24, borderRadius: 12,
  },
  logoText: {
    fontSize: 13, letterSpacing: 0.2,
  },
  center: {
    position: 'absolute',
    top: '32%',
    left: 32, right: 32,
  },
  eyebrow: {
    fontFamily: 'monospace',
    fontSize: 10, letterSpacing: 5,
    textTransform: 'uppercase',
    marginBottom: 22,
  },
  headline: {
    fontSize: 48, lineHeight: 50,
    letterSpacing: -2, fontWeight: '300',
  },
  headlineItalic: {
    fontStyle: 'italic', fontWeight: '400',
  },
  rotatingLine: {
    marginTop: 28, fontSize: 14.5, lineHeight: 22,
    letterSpacing: -0.15, maxWidth: 280,
  },
  cta: {
    position: 'absolute',
    bottom: 64,
    left: 24, right: 24,
    alignItems: 'center',
    gap: 18,
  },
  ctaButton: {
    width: '100%', paddingVertical: 18,
    borderRadius: 999, alignItems: 'center',
  },
  ctaText: {
    fontSize: 14.5, letterSpacing: 0.3,
  },
  version: {
    fontFamily: 'monospace',
    fontSize: 9, letterSpacing: 3,
    textTransform: 'uppercase',
  },
});
