import { useLayoutEffect, useRef, useState } from 'react'
import { BrandMark, Stage, brandMarks, type BrandName } from '../../kit'
import './brands.css'

const names = Object.keys(brandMarks) as BrandName[]
const groups = ['Payments', 'Banks', 'Apps', 'Crypto'] as const

function Sheet({ theme }: { theme: 'light' | 'dark' }) {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  useLayoutEffect(() => {
    const node = ref.current
    if (!node) return
    const measure = () => setWidth(node.clientWidth)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])
  const columns = width >= 600 ? 6 : 3
  const padding = width >= 600 ? 24 : 16
  const gridHeight = groups.reduce((total, group) => {
    const rows = Math.ceil(names.filter(name => brandMarks[name].category === group).length / columns)
    return total + rows * 82 + (rows - 1) * 20
  }, 0)
  const height = padding * 2 + (groups.length - 1) * 28 + groups.length * 36 + gridHeight
  return <section className="bm-sheet">
    <h2>{theme === 'light' ? 'Light' : 'Dark'}</h2>
    <div ref={ref} className="bm-frame">
      {width > 0 && <Stage specimen width={width} height={height} theme={theme} greys="cool" className="bm-stage">
        {() => <div className="bm-content" style={{ padding }}>
          {groups.map(group => <section className="bm-group" key={group}>
            <h3>{group}</h3>
            <div className="bm-grid" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
              {names.filter(name => brandMarks[name].category === group).map(brand => <div className="bm-item" key={brand}>
                <BrandMark brand={brand} size={40} />
                <span>{brandMarks[brand].name}</span>
              </div>)}
            </div>
          </section>)}
        </div>}
      </Stage>}
    </div>
  </section>
}

export default function BrandMarks() {
  return <div className="bm-gallery"><Sheet theme="light" /><Sheet theme="dark" /></div>
}
