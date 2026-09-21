import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSkillStars } from '../useSkillStars';

const STORAGE_KEY = 'saved_skills';
const LEGACY_STORAGE_KEY = 'user_stars';

describe('useSkillStars', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize as unsaved when no skillId is provided', () => {
      const { result } = renderHook(() => useSkillStars(undefined));

      expect(result.current.hasSaved).toBe(false);
      expect(result.current.isSaving).toBe(false);
    });

    it('should initialize as unsaved for a new skill', () => {
      const { result } = renderHook(() => useSkillStars('new-skill'));

      expect(result.current.hasSaved).toBe(false);
    });

    it('should read saved state from the new storage key', async () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ 'test-skill': true }));

      const { result } = renderHook(() => useSkillStars('test-skill'));

      await waitFor(() => {
        expect(result.current.hasSaved).toBe(true);
      });
    });

    it('should read saved state from the legacy storage key', async () => {
      localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify({ 'test-skill': true }));

      const { result } = renderHook(() => useSkillStars('test-skill'));

      await waitFor(() => {
        expect(result.current.hasSaved).toBe(true);
      });
    });

    it('should handle corrupted localStorage gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      localStorage.setItem(STORAGE_KEY, 'invalid-json');

      const { result } = renderHook(() => useSkillStars('test-skill'));

      expect(result.current.hasSaved).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        `Failed to parse ${STORAGE_KEY} from localStorage:`,
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should ignore non-boolean values in stored save records', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        'string-false': 'false',
        'string-true': 'true',
        'number-one': 1,
        'real-save': true,
      }));

      const falseString = renderHook(() => useSkillStars('string-false'));
      const trueString = renderHook(() => useSkillStars('string-true'));
      const numberOne = renderHook(() => useSkillStars('number-one'));
      const realSave = renderHook(() => useSkillStars('real-save'));

      expect(falseString.result.current.hasSaved).toBe(false);
      expect(trueString.result.current.hasSaved).toBe(false);
      expect(numberOne.result.current.hasSaved).toBe(false);
      expect(realSave.result.current.hasSaved).toBe(true);
    });

    it('should ignore array-shaped stored data', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([true]));

      const { result } = renderHook(() => useSkillStars('0'));

      expect(result.current.hasSaved).toBe(false);
    });
  });

  describe('handleSaveClick', () => {
    it('should not allow saving without skillId', async () => {
      const { result } = renderHook(() => useSkillStars(undefined));

      await act(async () => {
        await result.current.handleSaveClick();
      });

      expect(result.current.hasSaved).toBe(false);
      expect(localStorage.setItem).not.toHaveBeenCalled();
    });

    it('should not allow double-saving the same skill', async () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ 'skill-1': true }));

      const { result } = renderHook(() => useSkillStars('skill-1'));

      await act(async () => {
        await result.current.handleSaveClick();
      });

      expect(result.current.hasSaved).toBe(true);
    });

    it('should mark the skill as saved after persistence succeeds', async () => {
      const { result } = renderHook(() => useSkillStars('optimistic-skill'));

      expect(result.current.hasSaved).toBe(false);

      await act(async () => {
        await result.current.handleSaveClick();
      });

      await waitFor(() => {
        expect(result.current.hasSaved).toBe(true);
      });
    });

    it('should persist saved status to localStorage', async () => {
      const { result } = renderHook(() => useSkillStars('persist-skill'));

      await act(async () => {
        await result.current.handleSaveClick();
      });

      expect(localStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEY,
        JSON.stringify({ 'persist-skill': true })
      );
    });

    it('should expose a settled saving state after completion', async () => {
      const { result } = renderHook(() => useSkillStars('loading-skill'));

      await waitFor(() => {
        expect(result.current.isSaving).toBe(false);
      });

      await act(async () => {
        await result.current.handleSaveClick();
      });

      expect(result.current.isSaving).toBe(false);
    });
  });

  describe('LocalStorage error handling', () => {
    it('should handle setItem errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const setItemSpy = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      const { result } = renderHook(() => useSkillStars('error-skill'));

      await act(async () => {
        await result.current.handleSaveClick();
      });

      expect(result.current.hasSaved).toBe(false);
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        `Failed to save ${STORAGE_KEY} to localStorage:`,
        expect.any(Error)
      );

      setItemSpy.mockRestore();
      consoleSpy.mockRestore();
    });
  });

  describe('Return values', () => {
    it('should return all expected properties', () => {
      const { result } = renderHook(() => useSkillStars('test'));

      expect(result.current).toHaveProperty('hasSaved');
      expect(result.current).toHaveProperty('handleSaveClick');
      expect(result.current).toHaveProperty('isSaving');
    });

    it('should expose handleSaveClick as function', () => {
      const { result } = renderHook(() => useSkillStars('test'));

      expect(typeof result.current.handleSaveClick).toBe('function');
    });
  });
});
