---
name: use-dom
description: Use Expo DOM components to run web code in a webview on native and as-is on web. Migrate web code to native incrementally.
risk: unknown
source: https://github.com/expo/skills/tree/main/plugins/expo/skills/use-dom
source_repo: expo/skills
source_type: official
date_added: 2026-07-01
license: MIT
license_source: https://github.com/expo/skills/blob/main/LICENSE
---

## What are DOM Components?

DOM components allow web code to run verbatim in a webview on native platforms while rendering as-is on web. This enables using web-only libraries like `recharts`, `react-syntax-highlighter`, or any React web library in your Expo app without modification.

## When to Use DOM Components

Use DOM components when you need:

- **Web-only libraries** — Charts (recharts, chart.js), syntax highlighters, rich text editors, or any library that depends on DOM APIs
- **Migrating web code** — Bring existing React web components to native without rewriting
- **Complex HTML/CSS layouts** — When CSS features aren't available in React Native
- **iframes or embeds** — Embedding external content that requires a browser context
- **Canvas or WebGL** — Web graphics APIs not available natively

## When NOT to Use DOM Components

Avoid DOM components when:

- **Native performance is critical** — Webviews add overhead
- **Simple UI** — React Native components are more efficient for basic layouts
- **Deep native integration** — Use local modules instead for native APIs
- **Layout routes** — `_layout` files cannot be DOM components

## Basic DOM Component

Create a new file with the `'use dom';` directive at the top:

```tsx
// components/WebChart.tsx
"use dom";

export default function WebChart({
  data,
}: {
  data: number[];
  dom: import("expo/dom").DOMProps;
}) {
  return (
    <div style={{ padding: 20 }}>
      <h2>Chart Data</h2>
      <ul>
        {data.map((value, i) => (
          <li key={i}>{value}</li>
        ))}
      </ul>
    </div>
  );
}
```

## Rules for DOM Components

1. **Must have `'use dom';` directive** at the top of the file
2. **Single default export** — One React component per file
3. **Own file** — Cannot be defined inline or combined with native components
4. **Serializable props only** — Strings, numbers, booleans, arrays, plain objects
5. **Include CSS in the component file** — DOM components run in isolated context

## The `dom` Prop

Every DOM component receives a special `dom` prop for webview configuration. Always type it in your props:

```tsx
"use dom";

interface Props {
  content: string;
  dom: import("expo/dom").DOMProps;
}

export default function MyComponent({ content }: Props) {
  return <div>{content}</div>;
}
```

### Common `dom` Prop Options

```tsx
// Disable body scrolling
<DOMComponent dom={{ scrollEnabled: false }} />

// Flow under the notch (disable safe area insets)
<DOMComponent dom={{ contentInsetAdjustmentBehavior: "never" }} />

// Control size manually
<DOMComponent dom={{ style: { width: 300, height: 400 } }} />

// Combine options
<DOMComponent
  dom={{
    scrollEnabled: false,
    contentInsetAdjustmentBehavior: "never",
    style: { width: '100%', height: 500 }
  }}
/>
```

## Exposing Native Actions to the Webview

Pass async functions as props to expose native functionality to the DOM component:

```tsx
// app/index.tsx (native)
import { Alert } from "react-native";
import DOMComponent from "@/components/dom-component";

export default function Screen() {
  return (
    <DOMComponent
      showAlert={async (message: string) => {
        Alert.alert("From Web", message);
      }}
      saveData={async (data: { name: string; value: number }) => {
        // Save to native storage, database, etc.
        console.log("Saving:", data);
        return { success: true };
      }}
    />
  );
}
```

```tsx
// components/dom-component.tsx
"use dom";

interface Props {
  showAlert: (message: string) => Promise<void>;
  saveData: (data: {
    name: string;
    value: number;
  }) => Promise<{ success: boolean }>;
  dom?: import("expo/dom").DOMProps;
}

export default function DOMComponent({ showAlert, saveData }: Props) {
  const handleClick = async () => {
    await showAlert("Hello from the webview!");
    const result = await saveData({ name: "test", value: 42 });
    console.log("Save result:", result);
  };

  return <button onClick={handleClick}>Trigger Native Action</button>;
}
```

## Using Web Libraries

DOM components can use any web library:

```tsx
// components/syntax-highlight.tsx
"use dom";

import SyntaxHighlighter from "react-syntax-highlighter";
import { docco } from "react-syntax-highlighter/dist/esm/styles/hljs";

interface Props {
  code: string;
  language: string;
  dom?: import("expo/dom").DOMProps;
}

export default function SyntaxHighlight({ code, language }: Props) {
  return (
    <SyntaxHighlighter language={language} style={docco}>
      {code}
    </SyntaxHighlighter>
  );
}
```

