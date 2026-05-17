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
import { useSettings } from '../../lib/settings-context';
import { extractAndParseFolio, correctDates } from '../../lib/parseCompose';
import { fetchWikiPhoto } from '../../constants/photos';

type ComposeMode = 'screenshots' | 'words' | 'link' | null;

const COMPOSE_INTROS: Record<string, string> = {
  screenshots: 'Drop in a file — a PDF itinerary, confirmation email, or screenshot. I\'ll read what I can and draft a folio.',
  words: 'Tell me where, when, and how it should feel. Even a rough idea is enough.',
  link: 'Paste a link — an Airbnb listing, Google Doc, blog post, or article. I\'ll extract what\'s useful.',
};

function isEditIntent(text: string): boolean {
  return /\b(add|include|remove|delete|change|swap|move|replace|book|schedule|update|rebook|cancel|switch|insert|drop|put|shift)\b/i.test(text);
}

function buildSuggestions(folio?: Folio | null): string[] {
  if (!folio) {
    return [
      'Plan a long weekend in Lisbon',
      'Best cities for solo travel in Asia',
      'I have flights booked, help me plan the rest',
      'Hidden gems in southern Italy',
    ];
  }
  const { destination, country, days, season, vibe } = folio;
  const isUSA = /united states|usa|\bUS\b/i.test(country);
  const suggestions: string[] = [];

  // Find days without food events and suggest a dinner option
  const daysWithoutFood = (days ?? []).filter(day => {
    if (day.empty) return false;
    const events = day.events ?? [];
    const hasFood = events.some((e: any) =>
      /dinner|lunch|breakfast|restaurant|café|cafe|food|eat/i.test(e.title ?? '') ||
      /food|dining|restaurant/i.test(e.meta ?? '')
    );
    return !hasFood && events.length > 0;
  });
  if (daysWithoutFood.length > 0) {
    const targetDay = daysWithoutFood[0];
    suggestions.push(`Find a dinner option for Day ${targetDay.n}`);
  }

  suggestions.push(`What shouldn't I miss in ${destination}?`);

  // Vibe-aware suggestion
  const vibeLower = (vibe ?? '').toLowerCase();
  if (/culture|history|art/i.test(vibeLower)) {
    suggestions.push(`Best museums and galleries in ${destination}`);
  } else if (/food|culinary|eat/i.test(vibeLower)) {
    suggestions.push(`Best local markets and food neighbourhoods in ${destination}`);
  } else if (/adventure|outdoor|nature/i.test(vibeLower)) {
    suggestions.push(`Day trips and outdoor activities near ${destination}`);
  } else if (!isUSA) {
    suggestions.push(`Do I need a visa for ${country}?`);
  } else {
    suggestions.push(`Best neighbourhoods to stay in ${destination}`);
  }

  const seasonLower = (season ?? '').toLowerCase();
  suggestions.push(`What to pack for ${seasonLower || 'the trip'} in ${destination}`);

  // Always include an itinerary edit option
  suggestions.push(`I'd like to change...`);

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

function seedMessages(folioId?: string, composeMode?: ComposeMode, editMode?: boolean, folio?: Folio | null): ChatMessage[] {
  if (editMode && folio) {
    return [{
      id: 'seed',
      role: 'wayfinder',
      text: `What would you like to change about your ${folio.destination} trip? Tell me and I'll rebuild it.`,
    }];
  }
  if (composeMode) {
    return [{ id: 'seed', role: 'wayfinder', text: COMPOSE_INTROS[composeMode] }];
  }
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
  editMode?: boolean;
  onUpdate?: (folio: Folio) => void;
}

export function WayfinderSheet({
  theme: T, open, onClose, seedQuestion, folioId, composeMode,
  editMode = false, onUpdate,
}: Props) {
  const { addFolio } = useFolios();
  const { settings } = useSettings();
  const folio = folioId ? (FOLIOS[folioId] ?? null) : null;

  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    seedMessages(folioId, composeMode, editMode, folio)
  );
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [composed, setComposed] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [imageData, setImageData] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [activeMode, setActiveMode] = useState<ComposeMode>(null);
  const slideAnim = useRef(new Animated.Value(1)).current;
  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  const effectiveMode = activeMode ?? composeMode ?? null;
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
    setActiveMode(null);
    const currentFolio = folioId ? (FOLIOS[folioId] ?? null) : null;
    setMessages(seedMessages(folioId, composeMode, editMode, currentFolio));
    setComposed(false);
    setFileName(null);
    setImageData(null);
    setImagePreview(null);
    setInput(composeMode === 'link' ? 'https://' : '');
  }, [folioId, composeMode, editMode]);

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

  function activateMode(mode: ComposeMode) {
    setActiveMode(mode);
    if (mode) {
      setMessages([{ id: 'seed', role: 'wayfinder', text: COMPOSE_INTROS[mode] }]);
      if (mode === 'link') setInput('https://');
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }

  function activateTalk() {
    setMessages([{ id: 'seed', role: 'wayfinder', text: "What are you thinking? A destination, a vibe, a rough idea — I'll help shape it into a trip." }]);
    setTimeout(() => inputRef.current?.focus(), 150);
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
          mode: effectiveMode ?? 'words',
          input: text,
          imageData: capturedImage ?? undefined,
        }),
      });

      if (!res.ok) {
        let errMsg = `API returned ${res.status}`;
        try { const d = await res.json(); if (d.error) errMsg = d.error; } catch {}
        console.error('[compose] error:', errMsg);
        setThinking(false);
        setMessages(prev => [...prev, { id: `w-${Date.now()}`, role: 'wayfinder', text: errMsg }]);
        return;
      }

      let rawText = '';
      if (res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let done = false;
        while (!done) {
          const { value, done: d } = await reader.read();
          done = d;
          if (value) rawText += decoder.decode(value, { stream: true });
        }
      } else {
        const d = await res.clone().json().catch(() => ({}));
        if (d.folio) rawText = JSON.stringify(d.folio);
      }

      setThinking(false);

      let raw: any;
      try {
        const parsed = JSON.parse(rawText);
        raw = correctDates(parsed.folio ?? parsed);
      } catch {
        try { raw = extractAndParseFolio(rawText); } catch (e: any) {
          console.error('[compose] parse error:', e.message);
          setMessages(prev => [...prev, { id: `w-${Date.now()}`, role: 'wayfinder', text: 'Had trouble reading the itinerary. Try again.' }]);
          return;
        }
      }
      const palette = raw.palette ?? generateTripPalette(raw.destination ?? 'trip');
      const photo = await fetchWikiPhoto(raw.destination ?? '').catch(() => null);
      const id = addFolio({
        ...raw,
        palette,
        photo: photo ?? undefined,
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
    } catch (err: any) {
      console.error('[sendCompose]', err);
      setThinking(false);
      const msg = err?.message ?? String(err);
      setMessages(prev => [...prev, { id: `w-${Date.now()}`, role: 'wayfinder', text: `Error: ${msg}` }]);
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

      const userContext = (settings.homeCity || settings.travelPreferences)
        ? {
            homeCity: settings.homeCity || undefined,
            travelPreferences: settings.travelPreferences || undefined,
          }
        : undefined;

      const response = await fetch('/api/wayfinder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history, folio, userContext }),
      });

      if (!response.ok || !response.body) throw new Error('api error');

      const replyId = `w-${Date.now()}`;
      setMessages(prev => [...prev, { id: replyId, role: 'wayfinder', text: '' }]);
      setThinking(false);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let fullText = '';
      while (!done) {
        const { value, done: d } = await reader.read();
        done = d;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          fullText += chunk;
          const displayText = fullText
            .replace(/\[COMPOSE:[\s\S]*?\]/g, '')
            .replace(/\[EDIT:[\s\S]*?\]/g, '')
            .trimEnd();
          setMessages(prev => prev.map(m =>
            m.id === replyId ? { ...m, text: displayText } : m
          ));
          scrollRef.current?.scrollToEnd({ animated: false });
        }
      }

      // In-trip edit detection: folio loaded, not editMode, reply contains [EDIT: ...]
      const editTagMatch = fullText.match(/\[EDIT:\s*([\s\S]+?)\]/);
      if (!!folio && !editMode && editTagMatch) {
        const editContent = editTagMatch[1].trim();
        const dayBySummary = (folio.days ?? []).map((day: any) => {
          const events = (day.events ?? []) as Array<any>;
          if (day.empty || events.length === 0) {
            return `  Day ${day.n} (${day.date}): ${day.label} — open day`;
          }
          const evtSummary = events.map((e: any) => {
            const parts = [`${e.time ?? '?'} ${e.title}`];
            if (e.location) parts.push(`at ${e.location}`);
            return parts.join(' ');
          }).join(', ');
          return `  Day ${day.n} (${day.date}): ${day.label} — ${evtSummary}`;
        }).join('\n');
        const brief = [
          `Original trip: ${folio.destination}, ${folio.country} — ${folio.dates} (${folio.duration})`,
          `Season: ${folio.season} · Vibe: ${folio.vibe}`,
          `Teaser: ${folio.teaser}`,
          '',
          'Current itinerary (preserve everything not mentioned in the change):',
          dayBySummary,
          '',
          `Requested change: ${editContent}`,
        ].join('\n');
        setTimeout(() => autoRecompose(brief, true), 600);
        return;
      }

      // Edit mode: after 2 user messages, trigger a recompose
      if (editMode && folio) {
        const allMessages = [...messages, userMsg];
        const userTurns = allMessages.filter(m => m.role === 'user').length;
        if (userTurns >= 2) {
          const originalContext = [
            `Original trip: ${folio.destination}, ${folio.country} — ${folio.dates} (${folio.duration})`,
            `Season: ${folio.season} · Vibe: ${folio.vibe}`,
            `Teaser: ${folio.teaser}`,
          ].join('\n');
          const conversationBrief = allMessages
            .filter(m => m.id !== 'seed' && m.text)
            .map(m => `${m.role === 'user' ? 'User' : 'Wayfinder'}: ${m.text}`)
            .join('\n');
          const brief = `${originalContext}\n\nRequested changes:\n${conversationBrief}`;
          setTimeout(() => autoRecompose(brief), 400);
          return;
        }
      }

      // Standard new-trip compose trigger
      const composeMatch = fullText.match(/\[COMPOSE:\s*([\s\S]+?)\]/);
      if (composeMatch) {
        const brief = composeMatch[1].trim();
        setTimeout(() => autoCompose(brief), 400);
      } else if (!folio && !effectiveMode && !editMode) {
        const allMessages = [...messages, userMsg];
        const userTurns = allMessages.filter(m => m.role === 'user').length;
        if (userTurns >= 2) {
          const conversationBrief = allMessages
            .filter(m => m.id !== 'seed' && m.text)
            .map(m => `${m.role === 'user' ? 'User' : 'Wayfinder'}: ${m.text}`)
            .join('\n');
          setTimeout(() => autoCompose(conversationBrief), 400);
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

  async function autoCompose(brief: string) {
    setThinking(true);
    setMessages(prev => [...prev, {
      id: `w-${Date.now()}`, role: 'wayfinder',
      text: 'Building your folio now…',
    }]);
    try {
      const res = await fetch('/api/compose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'words', input: brief }),
      });
      if (!res.ok) {
        let errMsg = `API returned ${res.status}`;
        try { const d = await res.json(); if (d.error) errMsg = d.error; } catch {}
        throw new Error(errMsg);
      }

      let rawText = '';
      if (res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let done = false;
        while (!done) {
          const { value, done: d } = await reader.read();
          done = d;
          if (value) rawText += decoder.decode(value, { stream: true });
        }
      }

      setThinking(false);

      let raw: any;
      try {
        const parsed = JSON.parse(rawText);
        raw = correctDates(parsed.folio ?? parsed);
      } catch {
        raw = extractAndParseFolio(rawText);
      }
      const palette = raw.palette ?? generateTripPalette(raw.destination ?? 'trip');
      const photo = await fetchWikiPhoto(raw.destination ?? '').catch(() => null);
      const id = addFolio({
        ...raw, palette,
        photo: photo ?? undefined,
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
      setTimeout(() => { onClose(); router.push({ pathname: '/(app)/trip/[id]', params: { id } }); }, 700);
    } catch (err) {
      console.error('[autoCompose]', err);
      setThinking(false);
      setMessages(prev => [...prev, {
        id: `w-${Date.now()}`, role: 'wayfinder',
        text: 'Had trouble building the folio. Try describing the trip again.',
      }]);
    }
  }

  async function autoRecompose(brief: string, fromEditIntent?: boolean) {
    setThinking(true);
    const recomposeMsg = (fromEditIntent && folio)
      ? `Updating your ${folio.destination} trip…`
      : 'Rebuilding your folio now…';
    setMessages(prev => [...prev, {
      id: `w-${Date.now()}`, role: 'wayfinder',
      text: recomposeMsg,
    }]);
    try {
      const res = await fetch('/api/compose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'words', input: brief }),
      });
      if (!res.ok) {
        let errMsg = `API returned ${res.status}`;
        try { const d = await res.json(); if (d.error) errMsg = d.error; } catch {}
        throw new Error(errMsg);
      }

      let rawText = '';
      if (res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let done = false;
        while (!done) {
          const { value, done: d } = await reader.read();
          done = d;
          if (value) rawText += decoder.decode(value, { stream: true });
        }
      }

      setThinking(false);

      let raw: any;
      try {
        const parsed = JSON.parse(rawText);
        raw = correctDates(parsed.folio ?? parsed);
      } catch {
        raw = extractAndParseFolio(rawText);
      }

      const palette = raw.palette ?? generateTripPalette(raw.destination ?? 'trip');
      const newFolio: Folio = {
        ...raw,
        id: folio?.id ?? raw.destination,
        palette,
        title: raw.title ?? raw.destination,
        docs: folio?.docs ?? [],
        days: (raw.days ?? []).map((d: any) => ({
          ...d,
          confirmed: d.events?.some((e: any) => !e.suggested) ?? false,
          events: (d.events ?? []).map((e: any) => ({
            ...e,
            confirmed: e.suggested ? false : (e.confirmed ?? false),
          })),
        })),
      };

      setMessages(prev => [...prev, {
        id: `w-${Date.now()}`, role: 'wayfinder',
        text: 'Trip updated.',
      }]);

      setTimeout(() => {
        if (onUpdate) {
          onUpdate(newFolio);
        } else {
          onClose();
        }
      }, 700);
    } catch (err) {
      console.error('[autoRecompose]', err);
      setThinking(false);
      setMessages(prev => [...prev, {
        id: `w-${Date.now()}`, role: 'wayfinder',
        text: 'Had trouble rebuilding the folio. Try again.',
      }]);
    }
  }

  function send(override?: string) {
    const text = (override ?? input).trim();
    if (!text && !imageData) return;
    if (effectiveMode && !composed) {
      sendCompose(text);
    } else {
      sendChat(text);
    }
  }

  // Animation: opacity fade + scale pop (replaces old Y-slide)
  const opacity = slideAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const scale   = slideAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.95] });

  const placeholder =
    effectiveMode === 'link'        ? 'Paste a URL — Airbnb, Google Doc, blog post…'
      : effectiveMode === 'screenshots' ? 'Add a note about your trip…'
        : editMode                      ? 'What would you like to change?'
          : !folio                      ? 'Paris in spring, maybe. Or just 10 days somewhere quiet…'
            :                             'Ask anything about your trip…';

  // Create panel shows whenever there are no messages yet (effectiveMode is fine — it
  // just pre-fills the textarea or sets up image upload without changing the panel)
  const showCreateOptions    = !folio && !editMode && messages.length === 0 && !thinking;
  const showFolioSuggestions = !!folio && !editMode && messages.length === 0 && !thinking;
  const showChat             = messages.length > 0 || thinking || !!folio || editMode;

  return (
    <>
      {/* Full-screen overlay — scrim + centered modal */}
      <Animated.View
        style={[styles.overlay, { opacity }]}
        pointerEvents={open ? 'auto' : 'none'}
      >
        {/* Scrim */}
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />

        {/* Modal card */}
        <Animated.View style={[styles.modal, { transform: [{ scale }] }]}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

            {/* ── Header ── */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <LinearGradient
                  colors={[T.accent, T.ink]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Text style={{ color: T.dockText, fontSize: 13, fontWeight: '500' }}>W</Text>
                </LinearGradient>
                <View style={styles.headerText}>
                  <Text style={styles.headerName}>Wayfinder</Text>
                  <Text style={styles.headerSub}>
                    {editMode
                      ? 'Editing your folio'
                      : folio
                        ? `About your ${folio.destination} trip`
                        : 'Your AI travel concierge'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Text style={styles.closeX}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.headerDivider} />

            {/* ── Create state ── */}
            {showCreateOptions && (
              <View style={styles.createBody}>
                <Text style={styles.createHeading}>Where do you want to go?</Text>
                <Text style={styles.createSub}>
                  Tell me, upload something, or paste a link — I'll handle the rest.
                </Text>

                {imagePreview && (
                  <View style={styles.imagePreviewWrap}>
                    <ImagePreview uri={imagePreview} />
                    <TouchableOpacity
                      onPress={() => { setImageData(null); setImagePreview(null); setFileName(null); setActiveMode(null); }}
                      style={styles.imagePreviewClear}
                    >
                      <Text style={{ color: '#fff', fontSize: 10 }}>✕</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <TextInput
                  ref={inputRef}
                  value={input}
                  onChangeText={setInput}
                  placeholder={placeholder}
                  placeholderTextColor="rgba(0,0,0,0.28)"
                  style={styles.textarea}
                  multiline
                  textAlignVertical="top"
                />

                {fileName && !imagePreview && (
                  <View style={styles.fileChip}>
                    <Text style={styles.fileChipText}>📄 {fileName}</Text>
                    <TouchableOpacity
                      onPress={() => { setFileName(null); setImageData(null); setActiveMode(null); setInput(''); }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={styles.fileChipRemove}>✕</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => { pickFile(); setActiveMode('screenshots'); }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.actionIcon}>⬆</Text>
                    <Text style={styles.actionLabel}>Upload file</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => {
                      setActiveMode('link');
                      setInput('https://');
                      setTimeout(() => inputRef.current?.focus(), 80);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.actionIcon}>⌁</Text>
                    <Text style={styles.actionLabel}>Paste link</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.sendBtn,
                      { backgroundColor: (input.trim() || imageData) ? '#1a1210' : 'rgba(0,0,0,0.10)' },
                    ]}
                    onPress={() => send()}
                    activeOpacity={0.85}
                  >
                    <Text style={[
                      styles.sendArrowText,
                      { color: (input.trim() || imageData) ? '#F7F5F0' : 'rgba(0,0,0,0.25)' },
                    ]}>→</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* ── Chat / Folio mode ── */}
            {showChat && (
              <View style={styles.chatBody}>
                {imagePreview && (
                  <View style={[styles.imagePreviewWrap, { margin: 14, marginBottom: 0 }]}>
                    <ImagePreview uri={imagePreview} />
                    <TouchableOpacity
                      onPress={() => { setImageData(null); setImagePreview(null); setFileName(null); }}
                      style={styles.imagePreviewClear}
                    >
                      <Text style={{ color: '#fff', fontSize: 10 }}>✕</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <ScrollView
                  ref={scrollRef}
                  style={styles.messages}
                  contentContainerStyle={styles.messagesContent}
                  showsVerticalScrollIndicator={false}
                >
                  {messages.map(m => <MessageBubble key={m.id} m={m} theme={T} />)}

                  {thinking && (
                    <View style={styles.thinkingRow}>
                      <View style={styles.thinkingBubble}>
                        <View style={styles.dotsRow}>
                          {[0, 1, 2].map(i => <View key={i} style={styles.dot} />)}
                        </View>
                      </View>
                    </View>
                  )}

                  {showFolioSuggestions && (
                    <View style={styles.suggestionsList}>
                      <Text style={styles.suggestionsLabel}>
                        About your {folio!.destination} trip
                      </Text>
                      {suggestions.map((s, i) => (
                        <TouchableOpacity
                          key={i}
                          onPress={() => {
                            if (s === `I'd like to change...`) {
                              setInput(`I'd like to change `);
                              setTimeout(() => inputRef.current?.focus(), 80);
                            } else {
                              send(s);
                            }
                          }}
                          style={[styles.suggestionRow, { borderBottomWidth: i < suggestions.length - 1 ? 0.5 : 0 }]}
                          activeOpacity={0.6}
                        >
                          <Text style={styles.suggestionText}>{s}</Text>
                          <Text style={styles.suggestionArrow}>›</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </ScrollView>

                {/* Input bar */}
                <View style={styles.inputBar}>
                  {fileName && !imagePreview && (
                    <View style={[styles.fileChip, { marginBottom: 8 }]}>
                      <Text style={styles.fileChipText}>📄 {fileName}</Text>
                      <TouchableOpacity onPress={() => { setFileName(null); setInput(''); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Text style={styles.fileChipRemove}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  <View style={styles.inputWrap}>
                    {voiceSupported && (
                      <TouchableOpacity onPress={toggleVoice} style={styles.attachBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 2 }}>
                        <Text style={[styles.attachIcon, { color: listening ? T.accent : 'rgba(0,0,0,0.32)' }]}>
                          {listening ? '◉' : '⊙'}
                        </Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={pickFile} style={styles.attachBtn} hitSlop={{ top: 8, bottom: 8, left: 2, right: 4 }}>
                      <Text style={styles.attachIcon}>⌁</Text>
                    </TouchableOpacity>
                    <TextInput
                      ref={inputRef}
                      value={input}
                      onChangeText={setInput}
                      onSubmitEditing={() => send()}
                      placeholder={placeholder}
                      placeholderTextColor="rgba(0,0,0,0.28)"
                      style={styles.chatInput}
                      returnKeyType="send"
                      blurOnSubmit={false}
                    />
                    <TouchableOpacity
                      onPress={() => send()}
                      style={[styles.chatSendBtn, {
                        backgroundColor: (input.trim() || imageData) ? '#1a1210' : 'rgba(0,0,0,0.08)',
                      }]}
                    >
                      <Text style={[styles.chatSendArrow, {
                        color: (input.trim() || imageData) ? '#F7F5F0' : 'rgba(0,0,0,0.25)',
                      }]}>→</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

          </KeyboardAvoidingView>

          {/* Footer — privacy notice, shown in create state */}
          {showCreateOptions && (
            <View style={styles.footer}>
              <Text style={styles.footerIcon}>🔒</Text>
              <Text style={styles.footerText}>Your uploads are only used to plan your trip.</Text>
            </View>
          )}

        </Animated.View>
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

const MODAL_BG = '#F7F5F0';
const INK      = '#1a1210';
const MUTED    = 'rgba(0,0,0,0.42)';
const BORDER   = 'rgba(0,0,0,0.10)';

const styles = StyleSheet.create({
  // ── Overlay & modal ──────────────────────────────────────────────────
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 95,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  modal: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: MODAL_BG,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 32,
    elevation: 24,
  },

  // ── Header ──────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerText: { marginLeft: 2 },
  headerName: { fontSize: 15, fontWeight: '500', color: INK, letterSpacing: -0.2 },
  headerSub: { fontSize: 11, color: MUTED, marginTop: 1 },
  closeBtn: {
    width: 28, height: 28, borderRadius: 14,
    borderWidth: 0.5, borderColor: BORDER,
    alignItems: 'center', justifyContent: 'center',
  },
  closeX: { fontSize: 11, color: MUTED },
  headerDivider: { height: 0.5, backgroundColor: 'rgba(0,0,0,0.08)' },

  // ── Create state body ────────────────────────────────────────────────
  createBody: { padding: 20, gap: 14 },
  createHeading: {
    fontSize: 18, fontWeight: '500', color: INK,
    letterSpacing: -0.4, lineHeight: 24,
  },
  createSub: {
    fontSize: 13, color: MUTED, lineHeight: 20, letterSpacing: -0.1,
  },
  textarea: {
    height: 80,
    backgroundColor: '#fff',
    borderWidth: 0.5,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 14,
    color: INK,
    letterSpacing: -0.1,
  },
  fileChip: {
    flexDirection: 'row', alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 999, borderWidth: 0.5, borderColor: BORDER,
    backgroundColor: '#fff',
  },
  fileChipText: { fontSize: 12, color: INK, letterSpacing: -0.1 },
  fileChipRemove: { fontSize: 11, color: MUTED, marginLeft: 6 },
  actionRow: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    borderWidth: 0.5,
    borderColor: BORDER,
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  actionIcon: { fontSize: 14, color: INK },
  actionLabel: { fontSize: 13, color: INK, fontWeight: '400', letterSpacing: -0.1 },
  sendBtn: {
    width: 44, height: 40, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  sendArrowText: { fontSize: 17 },

  // ── Footer ──────────────────────────────────────────────────────────
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(0,0,0,0.08)',
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  footerIcon: { fontSize: 11 },
  footerText: { fontSize: 11, color: MUTED, letterSpacing: -0.1 },

  // ── Chat / Folio mode ────────────────────────────────────────────────
  chatBody: { height: 420 },
  messages: { flex: 1 },
  messagesContent: { padding: 16, gap: 12 },

  userRow: { alignItems: 'flex-end' },
  userBubble: {
    maxWidth: '80%', borderRadius: 17,
    paddingHorizontal: 13, paddingVertical: 9,
  },
  wayfinderRow: { paddingRight: 16 },
  wfContent: {},
  bubbleText: { fontSize: 14, letterSpacing: -0.1, lineHeight: 21 },

  thinkingRow: { alignItems: 'flex-start' },
  thinkingBubble: {
    borderRadius: 16, borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.10)',
    backgroundColor: 'rgba(0,0,0,0.04)',
    paddingHorizontal: 14, paddingVertical: 12,
  },
  dotsRow: { flexDirection: 'row', gap: 5 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(0,0,0,0.30)' },

  suggestionsList: { gap: 0, marginTop: 4 },
  suggestionsLabel: {
    fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase',
    color: MUTED, marginBottom: 10, fontFamily: 'monospace',
  },
  suggestionRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  suggestionText: { fontSize: 14, color: INK, flex: 1, letterSpacing: -0.1 },
  suggestionArrow: { fontSize: 18, color: MUTED, marginLeft: 8 },

  inputBar: {
    paddingHorizontal: 14, paddingTop: 8, paddingBottom: 14,
    borderTopWidth: 0.5, borderTopColor: 'rgba(0,0,0,0.08)',
  },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    paddingLeft: 4, paddingRight: 6, paddingVertical: 6,
    borderRadius: 20, borderWidth: 0.5, borderColor: BORDER,
    backgroundColor: '#fff',
  },
  attachBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  attachIcon: { fontSize: 18, color: 'rgba(0,0,0,0.32)' },
  chatInput: {
    flex: 1, fontSize: 14, letterSpacing: -0.1,
    minHeight: 30, paddingHorizontal: 6, color: INK,
  },
  chatSendBtn: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  chatSendArrow: { fontSize: 14 },

  // ── Image preview ─────────────────────────────────────────────────────
  imagePreviewWrap: {
    borderRadius: 10, overflow: 'hidden', borderWidth: 0.5,
    borderColor: BORDER, height: 130, position: 'relative',
  },
  imagePreviewInner: { width: '100%', height: '100%' },
  imagePreviewClear: {
    position: 'absolute', top: 6, right: 6,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: 'rgba(26,18,16,0.72)',
    alignItems: 'center', justifyContent: 'center',
  },

  // ── Compass rose arms (WayfinderIcon) ────────────────────────────────
  iconArm: { position: 'absolute', backgroundColor: 'rgba(245,239,226,0.9)' },
});
