import { type CSSProperties, type HTMLAttributes, type ReactNode, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { useLook } from './looks'
import './phone.css'

// An iPhone drawn from the real geometry, the iPhone 18 Pro in points, as
// Apple's iOS 27 UI kit lays it out: screen 402 × 874, status bar 62 tall,
// Dynamic Island 95 × 37 sitting 14 from the top, home indicator 144 × 5
// sitting 8 from the bottom. The screen's corner is traced from the cut-out
// in Apple's own product bezel (the kit's screens are square and the bezel
// rounds them): a superellipse 71pt across, exponent 2.31, within 0.7pt of
// Apple's curve all the way round.
//
// The screen is laid out at true points and scaled down as a whole, so type
// inside it renders at the size iOS uses (15pt, not 8px) and keeps the right
// letter shapes and spacing. Inside the screen, 1pt is 1px; `--pt` is kept
// at 1px there so calc(var(--pt) * n) still works.
const IPHONE = { w: 402, h: 874, r: 64 }
const CORNER = { a: 71, n: 2.31 }
// soft: the illustrative phone marketing pages draw, measured from one (a
// 250 × 527 screen, 28 corners): a little squatter, tighter corners
const SOFT = { w: 393, h: 829, r: 42 }
// Pixel 8: 412 × 915dp, corners about 38, a 24dp punch-hole camera 14 from the top.
const PIXEL = { w: 412, h: 915, r: 38 }

/**
 * photo: an optional caller-provided product bezel; falls back to pro without one.
 * pro: titanium band and black glass, island, status bar. The default.
 * bezel: a plain black border, no band. Flatter, more illustrative.
 * soft: a frosted white frame with no island or status bar, for a lighter, illustrative phone.
 * bare: the screen alone, rounded, on a shadow.
 * silver: light titanium around black glass, for light pages where black reads heavy.
 * clay: a soft matte frame in one light color (--ss-phone-clay), lit like a rendered model.
 * outline: line art, a stroke around the screen. For blueprint and minimal looks.
 * android: a Pixel. Its own screen size, tighter corners, a punch-hole camera.
 */
export type PhoneFrame = 'pro' | 'photo' | 'bezel' | 'soft' | 'bare' | 'silver' | 'clay' | 'outline' | 'android'

const FRAMES: Record<PhoneFrame, { band: number; glass: number }> = {
  pro: { band: 3, glass: 10 },
  // Apple's photograph of the iPhone 18 Pro (its product bezel): the body runs
  // 16pt past the screen on every side; the image itself is drawn over it
  photo: { band: 0, glass: 16 },
  bezel: { band: 0, glass: 12 },
  soft: { band: 0, glass: 12.5 },
  bare: { band: 0, glass: 0 },
  silver: { band: 4, glass: 9 },
  clay: { band: 0, glass: 16 },
  outline: { band: 0, glass: 8 },
  android: { band: 2, glass: 9 },
}

// The iOS frames draw their bands as strokes of the screen's own outline,
// each centered on the screen's edge, widest first: every band then stays
// exactly parallel to the screen, corners included. Each is [reach from the
// screen's edge in points, paint]; a paint is a color or one of the
// gradients Phone defines (url(#…-band), url(#…-clay))
const BANDS: Partial<Record<PhoneFrame, [number, string][]>> = {
  pro: [[13, 'band'], [10, 'var(--ss-phone-rim)'], [9.25, 'var(--ss-phone-glass)']],
  silver: [[13, 'band'], [9, 'var(--ss-phone-glass)']],
  bezel: [[12, 'var(--ss-phone-glass)']],
  clay: [[16, 'clay'], [1, 'var(--ss-phone-seam)']],
}

/** A rounded rectangle with continuous (superellipse) corners, as an SVG
 * path: corners `a` across with exponent `n` (2 is a circle). */
function superellipsePath(w: number, h: number, a: number, n: number) {
  const steps = 32
  const e = 2 / n
  const pts: string[] = []
  const corners: [number, number, number, number][] = [
    [w - a, a, 1, -1],
    [w - a, h - a, 1, 1],
    [a, h - a, -1, 1],
    [a, a, -1, -1],
  ]
  corners.forEach(([cx, cy, sx, sy], c) => {
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * (Math.PI / 2)
      // Clockwise: top-right runs top to right, bottom-right right to bottom, and so on
      const u = c % 2 === 0 ? Math.sin(t) : Math.cos(t)
      const v = c % 2 === 0 ? Math.cos(t) : Math.sin(t)
      pts.push(`${(cx + sx * a * Math.pow(u, e)).toFixed(2)} ${(cy + sy * a * Math.pow(v, e)).toFixed(2)}`)
    }
  })
  return `M${pts.join('L')}Z`
}

