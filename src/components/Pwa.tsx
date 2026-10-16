"use client";

import { useEffect, useSyncExternalStore } from "react";

// Installing the game: registers the service worker, and keeps the browser's install prompt so the
// "Download now" button can show it when the person asks (Chrome, Edge, Android). iPhones have no
// prompt, so the landing page shows the Add to Home Screen steps instead. On a Mac, Chrome and Edge
// give the prompt; Safari 17+ has no prompt but installs from File > Add to Dock.

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferred: InstallPromptEvent | null = null;
let installedNow = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as InstallPromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    installedNow = true;
    notify();
  });
}

export type Platform = "ios" | "android" | "mac-safari" | "mac" | "windows" | "desktop";

export interface InstallState {
  canPrompt: boolean;
  installed: boolean;
  platform: Platform;
}

const serverState: InstallState = { canPrompt: false, installed: false, platform: "desktop" };
let cached: InstallState = serverState;

function read(): InstallState {
  const ua = navigator.userAgent;
  const ios = /iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
  const mac = !ios && /macintosh|mac os x/i.test(ua);
  const safari = /safari/i.test(ua) && !/chrome|chromium|crios|edg|opr|firefox|fxios/i.test(ua);
  const next: InstallState = {
    canPrompt: !!deferred,
    installed: installedNow || /ThenAndNowApp/.test(ua) || window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true,
    platform: ios ? "ios" : /android/i.test(ua) ? "android" : mac ? (safari ? "mac-safari" : "mac") : /windows/i.test(ua) ? "windows" : "desktop",
  };
  if (next.canPrompt !== cached.canPrompt || next.installed !== cached.installed || next.platform !== cached.platform) cached = next;
  return cached;
}

export function useInstall() {
  const state = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    read,
    () => serverState,
  );
  const prompt = async (): Promise<"accepted" | "dismissed" | "unavailable"> => {
    if (!deferred) return "unavailable";
    const e = deferred;
    deferred = null;
    await e.prompt();
    const choice = await e.userChoice;
    notify();
    return choice.outcome;
  };
  return { ...state, prompt };
}

/** Registers the service worker in production builds. */
export default function Pwa() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => undefined);
  }, []);
  return null;
}
