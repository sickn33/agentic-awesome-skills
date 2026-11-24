declare module 'gifenc' {
  type Palette = number[][];
  interface GifStream {
    writeFrame(index: Uint8Array, width: number, height: number, opts?: { palette?: Palette; delay?: number; repeat?: number; transparent?: boolean; dispose?: number }): void;
    finish(): void;
    bytes(): Uint8Array;
  }
  type Format = 'rgb565' | 'rgb444' | 'rgba4444';
  const gifenc: {
    GIFEncoder(opts?: { auto?: boolean; initialCapacity?: number }): GifStream;
    quantize(rgba: Uint8Array | Uint8ClampedArray, maxColors: number, opts?: { format?: Format }): Palette;
    applyPalette(rgba: Uint8Array | Uint8ClampedArray, palette: Palette, format?: Format): Uint8Array;
  };
  export default gifenc;
}
