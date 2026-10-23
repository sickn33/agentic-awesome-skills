# Polaris web components

<!-- Generated from tools/reference/ by `npm run build:reference`. Do not edit. -->

Every component a Nitrogen page can use, each with a working example. They are custom elements loaded by `<script src="https://cdn.shopify.com/shopifycloud/polaris-1.js">` in `web/*.html`: plain HTML, no React, no build step, no imports. Polaris React (`<Page>`, `<Card>`, `@shopify/polaris`) does not apply here. Inside an app, the same examples render live on its Components page (`web/polaris.html`).

- **Actions:** Button, Button group, Clickable, Clickable chip, Link, Menu
- **Feedback and status:** Badge, Banner, Empty state, Progress, Spinner
- **Forms:** Text field, Text area, Email field, Password field, Number field, Money field, URL field, Search field, Select, Checkbox, Switch, Choice list, Color field, Color picker, Date field, Date picker, Drop zone
- **Layout and structure:** Page, Section, Box, Stack, Grid, Query container, Divider, Table, Ordered list, Unordered list
- **Media and visuals:** Avatar, Icon, Image, Thumbnail
- **Overlays:** Modal, Popover
- **Typography and content:** Heading, Paragraph, Text, Number, Chip, Tooltip

## Actions

### Button: `<s-button>`

Starts an action. One primary button per page; use tone="critical" for anything destructive.

```html
<s-stack direction="inline" gap="small-200">
  <s-button variant="primary">Save</s-button>
  <s-button>Cancel</s-button>
  <s-button variant="tertiary">Learn more</s-button>
  <s-button tone="critical">Delete</s-button>
  <s-button icon="plus">Add product</s-button>
  <s-button loading>Saving</s-button>
  <s-button disabled>Unavailable</s-button>
</s-stack>
```

### Button group: `<s-button-group>`

Lays out related buttons, with the primary action in its own slot.

```html
<s-button-group>
  <s-button slot="primary-action" variant="primary">Save</s-button>
  <s-button slot="secondary-actions">Duplicate</s-button>
  <s-button slot="secondary-actions">Archive</s-button>
</s-button-group>
```

### Clickable: `<s-clickable>`

Makes any content behave like a button or a link. It takes the same layout properties as a box.

```html
<s-clickable href="/products" border="base" borderRadius="base" padding="base">
  <s-stack gap="small-200">
    <s-heading>Products</s-heading>
    <s-text color="subdued">The whole card is the link.</s-text>
  </s-stack>
</s-clickable>
```

### Clickable chip: `<s-clickable-chip>`

A chip the merchant can press or remove, for filters and selected values.

```html
<s-stack direction="inline" gap="small-200">
  <s-clickable-chip>Active</s-clickable-chip>
  <s-clickable-chip color="strong">Draft</s-clickable-chip>
  <s-clickable-chip removable>Vendor: Acme</s-clickable-chip>
</s-stack>
```

### Link: `<s-link>`

Navigation inside text. App Bridge turns a relative href into in-app navigation.

```html
<s-paragraph>
  Open <s-link href="/settings">settings</s-link>, or read the
  <s-link href="https://shopify.dev" target="_blank">Shopify docs</s-link>.
</s-paragraph>
```

### Menu: `<s-menu>`

A list of actions that opens from a button. The button names the menu with commandFor.

```html
<s-button commandFor="demo-menu" icon="menu-horizontal">More actions</s-button>

<s-menu id="demo-menu" accessibilityLabel="Product actions">
  <s-button icon="edit">Edit</s-button>
  <s-button icon="duplicate">Duplicate</s-button>
  <s-button icon="delete" tone="critical">Delete</s-button>
</s-menu>
```

## Feedback and status

### Badge: `<s-badge>`

A short status label. The tone carries the meaning, so keep the text to a word or two.

```html
<s-stack direction="inline" gap="small-200">
  <s-badge>Draft</s-badge>
  <s-badge tone="info">Scheduled</s-badge>
  <s-badge tone="success">Active</s-badge>
  <s-badge tone="caution">Low stock</s-badge>
  <s-badge tone="warning">Expiring</s-badge>
  <s-badge tone="critical">Failed</s-badge>
  <s-badge tone="success" icon="check-circle">Paid</s-badge>
</s-stack>
```

### Banner: `<s-banner>`

An important message at the top of a page or section. Add dismissible when it can be closed.

