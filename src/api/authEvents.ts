// Single place that reacts to the server rejecting the current access token
// as invalid (401 from requireAuth — bad signature, e.g. a token issued by a
// different backend/JWT_SECRET than the one it's now being sent to). Unlike
// an expired token (caught locally in http.ts before the request goes out),
// a bad-signature token isn't detectable client-side, so every screen that
// fires a request keeps sending it and keeps getting rejected until the
// backend's brute-force rate limiter trips. http.ts and graphql.ts both
// report here; AuthContext subscribes and logs the user out so the bad
// token stops being retried.

type Listener = () => void;
const listeners = new Set<Listener>();

export function reportInvalidToken(): void {
  listeners.forEach((listener) => {
    try { listener(); } catch {}
  });
}

export function onInvalidToken(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
