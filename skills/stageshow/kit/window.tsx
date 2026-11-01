import type { HTMLAttributes, ReactNode } from 'react'
import { useLook } from './looks'
import './window.css'

export interface WindowProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /** The address. A string, or any node: roll just the path with `<>site.app/<Roll>{path}</Roll></>`. */
  url?: ReactNode
  /** Browser: the address field's shape. `pill` for the round field of current Safari and Chrome. */
  urlShape?: 'rounded' | 'pill'
  /** Browser: tab titles above the address bar; the first is the active tab. */
  /** Tab titles. A title that changes should animate the part that changed, so pass a node */
  tabs?: ReactNode[]
  /** Browser: back and forward buttons before the address. */
  nav?: boolean
  /** App: the window title. Centered in a plain title bar; with a `toolbar`, left-aligned 14px after the lights (a unified toolbar) with the toolbar on the right; beside a sidebar, the content column's heading at its 16px inset. */
  title?: string
  /** App: a full-height sidebar. The traffic lights sit in its top, the way Mail, Notes, Linear and Slack do it. */
  sidebar?: ReactNode
  /** The sidebar's width in px. */
  sidebarWidth?: number
  /** The sidebar's shape. `flush` (the default) runs edge to edge with a rule
   * on its right. `floating` is macOS 26: a rounded panel inset 8px from the
   * window's top, left and bottom, with a faint edge and shadow, on a window
   * whose corners grow to 24 (the panel's 16 plus the inset). The lights stay
   * in the panel's top, where the bar's controls are level with them. */
  sidebarStyle?: 'flush' | 'floating'
  /** Controls on the right of the bar (toolbar buttons, avatars, a share button). */
  toolbar?: ReactNode
  /** Controls on the left of the bar, after the title (a breadcrumb, a filter, view tabs). */
  lead?: ReactNode
  /** Props for the content column (data-crop, a class), which sits inside the window's own clip. */
  body?: HTMLAttributes<HTMLDivElement> & Record<`data-${string}`, unknown>
  /** Fades the window to 40%, so a window in front of it reads as the subject. */
  receded?: boolean
  /** The chrome's material. `native` is macOS (the default). `glass` is a frosted
   * frame that takes the color of whatever is behind it, with gray lights, the
   * address centered in a pill with a lock, and the page as a white card inset in
   * the frame. Glass is for a browser: give it a `url`.
   * `terminal` is a dark terminal: one surface, no rule under the bar, the
   * `title` dim and centered (`northwind — zsh`). Fill it with `Prompt` lines,
   * plain output and a `Caret`.
   * `card` is one white card: pale dots, a wide pale address bar, no rule under
   * it, a long soft shadow (the checkout-page browser of a payments site).
   * `hairline` is a small, quiet frame: a short bar over a 1px rule, tiny dots,
   * the address as bare centered text; for a window that is a detail, not the
   * subject. */
  chrome?: 'native' | 'glass' | 'terminal' | 'card' | 'hairline'
  /** The traffic lights: macOS colors, gray (the default for glass), or white (glass over a strong color). */
  lights?: 'color' | 'grey' | 'white'
  /** The lights' size. `standard` is 9px, 6px apart; `large` is macOS 26's
   * 12px, 8px apart. Either way they sit as far from the left edge as their
   * center is from the top. Native and terminal chrome only. */
  lightsSize?: 'standard' | 'large'
  /** The bar's height. `standard` is the fixed 38px every window shares.
   * `tall` is a 64px icon-and-label toolbar (macOS 26 Finder): no fill and no
   * rule, controls 32px tall at the top with their labels under them, and
   * the lights level with the controls (centered 26px down). Only for a
   * product whose real toolbar is that tall. Native chrome only. */
  barSize?: 'standard' | 'tall'
  children?: ReactNode
}

/** The traffic lights. Every chrome puts them in the same spot: centered in the top 38px, 12px in. */
function Lights() {
  return (
    <span className="ss-window__lights">
      <span className="ss-window__dot" />
      <span className="ss-window__dot" />
      <span className="ss-window__dot" />
    </span>
  )
}

function Lock() {
  return (
    <svg className="ss-window__lock" width="7" height="8" viewBox="0 0 7 8" aria-hidden>
      <path d="M1.5 3.3V2.4a2 2 0 0 1 4 0v.9" fill="none" stroke="currentColor" strokeWidth="1.1" />
      <rect x="0" y="3.3" width="7" height="4.7" rx="1.2" fill="currentColor" />
    </svg>
  )
}

