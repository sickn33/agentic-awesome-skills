import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'saved_skills';
const LEGACY_STORAGE_KEY = 'user_stars';
const CHANGE_EVENT = 'aas-saved-skills-change';

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
    const parsed: unknown = JSON.parse(stored);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};

    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, boolean] => typeof entry[1] === 'boolean')
    );
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
function saveUserStarsToStorage(stars: UserStars): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stars));
    window.dispatchEvent(new Event(CHANGE_EVENT));
    return true;
  } catch (error) {
    console.warn(`Failed to save ${STORAGE_KEY} to localStorage:`, error);
    return false;
  }
}

/**
 * Hook to manage local skill saves in the browser.
 */
export function useSkillStars(skillId: string | undefined): UseSkillStarsReturn {
  const [userStars, setUserStars] = useState<UserStars>(() => getUserStarsFromStorage());
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const hasSaved = Boolean(skillId && userStars[skillId]);

  useEffect(() => {
    const sync = (event: Event) => {
      if (event.type === 'storage') {
        const key = (event as StorageEvent).key;
        if (key && key !== STORAGE_KEY && key !== LEGACY_STORAGE_KEY) return;
      }
      setUserStars(getUserStarsFromStorage());
    };

    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  /**
   * Save a skill locally in this browser without pretending to update shared metrics.
   */
  const handleSaveClick = useCallback(async () => {
    if (!skillId || isSaving) return;

    const storedStars = getUserStarsFromStorage();
    if (storedStars[skillId]) {
      setUserStars(storedStars);
      return;
    }

    setIsSaving(true);

    try {
      const updatedStars = { ...storedStars, [skillId]: true };
      if (saveUserStarsToStorage(updatedStars)) {
        setUserStars(updatedStars);
      }
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
