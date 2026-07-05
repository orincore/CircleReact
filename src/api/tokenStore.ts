// Single place that reacts to the server silently reissuing an access token
// (see backend `X-Renewed-Token` header — sliding renewal, no refresh-token
// endpoint exists). http.ts and graphql.ts both persist the new token here;
// AuthContext subscribes so its in-memory `token` state (and anything derived
// from it, like the socket auth handshake) stays in sync without every caller
// needing to know about renewal.

const TOKEN_KEY = "@circle:access_token";

type Listener = (token: string) => void;
const listeners = new Set<Listener>();

export async function persistRenewedToken(newToken: string): Promise<void> {
  if (typeof window !== 'undefined') {
    try { window.localStorage?.setItem?.(TOKEN_KEY, newToken); } catch {}
  }
  try {
    // @ts-ignore - optional dependency at runtime
    const mod = await import('@react-native-async-storage/async-storage');
    await mod.default.setItem?.(TOKEN_KEY, newToken);
  } catch {}
  listeners.forEach((listener) => {
    try { listener(newToken); } catch {}
  });
}

export function onTokenRenewed(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
