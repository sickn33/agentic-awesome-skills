export type RiskLevel = 'none' | 'safe' | 'critical' | 'offensive' | 'unknown';

/**
 * Skill data type from skills.json
 */
export interface Skill {
  id: string;
  name: string;
  description: string;
  category: string;
  risk?: RiskLevel;
  source?: string;
  date_added?: string;
  path: string;
}

/**
 * Star count data from Supabase
 */
export interface StarMap {
  [skillId: string]: number;
}

/**
 * Sync message type for UI feedback
 */
export interface SyncMessage {
  type: 'success' | 'error' | 'info';
  text: string;
}

/**
 * Category statistics
 */
export interface CategoryStats {
  [category: string]: number;
}

export type TwitterCard = 'summary' | 'summary_large_image';

export type SeoJsonLd = Record<string, unknown> | Record<string, unknown>[];
export type SeoJsonLdFactory = (canonicalUrl: string) => SeoJsonLd;
export type SeoJsonLdValue = SeoJsonLd | SeoJsonLdFactory;

export interface SeoMeta {
  title: string;
  description: string;
  canonicalPath: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  twitterCard?: TwitterCard;
  jsonLd?: SeoJsonLdValue | SeoJsonLdValue[];
}