export interface PhoneProps extends HTMLAttributes<HTMLDivElement> {
  /** Outer width in px. Height follows the real proportions. */
  width: number
  frame?: PhoneFrame
  /** Status bar time. */
  time?: string
  /** The Dynamic Island. On by default for pro, silver, bezel and android. */
  island?: boolean
  /** The status bar (time, signal, battery). On by default for pro, silver, bezel and android. With it off, content still starts below a 44pt safe area. */
  status?: boolean
  /** Light content (white status bar, home indicator) for dark screens and wallpapers. */
  dark?: boolean
  /** Any CSS background for the screen: a color, gradient or image. The screen is white by default, black with `dark`. */
  wallpaper?: string
  children?: ReactNode
}

export function Phone({ width, frame: asked = 'pro', time = '9:41', island, status, dark, wallpaper, className, style, children, ...rest }: PhoneProps) {
  // The photo frame uses a caller-provided bezel. Without a configured image,
  // or if it fails to load, the phone draws the pro frame
  // instead of standing as an empty shell
  const photoRef = useRef<HTMLSpanElement>(null)
  const [photoOk, setPhotoOk] = useState(true)
  useEffect(() => {
    if (asked !== 'photo' || !photoRef.current) return
    const bg = getComputedStyle(photoRef.current).backgroundImage
    const url = bg.match(/url\(["']?([^"')]+)["']?\)/)?.[1]
    if (!url) return void setPhotoOk(false)
    let live = true
    const img = new Image()
    img.onerror = () => live && setPhotoOk(false)
    img.src = url
    return () => {
      live = false
    }
  }, [asked, dark])
  const frame: PhoneFrame = asked === 'photo' && !photoOk ? 'pro' : asked
  const { band, glass } = FRAMES[frame]
  const { fidelity } = useLook()
  const SCREEN = frame === 'android' ? PIXEL : frame === 'soft' ? SOFT : IPHONE
  const edge = band + glass
  const s = width / (SCREEN.w + edge * 2)
  const pt = (n: number) => n * s
  const id = useId().replace(/:/g, '')
  const ios = frame !== 'android' && frame !== 'soft'
  const outline = ios ? superellipsePath(pt(SCREEN.w), pt(SCREEN.h), pt(CORNER.a), CORNER.n) : null
  const bands = BANDS[frame]
  const chrome = frame === 'pro' || frame === 'photo' || frame === 'bezel' || frame === 'silver' || frame === 'android'
  // The photo has its own island, lens and all
  const showIsland = island ?? (chrome && frame !== 'photo')
  const showStatus = status ?? chrome
  return (
    <div
      {...rest}
      className={`ss-phone${className ? ` ${className}` : ''}`}
      data-frame={frame}
      data-dark={dark || undefined}
      style={{
        width,
        height: pt(SCREEN.h + edge * 2),
        padding: pt(band),
        borderRadius: pt(SCREEN.r + edge),
        ['--ps' as string]: `${s}px`,
        ...style,
      }}
    >
      {(bands || frame === 'outline') && outline && (
        <svg className="ss-phone__bands" width="100%" height="100%" aria-hidden>
          <defs>
            <linearGradient id={`${id}-band`} x1="0.2" y1="0" x2="0.8" y2="1">
              {[0, 0.22, 0.48, 0.74, 1].map((o, i) => (
                <stop key={o} offset={o} style={{ stopColor: `var(--ss-phone-band-${i + 1})` }} />
              ))}
            </linearGradient>
            <linearGradient id={`${id}-clay`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" style={{ stopColor: 'var(--ss-phone-clay-top)' }} />
              <stop offset="1" style={{ stopColor: 'var(--ss-phone-clay-bottom)' }} />
            </linearGradient>
            {frame === 'outline' && (
              // Line art: a ring between 7 and 8pt out, cut from a mask so it is one hairline
              <mask id={`${id}-ring`} maskUnits="userSpaceOnUse" x="-50%" y="-50%" width="200%" height="200%">
                <path d={outline} fill="none" stroke="#fff" strokeWidth={pt(16)} />
                <path d={outline} fill="none" stroke="#000" strokeWidth={pt(16) - 2} />
              </mask>
            )}
          </defs>
          <g transform={`translate(${pt(edge)} ${pt(edge)})`} strokeLinejoin="round">
            {frame === 'outline' ? (
              <>
                <rect x={-pt(9)} y={-pt(9)} width={pt(SCREEN.w + 18)} height={pt(SCREEN.h + 18)} mask={`url(#${id}-ring)`} style={{ fill: 'var(--ss-phone-line)' }} />
                <path d={outline} fill="none" strokeWidth="2" style={{ stroke: 'var(--ss-line, rgba(0, 0, 0, 0.06))' }} />
              </>
            ) : (
              bands!.map(([d, paint]) => (
                <path
                  key={d}
                  d={outline}
                  fill="none"
                  strokeWidth={pt(d * 2)}
                  stroke={paint === 'band' || paint === 'clay' ? `url(#${id}-${paint})` : undefined}
                  style={paint === 'band' || paint === 'clay' ? undefined : { stroke: paint }}
                />
              ))
            )}
          </g>
        </svg>
      )}
      <div className="ss-phone__glass" style={{ padding: pt(glass), borderRadius: pt(SCREEN.r + glass) }}>
        <div
          className="ss-phone__window"
          style={{
            width: pt(SCREEN.w),
            height: pt(SCREEN.h),
            borderRadius: outline ? undefined : pt(SCREEN.r),
            clipPath: outline ? `path('${outline}')` : undefined,
          }}
        >
          <div
            className="ss-phone__screen"
            style={{ width: SCREEN.w, height: SCREEN.h, transform: `scale(${s})`, ['--ss-screen-r' as string]: `${SCREEN.r}px`, ...(wallpaper ? ({ background: wallpaper } as CSSProperties) : null) }}
          >
            {showStatus && (
              <div className="ss-phone__status">
                <span className="ss-phone__time">{fidelity === 'minimal' ? <span className="ss-phone__time-bar" /> : time}</span>
                <span className="ss-phone__glyphs">
                  <Signal />
                  <Wifi />
                  <Battery />
                </span>
              </div>
            )}
            {showIsland && <span className="ss-phone__island" />}
            <div className="ss-phone__content" data-status={showStatus || undefined}>
              {children}
            </div>
            {chrome && <span className="ss-phone__home" />}
          </div>
        </div>
      </div>
      {frame === 'photo' && (
        // The bezel image is 450 × 920pt with the screen at (24, 23): laid over
        // the body so its cut-out frames the screen exactly
        <span ref={photoRef} className="ss-phone__photo" style={{ left: pt(-8), top: pt(-7), width: pt(450), height: pt(920) }} />
      )}
    </div>
  )
}

export interface LockScreenProps extends HTMLAttributes<HTMLDivElement> {
  date?: string
  time?: string
  /** The flashlight and camera buttons at the bottom. */
  controls?: boolean
  /** Where notifications stack. 'bottom' is how iOS does it; 'top' puts them
   * under the clock, for a phone cropped by the stage's bottom edge. */
  stack?: 'bottom' | 'top'
  /**
   * satellite: a phone beside a window. The controls go and notifications
   * stack under the clock. Nothing is scaled: notifications stay true iOS
   * size, so if one wouldn't read, make the phone bigger (and crop it), never
   * the notification.
   */
  size?: 'full' | 'satellite'
  /** The date and clock. Off for a crop that shows only the notifications. */
  clock?: boolean
  /** Notifications. They stack at the bottom of the screen, as iOS does. */
  children?: ReactNode
}

/** The default lock screen wallpaper: a soft blue to lilac gradient with a
 * faint light at the top, after the iPhone's own defaults. Quiet enough to
 * sit behind any demo; white type and frosted banners read on it. */
export const WALLPAPER =
  'radial-gradient(120% 70% at 25% 0%, rgba(255, 255, 255, 0.3), transparent 65%), linear-gradient(172deg, #8ea9d6 0%, #9aa1d4 50%, #aca3cf 100%)'

/** The iOS lock screen: date, large clock, notifications stacked at the bottom. Put it inside a Phone with `dark` and a `wallpaper`. */
export function LockScreen({ date = 'Tuesday, October 21', time = '9:41', controls = true, stack = 'bottom', size = 'full', clock = true, className, children, ...rest }: LockScreenProps) {
  return (
    <div {...rest} className={`ss-lock${className ? ` ${className}` : ''}`} data-size={size} data-clock={clock ? undefined : 'off'}>
      {clock && <div className="ss-lock__date">{date}</div>}
      {clock && <div className="ss-lock__clock">{time}</div>}
      <div className="ss-lock__stack" data-at={stack}>{children}</div>
      {controls && size === 'full' && (
        <div className="ss-lock__controls">
          {/* Drawn after SF Symbols flashlight.off.fill and camera.fill: solid
              glyphs with cut-outs, not outlines */}
          <span className="ss-lock__control">
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
              <path
                fill="currentColor"
                fillRule="evenodd"
                d="M7.6 1.6h8.8a1.6 1.6 0 0 1 1.6 1.6v1.9H6V3.2a1.6 1.6 0 0 1 1.6-1.6ZM6 6h12l-2.6 4v10.4a2 2 0 0 1-2 2h-2.8a2 2 0 0 1-2-2V10ZM10.6 14a1.4 1.4 0 1 0 2.8 0 1.4 1.4 0 1 0-2.8 0Z"
              />
            </svg>
          </span>
          <span className="ss-lock__control">
            <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden>
              <path
                fill="currentColor"
                fillRule="evenodd"
                d="M4.6 6.6h3.3l1.2-1.8a1.3 1.3 0 0 1 1.1-.6h3.6a1.3 1.3 0 0 1 1.1.6l1.2 1.8h3.3A2.6 2.6 0 0 1 22 9.2v8.6a2.6 2.6 0 0 1-2.6 2.6H4.6A2.6 2.6 0 0 1 2 17.8V9.2a2.6 2.6 0 0 1 2.6-2.6ZM7.5 13.4a4.5 4.5 0 1 0 9 0 4.5 4.5 0 1 0-9 0ZM9 13.4a3 3 0 1 0 6 0 3 3 0 1 0-6 0Z"
              />
            </svg>
          </span>
        </div>
      )}
    </div>
  )
}

export interface NotificationProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  icon?: ReactNode
  title: ReactNode
  body?: ReactNode
  time?: string
  /** Where it shows. Leave it out on a LockScreen, which stacks notifications
   * at the bottom as iOS does. banner: the phone is unlocked (in an app or on
   * the home screen), so it drops in at the top of the screen, under the
   * island, over whatever is there. */
  banner?: boolean
}

