import { useCallback, useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'aas_skill_shortlist';
const CHANGE_EVENT = 'aas-skill-shortlist-change';

function readStoredValue(): string | null | undefined {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    // Some private or restricted browsing contexts reject storage reads.
    return undefined;
  }
}

function readShortlist(): string[] {
  try {
    const value: unknown = JSON.parse(readStoredValue() || '[]');
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function writeShortlist(ids: string[]): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    window.dispatchEvent(new Event(CHANGE_EVENT));
    return true;
  } catch {
    // Local storage can be unavailable in private or restricted browsing contexts.
    return false;
  }
}

/** A browser-local working set for comparing and exporting exact skill IDs. */
export function useSkillShortlist() {
  const [ids, setIds] = useState<string[]>(readShortlist);
  // Snapshot of the last value confirmed in browser storage. Guards the persistence effect so
  // it never echoes a change back that its own change/storage listeners caused
  // (which would make two hooks ping-pong and re-render forever), and lets us
  // restore the UI when a browser rejects a write.
  const persistedRef = useRef<string[]>(ids);

  useEffect(() => {
    const sync = () => setIds(readShortlist());
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  // Persist the current ids whenever they change. Writing here (instead of
  // inside the setIds updater above) keeps the updater pure: React StrictMode
  // double-invokes updaters in dev, and a side effect there would fire twice.
  useEffect(() => {
    const next = JSON.stringify(ids);
    const persisted = JSON.stringify(persistedRef.current);
    if (next === persisted) return;
    // Only actually write when the stored value differs, so storage-synced
    // updates don't get re-broadcast (or dispatch a spurious change event).
    const stored = readStoredValue();
    if (stored === next) {
      persistedRef.current = ids;
      return;
    }
    if (stored !== undefined && writeShortlist(ids)) {
      persistedRef.current = ids;
      return;
    }

    // Keep the UI honest when persistence is unavailable or fails. The
    // shortlist is described as browser-saved, so don't display a transient
    // selection that will disappear on reload.
    setIds(persistedRef.current);
  }, [ids]);

  const toggle = useCallback((skillId: string) => {
    setIds((current) =>
      current.includes(skillId)
        ? current.filter((id) => id !== skillId)
        : [...current, skillId]
    );
  }, []);

  const clear = useCallback(() => {
    setIds([]);
  }, []);

  return { ids, toggle, clear };
}
