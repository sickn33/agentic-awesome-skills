import type { CSSProperties } from 'react'
import { useLook } from '../looks'
import { brandMarks, type BrandName, type BrandAsset } from '../brands'
import './BrandMark.css'

type CommonProps = {
  src?: string
  size?: number
  width?: number
  tile?: boolean
  /** The surface behind the mark. Defaults to the Stage theme. */
  surface?: 'light' | 'dark'
  className?: string
  style?: CSSProperties
}
export type BrandMarkProps = CommonProps & (
  | { brand: BrandName; name?: string }
  | { brand?: undefined; name: string }
)

/** A bundled product mark, or a caller-supplied logo. Original artwork keeps
 * its proportions; wide payment marks receive a wider footprint. On a tile the
 * mark is inset; bare (`tile={false}`, an app header's logo) it fills `size`. A custom
 * name without artwork retains the neutral initial tile. */
export function BrandMark({ brand, name, src, size = 28, width, tile = true, surface, className, style }: BrandMarkProps) {
  const { fidelity, theme } = useLook()
  const asset: BrandAsset | undefined = brand ? brandMarks[brand] : undefined
  const dark = (surface ?? (theme === 'dark' || theme === 'blueprint' ? 'dark' : 'light')) === 'dark'
  const label = name ?? asset?.name ?? ''
  const image = src ?? (tile && asset?.tileArtwork ? asset.tileArtwork : dark ? asset?.dark : asset?.light)
  const assetSizing = asset && !src
  const frameWidth = width ?? (assetSizing ? Math.round(size * asset.proportion) : size)
  // Full-color marks without a supplied dark variant keep their original
  // artwork on a light tile. Bare marks leave surface choice to the caller.
  const lightTile = tile && dark && assetSizing && asset.dark === asset.light
  return (
    <span className={`ss-brand${className ? ` ${className}` : ''}`} data-tile={tile || undefined} data-light-tile={lightTile || undefined} data-brand={brand} style={{ width: frameWidth, height: size, borderRadius: Math.round(size * 0.24), background: tile && assetSizing ? asset.tileBackground : undefined, ...style }} role="img" aria-label={label}>
      {image && fidelity !== 'minimal'
        ? <img src={image} alt="" draggable={false} style={assetSizing && tile ? { width: `${asset.scale * 100}%`, height: `${asset.scale * 100}%` } : undefined} />
        : <span className="ss-brand__initial" style={{ fontSize: Math.round(size * (size < 24 ? 0.5 : 0.42)) }}>{fidelity === 'minimal' ? '' : label.trim()[0]?.toUpperCase()}</span>}
    </span>
  )
}
