import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { Skill, StarMap } from '../types';
import { supabase } from '../lib/supabase';
import { getSkillsIndexCandidateUrls } from '../utils/publicAssetUrls';

interface SkillContextType {
    skills: Skill[];
    stars: StarMap;
    loading: boolean;
    error: string | null;
    refreshSkills: () => Promise<void>;
}

const SkillContext = createContext<SkillContextType | undefined>(undefined);

export function SkillProvider({ children }: { children: React.ReactNode }) {
    const [skills, setSkills] = useState<Skill[]>([]);
    const [stars, setStars] = useState<StarMap>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchSkillsAndStars = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        setError(null);
        try {
            // Fetch skills index
            const candidateUrls = getSkillsIndexCandidateUrls({
                baseUrl: import.meta.env.BASE_URL,
                origin: window.location.origin,
                pathname: window.location.pathname,
                documentBaseUrl: window.document.baseURI,
            });

            let data: Skill[] | null = null;
            let lastError: Error | null = null;

            for (const url of candidateUrls) {
                try {
                    const res = await fetch(url);
                    if (!res.ok) {
                        throw new Error(`Request failed (${res.status}) for ${url}`);
                    }

                    const rawBody = await res.text();
                    let parsed: unknown;

                    try {
                        parsed = JSON.parse(rawBody);
                    } catch {
                        const contentType = res.headers.get('content-type') || 'unknown content type';
                        throw new Error(`Non-JSON response from ${url} (${contentType})`);
                    }

                    if (!Array.isArray(parsed) || parsed.length === 0) {
                        throw new Error(`Invalid or empty payload from ${url}`);
                    }

                    data = parsed as Skill[];
                    break;
                } catch (err) {
                    lastError = err instanceof Error ? err : new Error(String(err));
                }
            }

            if (!Array.isArray(data)) {
                throw lastError || new Error('Unable to load skills.json from any known source');
            }

            // Incremental loading: set first 50 skills immediately if not a silent refresh
            if (!silent && data.length > 50) {
                setSkills(data.slice(0, 50));
                setLoading(false); // Clear loading state as soon as we have initial content
            } else {
                setSkills(data);
            }

            // Fetch stars from Supabase if available
            if (supabase) {
                const { data: starData, error } = await supabase
                    .from('skill_stars')
                    .select('skill_id, star_count');

                if (!error && starData) {
                    const starMap: StarMap = {};
                    starData.forEach((item: { skill_id: string; star_count: number }) => {
                        starMap[item.skill_id] = item.star_count;
                    });
                    setStars(starMap);
                }
            }

            // Finally set the full set of skills if we did incremental load
            if (!silent && data.length > 50) {
                setSkills(data);
            } else if (silent) {
                setSkills(data);
            }

        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unable to load the skills catalog.';
            setError(message);
            console.error('SkillContext: Failed to load skills', err);
        } finally {
            if (!silent) setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSkillsAndStars();
    }, [fetchSkillsAndStars]);

    const refreshSkills = useCallback(async () => {
        await fetchSkillsAndStars(true);
    }, [fetchSkillsAndStars]);

    const value = useMemo(() => ({
        skills,
        stars,
        loading,
        error,
        refreshSkills
    }), [skills, stars, loading, error, refreshSkills]);

    return (
        <SkillContext.Provider value={value}>
            {children}
        </SkillContext.Provider>
    );
}

export function useSkills() {
    const context = useContext(SkillContext);
    if (context === undefined) {
        throw new Error('useSkills must be used within a SkillProvider');
    }
    return context;
}
