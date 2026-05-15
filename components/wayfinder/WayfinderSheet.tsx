import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Animated, Platform, KeyboardAvoidingView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { Palette } from '../../constants/theme';
import type { ChatMessage, Folio } from '../../types';
import { router } from 'expo-router';
import { FOLIOS, WAYFINDER_GREETINGS } from '../../data/mock';
import { generateTripPalette } from '../../constants/theme';
import { useFolios } from '../../lib/folios-context';

type ComposeMode = 'screenshots' | 'words' | 'link' | null;

const COMPOSE_INTROS: Record<string, string> = {
  screenshots: 'Drop in a file — a PDF itinerary, confirmation email, or screenshot. I\'ll read what I can and draft a folio.',
  words: 'Tell me where, when, and how it should feel. Even a rough idea is enough.',
  link: 'Paste a link — an Airbnb listing, Google Doc, blog post, or article. I\'ll extract what\'s useful.',
};

function buildSuggestions(folio?: Folio | null): string[] {
  if (!folio) {
    return [
      'Plan a long weekend in Lisbon',
      'Best cities for solo travel in Asia',
      'I have flights booked, help me plan the rest',
      'Hidden gems in southern Italy',
    ];
  }
  const { destination, country, days, season } = folio;
  const isUSA = /united states|usa|\bUS\b/i.test(country);
  const suggestions: string[] = [];

  suggestions.push(`What shouldn't I miss in ${destination}?`);
  suggestions.push(`Best local restaurants in ${destination}`);
  if (days.length > 2) {
    suggestions.push(`Any ideas for Day ${Math.min(3, days.length)}?`);
  }
  if (!isUSA) {
    suggestions.push(`Do I need a visa for ${country}?`);
  } else {
    suggestions.push(`Best neighbourhoods to stay in ${destination}`);
  }
  const seasonLower = (season ?? '').toLowerCase();
  suggestions.push(`What to pack for ${seasonLower || 'the trip'} in ${destination}`);

  return suggestions.slice(0, 4);
}

function useVoice(onTranscript: (t: string) => void) {
  const [listening, setListening] = useState(false);
  const recogRef = useRef<any>(null);

  function toggle() {
    if (typeof window === 'undefined') return;
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SR) return;

    if (listening) {
      recogRef.current?.stop();
      setListening(false);
      return;
    }

    const r = new SR();
    r.continuous = false;
    r.interimResults = true;
    r.lang = 'en-US';
    r.onresult = (e: any) => {
      const transcript = Array.from(e.results as SpeechRecognitionResultList)
        .map((res: SpeechRecognitionResult) => res[0].transcript)
        .join('');
      onTranscript(transcript);
    };
    r.onerror = () => setListening(false);
    r.onend = () => setListening(false);
    r.start();
    recogRef.current = r;
    setListening(true);
  }

  const supported = typeof window !== 'undefined' &&
    ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  return { listening, toggle, supported };
}

function seedMessages(folioId?: string, composeMode?: ComposeMode): ChatMessage[] {
  if (composeMode) {
    return [{ id: 'seed', role: 'wayfinder', text: COMPOSE_INTROS[composeMode] }];
  }
  // In chat mode: no seed message — just show suggestions
  return [];
}

// ✦ compass-rose icon — four-pointed star with gradient fill
function WayfinderIcon({ size = 32, accent, bg }: { size: number; accent: string; bg: string }) {
  const arm = size * 0.28;
  const tip = size * 0.46;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <LinearGradient
        colors={[accent, '#1a1210']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center' }}
      >
        {/* North tip */}
        <View style={[styles.iconArm, { width: arm, height: tip, top: 0, left: (size - arm) / 2, borderRadius: arm / 2 }]} />
        {/* South tip */}
        <View style={[styles.iconArm, { width: arm, height: tip, bottom: 0, left: (size - arm) / 2, borderRadius: arm / 2, opacity: 0.55 }]} />
        {/* West tip */}
        <View style={[styles.iconArm, { height: arm, width: tip, left: 0, top: (size - arm) / 2, borderRadius: arm / 2, opacity: 0.55 }]} />
        {/* East tip */}
        <View style={[styles.iconArm, { height: arm, width: tip, right: 0, top: (size - arm) / 2, borderRadius: arm / 2 }]} />
        {/* Centre dot */}
        <View style={{ width: size * 0.14, height: size * 0.14, borderRadius: size * 0.07, backgroundColor: bg, opacity: 0.9 }} />
      </LinearGradient>
    </View>
  );
}