```html
<s-stack gap="base">
  <s-banner heading="Settings saved" tone="success" dismissible>
    Your changes are live.
  </s-banner>
  <s-banner heading="Payment method expiring" tone="warning">
    Update your card before the end of the month.
    <s-button slot="secondary-actions">Update card</s-button>
  </s-banner>
  <s-banner heading="Sync failed" tone="critical">
    The last sync stopped after 120 products.
  </s-banner>
</s-stack>
```

### Empty state: `<s-empty-state>`

What a page shows before there is any data: what belongs here, and the one action that starts it.

```html
<s-empty-state heading="No campaigns yet">
  <s-icon slot="graphic" type="product"></s-icon>
  <s-text slot="subheading">Campaigns you create will be listed here.</s-text>
  <s-button slot="primary-action" variant="primary">Create campaign</s-button>
  <s-button slot="secondary-actions">Learn more</s-button>
</s-empty-state>
```

### Progress: `<s-progress>`

How far along a task is. Give it a value and a max.

```html
<s-stack gap="base">
  <s-progress accessibilityLabel="Import progress" value="30" max="100"></s-progress>
  <s-progress accessibilityLabel="Steps completed" value="4" max="5" tone="success"></s-progress>
</s-stack>
```

### Spinner: `<s-spinner>`

Shows that something is loading when you cannot say how long it will take.

```html
<s-stack direction="inline" gap="large" alignItems="center">
  <s-spinner accessibilityLabel="Loading"></s-spinner>
  <s-spinner accessibilityLabel="Loading" size="large"></s-spinner>
</s-stack>
```

## Forms

### Text field: `<s-text-field>`

One line of text. `details` is the help text under the field; `error` replaces it when the value is wrong.

```html
<s-stack gap="base">
  <s-text-field
    label="Store name"
    name="storeName"
    placeholder="My store"
    details="Shown to customers at checkout."
  ></s-text-field>
  <s-text-field label="Discount code" value="SUMMER" prefix="#" suffix="active"></s-text-field>
  <s-text-field label="Handle" value="my store" error="A handle cannot contain spaces."></s-text-field>
  <s-text-field label="Search" labelAccessibilityVisibility="exclusive" placeholder="The label is hidden, but still read aloud"></s-text-field>
</s-stack>
```

### Text area: `<s-text-area>`

Several lines of text. `rows` sets the starting height.

```html
<s-text-area
  label="Description"
  name="description"
  rows="4"
  maxLength="500"
  details="Up to 500 characters."
></s-text-area>
```

### Email field: `<s-email-field>`

An email address, with the right keyboard on mobile and browser autofill.

```html
<s-email-field label="Contact email" name="email" placeholder="you@example.com" autocomplete="email"></s-email-field>
```

### Password field: `<s-password-field>`

A secret value, hidden as it is typed.

```html
<s-password-field label="API secret" name="secret" details="Stored encrypted."></s-password-field>
```

### Number field: `<s-number-field>`

A number with optional limits and step.

```html
<s-number-field label="Quantity" name="quantity" value="1" min="0" max="100" step="1" suffix="units"></s-number-field>
```

### Money field: `<s-money-field>`

An amount of money. The currency follows the shop unless you name one.

```html
<s-money-field label="Price" name="price" value="19.99" currencyCode="USD" min="0"></s-money-field>
```

### URL field: `<s-url-field>`

A web address.

```html
<s-url-field label="Website" name="website" placeholder="https://example.com"></s-url-field>
```

### Search field: `<s-search-field>`

A text field for searching, with a search icon and a clear button built in.

```html
<s-search-field label="Search products" labelAccessibilityVisibility="exclusive" placeholder="Search products"></s-search-field>
```

### Select: `<s-select>`

One choice from a list. Group long lists with s-option-group.

```html
<s-select label="Country" name="country" details="Used for tax calculation.">
  <s-option-group label="North America">
    <s-option value="ca">Canada</s-option>
    <s-option value="us" selected>United States</s-option>
  </s-option-group>
  <s-option-group label="Asia">
    <s-option value="in">India</s-option>
    <s-option value="jp">Japan</s-option>
  </s-option-group>
</s-select>
```

### Checkbox: `<s-checkbox>`

A choice that is saved with the rest of the form. For a setting that applies at once, use a switch.

