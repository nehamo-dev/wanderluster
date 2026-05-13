import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Animated, Platform, KeyboardAvoidingView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { Palette } from '../../constants/theme';
import type { ChatMessage, Folio } from '../../types';
import { FOLIOS, WAYFINDER_GREETINGS } from '../../data/mock';

const SUGGESTIONS = [
  'What should I do on Day 4?',
  'Do I need a visa with a US passport?',
  'Add a dinner — Narisawa, Jun 15, 8pm',
  'Pack list for 10 days in spring',
];

function seedMessages(folioId?: string): ChatMessage[] {
  const folio = folioId ? FOLIOS[folioId] : null;
  if (folio) {
    return [{
      id: 'seed',
      role: 'wayfinder',
      text: `Your ${folio.destination} folio is open. ${WAYFINDER_GREETINGS[folio.id] ?? ''}`,
    }];
  }
  return [{
    id: 'seed',
    role: 'wayfinder',
    text: 'Three folios are waiting. Each one a different season. Choose, and I will take care of the rest.',
  }];
}

function matchCanned(text: string, folioId?: string): string | null {
  const t = text.toLowerCase();
  if (t.includes('visa') && t.includes('japan')) {
    return 'For a US passport, a 90-day tourist stay in Japan needs no visa. I have surfaced an e-visa slot in your documents in case that changes.';
  }
  if (t.includes('day 4') && folioId === 'tokyo') {
    return 'Day 4 is the open one. Two options I trust: Kamakura by train, or a quiet morning at Nezu shrine then teahouse in Yanaka. I can hold either.';
  }
  if (t.includes('narisawa')) {
    return 'Narisawa, two guests, June 15 at 20:00. Added to Day 3. I have noted dress code.';
  }
  if (t.includes('pack') || t.includes('packing')) {
    return 'For 10 days in Tokyo in spring: layers, an umbrella small enough to carry, and shoes you can take off twenty times a day.';
  }
  if (t.includes('quieter') || t.includes('quiet')) {
    return 'Most mornings are loudest after 9. I can pre-book a 06:30 entry where possible and walk routes that avoid the main arteries.';
  }
  return null;
}

interface Props {
  theme: Palette;
  open: boolean;
  onClose: () => void;
  seedQuestion?: string;
  folioId?: string;
  composeMode?: 'screenshots' | 'words' | 'link' | null;
}

export function WayfinderSheet({ theme: T, open, onClose, seedQuestion, folioId, composeMode }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => seedMessages(folioId));
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const slideAnim = useRef(new Animated.Value(1)).current;
  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: open ? 0 : 1,
      damping: 28, stiffness: 200, useNativeDriver: true,
    }).start();
    if (open) setTimeout(() => inputRef.current?.focus(), 400);
  }, [open]);

  useEffect(() => {
    setMessages(seedMessages(folioId));
  }, [folioId]);

  useEffect(() => {
    if (seedQuestion) setInput(seedQuestion);
  }, [seedQuestion]);

  useEffect(() => {
    if (!open || !composeMode) return;
    const starters: Record<string, string> = {
      screenshots: 'Drop them in. I will read what I can — flights, hotels, bookings — and shape the first draft of a folio.',
      words: 'Tell me where, and how it should feel. A line or two is enough.',
      link: 'Paste anything — a listing, a doc, an article you saved. I will lift what matters.',
    };
    if (starters[composeMode]) {
      setMessages(prev => [...prev, { id: `auto-${Date.now()}`, role: 'wayfinder', text: starters[composeMode] }]);
    }
    if (composeMode === 'link') setInput('https://');
  }, [composeMode, open]);

  async function send(overrideText?: string) {
    const text = (overrideText ?? input).trim();
    if (!text) return;
    setInput('');

    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    setThinking(true);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);

    await new Promise(r => setTimeout(r, 700 + Math.random() * 600));

    const canned = matchCanned(text, folioId);
    const replyText = canned ?? 'Noted. I\'ll take care of that when we\'re back in signal.';
    setMessages(prev => [...prev, { id: `w-${Date.now()}`, role: 'wayfinder', text: replyText }]);
    setThinking(false);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%' as any, '100%' as any],
  });

  return (
    <>
      {/* Scrim */}
      {open && (
        <TouchableOpacity
          style={styles.scrim}
          onPress={onClose}
          activeOpacity={1}
        />
      )}

      {/* Sheet */}
      <Animated.View
        style={[styles.sheet, { backgroundColor: T.sheet, transform: [{ translateY }] }]}
        pointerEvents={open ? 'auto' : 'none'}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Grabber */}
          <View style={styles.grabberRow}>
            <View style={[styles.grabber, { backgroundColor: T.hair }]} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <LinearGradient
                colors={[T.accent, T.ink]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={styles.headerAvatar}
              >
                <Text style={[styles.headerAvatarText, { color: T.bg }]}>W</Text>
              </LinearGradient>
              <View>
                <Text style={[styles.headerName, { color: T.ink }]}>Wayfinder</Text>
                <Text style={[styles.headerSub, { color: T.muted }]}>Your concierge</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeButton, { backgroundColor: T.surface, borderColor: T.hair }]}
            >
              <Text style={[styles.closeX, { color: T.sub }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.hairline, { backgroundColor: T.hair }]} />

          {/* Messages */}
          <ScrollView
            ref={scrollRef}
            style={styles.messages}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
          >
            {messages.map(m => (
              <MessageBubble key={m.id} m={m} theme={T} />
            ))}
            {thinking && (
              <View style={styles.thinkingRow}>
                <LinearGradient
                  colors={[T.accent, T.ink]}
                  style={styles.thinkingAvatar}
                >
                  <Text style={{ color: T.bg, fontSize: 11, fontWeight: '500' }}>W</Text>
                </LinearGradient>
                <View style={[styles.thinkingBubble, { backgroundColor: T.surface, borderColor: T.hair }]}>
                  <View style={styles.dotsRow}>
                    {[0, 1, 2].map(i => (
                      <View key={i} style={[styles.dot, { backgroundColor: T.muted }]} />
                    ))}
                  </View>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Suggestion chips */}
          <ScrollView
            horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsRow}
          >
            {SUGGESTIONS.slice(0, 4).map(s => (
              <TouchableOpacity
                key={s} onPress={() => send(s)}
                style={[styles.chip, { backgroundColor: T.surface, borderColor: T.hair }]}
              >
                <Text style={[styles.chipText, { color: T.sub }]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Input bar */}
          <View style={[styles.inputBar, { borderTopColor: T.hair, backgroundColor: T.bg }]}>
            <View style={[styles.inputWrap, { backgroundColor: T.surface, borderColor: T.hair }]}>
              <TextInput
                ref={inputRef}
                value={input}
                onChangeText={setInput}
                onSubmitEditing={() => send()}
                placeholder={
                  composeMode === 'words' ? 'Where to, and how should it feel?'
                    : composeMode === 'link' ? 'Paste a link'
                      : 'Ask Wayfinder, or paste a confirmation'
                }
                placeholderTextColor={T.muted}
                style={[styles.input, { color: T.ink }]}
                returnKeyType="send"
                blurOnSubmit={false}
              />
              <TouchableOpacity
                onPress={() => send()}
                style={[styles.sendButton, { backgroundColor: T.ink }]}
              >
                <Text style={[styles.sendArrow, { color: T.bg }]}>→</Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.inputFooter, { color: T.muted }]}>Voice · Upload · Chat</Text>
          </View>
        </KeyboardAvoidingView>
      </Animated.View>
    </>
  );
}

