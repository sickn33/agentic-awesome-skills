/** Local product artwork. No network lookup or runtime icon service. */
export type BrandAsset = {
  name: string
  category: 'Payments' | 'Banks' | 'Apps' | 'Crypto'
  light: string
  dark: string
  tileArtwork?: string
  tileBackground?: string
  proportion: number
  scale: number
}

export const brandMarks = {
  'visa': {
    name: "Visa", category: 'Payments',
    light: new URL('./visa.svg', import.meta.url).href,
    dark: new URL('./visa.svg', import.meta.url).href,
    proportion: 1.56, scale: 0.9,
  },
  'mastercard': {
    name: "Mastercard", category: 'Payments',
    light: new URL('./mastercard.svg', import.meta.url).href,
    dark: new URL('./mastercard.svg', import.meta.url).href,
    proportion: 1.56, scale: 0.9,
  },
  'amex': {
    name: "American Express", category: 'Payments',
    light: new URL('./amex.svg', import.meta.url).href,
    dark: new URL('./amex.svg', import.meta.url).href,
    tileArtwork: new URL('./amex-tile.svg', import.meta.url).href, tileBackground: '#006fcf',
    proportion: 1.56, scale: 0.84,
  },
  'discover': {
    name: "Discover", category: 'Payments',
    light: new URL('./discover.svg', import.meta.url).href,
    dark: new URL('./discover.svg', import.meta.url).href,
    proportion: 1.56, scale: 0.9,
  },
  'paypal': {
    name: "PayPal", category: 'Payments',
    light: new URL('./paypal.svg', import.meta.url).href,
    dark: new URL('./paypal.svg', import.meta.url).href,
    proportion: 1, scale: 0.64,
  },
  'stripe': {
    name: "Stripe", category: 'Payments',
    light: new URL('./stripe.svg', import.meta.url).href,
    dark: new URL('./stripe.svg', import.meta.url).href,
    proportion: 1, scale: 0.64,
  },
  'notion': {
    name: "Notion", category: 'Apps',
    light: new URL('./notion.svg', import.meta.url).href,
    dark: new URL('./notion.svg', import.meta.url).href,
    proportion: 1, scale: 0.68,
  },
  'gmail': {
    name: "Gmail", category: 'Apps',
    light: new URL('./gmail.svg', import.meta.url).href,
    dark: new URL('./gmail.svg', import.meta.url).href,
    proportion: 1, scale: 0.64,
  },
  'google-calendar': {
    name: "Google Calendar", category: 'Apps',
    light: new URL('./google-calendar.svg', import.meta.url).href,
    dark: new URL('./google-calendar.svg', import.meta.url).href,
    proportion: 1, scale: 0.64,
  },
  'google-docs': {
    name: "Google Docs", category: 'Apps',
    light: new URL('./google-docs.svg', import.meta.url).href,
    dark: new URL('./google-docs.svg', import.meta.url).href,
    proportion: 1, scale: 0.64,
  },
  '1password': {
    name: "1Password", category: 'Apps',
    light: new URL('./1password.svg', import.meta.url).href,
    dark: new URL('./1password-dark.svg', import.meta.url).href,
    proportion: 1, scale: 0.64,
  },
  'figma': {
    name: "Figma", category: 'Apps',
    light: new URL('./figma.svg', import.meta.url).href,
    dark: new URL('./figma.svg', import.meta.url).href,
    proportion: 1, scale: 0.68,
  },
  'slack': {
    name: "Slack", category: 'Apps',
    light: new URL('./slack.svg', import.meta.url).href,
    dark: new URL('./slack.svg', import.meta.url).href,
    proportion: 1, scale: 0.64,
  },
  'github': {
    name: "GitHub", category: 'Apps',
    light: new URL('./github.svg', import.meta.url).href,
    dark: new URL('./github-dark.svg', import.meta.url).href,
    proportion: 1, scale: 0.64,
  },
  'linear': {
    name: "Linear", category: 'Apps',
    light: new URL('./linear.svg', import.meta.url).href,
    dark: new URL('./linear-dark.svg', import.meta.url).href,
    proportion: 1, scale: 0.64,
  },
  'dropbox': {
    name: "Dropbox", category: 'Apps',
    // The source artwork is the glyph on a square blue field; shown as the
    // blue glyph alone, so it sits on a tile like the other app marks
    light: new URL('./dropbox-glyph.svg', import.meta.url).href,
    dark: new URL('./dropbox-glyph.svg', import.meta.url).href,
    proportion: 1, scale: 0.72,
  },
  'google-drive': {
    name: "Google Drive", category: 'Apps',
    light: new URL('./google-drive.svg', import.meta.url).href,
    dark: new URL('./google-drive.svg', import.meta.url).href,
    proportion: 1, scale: 0.64,
  },
  'google-sheets': {
    name: "Google Sheets", category: 'Apps',
    light: new URL('./google-sheets.svg', import.meta.url).href,
    dark: new URL('./google-sheets.svg', import.meta.url).href,
    proportion: 1, scale: 0.74,
  },
  'google-slides': {
    name: "Google Slides", category: 'Apps',
    light: new URL('./google-slides.svg', import.meta.url).href,
    dark: new URL('./google-slides.svg', import.meta.url).href,
    proportion: 1, scale: 0.74,
  },
  'google-meet': {
    name: "Google Meet", category: 'Apps',
    light: new URL('./google-meet.svg', import.meta.url).href,
    dark: new URL('./google-meet.svg', import.meta.url).href,
    proportion: 1, scale: 0.64,
  },
  'zoom': {
    name: "Zoom", category: 'Apps',
    light: new URL('./zoom.svg', import.meta.url).href,
    dark: new URL('./zoom.svg', import.meta.url).href,
    proportion: 1, scale: 0.64,
  },
  'vercel': {
    name: "Vercel", category: 'Apps',
    light: new URL('./vercel.svg', import.meta.url).href,
    dark: new URL('./vercel-dark.svg', import.meta.url).href,
    proportion: 1, scale: 0.64,
  },
  'shopify': {
    name: "Shopify", category: 'Apps',
    light: new URL('./shopify.svg', import.meta.url).href,
    dark: new URL('./shopify.svg', import.meta.url).href,
    proportion: 1, scale: 0.68,
  },
  'bitcoin': {
    name: 'Bitcoin', category: 'Crypto',
    light: new URL('./bitcoin.svg', import.meta.url).href,
    dark: new URL('./bitcoin.svg', import.meta.url).href,
    proportion: 1, scale: 0.68,
  },
  'ethereum': {
    name: 'Ethereum', category: 'Crypto',
    light: new URL('./ethereum.svg', import.meta.url).href,
    dark: new URL('./ethereum.svg', import.meta.url).href,
    proportion: 1, scale: 0.68,
  },
  'solana': {
    name: 'Solana', category: 'Crypto',
    light: new URL('./solana.svg', import.meta.url).href,
    dark: new URL('./solana.svg', import.meta.url).href,
    proportion: 1, scale: 0.68,
  },
  'usdc': {
    name: 'USDC', category: 'Crypto',
    light: new URL('./usdc.svg', import.meta.url).href,
    dark: new URL('./usdc.svg', import.meta.url).href,
    proportion: 1, scale: 0.8,
  },
  'tether': {
    name: 'Tether', category: 'Crypto',
    light: new URL('./tether.svg', import.meta.url).href,
    dark: new URL('./tether.svg', import.meta.url).href,
    proportion: 1, scale: 0.68,
  },
  'chase': {
    name: "Chase", category: 'Banks',
    light: new URL('./chase.svg', import.meta.url).href,
    dark: new URL('./chase.svg', import.meta.url).href,
    proportion: 1, scale: 0.8,
  },
  'wellsfargo': {
    name: "Wells Fargo", category: 'Banks',
    light: new URL('./wellsfargo.svg', import.meta.url).href,
    dark: new URL('./wellsfargo.svg', import.meta.url).href,
    proportion: 1, scale: 0.8,
  },
  'bankofamerica': {
    name: "Bank of America", category: 'Banks',
    light: new URL('./bankofamerica.svg', import.meta.url).href,
    dark: new URL('./bankofamerica-dark.svg', import.meta.url).href,
    proportion: 1, scale: 0.8,
  },
  'barclays': {
    name: "Barclays", category: 'Banks',
    light: new URL('./barclays.svg', import.meta.url).href,
    dark: new URL('./barclays.svg', import.meta.url).href,
    proportion: 1, scale: 0.8,
  },
  'hsbc': {
    name: "HSBC", category: 'Banks',
    light: new URL('./hsbc.svg', import.meta.url).href,
    dark: new URL('./hsbc.svg', import.meta.url).href,
    proportion: 1, scale: 0.8,
  },
  'monzo': {
    name: "Monzo", category: 'Banks',
    light: new URL('./monzo.svg', import.meta.url).href,
    dark: new URL('./monzo-dark.svg', import.meta.url).href,
    proportion: 1, scale: 0.8,
  },
  'revolut': {
    name: "Revolut", category: 'Banks',
    light: new URL('./revolut.svg', import.meta.url).href,
    dark: new URL('./revolut-dark.svg', import.meta.url).href,
    proportion: 1, scale: 0.8,
  },
} as const satisfies Record<string, BrandAsset>

export type BrandName = keyof typeof brandMarks
