/**
 * TurnstileWidget
 *
 * Renders a Cloudflare Turnstile CAPTCHA widget inside a React Native View.
 * Uses nativeID → document.getElementById to bridge RN → DOM, then lets
 * the Turnstile script populate the element.
 *
 * Requires EXPO_PUBLIC_TURNSTILE_SITE_KEY in env.
 * Gracefully renders nothing if the site key is missing.
 */
import React, { useEffect, useRef } from 'react';
import { View, Platform, StyleSheet } from 'react-native';

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, unknown>) => string;
      remove: (widgetId: string) => void;
      reset: (widgetId: string) => void;
    };
    _onTurnstileReady?: () => void;
  }
}

interface Props {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: (code: string) => void;
}

const SITE_KEY = process.env.EXPO_PUBLIC_TURNSTILE_SITE_KEY ?? '';

export function TurnstileWidget({ onVerify, onExpire, onError }: Props) {
  const containerId = useRef(`ts-${Math.random().toString(36).slice(2, 9)}`);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || !SITE_KEY) return;

    function renderWidget() {
      const el = document.getElementById(containerId.current);
      if (!el || !window.turnstile || widgetIdRef.current) return;
      widgetIdRef.current = window.turnstile.render(el, {
        sitekey: SITE_KEY,
        callback: onVerify,
        'expired-callback': onExpire ?? (() => {}),
        'error-callback': (code: string) => {
          console.warn('[Turnstile] error:', code);
          onError?.(code);
        },
        theme: 'light',
        size: 'normal',
        // 'always' ensures the widget is visible — if Cloudflare needs interaction,
        // the user sees it. 'interaction-only' hides it even when a challenge is needed,
        // causing the token to never arrive.
        appearance: 'always',
      });
    }

    if (window.turnstile) {
      renderWidget();
    } else {
      window._onTurnstileReady = renderWidget;
      if (!document.querySelector('script[src*="turnstile"]')) {
        const s = document.createElement('script');
        s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=_onTurnstileReady';
        s.async = true;
        document.head.appendChild(s);
      }
    }

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  // onVerify/onExpire/onError are callbacks — intentionally not in deps to avoid re-mounting
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!SITE_KEY) return null;

  return <View nativeID={containerId.current} style={styles.container} />;
}

// Reset helper — call this after consuming a token so Turnstile issues a fresh one
export function resetTurnstile(widgetId: string | null) {
  if (widgetId && typeof window !== 'undefined' && window.turnstile) {
    window.turnstile.reset(widgetId);
  }
}

const styles = StyleSheet.create({
  container: { minHeight: 65 }, // enough space for the visible widget
});
