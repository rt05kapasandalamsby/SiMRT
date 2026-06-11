/**
 * useSnapScript — Dynamically injects Midtrans Snap.js into the document.
 * Idempotent: if already loaded, resolves immediately.
 * Uses Sandbox URL with the RT 05 client key.
 */
import { useState, useEffect } from "react";

const SNAP_URL   = "https://app.sandbox.midtrans.com/snap/snap.js";
const CLIENT_KEY = "Mid-client-ctC99iAlzQNhSwl0";

type ScriptState = "idle" | "loading" | "ready" | "error";

export function useSnapScript(): ScriptState {
  const [state, setState] = useState<ScriptState>(() =>
    typeof window !== "undefined" && typeof window.snap !== "undefined"
      ? "ready"
      : "idle",
  );

  useEffect(() => {
    // Already loaded
    if (typeof window.snap !== "undefined") {
      setState("ready");
      return;
    }

    // Already injected but not yet resolved
    const existing = document.querySelector(`script[src="${SNAP_URL}"]`);
    if (existing) {
      setState("loading");
      const check = setInterval(() => {
        if (typeof window.snap !== "undefined") {
          clearInterval(check);
          setState("ready");
        }
      }, 100);
      return () => clearInterval(check);
    }

    // Inject fresh
    setState("loading");
    const script        = document.createElement("script");
    script.src          = SNAP_URL;
    script.setAttribute("data-client-key", CLIENT_KEY);
    script.async        = true;

    script.onload = () => setState("ready");
    script.onerror = () => {
      if (import.meta.env.DEV) console.error("[Midtrans] Failed to load snap.js");
      setState("error");
    };

    document.head.appendChild(script);
    return () => {
      // Leave the script in DOM to avoid repeated loads
    };
  }, []);

  return state;
}