```html
<s-stack gap="small-200">
  <s-checkbox label="Send order confirmations" name="confirmations" checked></s-checkbox>
  <s-checkbox label="Send marketing emails" name="marketing" details="At most once a week."></s-checkbox>
  <s-checkbox label="Accept the terms" name="terms" error="You must accept the terms."></s-checkbox>
</s-stack>
```

### Switch: `<s-switch>`

Turns a setting on or off, taking effect immediately.

```html
<s-stack gap="small-200">
  <s-switch label="Enable notifications" name="notifications" checked></s-switch>
  <s-switch label="Test mode" name="testMode" details="Orders placed in test mode are not charged."></s-switch>
</s-stack>
```

### Choice list: `<s-choice-list>`

Radio buttons by default; add `multiple` for checkboxes. Read the result from its `values`.

```html
<s-stack gap="base">
  <s-choice-list label="Shipping speed" name="speed">
    <s-choice value="standard" selected>Standard</s-choice>
    <s-choice value="express">Express</s-choice>
    <s-choice value="overnight">Overnight</s-choice>
  </s-choice-list>
  <s-choice-list label="Sales channels" name="channels" multiple>
    <s-choice value="online" selected>Online store</s-choice>
    <s-choice value="pos">Point of sale</s-choice>
  </s-choice-list>
</s-stack>
```

### Color field: `<s-color-field>`

A colour typed as a value, with a swatch that opens a picker.

```html
<s-color-field label="Brand colour" name="brand" value="#008060"></s-color-field>
```

### Color picker: `<s-color-picker>`

The picker on its own. Add `alpha` to allow transparency.

```html
<s-color-picker name="accent" value="#5C6AC4" alpha></s-color-picker>
```

### Date field: `<s-date-field>`

A date typed or picked from a calendar. Dates are YYYY-MM-DD; `disallowDays` blocks weekdays.

```html
<s-date-field
  label="Start date"
  name="startDate"
  value="2026-10-01"
  view="2026-10"
  disallowDays="saturday, sunday"
></s-date-field>
```

### Date picker: `<s-date-picker>`

An inline calendar for one date, several dates or a range. A range is written start--end.

```html
<s-date-picker name="range" type="range" view="2026-10" value="2026-10-05--2026-10-12"></s-date-picker>
```

### Drop zone: `<s-drop-zone>`

File upload by drag and drop or by browsing. The chosen files are on its `files` property.

```html
<s-drop-zone
  label="Product images"
  name="images"
  accept=".jpg,.png,.webp"
  accessibilityLabel="Upload product images as jpg, png or webp"
  multiple
></s-drop-zone>
```

## Layout and structure

### Page: `<s-page>`

The frame of every page: the title bar, its actions, and the sections below. Keep sections as direct children, or the page cannot space them.

```html
<s-page heading="Products" inlineSize="base">
  <s-link slot="breadcrumb-actions" href="/">Dashboard</s-link>
  <s-button slot="primary-action" variant="primary">Add product</s-button>
  <s-button slot="secondary-actions">Import</s-button>

  <s-section heading="All products">...</s-section>

  <s-section slot="aside" heading="Summary">...</s-section>
</s-page>

<!-- inlineSize: "small" for forms, "base" by default, "large" for tables -->
```

### Section: `<s-section>`

A card with an optional heading. Nested sections step the heading level down automatically.

```html
<s-section heading="Shipping">
  <s-paragraph>Where and how you deliver.</s-paragraph>

  <s-section heading="Zones">
    <s-paragraph>A nested section gets a smaller heading.</s-paragraph>
  </s-section>
</s-section>

<!-- Edge to edge, for a table or an image -->
<s-section padding="none">...</s-section>
```

### Box: `<s-box>`

A container with padding, border and background. Spacing uses the Polaris scale, from small-500 to large-500.

```html
<s-stack gap="base">
  <s-box padding="base" border="base" borderRadius="base">
    Border, radius and base padding.
  </s-box>
  <s-box padding="large-200" background="subdued" borderRadius="large">
    Subdued background and more padding.
  </s-box>
  <s-box padding="base" background="strong" borderRadius="base">
    Strong background.
  </s-box>
</s-stack>
```

### Stack: `<s-stack>`

Children in a column, or a row with direction="inline". A row wraps when it runs out of room.

```html
<s-stack gap="base">
  <s-stack direction="inline" gap="small-200" alignItems="center">
    <s-badge tone="success">Active</s-badge>
    <s-text>In a row, centred vertically</s-text>
  </s-stack>
  <s-stack direction="inline" justifyContent="space-between" alignItems="center">
    <s-heading>Pushed apart</s-heading>
    <s-button>Edit</s-button>
  </s-stack>
</s-stack>
```

