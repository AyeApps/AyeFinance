import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import { WebView } from 'react-native-webview';

interface TurnstileVerificationProps {
  siteKey?: string;
  isDark?: boolean;
  onSuccess: (token: string) => void;
  onError?: (err?: string) => void;
  onExpire?: () => void;
  resetKey?: number;
}

const DEFAULT_SITE_KEY = process.env.EXPO_PUBLIC_TURNSTILE_SITE_KEY || '0x4AAAAAAEn3YN77Mt7jKxas';

export const TurnstileVerification: React.FC<TurnstileVerificationProps> = ({
  siteKey = DEFAULT_SITE_KEY,
  isDark = true,
  onSuccess,
  onError,
  onExpire,
  resetKey = 0,
}) => {
  const webWidgetId = useRef<string | null>(null);
  const webViewRef = useRef<WebView>(null);
  const theme = isDark ? 'dark' : 'light';

  // ─────────────────────────────────────────────────────────────
  // WEB IMPLEMENTATION
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    const win = window as any;
    const renderWeb = () => {
      if (!win.turnstile) return;
      const container = document.getElementById('ayefinance-turnstile-widget');
      if (!container) return;

      if (webWidgetId.current !== null) {
        try {
          win.turnstile.reset(webWidgetId.current);
          return;
        } catch {
          webWidgetId.current = null;
        }
      }

      try {
        container.innerHTML = '';
        webWidgetId.current = win.turnstile.render('#ayefinance-turnstile-widget', {
          sitekey: siteKey,
          theme,
          size: 'normal',
          callback: (token: string) => onSuccess(token),
          'error-callback': (e: any) => onError?.(e),
          'expired-callback': () => onExpire?.(),
        });
      } catch (e) {
        console.warn('[Turnstile Web] render error:', e);
      }
    };

    if (win.turnstile) {
      renderWeb();
    } else {
      const interval = setInterval(() => {
        if (win.turnstile) {
          clearInterval(interval);
          renderWeb();
        }
      }, 150);
      const timer = setTimeout(() => clearInterval(interval), 8000);
      return () => {
        clearInterval(interval);
        clearTimeout(timer);
      };
    }

    return () => {
      if (webWidgetId.current !== null && win.turnstile) {
        try {
          win.turnstile.remove(webWidgetId.current);
        } catch {}
        webWidgetId.current = null;
      }
    };
  }, [siteKey, theme, resetKey]);

  // ─────────────────────────────────────────────────────────────
  // NATIVE IMPLEMENTATION (Android & iOS via WebView)
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (Platform.OS !== 'web' && resetKey > 0 && webViewRef.current) {
      webViewRef.current.reload();
    }
  }, [resetKey]);

  if (Platform.OS === 'web') {
    return (
      <View style={styles.webContainer}>
        {/* @ts-ignore */}
        <div id="ayefinance-turnstile-widget" />
      </View>
    );
  }

  const turnstileHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" async defer></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 100%;
      height: 100%;
      background: transparent;
      display: flex;
      justify-content: center;
      align-items: center;
      overflow: hidden;
    }
  </style>
</head>
<body>
  <div id="cf-turnstile"></div>
  <script>
    function post(type, data) {
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: type, data: data }));
      }
    }

    function init() {
      if (!window.turnstile) return;
      try {
        window.turnstile.render('#cf-turnstile', {
          sitekey: '${siteKey}',
          theme: '${theme}',
          size: 'normal',
          callback: function(token) {
            post('token', token);
          },
          'error-callback': function(err) {
            post('error', err || 'turnstile_error');
          },
          'expired-callback': function() {
            post('expired', null);
          }
        });
      } catch (e) {
        post('error', e.message);
      }
    }

    if (window.turnstile) {
      init();
    } else {
      var interval = setInterval(function() {
        if (window.turnstile) {
          clearInterval(interval);
          init();
        }
      }, 150);
      setTimeout(function() { clearInterval(interval); }, 8000);
    }
  </script>
</body>
</html>`;

  return (
    <View style={styles.nativeContainer}>
      <WebView
        ref={webViewRef}
        source={{
          html: turnstileHtml,
          baseUrl: 'https://finance.ayeapps.com',
        }}
        style={styles.webView}
        containerStyle={styles.webViewContainer}
        originWhitelist={['*']}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'token' && typeof data.data === 'string') {
              onSuccess(data.data);
            } else if (data.type === 'error') {
              onError?.(data.data);
            } else if (data.type === 'expired') {
              onExpire?.();
            }
          } catch {
            if (typeof event.nativeEvent.data === 'string' && event.nativeEvent.data.length > 20) {
              onSuccess(event.nativeEvent.data);
            }
          }
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  webContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 65,
    marginVertical: 12,
  },
  nativeContainer: {
    width: '100%',
    height: 70,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  webViewContainer: {
    width: 300,
    height: 70,
    backgroundColor: 'transparent',
  },
  webView: {
    width: 300,
    height: 70,
    backgroundColor: 'transparent',
  },
});