/**
 * An iOS notification banner, in points. Place it inside a Phone (or a
 * LockScreen). The body wraps to three lines, as iOS shows it. It is native
 * width, the screen minus 18pt each side, and nothing narrows it: a phone
 * cropped at a side is composed so the banner shows whole.
 */
export function Notification({ icon, title, body, time = 'now', banner, className, ...rest }: NotificationProps) {
  const el = useRef<HTMLDivElement>(null)
  return (
    <div {...rest} ref={el} className={`ss-notification${className ? ` ${className}` : ''}`} data-banner={banner || undefined}>
      <span className="ss-notification__icon">{icon}</span>
      <span className="ss-notification__text">
        <span className="ss-notification__head">
          <span className="ss-notification__title">{title}</span>
          <span className="ss-notification__time">{time}</span>
        </span>
        {body && <span className="ss-notification__body">{body}</span>}
      </span>
    </div>
  )
}

// The status bar glyphs, taken from Apple's iOS 27 UI kit for Figma
// (Status bar, iPhone): exact paths and sizes in points

function Signal() {
  // Four bars 3.33 wide on a 5.67 pitch, fully rounded, 6.33 to 13.67 tall
  return (
    <svg viewBox="0 0 20.33 13.67" width="20.33" height="13.67" className="ss-phone__glyph ss-phone__signal">
      {[6.33, 8.67, 11, 13.67].map((h, i) => (
        <rect key={i} x={i * 5.667} y={13.67 - h} width={3.333} height={h} rx={1.667} fill="currentColor" />
      ))}
    </svg>
  )
}

