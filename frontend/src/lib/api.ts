// Thin fetch wrapper for the FastAPI backend. Attaches the bearer token set by
// AuthContext and throws readable errors so screens can show them directly.
import { Platform } from "react-native";

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
export const API_BASE = `${BACKEND_URL}/api`;

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

export function getAuthToken() {
  return authToken;
}

export async function api(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (!(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (authToken) headers.set("Authorization", `Bearer ${authToken}`);

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  const isJson = res.headers.get("content-type")?.includes("application/json");
  const body = isJson ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    const detail = body?.detail;
    const message = typeof detail === "string" ? detail : detail ? JSON.stringify(detail) : `Request failed (${res.status})`;
    throw new Error(message);
  }
  return body;
}

// Builds an authenticated, cache-busting-free URL for a stored media file.
// Uses a query token (works identically on native <Image> and web <img>).
export function mediaFileUrl(mediaId: string) {
  return `${API_BASE}/media/file/${mediaId}?token=${encodeURIComponent(authToken ?? "")}`;
}

// Multipart upload — native and web need different FormData shapes for the
// same picked file (react-native-web stringifies the {uri,name,type} object).
export async function uploadMedia(params: { uri: string; name: string; type: string; tags: string; altText: string }) {
  const form = new FormData();
  if (Platform.OS === "web") {
    const blob = await (await fetch(params.uri)).blob();
    form.append("file", blob, params.name);
  } else {
    form.append("file", { uri: params.uri, name: params.name, type: params.type } as unknown as Blob);
  }
  form.append("tags", params.tags);
  form.append("alt_text", params.altText);

  const headers = new Headers();
  if (authToken) headers.set("Authorization", `Bearer ${authToken}`);
  const res = await fetch(`${API_BASE}/media/upload`, { method: "POST", body: form, headers });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.detail || "Upload failed");
  return body;
}