### Grid: `<s-grid>`

Columns. Make them respond to the width available with a container query in the value.

```html
<s-query-container>
  <s-grid gridTemplateColumns="@container (inline-size <= 500px) 1fr, 1fr 1fr 1fr" gap="base">
    <s-box padding="base" border="base" borderRadius="base">One</s-box>
    <s-box padding="base" border="base" borderRadius="base">Two</s-box>
    <s-box padding="base" border="base" borderRadius="base">Three</s-box>
  </s-grid>
</s-query-container>
```

### Query container: `<s-query-container>`

Marks the element that container queries measure. Values then change with its width, not the window's.

```html
<s-query-container>
  <s-box
    padding="@container (inline-size > 500px) large-300, base"
    background="subdued"
    borderRadius="base"
  >
    More padding once this box is wider than 500px.
  </s-box>
</s-query-container>
```

### Divider: `<s-divider>`

A line between groups of content.

```html
<s-stack gap="base">
  <s-text>Above</s-text>
  <s-divider></s-divider>
  <s-text>Below</s-text>
  <s-divider color="strong"></s-divider>
</s-stack>
```

### Table: `<s-table>`

Rows and columns of data. Put it in a section with padding="none". For paging, add `paginate` and listen for nextpage and previouspage.

```html
<s-table paginate hasNextPage>
  <s-table-header-row>
    <s-table-header>Product</s-table-header>
    <s-table-header>Status</s-table-header>
    <s-table-header format="numeric">Stock</s-table-header>
  </s-table-header-row>
  <s-table-body>
    <s-table-row>
      <s-table-cell>Cotton T-shirt</s-table-cell>
      <s-table-cell><s-badge tone="success">Active</s-badge></s-table-cell>
      <s-table-cell>128</s-table-cell>
    </s-table-row>
    <s-table-row>
      <s-table-cell>Canvas tote</s-table-cell>
      <s-table-cell><s-badge>Draft</s-badge></s-table-cell>
      <s-table-cell>0</s-table-cell>
    </s-table-row>
  </s-table-body>
</s-table>
```

### Ordered list: `<s-ordered-list>`

Numbered steps, where the order matters.

```html
<s-ordered-list>
  <s-list-item>Create the app</s-list-item>
  <s-list-item>Install it on a store</s-list-item>
  <s-list-item>Open it from the admin</s-list-item>
</s-ordered-list>
```

### Unordered list: `<s-unordered-list>`

Bullet points, where the order does not matter.

```html
<s-unordered-list>
  <s-list-item>Runs on Firebase</s-list-item>
  <s-list-item>No build step</s-list-item>
  <s-list-item>Scales to zero</s-list-item>
</s-unordered-list>
```

## Media and visuals

### Avatar: `<s-avatar>`

A person or a business, as a picture or as initials.

```html
<s-stack direction="inline" gap="base" alignItems="center">
  <s-avatar initials="JD" alt="Jane Doe" size="small"></s-avatar>
  <s-avatar initials="JD" alt="Jane Doe"></s-avatar>
  <s-avatar initials="JD" alt="Jane Doe" size="large"></s-avatar>
</s-stack>
```

### Icon: `<s-icon>`

An icon from the Polaris set, named with `type`. The same names work as `icon` on a button or badge.

```html
<s-stack direction="inline" gap="base">
  <s-icon type="home"></s-icon>
  <s-icon type="order"></s-icon>
  <s-icon type="product"></s-icon>
  <s-icon type="settings"></s-icon>
  <s-icon type="search"></s-icon>
  <s-icon type="check-circle" tone="success"></s-icon>
  <s-icon type="alert-triangle" tone="warning"></s-icon>
  <s-icon type="info" tone="info"></s-icon>
</s-stack>
```

### Image: `<s-image>`

A picture that keeps its shape while it loads. Always give it alt text.

```html
<s-box inlineSize="240px">
  <s-image
    src="https://cdn.shopify.com/static/sample-product/House-Plant1.png"
    alt="A house plant in a pot"
    aspectRatio="16/9"
    objectFit="cover"
    borderRadius="base"
    loading="lazy"
  ></s-image>
</s-box>
```

### Thumbnail: `<s-thumbnail>`

