// Small helpers shared by the stage and its script API.

// Development only. Bundlers (Vite, Next, esbuild with a define) replace
// process.env.NODE_ENV, so a production build never warns; with no bundler
// to replace it, `process` is missing and this counts as development.
export function isDev() {
  try {
    return process.env.NODE_ENV !== 'production'
  } catch {
    return true
  }
}

export function warn(msg: string) {
  if (isDev()) console.warn(`[stageshow] ${msg}`)
}

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
export const hash = (i: number) => {
  const x = Math.sin(i * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

declare const process: { env: { NODE_ENV?: string } }