function Wifi() {
  return (
    <svg viewBox="0 0 19.33 14.33" width="19.33" height="14.33" className="ss-phone__glyph ss-phone__wifi">
      <path fillRule="evenodd" fill="currentColor" d="M0.415933 5.54283C0.902185 6.04412 1.66017 5.95818 2.27513 5.41393C4.30595 3.58064 6.83731 2.63535 9.66901 2.63535C12.5007 2.63535 15.0464 3.60928 17.0629 5.41393C17.6636 5.97251 18.4215 6.0298 18.9221 5.54283C19.4226 5.02722 19.4942 4.2538 18.9793 3.70954C16.8341 1.51819 13.3302 0 9.66901 0C6.00783 0 2.48965 1.53251 0.358727 3.72387C-0.156127 4.2538 -0.0989213 5.02722 0.415933 5.55715L0.415933 5.54283ZM3.94841 9.13779C4.50617 9.68205 5.22124 9.62476 5.85051 9.10915C6.88022 8.29276 8.25316 7.73418 9.66901 7.7485C11.0706 7.7485 12.4435 8.29276 13.4875 9.12347C14.1168 9.63908 14.8605 9.66773 15.4039 9.12347C15.9331 8.57921 16.0189 7.7485 15.4611 7.23289C14.0739 5.98683 11.9859 5.11315 9.68332 5.11315C7.38077 5.11315 5.27845 5.98683 3.9055 7.23289C3.41925 7.69121 3.31914 8.47896 3.96271 9.13779L3.94841 9.13779ZM8.72511 13.8929C9.34008 14.4801 9.98365 14.4801 10.5986 13.8929L11.757 12.7757C12.372 12.1742 12.5007 11.4151 11.7999 10.8995C11.2136 10.4841 10.4699 10.212 9.66901 10.212C8.86813 10.212 8.11015 10.4841 7.53809 10.9138C6.83731 11.4151 6.98033 12.1885 7.59529 12.7757L8.73942 13.8929L8.72511 13.8929Z" />
    </svg>
  )
}