A small square image for a row in a list. Without a src it shows a placeholder.

```html
<s-stack direction="inline" gap="base" alignItems="center">
  <s-thumbnail alt="No image yet" size="small"></s-thumbnail>
  <s-thumbnail alt="Product" src="https://cdn.shopify.com/static/images/polaris/thumbnail-wc_src.jpg"></s-thumbnail>
  <s-thumbnail alt="Product" src="https://cdn.shopify.com/static/images/polaris/thumbnail-wc_src.jpg" size="large"></s-thumbnail>
</s-stack>
```

## Overlays

### Modal: `<s-modal>`

Content over the page, for a confirmation or a short form. Any button opens it with commandFor, and closes it with command="--hide".

```html
<s-button commandFor="demo-modal">Delete product</s-button>

<s-modal id="demo-modal" heading="Delete this product?">
  <s-paragraph>This cannot be undone.</s-paragraph>

  <s-button slot="secondary-actions" commandFor="demo-modal" command="--hide">Cancel</s-button>
  <s-button slot="primary-action" variant="primary" tone="critical" commandFor="demo-modal" command="--hide">
    Delete
  </s-button>
</s-modal>

<!-- From JavaScript: document.getElementById("demo-modal").showOverlay() -->
```

### Popover: `<s-popover>`

A small panel anchored to the button that opens it.

```html
<s-button commandFor="demo-popover">Filter</s-button>

<s-popover id="demo-popover">
  <s-box padding="base">
    <s-choice-list label="Status" name="status">
      <s-choice value="active" selected>Active</s-choice>
      <s-choice value="draft">Draft</s-choice>
    </s-choice-list>
  </s-box>
</s-popover>
```

## Typography and content

### Heading: `<s-heading>`

A title for a block of content. The level follows how deeply it is nested in sections; fontSize only changes how it looks.

```html
<s-stack gap="small-200">
  <s-heading fontSize="large-400">large-400</s-heading>
  <s-heading fontSize="large-300">large-300</s-heading>
  <s-heading fontSize="large-200">large-200</s-heading>
  <s-heading fontSize="large">large</s-heading>
  <s-heading>base</s-heading>
  <s-heading fontSize="small">small</s-heading>
</s-stack>
```

### Paragraph: `<s-paragraph>`

A block of text. `lineClamp` cuts it off after a number of lines.

```html
<s-stack gap="small-200">
  <s-paragraph>A paragraph sits on its own line and leaves space before the next.</s-paragraph>
  <s-paragraph color="subdued">Subdued, for supporting detail.</s-paragraph>
  <s-paragraph tone="critical">Critical, for an error.</s-paragraph>
  <s-paragraph lineClamp="1">
    Clamped to one line, so a long description is cut short with an ellipsis rather than pushing the layout around.
  </s-paragraph>
</s-stack>
```

### Text: `<s-text>`

Text inside a line. `color` is base or subdued; meaning such as success or critical is a `tone`.

```html
<s-stack gap="small-200">
  <s-text>Default</s-text>
  <s-text type="strong">Strong</s-text>
  <s-text fontWeight="semibold">Semibold</s-text>
  <s-text color="subdued">Subdued</s-text>
  <s-text tone="success">Success</s-text>
  <s-text tone="critical">Critical</s-text>
  <s-text fontSize="small">Small</s-text>
  <s-text fontSize="large">Large</s-text>
</s-stack>
```

### Number: `<s-number>`

A figure set in tabular numerals, so a column of them lines up.

```html
<s-stack gap="small-100">
  <s-number>1,204</s-number>
  <s-number>98</s-number>
  <s-number tone="success" fontWeight="semibold">17,660</s-number>
</s-stack>
```

### Chip: `<s-chip>`

A label for a tag or a category. Unlike a clickable chip, it does nothing when pressed.

```html
<s-stack direction="inline" gap="small-200">
  <s-chip>Summer</s-chip>
  <s-chip color="strong">Featured</s-chip>
  <s-chip><s-icon slot="graphic" type="product"></s-icon>Apparel</s-chip>
</s-stack>
```

### Tooltip: `<s-tooltip>`

A hint shown on hover or focus. The element it describes names it with interestFor.

```html
<s-tooltip id="demo-tooltip">Copy the key to your clipboard</s-tooltip>
<s-button interestFor="demo-tooltip" icon="clipboard" accessibilityLabel="Copy">Copy</s-button>
```
