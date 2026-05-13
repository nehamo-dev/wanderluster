import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { Palette } from '../../constants/theme';

const SUGGESTIONS = [
  'What should I do on Day 4?',
  'Do I need a visa with a US passport?',
  'Add a dinner — Narisawa, Jun 15, 8pm',
  'Find a quieter morning option',
  'Pack list for 10 days in spring',
];

interface Props {
  theme: Palette;
  onExpand: () => void;
  suggestion?: string;
}

export function WayfinderDock({ theme: T, onExpand, suggestion }: Props) {
  const [idx, setIdx] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const interval = setInterval(() => {
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
      setIdx(i => (i + 1) % SUGGESTIONS.length);
    }, 3800);
    return () => clearInterval(interval);
  }, []);

  const currentSuggestion = suggestion ?? SUGGESTIONS[idx];

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={onExpand}
        activeOpacity={0.92}
        style={[styles.pill, { backgroundColor: T.dock, borderColor: T.dockBorder }]}
      >
        {/* Avatar */}
        <LinearGradient
          colors={[T.accent, T.ink]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.avatar}
        >
          <Text style={[styles.avatarText, { color: T.dockText }]}>W</Text>
        </LinearGradient>

        {/* Text */}
        <View style={styles.textBlock}>
          <Text style={[styles.label, { color: T.dockMuted }]}>Wayfinder</Text>
          <Animated.Text
            style={[styles.suggestion, { color: T.dockText, opacity: fadeAnim }]}
            numberOfLines={1}
          >
            {currentSuggestion}
          </Animated.Text>
        </View>

        {/* Mic button */}
        <View style={[styles.micButton, { backgroundColor: T.dockText }]}>
          <Text style={[styles.micIcon, { color: T.dock }]}>♪</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 12, right: 12, bottom: 28,
    zIndex: 80,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 24,
    padding: 14,
    borderWidth: 0.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 32,
    elevation: 16,
  },
  avatar: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: { fontSize: 12, fontWeight: '500' },
  textBlock: { flex: 1, minWidth: 0 },
  label: {
    fontSize: 9, letterSpacing: 3.5,
    textTransform: 'uppercase', fontFamily: 'monospace',
  },
  suggestion: {
    fontSize: 13, letterSpacing: -0.15, marginTop: 2,
  },
  micButton: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  micIcon: { fontSize: 14 },
});
