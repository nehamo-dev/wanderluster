import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Modal, Pressable,
  StyleSheet, KeyboardAvoidingView, Platform, Animated, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { DEFAULT_PALETTE as T } from '../../constants/theme';
import { fetchWikiPhoto } from '../../constants/photos';
import type { WishlistItem } from '../../types';

const QUICK_PICKS = [
  'Japan', 'Iceland', 'Morocco', 'Peru', 'New Zealand',
  'Portugal', 'Vietnam', 'Greece', 'Mexico', 'Tanzania',
];

interface Props {
  visible: boolean;
  onAdd: (item: WishlistItem) => void;
  onClose: () => void;
}

export function WishlistComposerSheet({ visible, onAdd, onClose }: Props) {
  const [input, setInput] = useState('');
  const [stage, setStage] = useState<'idle' | 'loading' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) { setInput(''); setStage('idle'); setErrorMsg(''); }
  }, [visible]);

  useEffect(() => {
    if (stage === 'loading') {
      Animated.loop(
        Animated.timing(spinAnim, { toValue: 1, duration: 1200, useNativeDriver: true })
      ).start();
    } else {
      spinAnim.setValue(0);
    }
  }, [stage]);

  async function handleAdd() {
    const dest = input.trim();
    if (!dest) return;
    setStage('loading');
    setErrorMsg('');
    try {
      const [metaRes, photo] = await Promise.all([
        fetch('/api/wishlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ destination: dest }),
        }),
        fetchWikiPhoto(dest).catch(() => null),
      ]);

      if (!metaRes.ok) throw new Error('API error');
      const meta = await metaRes.json();

      const item: WishlistItem = {
        id: `wish-${Date.now()}`,
        name: meta.name ?? dest,
        season: meta.season ?? '',
        vibe: meta.vibe ?? '',
        flight: meta.flight ?? '',
        visa: meta.visa ?? '',
        budget: meta.budget ?? '$$',
        palette: meta.palette ?? { a: '#b0a898', b: '#6a5a4a', c: '#1a1410' },
        photo: photo ?? undefined,
        bestTime: meta.bestTime,
      };

      onAdd(item);
      setStage('idle');
      onClose();
    } catch (e) {
      setStage('error');
      setErrorMsg("Couldn't add that destination. Check your connection and try again.");
    }
  }

  const canAdd = input.trim().length > 0 && stage !== 'loading';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={stage === 'loading' ? undefined : onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ width: '100%' }}
        >
          <Pressable onPress={() => {}} style={[styles.sheet, { backgroundColor: T.bg }]}>
            <View style={[styles.handle, { backgroundColor: T.hair }]} />

            {/* Header */}
            <View style={styles.headerRow}>
              <LinearGradient
                colors={[T.accent, T.ink]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={styles.iconCircle}
              >
                <Text style={styles.iconText}>✦</Text>
              </LinearGradient>
              <View style={styles.headerText}>
                <Text style={[styles.title, { color: T.ink }]}>Add to wishlist</Text>
                <Text style={[styles.sub, { color: T.muted }]}>Where do you dream of going?</Text>
              </View>
            </View>

            {/* Input */}
            <View style={[styles.inputWrap, { borderColor: T.hair, backgroundColor: T.surface }]}>
              <TextInput
                value={input}
                onChangeText={setInput}
                placeholder="e.g. Bali, Patagonia, Southeast Asia…"
                placeholderTextColor={T.muted}
                style={[styles.input, { color: T.ink }]}
                autoFocus
                editable={stage !== 'loading'}
                returnKeyType="done"
                onSubmitEditing={canAdd ? handleAdd : undefined}
              />
              {input.length > 0 && stage !== 'loading' && (
                <TouchableOpacity
                  onPress={() => setInput('')}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={[styles.clearX, { color: T.muted }]}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Quick picks */}
            {stage === 'idle' && (
              <>
                <Text style={[styles.quickLabel, { color: T.muted }]}>Quick picks</Text>
                <View style={styles.chipWrap}>
                  {QUICK_PICKS.map(place => (
                    <TouchableOpacity
                      key={place}
                      onPress={() => setInput(place)}
                      style={[
                        styles.chip,
                        { borderColor: input === place ? T.ink : T.hair },
                        input === place && { backgroundColor: T.ink },
                      ]}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.chipText, { color: input === place ? T.bg : T.sub }]}>
                        {place}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {/* Loading state */}
            {stage === 'loading' && (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color={T.accent} />
                <Text style={[styles.loadingText, { color: T.muted }]}>
                  Looking up {input}…
                </Text>
              </View>
            )}

            {/* Error */}
            {stage === 'error' && errorMsg ? (
              <Text style={styles.errorText}>{errorMsg}</Text>
            ) : null}

            {/* Actions */}
            <View style={styles.actions}>
              <TouchableOpacity
                onPress={onClose}
                style={[styles.cancelBtn, { borderColor: T.hair }]}
                disabled={stage === 'loading'}
                activeOpacity={0.7}
              >
                <Text style={[styles.cancelText, { color: T.sub }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleAdd}
                style={[styles.addBtn, { backgroundColor: T.ink }, !canAdd && { opacity: 0.35 }]}
                disabled={!canAdd}
                activeOpacity={0.85}
              >
                <Text style={[styles.addText, { color: T.bg }]}>
                  {stage === 'error' ? 'Retry' : 'Add to wishlist'}
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.38)', justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, paddingBottom: 40,
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    alignSelf: 'center', marginBottom: 22,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 22 },
  iconCircle: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  iconText: { color: '#f5efe2', fontSize: 14 },
  headerText: { flex: 1 },
  title: { fontSize: 17, fontWeight: '500', letterSpacing: -0.3 },
  sub: { fontSize: 13, letterSpacing: -0.1, marginTop: 2 },

  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 0.5, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 13,
  },
  input: { flex: 1, fontSize: 15, letterSpacing: -0.2 },
  clearX: { fontSize: 12, padding: 2 },

  quickLabel: { fontSize: 11, letterSpacing: 0.2, marginTop: 18, marginBottom: 10 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 0.5, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  chipText: { fontSize: 13, letterSpacing: -0.1 },

  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 18, marginBottom: 6 },
  loadingText: { fontSize: 13, letterSpacing: -0.1, fontStyle: 'italic' },

  errorText: { fontSize: 12, color: '#c0392b', marginTop: 12, lineHeight: 17 },

  actions: { flexDirection: 'row', gap: 10, marginTop: 24 },
  cancelBtn: {
    flex: 1, paddingVertical: 13, borderRadius: 12,
    borderWidth: 0.5, alignItems: 'center',
  },
  cancelText: { fontSize: 15, letterSpacing: -0.2 },
  addBtn: { flex: 2, paddingVertical: 13, borderRadius: 12, alignItems: 'center' },
  addText: { fontSize: 15, fontWeight: '500', letterSpacing: -0.2 },
});
