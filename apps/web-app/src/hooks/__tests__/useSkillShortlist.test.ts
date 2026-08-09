import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSkillShortlist } from '../useSkillShortlist';

const STORAGE_KEY = 'aas_skill_shortlist';

describe('useSkillShortlist', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('starts empty when nothing is stored', () => {
      const { result } = renderHook(() => useSkillShortlist());
      expect(result.current.ids).toEqual([]);
    });

    it('reads an existing shortlist from localStorage', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(['skill-1', 'skill-2']));
      const { result } = renderHook(() => useSkillShortlist());
      expect(result.current.ids).toEqual(['skill-1', 'skill-2']);
    });

    it('falls back to an empty list for corrupted storage', () => {
      localStorage.setItem(STORAGE_KEY, 'not-json{');
      const { result } = renderHook(() => useSkillShortlist());
      expect(result.current.ids).toEqual([]);
    });

    it('drops non-string entries from stored JSON', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(['skill-1', 42, null, 'skill-2']));
      const { result } = renderHook(() => useSkillShortlist());
      expect(result.current.ids).toEqual(['skill-1', 'skill-2']);
    });

    it('stays usable when the browser rejects storage reads', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new DOMException('Storage access denied', 'SecurityError');
      });

      expect(() => renderHook(() => useSkillShortlist())).not.toThrow();
    });
  });

  describe('toggle', () => {
    it('adds a skill that was not selected', () => {
      const { result } = renderHook(() => useSkillShortlist());
      act(() => result.current.toggle('react'));
      expect(result.current.ids).toEqual(['react']);
    });

    it('removes a skill that was already selected', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(['react', 'sql']));
      const { result } = renderHook(() => useSkillShortlist());
      act(() => result.current.toggle('react'));
      expect(result.current.ids).toEqual(['sql']);
    });

    it('persists additions to localStorage', () => {
      const { result } = renderHook(() => useSkillShortlist());
      act(() => result.current.toggle('react'));
      expect(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')).toEqual(['react']);
    });

    it('stays referentially stable across renders (memo-friendly)', () => {
      const { result, rerender } = renderHook(() => useSkillShortlist());
      const toggle = result.current.toggle;
      rerender();
      expect(result.current.toggle).toBe(toggle);
    });
  });

  describe('clear', () => {
    it('empties the selected ids and storage', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(['a', 'b']));
      const { result } = renderHook(() => useSkillShortlist());
      act(() => result.current.clear());
      expect(result.current.ids).toEqual([]);
      expect(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')).toEqual([]);
    });
  });

  describe('Cross-tab / cross-hook sync', () => {
    it('syncs when another tab writes via the storage event', async () => {
      const { result } = renderHook(() => useSkillShortlist());
      act(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(['external-skill']));
        window.dispatchEvent(new Event('storage'));
      });
      await waitFor(() => expect(result.current.ids).toEqual(['external-skill']));
    });

    it('syncs a second hook when the first toggles a skill', async () => {
      const first = renderHook(() => useSkillShortlist());
      const second = renderHook(() => useSkillShortlist());

      act(() => first.result.current.toggle('shared-skill'));

      await waitFor(() => expect(second.result.current.ids).toEqual(['shared-skill']));
    });
  });
});
