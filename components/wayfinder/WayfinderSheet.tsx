import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Animated, Platform, KeyboardAvoidingView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { Palette } from '../../constants/theme';
import type { ChatMessage } from '../../types';
import { router } from 'expo-router';
import { FOLIOS, WAYFINDER_GREETINGS } from '../../data/mock';
import { generateTripPalette } from '../../constants/theme';
import { useFolios } from '../../lib/folios-context';

type ComposeMode = 'screenshots' | 'words' | 'link' | null;

const SUGGESTIONS = [
  'What should I do on Day 4?',
  'Do I need a visa with a US passport?',
  'Best restaurants near my hotel?',
  'Pack list for 10 days in spring',
];

const COMPOSE_INTROS: Record<string, string> = {
  screenshots: 'Drop in a file — a PDF itinerary, confirmation email, or Notion export. I\'ll read what I can and draft a folio from it.',
  words: 'Tell me where, when, and how it should feel. Even a rough idea is enough — I\'ll shape the rest.',
  link: 'Paste a link — an Airbnb listing, Google Doc, blog post, or article. I\'ll extract what\'s useful and build the structure.',
};

function seedMessages(folioId?: string, composeMode?: ComposeMode): ChatMessage[] {
  if (composeMode) {
    return [{ id: 'seed', role: 'wayfinder', text: COMPOSE_INTROS[composeMode] }];
  }
  const folio = folioId ? FOLIOS[folioId] : null;
  if (folio) {
    return [{
      id: 'seed', role: 'wayfinder',
      text: `Your ${folio.destination} folio is open. ${WAYFINDER_GREETINGS[folio.id] ?? ''}`,
    }];
  }
  return [{
    id: 'seed', role: 'wayfinder',
    text: 'Three folios are waiting. Each one a different season. Choose, and I will take care of the rest.',
  }];
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
  const [imageData, setImageData] = useState<string | null>(null); // base64 data URL for images
  const [imagePreview, setImagePreview] = useState<string | null>(null);
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
      const data = await res.json();
      setThinking(false);

      if (!res.ok || data.error) {
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
        text: `Your ${raw.destination} folio is ready. Opening it now.`,
      }]);

      setTimeout(() => {
        onClose();
        router.push({ pathname: '/(app)/trip/[id]', params: { id } });
      }, 700);
    } catch {
      setThinking(false);
      setMessages(prev => [...prev, { id: `w-${Date.now()}`, role: 'wayfinder', text: 'Connection lost. Try again.' }]);
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

      const folio = folioId ? FOLIOS[folioId] ?? null : null;

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
    } catch {
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
          : 'Ask Wayfinder anything';

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
              <LinearGradient colors={[T.accent, T.ink]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.headerAvatar}>
                <Text style={[styles.headerAvatarText, { color: T.bg }]}>W</Text>
              </LinearGradient>
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
                <LinearGradient colors={[T.accent, T.ink]} style={styles.thinkingAvatar}>
                  <Text style={{ color: T.bg, fontSize: 11, fontWeight: '500' }}>W</Text>
                </LinearGradient>
                <View style={[styles.thinkingBubble, { backgroundColor: T.surface, borderColor: T.hair }]}>
                  <View style={styles.dotsRow}>
                    {[0, 1, 2].map(i => <View key={i} style={[styles.dot, { backgroundColor: T.muted }]} />)}
                  </View>
                </View>
              </View>
            )}
          </ScrollView>

          {/* File upload strip (screenshots mode, before first send) */}
          {composeMode === 'screenshots' && !composed && (
            <>
              {imagePreview && (
                // eslint-disable-next-line @typescript-eslint/no-require-imports
                <View style={[styles.imagePreviewWrap, { borderColor: T.hair }]}>
                  {/* On web, use a native img element via dangerouslySetInnerHTML workaround */}
                  <ImagePreview uri={imagePreview} />
                  <TouchableOpacity
                    onPress={() => { setImageData(null); setImagePreview(null); setFileName(null); }}
                    style={[styles.imagePreviewClear, { backgroundColor: T.ink }]}
                  >
                    <Text style={{ color: T.bg, fontSize: 11 }}>✕</Text>
                  </TouchableOpacity>
                </View>
              )}
              <TouchableOpacity
                onPress={pickFile}
                style={[styles.uploadStrip, { backgroundColor: T.surface, borderColor: T.hair }]}
              >
                <Text style={[styles.uploadIcon, { color: T.ink }]}>{imageData ? '🖼' : '⬆'}</Text>
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
            </>
          )}

          {/* Suggestion chips (regular chat only) */}
          {!composeMode && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
              {SUGGESTIONS.map(s => (
                <TouchableOpacity key={s} onPress={() => send(s)} style={[styles.chip, { backgroundColor: T.surface, borderColor: T.hair }]}>
                  <Text style={[styles.chipText, { color: T.sub }]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Input bar */}
          <View style={[styles.inputBar, { borderTopColor: T.hair, backgroundColor: T.bg }]}>
            <View style={[styles.inputWrap, { backgroundColor: T.surface, borderColor: T.hair }]}>
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
              <TouchableOpacity onPress={() => send()} style={[styles.sendButton, { backgroundColor: (input.trim() || imageData) ? T.ink : T.hair }]}>
                <Text style={[styles.sendArrow, { color: (input.trim() || imageData) ? T.bg : T.muted }]}>→</Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.inputFooter, { color: T.muted }]}>
              {isComposeFirst ? 'Wayfinder · Trip builder' : 'Voice · Upload · Chat'}
            </Text>
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
        {/* @ts-ignore — web-only img element */}
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
      <LinearGradient colors={[T.accent, T.ink]} style={styles.wfAvatar}>
        <Text style={[styles.wfAvatarText, { color: T.bg }]}>W</Text>
      </LinearGradient>
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
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  headerAvatarText: { fontSize: 13, fontWeight: '500' },
  headerName: { fontSize: 15, letterSpacing: -0.15 },
  headerSub: { fontSize: 10.5, letterSpacing: 2.5, textTransform: 'uppercase', marginTop: 1 },
  closeButton: { width: 30, height: 30, borderRadius: 15, borderWidth: 0.5, alignItems: 'center', justifyContent: 'center' },
  closeX: { fontSize: 12 },
  hairline: { height: 0.5 },
  messages: { flex: 1 },
  messagesContent: { padding: 18, gap: 16 },
  userRow: { alignItems: 'flex-end' },
  userBubble: { maxWidth: '78%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  wayfinderRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  wfAvatar: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  wfAvatarText: { fontSize: 11, fontWeight: '500' },
  wfContent: { maxWidth: '88%', paddingTop: 2, gap: 8 },
  bubbleText: { fontSize: 14, letterSpacing: -0.15, lineHeight: 20 },
  thinkingRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-end' },
  thinkingAvatar: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  thinkingBubble: { borderRadius: 18, borderWidth: 0.5, paddingHorizontal: 16, paddingVertical: 14 },
  dotsRow: { flexDirection: 'row', gap: 5 },
  dot: { width: 6, height: 6, borderRadius: 3 },

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

  // File upload strip
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

  // Suggestion chips
  chipsRow: { paddingHorizontal: 18, paddingVertical: 10, gap: 8 },
  chip: { flexShrink: 0, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 0.5 },
  chipText: { fontSize: 11.5, letterSpacing: -0.1 },

  // Input bar
  inputBar: { padding: 8, paddingHorizontal: 16, paddingBottom: 22, borderTopWidth: 0.5 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', paddingLeft: 16, paddingRight: 8, paddingVertical: 8, borderRadius: 24, borderWidth: 0.5 },
  input: { flex: 1, fontSize: 14, letterSpacing: -0.15, minHeight: 36 },
  sendButton: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  sendArrow: { fontSize: 16 },
  inputFooter: { textAlign: 'center', marginTop: 10, fontFamily: 'monospace', fontSize: 9, letterSpacing: 3.5, textTransform: 'uppercase' },

});
