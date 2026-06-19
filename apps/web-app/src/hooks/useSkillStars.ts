import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'saved_skills';
const LEGACY_STORAGE_KEY = 'user_stars';

interface UserStars {
  [skillId: string]: boolean;
}

interface UseSkillStarsReturn {
  hasSaved: boolean;
  handleSaveClick: () => Promise<void>;
  isSaving: boolean;
}

/**
 * Safely parse localStorage data with error handling
 */
function parseStoredStars(storageKey: string): UserStars {
  try {
    const stored = localStorage.getItem(storageKey);
    if (!stored) return {};
    const parsed = JSON.parse(stored);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch (error) {
    console.warn(`Failed to parse ${storageKey} from localStorage:`, error);
    return {};
  }
}

function getUserStarsFromStorage(): UserStars {
  return {
    ...parseStoredStars(LEGACY_STORAGE_KEY),
    ...parseStoredStars(STORAGE_KEY),
  };
}

/**
 * Safely save to localStorage with error handling
 */
function saveUserStarsToStorage(stars: UserStars): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stars));
  } catch (error) {
    console.warn(`Failed to save ${STORAGE_KEY} to localStorage:`, error);
  }
}

/**
 * Hook to manage local skill saves in the browser.
 */
export function useSkillStars(skillId: string | undefined): UseSkillStarsReturn {
  const [hasSaved, setHasSaved] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    if (!skillId) {
      setHasSaved(false);
      return;
    }

    const userStars = getUserStarsFromStorage();
    setHasSaved(!!userStars[skillId]);
  }, [skillId]);

  /**
   * Save a skill locally in this browser without pretending to update shared metrics.
   */
  const handleSaveClick = useCallback(async () => {
    if (!skillId || isSaving) return;

    const userStars = getUserStarsFromStorage();
    if (userStars[skillId]) return;

    setIsSaving(true);
    setHasSaved(true);

    try {
      const updatedStars = { ...userStars, [skillId]: true };
      saveUserStarsToStorage(updatedStars);
    } catch (error) {
      console.error('Failed to save skill locally:', error);
    } finally {
      setIsSaving(false);
    }
  }, [skillId, isSaving]);

  return {
    hasSaved,
    handleSaveClick,
    isSaving
  };
}

export default useSkillStars;
