# App Bridge

<!-- Generated from tools/reference/ by `npm run build:reference`. Do not edit. -->

Everything a Nitrogen page can ask of the Shopify admin. `<script src="https://cdn.shopify.com/shopifycloud/app-bridge.js">` in `web/*.html` puts it all on one global object, `shopify`, so there is nothing to import and no `createApp`. It only works inside the Shopify admin. Inside an app, each example runs from its App Bridge page (`web/apis.html`).

- **Authentication and data:** Config, Environment, ID token, Resource fetching, Scopes, User, App
- **Interface and interactions:** Toast, Loading, Modal, Navigation, Resource picker, Picker, Intents, Save bar, Reviews, Support, Tools
- **App Bridge elements:** App nav, Title bar, App window
- **Device and platform:** Print, Share, Scanner, POS, Web Vitals

## Authentication and data

### Config: `shopify.config`

What App Bridge knows about where it is running: the shop, the locale and your client id.

```js
console.log({
  shop: shopify.config.shop,
  locale: shopify.config.locale,
  apiKey: shopify.config.apiKey,
});
```

### Environment: `shopify.environment`

Whether the app is embedded, on Shopify Mobile, or in Point of Sale. Check it before offering something only one of them supports.

```js
const { embedded, mobile, pos } = shopify.environment;
console.log({ embedded, mobile, pos });
```

### ID token: `shopify.idToken()`

A short-lived token that proves to your backend who is calling. It lasts about a minute, so ask for one per request and never store it. `apiFetch()` in js/app.js does this for you.

```js
const token = await shopify.idToken();

const response = await fetch("/api/status", {
  headers: { Authorization: "Bearer " + token },
});
console.log(await response.json());
```

### Resource fetching: `fetch()`

App Bridge adds the ID token to every fetch to your own app, so a plain fetch is already authenticated. It can also call the Admin API straight from the page, with no backend, once direct API access is enabled in shopify.app.toml.

```js
// Your own backend: the token is attached for you
const mine = await fetch("/api/status");
console.log(await mine.json());

// The Admin API, directly. Needs in shopify.app.toml:
//   [access.admin]
//   embedded_app_direct_api_access = true
const admin = await fetch("shopify:admin/api/graphql.json", {
  method: "POST",
  body: JSON.stringify({ query: "{ shop { name } }" }),
});
console.log(await admin.json());
```

### Scopes: `shopify.scopes`

The access the shop has granted, and a way to ask for an optional scope only when a feature needs it. Optional scopes are declared in shopify.app.toml.

```js
const { granted, required, optional } = await shopify.scopes.query();
console.log({ granted, required, optional });

// Ask when the merchant reaches the feature that needs it:
//   const result = await shopify.scopes.request(["read_orders"]);
//   result.result === "granted-all" or "declined-all"
//
// Give one back:
//   await shopify.scopes.revoke(["read_orders"]);
```

### User: `shopify.user()`

The staff member using the app. Use it to greet them or to log who changed what; decide permissions on the backend, from the verified token.

```js
const user = await shopify.user();
console.log(user);
```

### App: `shopify.app`

Which of your app's extensions are active on this shop, such as a theme app block the merchant has yet to add.

```js
const extensions = await shopify.app.extensions();
console.log(extensions);
```

## Interface and interactions

### Toast: `shopify.toast`

A short message at the bottom of the screen that leaves on its own. Give it an action to offer an undo.

```js
shopify.toast.show("Product saved");

shopify.toast.show("Product archived", {
  duration: 5000,
  action: "Undo",
  onAction: () => shopify.toast.show("Restored"),
});

// For a failure
shopify.toast.show("Could not save", { isError: true });
```

### Loading: `shopify.loading()`

The admin's own loading bar, across the top of the page. Turn it on before a slow request and off when it ends.

```js
shopify.loading(true);
await new Promise((resolve) => setTimeout(resolve, 2000));
shopify.loading(false);
```

### Modal: `shopify.modal`

Opens or closes an s-modal by its id. A button with commandFor does the same without any JavaScript.

```html
<s-modal id="api-modal" heading="Opened from JavaScript">
  <s-paragraph>shopify.modal.show("api-modal") opened this.</s-paragraph>
  <s-button slot="primary-action" variant="primary" commandFor="api-modal" command="--hide">Done</s-button>
</s-modal>
```

```js
await shopify.modal.show("api-modal");

// await shopify.modal.hide("api-modal");
// await shopify.modal.toggle("api-modal");
```

### Navigation: `open()`

Relative links move around your app without reloading the admin. A shopify:// link with target="_top" leaves your app for a page of the admin.

```html
<s-stack direction="inline" gap="base">
  <s-link href="/settings">A page of this app</s-link>
  <s-link href="shopify://admin/products" target="_top">The admin's products</s-link>
  <s-link href="shopify://admin/orders" target="_top">The admin's orders</s-link>
</s-stack>
```

```js
// From JavaScript, inside the app
open("/settings", "_self");

// To a page of the admin:
//   open("shopify://admin/products", "_top");
```

### Resource picker: `shopify.resourcePicker()`

Shopify's own search-and-select dialog for products, variants and collections. It returns what the merchant chose, or nothing if they cancelled.

```js
const selected = await shopify.resourcePicker({
  type: "product", // or "variant", "collection"
  multiple: 3,     // true for any number, a number for a limit
  filter: { variants: false, draft: false },
});

console.log(selected ? selected.map((p) => ({ id: p.id, title: p.title })) : "Cancelled");
```

### Picker: `shopify.picker()`

The same dialog for your own data: templates, campaigns, anything that is not a Shopify resource.

