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
    res = await fetch(url, {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
    const err: ApiError = new Error((isJson && (data as any)?.error) || `HTTP ${res.status} on ${method} ${url}`);
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