function MessageBubble({ m, theme: T }: { m: ChatMessage; theme: Palette }) {
  if (m.role === 'user') {
    return (
      <View style={styles.userRow}>
        <View style={[styles.userBubble, { backgroundColor: T.ink }]}>
          <Text style={[styles.bubbleText, { color: T.bg }]}>{m.text}</Text>
        </View>
      </View>
    );
  }
  return (
    <View style={styles.wayfinderRow}>
      <LinearGradient
        colors={[T.accent, T.ink]}
        style={styles.wfAvatar}
      >
        <Text style={[styles.wfAvatarText, { color: T.bg }]}>W</Text>
      </LinearGradient>
      <View style={styles.wfContent}>
        <Text style={[styles.bubbleText, { color: T.ink }]}>{m.text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: {
    position: 'absolute', inset: 0 as any, zIndex: 90,
    backgroundColor: 'rgba(0,0,0,0.32)',
  },
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    height: '88%', zIndex: 95,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.16, shadowRadius: 40, elevation: 24,
  },
  grabberRow: { alignItems: 'center', paddingTop: 8 },
  grabber: { width: 36, height: 4, borderRadius: 2 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 22, paddingVertical: 14,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerAvatar: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  headerAvatarText: { fontSize: 13, fontWeight: '500' },
  headerName: { fontSize: 15, letterSpacing: -0.15 },
  headerSub: {
    fontSize: 10.5, letterSpacing: 2.5,
    textTransform: 'uppercase', marginTop: 1,
  },
  closeButton: {
    width: 30, height: 30, borderRadius: 15, borderWidth: 0.5,
    alignItems: 'center', justifyContent: 'center',
  },
  closeX: { fontSize: 12 },
  hairline: { height: 0.5 },
  messages: { flex: 1 },
  messagesContent: { padding: 18, gap: 16 },
  userRow: { alignItems: 'flex-end' },
  userBubble: {
    maxWidth: '78%', borderRadius: 18,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  wayfinderRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  wfAvatar: {
    width: 26, height: 26, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  wfAvatarText: { fontSize: 11, fontWeight: '500' },
  wfContent: { maxWidth: '82%', paddingTop: 2 },
  bubbleText: { fontSize: 14, letterSpacing: -0.15, lineHeight: 20 },
  thinkingRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-end' },
  thinkingAvatar: {
    width: 26, height: 26, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
  },
  thinkingBubble: {
    borderRadius: 18, borderWidth: 0.5,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  dotsRow: { flexDirection: 'row', gap: 5 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  chipsRow: { paddingHorizontal: 18, paddingVertical: 10, gap: 8 },
  chip: {
    flexShrink: 0, paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 999, borderWidth: 0.5,
  },
  chipText: { fontSize: 11.5, letterSpacing: -0.1 },
  inputBar: { padding: 8, paddingHorizontal: 16, paddingBottom: 22, borderTopWidth: 0.5 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    paddingLeft: 16, paddingRight: 8, paddingVertical: 8,
    borderRadius: 24, borderWidth: 0.5,
  },
  input: { flex: 1, fontSize: 14, letterSpacing: -0.15, minHeight: 36 },
  sendButton: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
  },
  sendArrow: { fontSize: 16 },
  inputFooter: {
    textAlign: 'center', marginTop: 12,
    fontFamily: 'monospace', fontSize: 9,
    letterSpacing: 3.5, textTransform: 'uppercase',
  },
});
