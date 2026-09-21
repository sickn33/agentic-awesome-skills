# App Store Metadata

Manage App Store metadata and optimize for ASO using EAS Metadata.

## Contents

- [What is EAS Metadata?](#what-is-eas-metadata)
- [Getting Started](#getting-started)
- [Configuration File](#configuration-file)
- [App Store Optimization (ASO)](#app-store-optimization-aso)
- [Categories](#categories)
- [Localization](#localization)
- [Dynamic Configuration](#dynamic-configuration)
- [Age Rating (Advisory)](#age-rating-advisory)
- [Release Strategy](#release-strategy)
- [Review Information](#review-information)
- [ASO Checklist](#aso-checklist)
- [VS Code Integration](#vs-code-integration)
- [Common Issues](#common-issues)
- [CI/CD Integration](#cicd-integration)
- [Tips](#tips)

## What is EAS Metadata?

EAS Metadata automates App Store presence management from the command line using a `store.config.json` file instead of manually filling forms in App Store Connect. It includes built-in validation to catch common rejection pitfalls.

**Current Status:** Preview, Apple App Store only.

## Getting Started

### Pull Existing Metadata

If your app is already published, pull current metadata:

```bash
eas metadata:pull
```

This creates `store.config.json` with your current App Store configuration.

### Push Metadata Updates

After editing your config, push changes:

```bash
eas metadata:push
```

**Important:** You must submit a binary via `eas submit` before pushing metadata for new apps.

## Configuration File

Create `store.config.json` at your project root:

```json
{
  "configVersion": 0,
  "apple": {
    "copyright": "2025 Your Company",
    "categories": ["UTILITIES", "PRODUCTIVITY"],
    "info": {
      "en-US": {
        "title": "App Name",
        "subtitle": "Your compelling tagline",
        "description": "Full app description...",
        "keywords": ["keyword1", "keyword2", "keyword3"],
        "releaseNotes": "What's new in this version...",
        "promoText": "Limited time offer!",
        "privacyPolicyUrl": "https://example.com/privacy",
        "supportUrl": "https://example.com/support",
        "marketingUrl": "https://example.com"
      }
    },
    "advisory": {
      "alcoholTobaccoOrDrugUseOrReferences": "NONE",
      "gamblingSimulated": "NONE",
      "medicalOrTreatmentInformation": "NONE",
      "profanityOrCrudeHumor": "NONE",
      "sexualContentGraphicAndNudity": "NONE",
      "sexualContentOrNudity": "NONE",
      "horrorOrFearThemes": "NONE",
      "matureOrSuggestiveThemes": "NONE",
      "violenceCartoonOrFantasy": "NONE",
      "violenceRealistic": "NONE",
      "violenceRealisticProlongedGraphicOrSadistic": "NONE",
      "contests": "NONE",
      "gambling": false,
      "unrestrictedWebAccess": false,
      "seventeenPlus": false
    },
    "release": {
      "automaticRelease": true,
      "phasedRelease": true
    },
    "review": {
      "firstName": "John",
      "lastName": "Doe",
      "email": "review@example.com",
      "phone": "+1 555-123-4567",
      "notes": "Demo account: test@example.com / password123"
    }
  }
}
```

## App Store Optimization (ASO)

### Title Optimization (30 characters max)

The title is the most important ranking factor. Include your brand name and 1-2 strongest keywords.

```json
{
  "title": "Budgetly - Money Tracker"
}
```

**Best Practices:**

- Brand name first for recognition
- Include highest-volume keyword
- Avoid generic words like "app" or "the"
- Title keywords boost rankings by ~10%

### Subtitle Optimization (30 characters max)

The subtitle appears below your title in search results. Use it for your unique value proposition.

```json
{
  "subtitle": "Smart Expense & Budget Planner"
}
```

**Best Practices:**

- Don't duplicate keywords from title (Apple counts each word once)
- Highlight your main differentiator
- Include secondary high-value keywords
- Focus on benefits, not features

### Keywords Field (100 characters max)

Hidden from users but crucial for discoverability. Use comma-separated keywords without spaces after commas.

```json
{
  "keywords": [
    "finance,budget,expense,money,tracker,savings,bills,income,spending,wallet,personal,weekly,monthly"
  ]
}
```

**Best Practices:**

- Use all 100 characters
- Separate with commas only (no spaces)
- No duplicates from title/subtitle
- Include singular forms (Apple handles plurals)
- Add synonyms and alternate spellings
- Include competitor brand names (carefully)
- Use digits instead of spelled numbers ("5" not "five")
- Skip articles and prepositions

### Description Optimization

The iOS description is NOT indexed for search but critical for conversion. Focus on convincing users to download.

```json
{
  "description": "Take control of your finances with Budgetly, the intuitive money management app trusted by over 1 million users.\n\nKEY FEATURES:\n• Smart budget tracking - Set limits and watch your progress\n• Expense categorization - Know exactly where your money goes\n• Bill reminders - Never miss a payment\n• Beautiful charts - Visualize your financial health\n• Bank sync - Connect 10,000+ institutions\n• Cloud backup - Your data, always safe\n\nWHY BUDGETLY?\nUnlike complex spreadsheets or basic calculators, Budgetly learns your spending habits and provides personalized insights. Our users save an average of $300/month within 3 months.\n\nPRIVACY FIRST\nYour financial data is encrypted end-to-end. We never sell your information.\n\nDownload Budgetly today and start your journey to financial freedom!"
}
```

**Best Practices:**

- Front-load the first 3 lines (visible before "more")
- Use bullet points for features
- Include social proof (user counts, ratings, awards)
- Add a clear call-to-action
- Mention privacy/security for sensitive apps
- Update with each release

### Release Notes

Shown to existing users deciding whether to update.

```json
{
  "releaseNotes": "Version 2.5 brings exciting improvements:\n\n• NEW: Dark mode support\n• NEW: Widget for home screen\n• IMPROVED: 50% faster sync\n• FIXED: Notification timing issues\n\nLove Budgetly? Please leave a review!"
}
```

### Promo Text (170 characters max)

Appears above description; can be updated without new binary. Great for time-sensitive promotions.

```json
{
  "promoText": "🎉 New Year Special: Premium features free for 30 days! Start 2025 with better finances."
}
```

## Categories

Primary category is most important for browsing and rankings.

```json
{
  "categories": ["FINANCE", "PRODUCTIVITY"]
}
```

**Available Categories:**

- BOOKS, BUSINESS, DEVELOPER_TOOLS, EDUCATION
- ENTERTAINMENT, FINANCE, FOOD_AND_DRINK
- GAMES (with subcategories), GRAPHICS_AND_DESIGN
- HEALTH_AND_FITNESS, KIDS (age-gated)
- LIFESTYLE, MAGAZINES_AND_NEWSPAPERS
- MEDICAL, MUSIC, NAVIGATION, NEWS
- PHOTO_AND_VIDEO, PRODUCTIVITY, REFERENCE
- SHOPPING, SOCIAL_NETWORKING, SPORTS
- STICKERS (with subcategories), TRAVEL
- UTILITIES, WEATHER

## Localization

Localize metadata for each target market. Keywords should be researched per locale—direct translations often miss regional search terms.

```json
{
  "info": {
    "en-US": {
      "title": "Budgetly - Money Tracker",
      "subtitle": "Smart Expense Planner",
      "keywords": ["budget,finance,money,expense,tracker"]
    },
    "es-ES": {
      "title": "Budgetly - Control de Gastos",
      "subtitle": "Planificador de Presupuesto",
      "keywords": ["presupuesto,finanzas,dinero,gastos,ahorro"]
    },
    "ja": {
      "title": "Budgetly - 家計簿アプリ",
      "subtitle": "簡単支出管理",
      "keywords": ["家計簿,支出,予算,節約,お金"]
    },
    "de-DE": {
      "title": "Budgetly - Haushaltsbuch",
      "subtitle": "Ausgaben Verwalten",
      "keywords": ["budget,finanzen,geld,ausgaben,sparen"]
    }
  }
}
```

**Supported Locales:**
`ar-SA`, `ca`, `cs`, `da`, `de-DE`, `el`, `en-AU`, `en-CA`, `en-GB`, `en-US`, `es-ES`, `es-MX`, `fi`, `fr-CA`, `fr-FR`, `he`, `hi`, `hr`, `hu`, `id`, `it`, `ja`, `ko`, `ms`, `nl-NL`, `no`, `pl`, `pt-BR`, `pt-PT`, `ro`, `ru`, `sk`, `sv`, `th`, `tr`, `uk`, `vi`, `zh-Hans`, `zh-Hant`

## Dynamic Configuration

Use JavaScript for dynamic values like copyright year or fetched translations.

### Basic Dynamic Config

```js
// store.config.js
const baseConfig = require("./store.config.json");

const year = new Date().getFullYear();

module.exports = {
  ...baseConfig,
  apple: {
    ...baseConfig.apple,
    copyright: `${year} Your Company, Inc.`,
  },
};
```

### Async Configuration (External Localization)

```js
// store.config.js
module.exports = async () => {
  const baseConfig = require("./store.config.json");

  // Fetch translations from CMS/localization service
  const translations = await fetch(
    "https://api.example.com/app-store-copy"
  ).then((r) => r.json());

  return {
    ...baseConfig,
    apple: {
      ...baseConfig.apple,
      info: translations,
    },
  };
};
```

### Environment-Based Config

```js
// store.config.js
const baseConfig = require("./store.config.json");

const isProduction = process.env.EAS_BUILD_PROFILE === "production";

module.exports = {
  ...baseConfig,
  apple: {
    ...baseConfig.apple,
    info: {
      "en-US": {
        ...baseConfig.apple.info["en-US"],
        promoText: isProduction
          ? "Download now and get started!"
          : "[BETA] Help us test new features!",
      },
    },
  },
};
```

Update `eas.json` to use JS config:

```json
{
  "cli": {
    "metadataPath": "./store.config.js"
  }
}
```

## Age Rating (Advisory)

Answer content questions honestly to get an appropriate age rating.

**Content Descriptors:**

- `NONE` - Content not present
- `INFREQUENT_OR_MILD` - Occasional mild content
- `FREQUENT_OR_INTENSE` - Regular or strong content

```json
{
  "advisory": {
    "alcoholTobaccoOrDrugUseOrReferences": "NONE",
    "contests": "NONE",
    "gambling": false,
    "gamblingSimulated": "NONE",
    "horrorOrFearThemes": "NONE",
    "matureOrSuggestiveThemes": "NONE",
    "medicalOrTreatmentInformation": "NONE",
    "profanityOrCrudeHumor": "NONE",
    "sexualContentGraphicAndNudity": "NONE",
    "sexualContentOrNudity": "NONE",
    "unrestrictedWebAccess": false,
    "violenceCartoonOrFantasy": "NONE",
    "violenceRealistic": "NONE",
    "violenceRealisticProlongedGraphicOrSadistic": "NONE",
    "seventeenPlus": false,
    "kidsAgeBand": "NINE_TO_ELEVEN"
  }
}
```

**Kids Age Bands:** `FIVE_AND_UNDER`, `SIX_TO_EIGHT`, `NINE_TO_ELEVEN`

## Release Strategy

Control how your app rolls out to users.

```json
{
  "release": {
    "automaticRelease": true,
    "phasedRelease": true
  }
}
```

**Options:**

- `automaticRelease: true` - Release immediately upon approval
- `automaticRelease: false` - Manual release after approval
- `automaticRelease: "2025-02-01T10:00:00Z"` - Schedule release (RFC 3339)
- `phasedRelease: true` - 7-day gradual rollout (1%, 2%, 5%, 10%, 20%, 50%, 100%)

## Review Information

Provide contact info and test credentials for the App Review team.

```json
{
  "review": {
    "firstName": "Jane",
    "lastName": "Smith",
    "email": "app-review@company.com",
    "phone": "+1 (555) 123-4567",
    "demoUsername": "demo@example.com",
    "demoPassword": "ReviewDemo2025!",
    "notes": "To test premium features:\n1. Log in with demo credentials\n2. Navigate to Settings > Subscription\n3. Tap 'Restore Purchase' - sandbox purchase will be restored\n\nFor location features, allow location access when prompted."
  }
}
```

## ASO Checklist

### Before Each Release

- [ ] Update keywords based on performance data
- [ ] Refresh description with new features
- [ ] Write compelling release notes
- [ ] Update promo text if running campaigns
- [ ] Verify all URLs are valid

### Monthly ASO Tasks

- [ ] Analyze keyword rankings
- [ ] Research competitor keywords
- [ ] Check conversion rates in App Analytics
- [ ] Review user feedback for keyword ideas
- [ ] A/B test screenshots in App Store Connect

### Keyword Research Tips

1. **Brainstorm features** - List all app capabilities
2. **Mine reviews** - Find words users actually use
3. **Analyze competitors** - Check their titles/subtitles
4. **Use long-tail keywords** - Less competition, higher intent
5. **Consider misspellings** - Common typos can drive traffic
6. **Track seasonality** - Some keywords peak at certain times

### Metrics to Monitor

- **Impressions** - How often your app appears in search
- **Product Page Views** - Users who tap to learn more
- **Conversion Rate** - Views → Downloads
- **Keyword Rankings** - Position for target keywords
- **Category Ranking** - Position in your categories

## VS Code Integration

Install the [Expo Tools extension](https://marketplace.visualstudio.com/items?itemName=expo.vscode-expo-tools) for:

- Auto-complete for all schema properties
- Inline validation and warnings
- Quick fixes for common issues

## Common Issues

### "Binary not found"

Push a binary with `eas submit` before pushing metadata.

### "Invalid keywords"

- Check total length is ≤100 characters
- Remove spaces after commas
- Remove duplicate words

### "Description too long"

Description maximum is 4000 characters.

### Pull doesn't update JS config

`eas metadata:pull` creates a JSON file; import it into your JS config.

## CI/CD Integration

Automate metadata updates in your deployment pipeline:

```yaml
# .eas/workflows/release.yml
jobs:
  submit-and-metadata:
    steps:
      - name: Submit to App Store
        run: eas submit -p ios --latest

      - name: Push Metadata
        run: eas metadata:push
```

## Tips

- Update metadata every 4-6 weeks for optimal ASO
- 70% of App Store visitors use search to find apps
- Apps with 4+ star ratings get featured more often
- Localized apps see 128% more downloads per country
- First 3 lines of description are most critical (shown before "more")
- Use all 100 keyword characters—every character counts