interface Props {
  theme: Palette;
  open: boolean;
  onClose: () => void;
  seedQuestion?: string;
  folioId?: string;
  composeMode?: ComposeMode;
}

export function WayfinderSheet({ theme: T, open, onClose, seedQuestion, folioId, composeMode }: Props) {
  const { addFolio } = useFolios();
  const [messages, setMessages] = useState<ChatMessage[]>(() => seedMessages(folioId, composeMode));
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [composed, setComposed] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [imageData, setImageData] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const slideAnim = useRef(new Animated.Value(1)).current;
  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  const folio = folioId ? FOLIOS[folioId] ?? null : null;
  const suggestions = buildSuggestions(folio);
  const { listening, toggle: toggleVoice, supported: voiceSupported } = useVoice(
    (transcript) => setInput(transcript)
  );

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: open ? 0 : 1,
      damping: 28, stiffness: 200, useNativeDriver: true,
    }).start();
    if (open) setTimeout(() => inputRef.current?.focus(), 400);
  }, [open]);

  useEffect(() => {
    setMessages(seedMessages(folioId, composeMode));
    setComposed(false);
    setFileName(null);
    setImageData(null);
    setImagePreview(null);
    setInput(composeMode === 'link' ? 'https://' : '');
  }, [folioId, composeMode]);

  useEffect(() => {
    if (seedQuestion) setInput(seedQuestion);
  }, [seedQuestion]);

  function pickFile() {
    if (typeof document === 'undefined') return;
    const el = document.createElement('input');
    el.type = 'file';
    el.accept = '.pdf,.txt,.md,.csv,.html,.htm,.png,.jpg,.jpeg,.webp,.gif';
    el.onchange = async () => {
      const file = el.files?.[0];
      if (!file) return;
      setFileName(file.name);
      const isImage = file.type.startsWith('image/');
      if (isImage) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUrl = e.target?.result as string;
          setImageData(dataUrl);
          setImagePreview(dataUrl);
          setInput('');
        };
        reader.readAsDataURL(file);
      } else {
        setImageData(null);
        setImagePreview(null);
        const text = await file.text().catch(() => null);
        if (text) setInput(text.slice(0, 12000));
      }
    };
    el.click();
  }

  async function sendCompose(text: string) {
    const hasImage = !!imageData;
    if (!text.trim() && !hasImage) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`, role: 'user',
      text: fileName ? `[${fileName}]${text ? `\n${text}` : ''}` : text,
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setFileName(null);
    const capturedImage = imageData;
    setImageData(null);
    setImagePreview(null);
    setThinking(true);
    setComposed(true);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);

    try {
      const res = await fetch('/api/compose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: composeMode ?? 'words',
          input: text,
          imageData: capturedImage ?? undefined,
        }),
      });

      let data: any;
      try {
        data = await res.json();
      } catch {
        console.error('[compose] non-JSON response, status:', res.status);
        throw new Error(`API returned ${res.status}`);
      }

      setThinking(false);

      if (!res.ok || data.error) {
        console.error('[compose] api error:', data.error, res.status);
        setMessages(prev => [...prev, { id: `w-${Date.now()}`, role: 'wayfinder', text: data.error ?? 'Something went wrong. Try again.' }]);
        return;
      }

      const raw = data.folio;
      const palette = raw.palette ?? generateTripPalette(raw.destination ?? 'trip');
      const id = addFolio({
        ...raw,
        palette,
        title: raw.title ?? raw.destination,
        days: (raw.days ?? []).map((d: any) => ({
          ...d,
          confirmed: d.events?.some((e: any) => !e.suggested) ?? false,
          events: (d.events ?? []).map((e: any) => ({
            ...e,
            confirmed: e.suggested ? false : (e.confirmed ?? false),
          })),
        })),
      });

      setMessages(prev => [...prev, {
        id: `w-${Date.now()}`, role: 'wayfinder',
        text: `${raw.destination} folio ready. Opening now.`,
      }]);

      setTimeout(() => {
        onClose();
        router.push({ pathname: '/(app)/trip/[id]', params: { id } });
      }, 700);
    } catch (err) {
      console.error('[sendCompose]', err);
      setThinking(false);
      setMessages(prev => [...prev, { id: `w-${Date.now()}`, role: 'wayfinder', text: 'Something went wrong. Check the console for details.' }]);
    }
  }

  async function sendChat(text: string) {
    if (!text.trim() || thinking) return;
    setInput('');

    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    setThinking(true);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);

    try {
      const history = [...messages, userMsg]
        .filter(m => m.id !== 'seed' && m.text && m.kind !== 'folio-draft')
        .map(m => ({
          role: (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
          content: m.text!,
        }));

      const response = await fetch('/api/wayfinder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history, folio }),
      });

      if (!response.ok || !response.body) throw new Error('api error');

      const replyId = `w-${Date.now()}`;
      setMessages(prev => [...prev, { id: replyId, role: 'wayfinder', text: '' }]);
      setThinking(false);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      while (!done) {
        const { value, done: d } = await reader.read();
        done = d;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          setMessages(prev => prev.map(m =>
            m.id === replyId ? { ...m, text: (m.text ?? '') + chunk } : m
          ));
          scrollRef.current?.scrollToEnd({ animated: false });
        }
      }
    } catch (err) {
      console.error('[sendChat]', err);
      setThinking(false);
      setMessages(prev => [...prev, {
        id: `w-${Date.now()}`, role: 'wayfinder',
        text: 'Connection lost. Try again in a moment.',
      }]);
    }
  }

  function send(override?: string) {
    const text = (override ?? input).trim();
    if (!text && !imageData) return;
    if (composeMode && !composed) {
      sendCompose(text);
    } else {
      sendChat(text);
    }
  }

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1], outputRange: ['0%' as any, '100%' as any],
  });

  const isComposeFirst = composeMode && !composed;
  const placeholder =
    composeMode === 'link' ? 'Paste a URL'
      : composeMode === 'words' ? 'Where to, and how should it feel?'
        : composeMode === 'screenshots' ? 'Or describe your trip in words…'
          : 'Ask anything about your trip…';

  const showSuggestions = !composeMode && messages.length === 0 && !thinking;

  return (
    <>
      {open && <TouchableOpacity style={styles.scrim} onPress={onClose} activeOpacity={1} />}

      <Animated.View
        style={[styles.sheet, { backgroundColor: T.sheet, transform: [{ translateY }] }]}
        pointerEvents={open ? 'auto' : 'none'}
      >
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

          <View style={styles.grabberRow}>
            <View style={[styles.grabber, { backgroundColor: T.hair }]} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <WayfinderIcon size={36} accent={T.accent} bg={T.bg} />
              <View>
                <Text style={[styles.headerName, { color: T.ink }]}>Wayfinder</Text>
                <Text style={[styles.headerSub, { color: T.muted }]}>
                  {composeMode ? 'New folio' : 'Your concierge'}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={[styles.closeButton, { backgroundColor: T.surface, borderColor: T.hair }]}>
              <Text style={[styles.closeX, { color: T.sub }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.hairline, { backgroundColor: T.hair }]} />

          {/* Messages */}
          <ScrollView ref={scrollRef} style={styles.messages} contentContainerStyle={styles.messagesContent} showsVerticalScrollIndicator={false}>
            {messages.map(m => (
              <MessageBubble key={m.id} m={m} theme={T} />
            ))}
            {thinking && (
              <View style={styles.thinkingRow}>
                <WayfinderIcon size={26} accent={T.accent} bg={T.bg} />
                <View style={[styles.thinkingBubble, { backgroundColor: T.surface, borderColor: T.hair }]}>
                  <View style={styles.dotsRow}>
                    {[0, 1, 2].map(i => <View key={i} style={[styles.dot, { backgroundColor: T.muted }]} />)}
                  </View>
                </View>
              </View>
            )}

            {/* Inline suggestions — shown instead of a blank state */}
            {showSuggestions && (
              <View style={styles.suggestionsList}>
                <Text style={[styles.suggestionsLabel, { color: T.muted }]}>
                  {folio ? `About your ${folio.destination} trip` : 'Where do you want to go?'}
                </Text>
                {suggestions.map((s, i) => (
                  <TouchableOpacity
                    key={i}
                    onPress={() => send(s)}
                    style={[styles.suggestionRow, { borderBottomColor: T.hair, borderBottomWidth: i < suggestions.length - 1 ? 0.5 : 0 }]}
                    activeOpacity={0.6}
                  >
                    <Text style={[styles.suggestionText, { color: T.ink }]}>{s}</Text>
                    <Text style={[styles.suggestionArrow, { color: T.muted }]}>›</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </ScrollView>

          {/* Image preview */}
          {imagePreview && (
            <View style={[styles.imagePreviewWrap, { borderColor: T.hair }]}>
              <ImagePreview uri={imagePreview} />
              <TouchableOpacity
                onPress={() => { setImageData(null); setImagePreview(null); setFileName(null); }}
                style={[styles.imagePreviewClear, { backgroundColor: T.ink }]}
              >
                <Text style={{ color: T.bg, fontSize: 11 }}>✕</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* File upload strip (screenshots compose mode only) */}
          {isComposeFirst && composeMode === 'screenshots' && !imagePreview && (
            <TouchableOpacity
              onPress={pickFile}
              style={[styles.uploadStrip, { backgroundColor: T.surface, borderColor: T.hair }]}
            >
              <Text style={[styles.uploadIcon, { color: T.ink }]}>⬆</Text>
              <View style={styles.uploadText}>
                <Text style={[styles.uploadTitle, { color: T.ink }]}>
                  {fileName ?? 'Upload a file'}
                </Text>
                <Text style={[styles.uploadSub, { color: T.muted }]}>
                  {fileName ? 'Ready — hit send' : 'Images, PDF, TXT, Markdown'}
                </Text>
              </View>
              {fileName && <Text style={[styles.uploadCheck, { color: T.accent }]}>✓</Text>}
            </TouchableOpacity>
          )}

          {/* Input bar */}
          <View style={[styles.inputBar, { borderTopColor: T.hair, backgroundColor: T.bg }]}>
            {fileName && !imagePreview && (
              <View style={[styles.fileChip, { backgroundColor: T.surface, borderColor: T.hair }]}>
                <Text style={[styles.fileChipText, { color: T.sub }]}>📄 {fileName}</Text>
                <TouchableOpacity onPress={() => { setFileName(null); setInput(''); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={[{ color: T.muted, fontSize: 12, marginLeft: 6 }]}>✕</Text>
                </TouchableOpacity>
              </View>
            )}
            <View style={[styles.inputWrap, { backgroundColor: T.surface, borderColor: T.hair }]}>
              {/* Voice button */}
              {voiceSupported ? (
                <TouchableOpacity onPress={toggleVoice} style={styles.attachBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 2 }}>
                  <Text style={[styles.attachIcon, { color: listening ? T.accent : T.muted }]}>
                    {listening ? '◉' : '⊙'}
                  </Text>
                </TouchableOpacity>
              ) : null}
              {/* Attachment button — always visible */}
              <TouchableOpacity onPress={pickFile} style={styles.attachBtn} hitSlop={{ top: 8, bottom: 8, left: 2, right: 4 }}>
                <Text style={[styles.attachIcon, { color: T.muted }]}>⌁</Text>
              </TouchableOpacity>
              <TextInput
                ref={inputRef}
                value={input}
                onChangeText={setInput}
                onSubmitEditing={() => send()}
                placeholder={placeholder}
                placeholderTextColor={T.muted}
                style={[styles.input, { color: T.ink }]}
                returnKeyType="send"
                blurOnSubmit={false}
                multiline={composeMode === 'words'}
                numberOfLines={composeMode === 'words' ? 3 : 1}
              />
              <TouchableOpacity
                onPress={() => send()}
                style={[styles.sendButton, { backgroundColor: (input.trim() || imageData) ? T.ink : T.hair }]}
              >
                <Text style={[styles.sendArrow, { color: (input.trim() || imageData) ? T.bg : T.muted }]}>→</Text>
              </TouchableOpacity>
            </View>
          </View>

        </KeyboardAvoidingView>
      </Animated.View>
    </>
  );
}

function ImagePreview({ uri }: { uri: string }) {
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    return (
      <View style={styles.imagePreviewInner}>
        {/* @ts-ignore */}
        <img src={uri} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      </View>
    );
  }
  const { Image } = require('react-native');
  return <Image source={{ uri }} style={styles.imagePreviewInner} resizeMode="cover" />;
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
      <View style={styles.wfContent}>
        {m.text ? <Text style={[styles.bubbleText, { color: T.ink }]}>{m.text}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: { position: 'absolute', inset: 0 as any, zIndex: 90, backgroundColor: 'rgba(0,0,0,0.32)' },
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0, height: '92%', zIndex: 95,
    borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.16, shadowRadius: 40, elevation: 24,
  },
  grabberRow: { alignItems: 'center', paddingTop: 8 },
  grabber: { width: 36, height: 4, borderRadius: 2 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 22, paddingVertical: 14 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerName: { fontSize: 15, letterSpacing: -0.2, fontWeight: '500' },
  headerSub: { fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', marginTop: 2 },
  closeButton: { width: 30, height: 30, borderRadius: 15, borderWidth: 0.5, alignItems: 'center', justifyContent: 'center' },
  closeX: { fontSize: 12 },
  hairline: { height: 0.5 },
  messages: { flex: 1 },
  messagesContent: { padding: 20, gap: 14 },
  userRow: { alignItems: 'flex-end' },
  userBubble: { maxWidth: '78%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  wayfinderRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  wfContent: { flex: 1, paddingTop: 2 },
  bubbleText: { fontSize: 14, letterSpacing: -0.15, lineHeight: 21 },
  thinkingRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-end' },
  thinkingBubble: { borderRadius: 18, borderWidth: 0.5, paddingHorizontal: 16, paddingVertical: 14 },
  dotsRow: { flexDirection: 'row', gap: 5 },
  dot: { width: 6, height: 6, borderRadius: 3 },

  // Suggestions list
  suggestionsList: { marginTop: 8, gap: 0 },
  suggestionsLabel: {
    fontSize: 10, letterSpacing: 3, textTransform: 'uppercase',
    fontFamily: 'monospace', marginBottom: 12,
  },
  suggestionRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14,
  },
  suggestionText: { fontSize: 14.5, letterSpacing: -0.2, flex: 1 },
  suggestionArrow: { fontSize: 20, marginLeft: 8 },

  // Icon arms (compass rose)
  iconArm: { position: 'absolute', backgroundColor: 'rgba(245,239,226,0.9)' },

  // Image preview
  imagePreviewWrap: {
    marginHorizontal: 16, marginBottom: 8, borderRadius: 12,
    overflow: 'hidden', borderWidth: 0.5, height: 160, position: 'relative',
  },
  imagePreviewInner: { width: '100%', height: '100%' },
  imagePreviewClear: {
    position: 'absolute', top: 8, right: 8,
    width: 24, height: 24, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },

  // Upload strip
  uploadStrip: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginHorizontal: 16, marginBottom: 8,
    padding: 14, borderRadius: 12, borderWidth: 0.5,
  },
  uploadIcon: { fontSize: 18, width: 24, textAlign: 'center' },
  uploadText: { flex: 1 },
  uploadTitle: { fontSize: 13, letterSpacing: -0.1 },
  uploadSub: { fontSize: 11, marginTop: 2, letterSpacing: 0.2 },
  uploadCheck: { fontSize: 16 },

  // Input bar
  inputBar: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 28, borderTopWidth: 0.5 },
  fileChip: {
    flexDirection: 'row', alignItems: 'center',
    alignSelf: 'flex-start', marginBottom: 8,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 999, borderWidth: 0.5,
  },
  fileChipText: { fontSize: 12, letterSpacing: -0.1 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    paddingLeft: 4, paddingRight: 6, paddingVertical: 6,
    borderRadius: 24, borderWidth: 0.5,
  },
  attachBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  attachIcon: { fontSize: 20, letterSpacing: 0 },
  input: { flex: 1, fontSize: 14, letterSpacing: -0.15, minHeight: 36, paddingHorizontal: 6 },
  sendButton: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  sendArrow: { fontSize: 16 },
});
