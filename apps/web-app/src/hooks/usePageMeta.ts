import { useEffect } from 'react';
import type { SeoMeta } from '../types';
import { setPageMeta } from '../utils/seo';

export function usePageMeta(meta: SeoMeta): void {
  useEffect(() => {
    setPageMeta(meta);
  }, [meta]);
}
