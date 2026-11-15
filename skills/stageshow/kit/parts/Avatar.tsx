import type { HTMLAttributes } from 'react'
import { useLook } from '../looks'
import './Avatar.css'

export interface AvatarProps extends HTMLAttributes<HTMLSpanElement> {
  /** Its initial. Leave it out (or set `plain`) for a plain disc. */
  name?: string
  /** A plain disc in any fidelity: filler people (assignees, a facepile behind the one that matters), so they don't compete with the named one. */
  plain?: boolean
  size?: number
  /** person (the default for a named avatar): a muted color of its own,
   * picked from the name, as Mail and Messages draw monograms, so a list or a
   * pile reads as different people. accent: the person the story is about.
   * ink: a gray disc, for filler. ios: the monogram iOS draws for a contact
   * with no photo (Contacts, Mail, Messages): a gray-blue gradient, lighter at
   * the top, with up to two white initials in a rounded face. */
  tone?: 'accent' | 'ink' | 'success' | 'person' | 'ios'
  src?: string
  /** A status ring, cut out from the background: pending (a quiet ring), waiting (the quiet ring with an accent arc traveling round it: asked, not yet answered), confirmed (success), declined (danger). It eases between states. */
  ring?: 'pending' | 'waiting' | 'confirmed' | 'declined'
}

/** A round avatar with an initial, or an image from src. In minimal fidelity, or with `plain`, it is a plain disc. */
// Six muted, opaque fills that read on light and dark grounds, one per person
const PEOPLE = ['#c98f6e', '#6f9b7d', '#7b86c7', '#c47a9e', '#8c9ab0', '#c2a35a']
const hue = (name: string) => { let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 9973; return PEOPLE[h % PEOPLE.length] }

export function Avatar({ name = '', plain = false, size = 24, tone = name ? 'person' : 'ink', src, ring, className, style, ...rest }: AvatarProps) {
  const { fidelity } = useLook()
  const disc = plain || fidelity === 'minimal'
  const person = tone === 'person' && !disc ? { background: hue(name), color: '#fff' } : undefined
  // iOS monograms carry two initials, first and last name
  const words = name.trim().split(/\s+/).filter(Boolean)
  const initials = tone === 'ios' ? (words[0]?.[0] ?? '') + (words.length > 1 ? words[words.length - 1]![0] : '') : name.trim()[0] ?? ''
  return (
    <span
      {...rest}
      className={`ss-avatar${className ? ` ${className}` : ''}`}
      data-tone={tone}
      data-ring={ring}
      style={{ width: size, height: size, fontSize: Math.round(size * (tone === 'ios' ? 0.4 : size < 24 ? 0.5 : 0.42)), ...person, ...style }}
    >
      {src && !disc ? <img src={src} alt="" /> : disc ? null : <span className="ss-avatar__initial">{initials.toUpperCase()}</span>}
    </span>
  )
}
