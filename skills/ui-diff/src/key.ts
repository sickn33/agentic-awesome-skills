/** Identity of one capture: which route, at which viewport and theme, and optionally which variant. */
export interface CaptureKey {
  /** Route slug (`routes[].name` or derived from the path), unique within the config. */
  route: string;
  viewport: string;
  theme: string;
  /** A variant set (`?param=`), or one value of it. */
  variant?: { param: string; value?: string };
  /** A checkpoint of a recorded flow: both slugs. */
  flow?: { name: string; checkpoint: string };
  /** A component in one state: its slug and the state. */
  component?: { name: string; state: string };
}

export function captureKey(
  route: { slug: string },
  viewport: { name: string },
  theme: { name: string },
  variant?: CaptureKey['variant'],
  flow?: CaptureKey['flow'],
  component?: CaptureKey['component'],
): CaptureKey {
  return { route: route.slug, viewport: viewport.name, theme: theme.name, ...(variant ? { variant } : {}), ...(flow ? { flow } : {}), ...(component ? { component } : {}) };
}

function safe(value: string): string {
  return value.replace(/[^A-Za-z0-9_-]+/g, '_');
}

/**
 * The one serializer for capture ids and the file names derived from them:
 * `home__desktop__light`, `home__desktop__light__hero` (a variant set), `home__desktop__light__hero-2` (one value),
 * `home__desktop__light__flow-menu-after-open` (a flow checkpoint), `home__desktop__light__component-cta`
 * and `home__desktop__light__component-cta-hover` (a component in its default and hover state).
 */
export function keyId(key: CaptureKey): string {
  const id = `${key.route}__${key.viewport}__${key.theme}`;
  if (key.component) return `${id}__component-${key.component.name}${key.component.state === 'default' ? '' : `-${key.component.state}`}`;
  if (key.flow) return `${id}__flow-${key.flow.name}-${key.flow.checkpoint}`;
  if (!key.variant) return id;
  return `${id}__${key.variant.param}${key.variant.value === undefined ? '' : `-${safe(key.variant.value)}`}`;
}
