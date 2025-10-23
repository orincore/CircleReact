import { withBase } from "./config";
import { API_BASE_URL } from '../config/api.js';

export interface ApiError extends Error {
  status?: number;
  details?: unknown;
}

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface RequestOptions<TBody = unknown> {
  method?: HttpMethod;
  body?: TBody;
  token?: string | null;
  headers?: Record<string, string>;
}

async function request<TResp, TBody = unknown>(path: string, opts: RequestOptions<TBody> = {}): Promise<TResp> {
  const { method = "GET", body, token, headers } = opts;
  const url = `${API_BASE_URL}${path}`;
  let res: Response;
  try {
    // Centralized token fallback (web only): if caller didn't pass a token but user is logged in,
    // try to read from localStorage to avoid races with context hydration.
    let effectiveToken: string | null | undefined = token;
    // Try localStorage on web first
    if (!effectiveToken && typeof window !== 'undefined') {
      try {
        effectiveToken = window.localStorage?.getItem?.('@circle:access_token') || effectiveToken;
      } catch {}
    }
    // Always try AsyncStorage (web/native) via dynamic import if still missing
    if (!effectiveToken) {
      try {
        // @ts-ignore - optional dependency at runtime
        const mod = await import('@react-native-async-storage/async-storage');
        const maybeToken = await mod.default.getItem?.('@circle:access_token');
        if (maybeToken) effectiveToken = maybeToken;
      } catch {}
    }

    // Validate token formatting
    const isValidToken = (t: any) => typeof t === 'string' && t.trim().length > 10 && t !== 'undefined' && t !== 'null';
    const useToken = isValidToken(effectiveToken) ? (effectiveToken as string) : undefined;

    // Minimal diagnostics: log token validity for chat DELETE and warn if missing token on non-GET secure paths
    if ((method === 'DELETE' && path.startsWith('/chat/')) || (!useToken && method !== 'GET')) {
      const len = typeof effectiveToken === 'string' ? effectiveToken.length : 0;
      console.warn('[HTTP]', method, path, 'authValid=', !!useToken, 'tokenLen=', len);
    }
    res = await fetch(url, {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(useToken ? { Authorization: `Bearer ${useToken}` } : {}),
        ...(headers || {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      // Disable SSL verification for development
      ...(process.env.NODE_ENV === 'development' && {
        // @ts-ignore - React Native specific options
        trustAllCerts: true,
        rejectUnauthorized: false,
      }),
    });
  } catch (e: any) {
    const err: ApiError = new Error(`Network error while calling ${method} ${url}: ${e?.message || e}`);
    throw err;
  }

  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const data = isJson ? await res.json() : await res.text();

  if (!res.ok) {
    const errorMessage = (isJson && (data as any)?.error) || `HTTP ${res.status} on ${method} ${url}`;
    
    // Only log non-404 errors to reduce noise
    if (res.status !== 404) {
      console.error(`🚨 API Error [${res.status}]:`, {
        url,
        method,
        status: res.status,
        statusText: res.statusText,
        error: errorMessage,
        details: isJson ? data : null,
      });
    } else {
      // Just log 404s as warnings
      console.warn(`⚠️ Resource not found [404]: ${method} ${url}`);
    }
    
    const err: ApiError = new Error(errorMessage);
    err.status = res.status;
    if (isJson) err.details = data;
    throw err;
  }

  return data as TResp;
}

export const http = {
  get: <TResp>(path: string, token?: string | null) => request<TResp>(path, { method: "GET", token }),
  post: <TResp, TBody = unknown>(path: string, body?: TBody, token?: string | null) =>
    request<TResp, TBody>(path, { method: "POST", body, token }),
  put: <TResp, TBody = unknown>(path: string, body?: TBody, token?: string | null) =>
    request<TResp, TBody>(path, { method: "PUT", body, token }),
  patch: <TResp, TBody = unknown>(path: string, body?: TBody, token?: string | null) =>
    request<TResp, TBody>(path, { method: "PATCH", body, token }),
  delete: <TResp>(path: string, token?: string | null) => request<TResp>(path, { method: "DELETE", token }),
};