```tsx
// components/chart.tsx
"use dom";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

interface Props {
  data: Array<{ name: string; value: number }>;
  dom: import("expo/dom").DOMProps;
}

export default function Chart({ data }: Props) {
  return (
    <LineChart width={400} height={300} data={data}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="name" />
      <YAxis />
      <Tooltip />
      <Line type="monotone" dataKey="value" stroke="#8884d8" />
    </LineChart>
  );
}
```

## CSS in DOM Components

CSS imports must be in the DOM component file since they run in isolated context:

```tsx
// components/styled-component.tsx
"use dom";

import "@/styles.css"; // CSS file in same directory

export default function StyledComponent({
  dom,
}: {
  dom: import("expo/dom").DOMProps;
}) {
  return (
    <div className="container">
      <h1 className="title">Styled Content</h1>
    </div>
  );
}
```

Or use inline styles / CSS-in-JS:

```tsx
"use dom";

const styles = {
  container: {
    padding: 20,
    backgroundColor: "#f0f0f0",
  },
  title: {
    fontSize: 24,
    color: "#333",
  },
};

export default function StyledComponent({
  dom,
}: {
  dom: import("expo/dom").DOMProps;
}) {
  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Styled Content</h1>
    </div>
  );
}
```

## Expo Router in DOM Components

The expo-router `<Link />` component and router API work inside DOM components:

```tsx
"use dom";

import { Link, useRouter } from "expo-router";

export default function Navigation({
  dom,
}: {
  dom: import("expo/dom").DOMProps;
}) {
  const router = useRouter();

  return (
    <nav>
      <Link href="/about">About</Link>
      <button onClick={() => router.push("/settings")}>Settings</button>
    </nav>
  );
}
```

### Router APIs That Require Props

These hooks don't work directly in DOM components because they need synchronous access to native routing state:

- `useLocalSearchParams()`
- `useGlobalSearchParams()`
- `usePathname()`
- `useSegments()`
- `useRootNavigation()`
- `useRootNavigationState()`

**Solution:** Read these values in the native parent and pass as props:

```tsx
// app/[id].tsx (native)
import { useLocalSearchParams, usePathname } from "expo-router";
import DOMComponent from "@/components/dom-component";

export default function Screen() {
  const { id } = useLocalSearchParams();
  const pathname = usePathname();

  return <DOMComponent id={id as string} pathname={pathname} />;
}
```

```tsx
// components/dom-component.tsx
"use dom";

interface Props {
  id: string;
  pathname: string;
  dom?: import("expo/dom").DOMProps;
}

export default function DOMComponent({ id, pathname }: Props) {
  return (
    <div>
      <p>Current ID: {id}</p>
      <p>Current Path: {pathname}</p>
    </div>
  );
}
```

## Detecting DOM Environment

Check if code is running in a DOM component:

```tsx
"use dom";

import { IS_DOM } from "expo/dom";

export default function Component({
  dom,
}: {
  dom?: import("expo/dom").DOMProps;
}) {
  return <div>{IS_DOM ? "Running in DOM component" : "Running natively"}</div>;
}
```

## Assets

Prefer requiring assets instead of using the public directory:

```tsx
"use dom";

// Good - bundled with the component
const logo = require("../assets/logo.png");

export default function Component({
  dom,
}: {
  dom: import("expo/dom").DOMProps;
}) {
  return <img src={logo} alt="Logo" />;
}
```

## Usage from Native Components

Import and use DOM components like regular components:

```tsx
// app/index.tsx
import { View, Text } from "react-native";
import WebChart from "@/components/web-chart";
import CodeBlock from "@/components/code-block";

export default function HomeScreen() {
  return (
    <View style={{ flex: 1 }}>
      <Text>Native content above</Text>

      <WebChart data={[10, 20, 30, 40, 50]} dom={{ style: { height: 300 } }} />

      <CodeBlock
        code="const x = 1;"
        language="javascript"
        dom={{ scrollEnabled: true }}
      />

      <Text>Native content below</Text>
    </View>
  );
}
```

## Platform Behavior

| Platform | Behavior                            |
| -------- | ----------------------------------- |
| iOS      | Rendered in WKWebView               |
| Android  | Rendered in WebView                 |
| Web      | Rendered as-is (no webview wrapper) |

On web, the `dom` prop is ignored since no webview is needed.

## Tips

- DOM components hot reload during development
- Keep DOM components focused — don't put entire screens in webviews
- Use native components for navigation chrome, DOM components for specialized content
- Test on all platforms — web rendering may differ slightly from native webviews
- Large DOM components may impact performance — profile if needed
- The webview has its own JavaScript context — cannot directly share state with native

## Limitations

- Use this skill only when the task clearly matches its upstream product or API scope.
- Verify commands, API behavior, pricing, quotas, credentials, and deployment effects against current official documentation before making changes.
- Do not treat generated examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