```js
const picker = await shopify.picker({
  heading: "Choose a template",
  multiple: false,
  headers: [{ content: "Template" }, { content: "Uses", type: "number" }],
  items: [
    { id: "welcome", heading: "Welcome email", data: ["12"], badges: [{ content: "Live", tone: "success" }] },
    { id: "restock", heading: "Back in stock", data: ["3"] },
  ],
});

console.log(await picker.selected);
```

### Intents: `shopify.intents`

Hands the merchant to the admin's own screen for creating or editing something, then tells you how it ended.

```js
const activity = await shopify.intents.invoke("create:shopify/Collection");
const response = await activity.complete;

// response.code is "ok", "closed" or "error"
console.log(response);

// To edit an existing resource:
//   shopify.intents.invoke("edit:shopify/Product", { value: "gid://shopify/Product/123" });
```

### Save bar: `data-save-bar`

The admin's Save and Discard bar. Add data-save-bar to a form and it appears as soon as a field changes: Save submits the form, Discard resets it. The Settings page uses this.

```html
<form data-save-bar onsubmit="event.preventDefault(); shopify.toast.show('Saved');">
  <s-text-field label="Change me to show the save bar" name="demo" value="Hello"></s-text-field>
</form>
```

```html
<form data-save-bar data-discard-confirmation>
  <s-text-field label="Name" name="name"></s-text-field>
</form>

<script>
  const form = document.querySelector("form");
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    // save, then the bar goes away
  });
  form.addEventListener("reset", () => {
    // Discard was pressed
  });

  // Before navigating away yourself, let the merchant decide:
  //   await shopify.saveBar.leaveConfirmation();
</script>
```

### Reviews: `shopify.reviews`

Asks the merchant to review your app. Shopify limits how often it appears, so call it after something went well, and expect it to decline.

```js
const result = await shopify.reviews.request();

// result.success is false with a code such as "already-reviewed"
// or "annual-limit-reached" when Shopify chose not to show it
console.log(result);
```

### Support: `shopify.support`

Runs your code when the merchant asks for support from the admin, so you can open your own chat or help page.

```js
await shopify.support.registerHandler(() => {
  open("https://example.com/help", "_blank");
});
console.log("Registered. It runs when the merchant asks for support.");
```

### Tools: `shopify.tools`

Offers functions of your app to the admin's assistant, which can call them on the merchant's behalf while your app is open.

```js
shopify.tools.register("get_app_status", async () => {
  const response = await fetch("/api/status");
  return response.json();
});
console.log("Registered get_app_status");

// shopify.tools.unregister("get_app_status");
// shopify.tools.clear();
```

## App Bridge elements

### App nav: `<s-app-nav>`

Your app's links in the admin sidebar. The link with rel="home" sets the landing page and is left out of the menu. It is at the top of every page in web/.

```html
<s-app-nav>
  <s-link href="/" rel="home">Dashboard</s-link>
  <s-link href="/products">Products</s-link>
  <s-link href="/settings">Settings</s-link>
</s-app-nav>
```

### Title bar: `<s-page>`

The page title, breadcrumb and actions in the admin's own title bar. They are slots of s-page.

```html
<s-page heading="Edit product">
  <s-link slot="breadcrumb-actions" href="/products">Products</s-link>
  <s-badge slot="accessory" tone="warning">Draft</s-badge>
  <s-button slot="primary-action" variant="primary">Save</s-button>
  <s-button slot="secondary-actions">Duplicate</s-button>
  <s-button slot="secondary-actions" commandFor="more-actions">More actions</s-button>

  <s-menu id="more-actions">
    <s-button icon="view">Preview</s-button>
    <s-button icon="delete" tone="critical">Delete</s-button>
  </s-menu>
</s-page>
```

### App window: `<s-app-window>`

A full-screen window showing another page of your app, for an editor that needs the whole screen.

```html
<s-app-window id="api-app-window" src="/settings"></s-app-window>
<s-button commandFor="api-app-window" command="--show">Open settings full screen</s-button>
```

```html
<s-app-window id="editor" src="/settings"></s-app-window>

<s-button commandFor="editor" command="--show">Open</s-button>

<!-- From JavaScript -->
<script>
  document.getElementById("editor").show();
</script>
```

## Device and platform

### Print: `print()`

Opens the print dialog for the current page. On Shopify Mobile it uses the device's printing.

```js
print();
```

### Share: `navigator.share()`

The device's share sheet, on Shopify Mobile.

```js
try {
  await navigator.share({
    text: "Have a look at this",
    url: "https://" + shopify.config.shop,
  });
  console.log("Shared");
} catch (error) {
  console.log("Not shared: " + error.message);
}
```

### Scanner: `shopify.scanner`

Reads a barcode or QR code with the camera. Shopify Mobile and Point of Sale only.

```js
if (!shopify.environment.mobile && !shopify.environment.pos) {
  console.log("The scanner needs Shopify Mobile or Point of Sale");
  return;
}

const { data } = await shopify.scanner.capture();
console.log(data);
```

### POS: `shopify.pos`

The cart, the device and the location, when the app is open in Shopify Point of Sale.

```js
if (!shopify.environment.pos) {
  console.log("Open the app in Shopify Point of Sale to use this");
  return;
}

console.log(await shopify.pos.device());

// await shopify.pos.cart.addLineItem(40202439393345, 1);
// await shopify.pos.cart.applyCartDiscount("FixedAmount", "Staff discount", "10");
// await shopify.pos.cart.clear();
// await shopify.pos.close();
```

### Web Vitals: `shopify.webVitals`

The loading and responsiveness measurements Shopify takes of your app, so you can watch them yourself.

```js
await shopify.webVitals.onReport((report) => {
  // Send report.metrics wherever you keep measurements
  console.log(report.metrics);
});
console.log("Registered. Reports arrive as the page is measured.");
```
