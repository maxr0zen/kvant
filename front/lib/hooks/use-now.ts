"use client";

import { useSyncExternalStore } from "react";

type Listener = () => void;

type NowStore = {
  now: number;
  listeners: Set<Listener>;
  intervalId: ReturnType<typeof setInterval> | null;
  intervalMs: number;
};

const stores = new Map<number, NowStore>();

function getStore(intervalMs: number): NowStore {
  const existing = stores.get(intervalMs);
  if (existing) return existing;

  const store: NowStore = {
    now: Date.now(),
    listeners: new Set<Listener>(),
    intervalId: null,
    intervalMs,
  };
  stores.set(intervalMs, store);
  return store;
}

function subscribeToNow(store: NowStore, cb: Listener): () => void {
  store.listeners.add(cb);

  // Only start timers in the browser.
  if (typeof window !== "undefined" && store.intervalId === null) {
    store.intervalId = setInterval(() => {
      store.now = Date.now();
      // Copy to avoid issues if listeners mutate during notify.
      for (const l of Array.from(store.listeners)) l();
    }, store.intervalMs);
  }

  return () => {
    store.listeners.delete(cb);
    if (store.listeners.size === 0 && store.intervalId !== null) {
      clearInterval(store.intervalId);
      store.intervalId = null;
    }
  };
}

export function useNow(intervalMs: number): number {
  const store = getStore(intervalMs);

  return useSyncExternalStore(
    (cb) => subscribeToNow(store, cb),
    () => store.now,
    () => Date.now()
  );
}