function Battery() {
  // iOS 27 draws a full battery as one solid body, with a small contact
  return (
    <svg viewBox="0 0 29.33 13.67" width="29.33" height="13.67" className="ss-phone__glyph ss-phone__battery">
      <path fill="currentColor" d="M0 6.4C0 4.15979 0 3.03969 0.435974 2.18404C0.819467 1.43139 1.43139 0.819467 2.18404 0.435974C3.03969 0 4.15979 0 6.4 0L19.933 0C22.1732 0 23.2933 0 24.149 0.435974C24.9016 0.819467 25.5135 1.43139 25.897 2.18404C26.333 3.03969 26.333 4.15979 26.333 6.4L26.333 7.26666C26.333 9.50687 26.333 10.627 25.897 11.4826C25.5135 12.2353 24.9016 12.8472 24.149 13.2307C23.2933 13.6667 22.1732 13.6667 19.933 13.6667L6.4 13.6667C4.15979 13.6667 3.03969 13.6667 2.18404 13.2307C1.43139 12.8472 0.819467 12.2353 0.435974 11.4826C0 10.627 0 9.50687 0 7.26666L0 6.4Z" />
      <path fillRule="evenodd" fill="currentColor" transform="translate(27.33 4.33)" d="M0 0L0 5C0.601505 4.8625 2 3.75 2 2.5C2 1.25 0.601505 0.1375 0 0Z" />
    </svg>
  )
}
