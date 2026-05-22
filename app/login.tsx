import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FilmGrain } from '../components/art/FilmGrain';
import { supabase } from '../lib/supabase';
import { DEFAULT_PALETTE as T } from '../constants/theme';
import { TurnstileWidget } from '../components/auth/TurnstileWidget';

export default function LoginScreen() {
  const [mode, setMode] = useState<'idle' | 'email'>('idle');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [demoBusy, setDemoBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const captchaToken = useRef<string | null>(null);
  // True once Turnstile fires its callback (or immediately if no site key configured).
  // The widget is always mounted so a token is available for BOTH email and demo flows.
  const [captchaReady, setCaptchaReady] = useState(!process.env.EXPO_PUBLIC_TURNSTILE_SITE_KEY);

  function onTurnstileVerify(token: string) {
    captchaToken.current = token;
    setCaptchaReady(true);
  }
  function onTurnstileExpire() {
    captchaToken.current = null;
    setCaptchaReady(false);
  }
  function onTurnstileError() {
    captchaToken.current = null;
    setCaptchaReady(false);
  }

  async function handleDemo() {
    setDemoBusy(true);
    try {
      // If Turnstile hasn't verified yet, wait up to 6 s then proceed anyway
      if (!captchaToken.current && process.env.EXPO_PUBLIC_TURNSTILE_SITE_KEY) {
        await new Promise<void>(resolve => {
          const deadline = Date.now() + 6000;
          const check = () => {
            if (captchaToken.current || Date.now() > deadline) resolve();
            else setTimeout(check, 200);
          };
          check();
        });
      }

      const { error } = await supabase.auth.signInAnonymously({
        options: captchaToken.current ? { captchaToken: captchaToken.current } : undefined,
      });
      captchaToken.current = null;
      if (error) {
        // Captcha required but token unavailable, or anonymous auth disabled —
        // fall back gracefully so at least the UI is usable
        console.warn('[demo] signInAnonymously failed:', error.message);
        router.replace('/(app)');
      }
      // On success, onAuthStateChange in _layout.tsx fires and navigates to /(app)
    } catch {
      router.replace('/(app)');
    } finally {
      setDemoBusy(false);
    }
  }

  // RFC 5322 simplified — requires local@domain.tld structure
  function isValidEmail(e: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e.trim());
  }

  async function handleMagicLink() {
    if (!isValidEmail(email) || !captchaReady || !captchaToken.current) return;
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        ...(captchaToken.current ? { captchaToken: captchaToken.current } : {}),
      },
    });
    captchaToken.current = null;
    setBusy(false);
    if (error) {
      Alert.alert('Something went wrong', error.message);
    } else {
      setSent(true);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: T.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Atmospheric strip */}
      <LinearGradient
        colors={[T.surface, T.bg]}
        start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
        style={[StyleSheet.absoluteFill, { bottom: '68%' }]}
      />
      <View style={[styles.glowTop, { backgroundColor: T.accent }]} />
      <FilmGrain seed={17} opacity={0.16} />

      <SafeAreaView style={styles.safe}>
        {/* Nav */}
        <View style={styles.nav}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: T.surface, borderColor: T.hair }]}
            onPress={() => router.back()}
          >
            <Text style={[styles.backChevron, { color: T.sub }]}>‹</Text>
          </TouchableOpacity>
          <Text style={[styles.navLabel, { color: T.muted }]}>№ 02 · Sign in</Text>
        </View>

        {/* Heading */}
        <View style={styles.heading}>
          <Text style={[styles.title, { color: T.ink }]}>Step inside.</Text>
          <Text style={[styles.subtitle, { color: T.sub }]}>
            Choose how to begin. Wayfinder will be ready on the other side.
          </Text>
        </View>

        {/* Options */}
        <View style={styles.options}>
          {/* Email magic link */}
          <View style={[styles.card, { backgroundColor: T.surface, borderColor: T.hair }]}>
            {sent ? (
              <View style={styles.sentState}>
                <Text style={[styles.sentTitle, { color: T.ink }]}>Check your inbox.</Text>
                <Text style={[styles.sentSub, { color: T.muted }]}>
                  A magic link is on its way to {email}
                </Text>
                <TouchableOpacity onPress={() => { setSent(false); setEmail(''); setMode('idle'); }}>
                  <Text style={[styles.resendText, { color: T.sub }]}>Use a different address</Text>
                </TouchableOpacity>
              </View>
            ) : mode === 'email' ? (
              <View>
                <Text style={[styles.fieldLabel, { color: T.muted }]}>Your email</Text>
                <TextInput
                  autoFocus
                  value={email}
                  onChangeText={setEmail}
                  onSubmitEditing={() => captchaReady && handleMagicLink()}
                  placeholder="you@somewhere.com"
                  placeholderTextColor={T.muted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  returnKeyType="send"
                  style={[styles.emailInput, { color: T.ink, borderBottomColor: T.hair }]}
                />
                {/* Turnstile shown inline in email mode (same widget, always mounted below) */}
                <TouchableOpacity
                  onPress={handleMagicLink}
                  disabled={busy || !isValidEmail(email) || !captchaReady}
                  style={[
                    styles.sendButton,
                    { backgroundColor: (isValidEmail(email) && captchaReady) ? T.ink : T.hair },
                  ]}
                >
                  {busy ? (
                    <ActivityIndicator size="small" color={T.bg} />
                  ) : (
                    <Text style={[styles.sendButtonText, { color: (isValidEmail(email) && captchaReady) ? T.bg : T.muted }]}>
                      {captchaReady ? 'Send magic link' : 'Verifying…'}
                    </Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => { setMode('idle'); setCaptchaReady(false); captchaToken.current = null; }}
                  style={styles.backLink}
                >
                  <Text style={[styles.backLinkText, { color: T.muted }]}>Back</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => setMode('email')}
                style={styles.optionRow}
                activeOpacity={0.7}
              >
                <View style={[styles.optionIcon, { borderColor: T.hair }]}>
                  <Text style={[styles.optionIconText, { color: T.ink }]}>✉</Text>
                </View>
                <View style={styles.optionText}>
                  <Text style={[styles.optionTitle, { color: T.ink }]}>Continue with email</Text>
                  <Text style={[styles.optionSub, { color: T.muted }]}>A magic link, nothing more</Text>
                </View>
                <Text style={[styles.arrow, { color: T.muted }]}>›</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Demo shortcut */}
          <TouchableOpacity
            onPress={handleDemo}
            disabled={demoBusy}
            style={[styles.card, { backgroundColor: T.surface, borderColor: T.hair }]}
            activeOpacity={0.7}
          >
            <View style={styles.optionRow}>
              <View style={[styles.optionIcon, { borderColor: T.hair }]}>
                <Text style={[styles.optionIconText, { color: T.ink }]}>⊙</Text>
              </View>
              <View style={styles.optionText}>
                <Text style={[styles.optionTitle, { color: T.ink }]}>Try the demo</Text>
                <Text style={[styles.optionSub, { color: T.muted }]}>No account needed</Text>
              </View>
              {demoBusy
                ? <ActivityIndicator size="small" color={T.muted} />
                : <Text style={[styles.arrow, { color: T.muted }]}>›</Text>
              }
            </View>
          </TouchableOpacity>

          {/* Turnstile — always mounted so token is ready for both email and demo.
              Hidden when not in email mode (height collapses, widget stays alive). */}
          <View style={mode === 'email' ? styles.captcha : styles.captchaHidden}>
            <TurnstileWidget
              onVerify={onTurnstileVerify}
              onExpire={onTurnstileExpire}
              onError={onTurnstileError}
            />
          </View>
        </View>


        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: T.muted }]}>
            By continuing you agree to our{' '}
            <Text style={{ color: T.sub }}>terms</Text>
            {' '}and{' '}
            <Text style={{ color: T.sub }}>privacy</Text>.
          </Text>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  glowTop: {
    position: 'absolute', top: '-30%', right: '-20%',
    width: '90%', height: '110%', borderRadius: 999, opacity: 0.17,
  },
  nav: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 58,
  },
  backButton: {
    width: 36, height: 36, borderRadius: 18, borderWidth: 0.5,
    alignItems: 'center', justifyContent: 'center',
  },
  backChevron: { fontSize: 22, marginTop: -2 },
  navLabel: {
    fontFamily: 'monospace', fontSize: 9,
    letterSpacing: 3.5, textTransform: 'uppercase',
  },
  heading: { paddingHorizontal: 32, paddingTop: 40, paddingBottom: 24 },
  title: { fontSize: 36, lineHeight: 36, letterSpacing: -1.5, fontWeight: '300' },
  subtitle: { marginTop: 14, fontSize: 14.5, lineHeight: 22, letterSpacing: -0.15, maxWidth: 290 },
  options: { paddingHorizontal: 16, gap: 14 },
  card: {
    borderRadius: 16, borderWidth: 0.5, padding: 20,
  },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  optionIcon: {
    width: 36, height: 36, borderRadius: 18, borderWidth: 0.5,
    alignItems: 'center', justifyContent: 'center',
  },
  optionIconText: { fontSize: 16 },
  optionText: { flex: 1 },
  optionTitle: { fontSize: 15, letterSpacing: -0.15 },
  optionSub: { fontSize: 11.5, marginTop: 3, letterSpacing: -0.05 },
  arrow: { fontSize: 20 },
  fieldLabel: {
    fontFamily: 'monospace', fontSize: 9,
    letterSpacing: 3.5, textTransform: 'uppercase',
  },
  emailInput: {
    marginTop: 8, borderBottomWidth: 0.5,
    paddingVertical: 10, fontSize: 16, letterSpacing: -0.15,
  },
  sendButton: {
    marginTop: 16, paddingVertical: 13, borderRadius: 999, alignItems: 'center',
  },
  sendButtonText: { fontSize: 13.5, letterSpacing: 0.2 },
  backLink: { marginTop: 12, alignItems: 'center' },
  backLinkText: {
    fontSize: 11.5, letterSpacing: 1.5, textTransform: 'uppercase',
  },
  sentState: { gap: 10 },
  sentTitle: { fontSize: 17, letterSpacing: -0.3, fontWeight: '500' },
  sentSub: { fontSize: 13.5, lineHeight: 20, letterSpacing: -0.1 },
  resendText: { fontSize: 12, letterSpacing: 0.3, marginTop: 4 },
  devSkip: {
    borderWidth: 0.5, borderStyle: 'dashed', borderRadius: 12,
    paddingVertical: 12, alignItems: 'center',
  },
  devSkipText: { fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' },
  captcha: { marginTop: 14, alignItems: 'flex-start' },
  // Keep the widget in the DOM (so it stays verified) but invisible
  captchaHidden: { height: 0, overflow: 'hidden', opacity: 0 },
  footer: { position: 'absolute', bottom: 38, left: 32, right: 32 },
  footerText: { fontSize: 10.5, lineHeight: 16, letterSpacing: -0.05, textAlign: 'center' },
});
