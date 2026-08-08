# i18n Rules

## Library: {{I18N_LIBRARY}}

{{I18N_DESCRIPTION}}

## Supported Languages

{{LANGUAGES}}

## File Structure

```text
{{I18N_FILE_STRUCTURE}}
```

## Usage in Code

```typescript
{
  {
    I18N_USAGE_EXAMPLE;
  }
}
```

## Rules

{{I18N_RULES}}

## Generation Rules

- **I18N_LIBRARY**: "next-intl", "react-i18next", "next-i18next", "Lingui", or "Custom".
- **I18N_DESCRIPTION**: How i18n works in the project. E.g.: "next-intl with App Router, messages per locale in JSON files, detection via middleware."
- **LANGUAGES**: List of supported locales. Detect from `i18n.ts`, `next.config.*`, `middleware.ts`, or `messages/{locale}/` folders.
- **I18N_FILE_STRUCTURE**: Directory tree with translation files.
- **I18N_USAGE_EXAMPLE**:
  - **next-intl App Router**: `useTranslations()`, `getTranslations()`, `<NextIntlClientProvider>`.
  - **next-intl Pages Router**: `getStaticProps` with `useTranslations`.
  - **react-i18next**: `useTranslation()`, `t("key")`, namespaces.
  - **next-i18next**: `serverSideTranslations`, `useTranslation`.
- **I18N_RULES**:
  - UI uses translations, not hardcoded strings.
  - Keys in snake_case or camelCase (detect from project).
  - Interpolation: `t("greeting", { name })` not concatenation.
  - Date/number formatting with `Intl` or library helpers.
  - Metadata and SEO also translated (`generateMetadata` with `getTranslations`).
  - Next.js App Router: middleware handles locale detection + redirect.
  - Pages Router: `getStaticProps`/`getServerSideProps` load translations.
  - Translation files nested by feature, not a single flat file.