function Chevron({ back }: { back?: boolean }) {
  return (
    <svg className="ss-window__chev" width="10" height="10" viewBox="0 0 10 10" aria-hidden>
      <path d={back ? 'M6.5 1.5 3 5l3.5 3.5' : 'M3.5 1.5 7 5 3.5 8.5'} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/**
 * Window chrome. Three kinds, chosen by props:
 * - browser (`url`): address bar, optional `nav` arrows and `tabs` strip
 * - app (`title`): a plain title bar with a centered title
 * - sidebar app (`sidebar`): the sidebar runs to the top and holds the lights; the content column gets its own toolbar
 */
export function Window({ url, urlShape, tabs, nav, title, sidebar, sidebarWidth = 180, sidebarStyle, toolbar, lead, body, className, receded, chrome, lights, lightsSize, barSize, children, ...rest }: WindowProps) {
  const cls = `ss-window ss-recede${className ? ` ${className}` : ''}`
  const large = lightsSize === 'large' ? 'large' : undefined
  const tall = barSize === 'tall' ? 'tall' : undefined

  if (chrome === 'terminal') {
    return (
      <div {...rest} className={cls} data-chrome="terminal" data-lights={lights === 'grey' ? 'grey' : undefined} data-lights-size={large} data-receded={receded || undefined}>
        <div className="ss-window__bar">
          <Lights />
          {title !== undefined && <span className="ss-term__title">{title}</span>}
        </div>
        <div {...body} className={`ss-window__body ss-term${body?.className ? ` ${body.className}` : ''}`}>{children}</div>
      </div>
    )
  }

  if (chrome === 'glass' || chrome === 'card' || chrome === 'hairline') {
    return (
      <div {...rest} className={cls} data-chrome={chrome} data-lights={lights === 'color' || lights === 'white' ? lights : chrome === 'glass' ? 'grey' : undefined} data-receded={receded || undefined}>
        <div className="ss-window__bar">
          <Lights />
          {url !== undefined && (
            <span className="ss-window__url">
              {chrome === 'glass' && <Lock />}
              <span className="ss-window__url-text">{url}</span>
            </span>
          )}
          <span className="ss-window__end">{toolbar}</span>
        </div>
        <div {...body} className={`ss-window__body${body?.className ? ` ${body.className}` : ''}`}>{children}</div>
      </div>
    )
  }

  const address = url !== undefined && (
    <>
      {nav && (
        <span className="ss-window__nav">
          <Chevron back />
          <Chevron />
        </span>
      )}
      <span className="ss-window__url">{url}</span>
    </>
  )

  if (sidebar !== undefined) {
    return (
      <div {...rest} className={cls} data-kind="sidebar" data-side={sidebarStyle === 'floating' ? 'floating' : undefined} data-lights={lights === 'grey' ? 'grey' : undefined} data-lights-size={large} data-bar={tall} data-receded={receded || undefined} data-url-shape={urlShape}>
        <aside className="ss-window__side" style={{ width: sidebarWidth }}>
          <div className="ss-window__side-top">
            <Lights />
          </div>
          {sidebar}
        </aside>
        <div className="ss-window__main">
          <div className="ss-window__bar">
            {title !== undefined && <span className="ss-window__heading">{title}</span>}
            {lead}
            {address}
            <span className="ss-window__spacer" />
            {toolbar}
          </div>
          <div {...body} className={`ss-window__body${body?.className ? ` ${body.className}` : ''}`}>{children}</div>
        </div>
      </div>
    )
  }

  if (tabs?.length) {
    return (
      <div {...rest} className={cls} data-kind="tabs" data-lights={lights === 'grey' ? 'grey' : undefined} data-lights-size={large} data-receded={receded || undefined} data-url-shape={urlShape}>
        <div className="ss-window__tabs">
          <Lights />
          {tabs.map((t, i) => (
            <span key={i} className="ss-window__tab" data-active={i === 0 || undefined}>
              <span className="ss-window__favicon" />
              <span className="ss-window__tab-label">{t}</span>
            </span>
          ))}
        </div>
        <div className="ss-window__bar">
          {address}
          {toolbar}
        </div>
        <div {...body} className={`ss-window__body${body?.className ? ` ${body.className}` : ''}`}>{children}</div>
      </div>
    )
  }

  return (
    <div {...rest} className={cls} data-receded={receded || undefined} data-url-shape={urlShape} data-lights={lights === 'grey' ? 'grey' : undefined} data-lights-size={large} data-bar={tall}>
      <div className="ss-window__bar">
        <Lights />
        {address}
        {title !== undefined && <span className="ss-window__title" data-toolbar={toolbar ? true : undefined}>{title}</span>}
        {lead}
        {url === undefined && title === undefined && <span className="ss-window__spacer" />}
        {toolbar}
      </div>
      <div {...body} className={`ss-window__body${body?.className ? ` ${body.className}` : ''}`}>{children}</div>
    </div>
  )
}

const INK = ['var(--ss-ink-1)', 'var(--ss-ink-2)', 'var(--ss-ink-3)', 'var(--ss-ink-4)', 'var(--ss-ink-5)']

export interface BarProps extends HTMLAttributes<HTMLSpanElement> {
  w: number | string
  h?: number
  /** 1 (faintest) to 5 */
  tone?: 1 | 2 | 3 | 4 | 5
  r?: number
  /** Let it narrow in a row too tight for it, never past its container. On
   * by default for a line (a numeric `w` over three times `h`); an icon slot,
   * a dot or a percentage width keeps its size. */
  shrink?: boolean
}

/** A placeholder: a line of text, a value, an icon slot or a pill. A line
 * gives way in a narrow row as text would; where it fits, it is exactly `w`. */
export function Bar({ w, h = 6, tone = 3, r = 2, shrink, className, style, ...rest }: BarProps) {
  const gives = shrink ?? (typeof w === 'number' && w > h * 3)
  return <span {...rest} className={`ss-bar${className ? ` ${className}` : ''}`} data-shrink={gives || undefined} style={{ width: w, height: h, borderRadius: r, background: INK[tone - 1], ...style }} />
}

export interface TextProps extends HTMLAttributes<HTMLSpanElement> {
  children: string
  /** Filler: the words show only at `realistic` fidelity; at `standard` and `minimal` the line is a bar of about the same width. Write the real copy once and let the stage's fidelity decide. */
  filler?: boolean
  /** Bar width in minimal fidelity. Defaults to an estimate from the text. */
  w?: number
  h?: number
  tone?: BarProps['tone']
  /** Let it wrap. Text is one line by default, so a label never breaks by accident. */
  wrap?: boolean
}

/**
 * Text that knows the stage's fidelity: real words normally, a bar of about
 * the same width in minimal. Write real copy once and every look follows.
 */
export function Text({ children, w, h = 6, tone = 3, wrap, filler, className, style, ...rest }: TextProps) {
  const { fidelity } = useLook()
  if (fidelity === 'minimal' || (filler && fidelity !== 'realistic')) {
    const size = typeof style?.fontSize === 'number' ? style.fontSize : 11
    return <Bar {...rest} w={w ?? Math.round(children.length * size * 0.52)} h={h} tone={tone} className={className} />
  }
  return (
    <span {...rest} className={`ss-text${className ? ` ${className}` : ''}`} data-wrap={wrap || undefined} style={style}>
      {children}
    </span>
  )
}

export interface PromptProps extends HTMLAttributes<HTMLDivElement> {
  /** The working directory shown before the prompt. */
  path?: string
  /** What was typed. A string, or a node (a typed string, a Caret after it). */
  children?: ReactNode
}

/** A terminal command line: a dim path, the prompt mark, and the command
 * bright. Recolor the path and mark with `--ss-term-path` and
 * `--ss-term-sigil` (set on the window, the stage or any parent). */
export function Prompt({ path = '~', children, className, ...rest }: PromptProps) {
  return (
    <div {...rest} className={`ss-term__line ss-term__prompt${className ? ` ${className}` : ''}`}>
      <span className="ss-term__path">{path}</span>
      <span className="ss-term__sigil">❯</span>
      <span className="ss-term__cmd">{children}</span>
    </div>
  )
}

/** A terminal's block cursor. Blinks unless `still` (while typing, a real one holds solid). */
export function Caret({ still }: { still?: boolean }) {
  return <span className="ss-term__caret" data-still={still || undefined} aria-hidden />
}
