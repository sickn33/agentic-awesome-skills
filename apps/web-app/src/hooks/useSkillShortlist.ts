import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'aas_skill_shortlist';
const CHANGE_EVENT = 'aas-skill-shortlist-change';

function readShortlist(): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function writeShortlist(ids: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    // Local storage can be unavailable in private or restricted browsing contexts.
  }
}

/** A browser-local working set for comparing and exporting exact skill IDs. */
export function useSkillShortlist() {
  const [ids, setIds] = useState<string[]>(readShortlist);

  useEffect(() => {
    const sync = () => setIds(readShortlist());
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const toggle = useCallback((skillId: string) => {
    setIds((current) => {
      const next = current.includes(skillId)
        ? current.filter((id) => id !== skillId)
        : [...current, skillId];
      writeShortlist(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    writeShortlist([]);
    setIds([]);
  }, []);

  return { ids, toggle, clear };
}
