import type { CSSProperties } from 'react'
import './Stream.css'

/**
 * Text written in word by word, as a model streams it. Every word is laid out
 * from the start in its final place, hidden, so nothing reflows as it
 * arrives. `count` is how many words show; drive it from the script. `mark`
 * highlights words (what changed in a rewrite), and neighboring marked words
 * join into one run; return false for all to fade the marks away.
 */
export function Stream({ text, count, mark, className, style, ...rest }: { text: string; count: number; mark?: (word: string, i: number) => boolean; className?: string; style?: CSSProperties } & Record<`data-${string}`, unknown>) {
  const words = text.split(' ')
  const marked = words.map((w, i) => !!mark?.(w, i))
  return (
    <span {...rest} className={`ss-stream${className ? ` ${className}` : ''}`} style={style}>
      {words.map((w, i) => {
        const join = marked[i] && marked[i + 1]
        return (
          <span key={i}>
            <span className="ss-stream__w" data-on={i < count || undefined} data-mark={marked[i] || undefined} data-join={join || undefined} data-joined={(marked[i] && marked[i - 1]) || undefined}>
              {w}
              {join ? ' ' : ''}
            </span>
            {!join && i < words.length - 1 ? ' ' : ''}
          </span>
        )
      })}
    </span>
  )
}
