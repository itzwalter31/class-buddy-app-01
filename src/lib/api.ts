import { supabase } from "./supabase";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api";

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers = new Headers(options.headers);

  headers.set("Content-Type", "application/json");

  if (session?.access_token) {
    headers.set("Authorization", `Bearer ${session.access_token}`);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const text = await response.text();
    let message = `API Error: ${response.status}`;

    try {
      const error = JSON.parse(text) as { message?: unknown };
      if (typeof error.message === "string") {
        message = error.message;
      }
    } catch {
      // Keep the status-based message for non-JSON error responses.
    }

    console.error("API error:", {
      status: response.status,
      endpoint,
      response: text,
    });

    throw new Error(message);
  }

  const contentType = response.headers.get("content-type");

  if (contentType?.includes("application/json")) {
    return response.json();
  }

  return response.text();
}
