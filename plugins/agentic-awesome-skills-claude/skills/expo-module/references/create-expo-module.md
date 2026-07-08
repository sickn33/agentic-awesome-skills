# create-expo-module

Use `create-expo-module` to scaffold new Expo modules and `create-expo-module add-platform-support` to extend existing Expo modules.

Prefer `create-expo-module` over manually creating module files and directories. In most cases, the right move is to generate the scaffold first and then build on top of it.

## Choose the Module Type First

### Local module

Use a local module when the native code only belongs to one Expo app.

- lives inside the app
- uses the app's dependencies and tooling
- does not create an example app
- respects `package.json:expo.autolinking.nativeModulesDir`, or falls back to `modules/`

### Standalone module

Use a standalone module when the module should be reusable across apps, live in a monorepo package, or be published to npm.

- has its own `package.json`
- installs its own dependencies
- builds TypeScript during scaffolding
- usually creates an `example` app unless `--no-example` is passed
- may initialize a Git repo if not already inside one

When creating a standalone module, default to keeping the example app. Only skip it when the user explicitly asks for `--no-example` or clearly does not want the example project.

## Recommended Commands

### Local module

Use an explicit slug or path.

```bash
npx create-expo-module@latest key-value-store --local --platform apple android --features Function AsyncFunction
```

If you need deterministic non-interactive output, pass the slug or path explicitly and then pass the rest of the options:

```bash
EXPO_NONINTERACTIVE=1 npx create-expo-module@latest key-value-store \
  --local \
  --name KeyValueStore \
  --package expo.modules.keyvaluestore \
  --platform apple android \
  --features Function AsyncFunction
```

Important quirk:

- in non-interactive local scaffolding, omitting the positional slug causes the CLI to fall back to `my-module`
- `--name` changes the native module class name, not the directory name

### Standalone module

```bash
npx create-expo-module@latest expo-key-value-store --platform apple android --features Function AsyncFunction
```

## Creation Options

These are the module creation options exposed by the CLI:

| Option                        | Applies to        | Notes                                                                                                     |
| ----------------------------- | ----------------- | --------------------------------------------------------------------------------------------------------- |
| `[path]`                      | local, standalone | Positional slug or target path. Use this explicitly for stable local scaffolding in non-interactive mode. |
| `--local`                     | local             | Create a local module inside the current Expo project.                                                    |
| `--platform <platforms...>`   | local, standalone | Valid values: `apple`, `android`, `web`.                                                                  |
| `--features <features...>`    | local, standalone | Pick generated feature examples. Use `all` to include everything.                                         |
| `--full-example`              | local, standalone | Equivalent to `--features all`.                                                                           |
| `--barrel`                    | local             | Generate a local `index.ts` barrel. Ignored for standalone modules.                                       |
| `--source <source_dir>`       | local, standalone | Use a local `expo-module-template` directory instead of downloading from npm.                             |
| `--name <name>`               | local, standalone | Native module name, for example `KeyValueStore`.                                                          |
| `--description <description>` | standalone        | Package description.                                                                                      |
| `--package <package>`         | local, standalone | Android package name, for example `expo.modules.keyvaluestore`.                                           |
| `--author-name <name>`        | standalone        | Package author name.                                                                                      |
| `--author-email <email>`      | standalone        | Package author email.                                                                                     |
| `--author-url <url>`          | standalone        | Package author profile URL.                                                                               |
| `--repo <url>`                | standalone        | Package repository URL.                                                                                   |
| `--license <license>`         | standalone        | Package license identifier.                                                                               |
| `--module-version <version>`  | standalone        | Initial package version.                                                                                  |
| `--package-manager <manager>` | standalone        | One of `npm`, `pnpm`, `yarn`, `bun`.                                                                      |
| `--with-readme`               | standalone        | Keep `README.md` in the generated package.                                                                |
| `--with-changelog`            | standalone        | Keep `CHANGELOG.md` in the generated package.                                                             |
| `--no-example`                | standalone        | Skip creating the example app.                                                                            |

Notes:

- `--description`, author flags, `--repo`, `--license`, and `--module-version` only affect standalone modules because local modules do not have a standalone package manifest.
- `--with-readme`, `--with-changelog`, `--no-example`, and `--package-manager` are standalone-only concerns.
- `--barrel` only affects local modules.
- `--name` changes the native module class name. It does not rename the local module directory.

## Platforms

Valid values are:

- `apple`
- `android`
- `web`

Behavior to remember:

- standalone modules default to all platforms when `--platform` is omitted in non-interactive mode
- local modules also default to all platforms in non-interactive mode
- interactive local scaffolding preselects platforms from `app.json:expo.platforms` when available, mapping `ios` to `apple`
- invalid platform values are ignored with a warning; if all provided values are invalid, the CLI falls back to all platforms

If you do not want web support, omit `web` during scaffolding instead of removing it later.

## Feature Examples

Feature examples are generated starter snippets, not capability restrictions. They are small working examples of common Expo Modules API patterns.

Available values:

- `Constant`
- `Function`
- `AsyncFunction`
- `Event`
- `View`
- `ViewEvent`
- `SharedObject`

Important behaviors:

- no features selected means a minimal module
- in interactive mode, feature examples start unselected
- in non-interactive mode, no features are included unless `--features` or `--full-example` is passed
- `--full-example` is equivalent to `--features all`
- `ViewEvent` automatically includes `View`

Use `View` only when the module actually renders UI. For native-only modules, do not scaffold the view files unless you plan to use them.

## Local Module Quirks

- local modules do not generate an `index.ts` barrel by default
- use `--barrel` only if you want a root barrel file
- local modules skip dependency installation and do not create an `example` app
- local modules do not have a local `package.json`; they rely on the host app

If `--barrel` is not used, the CLI's follow-up instructions point to direct imports from the module's `src/` files.

## Standalone Module Quirks

- `--package-manager` is only relevant for standalone modules
- if omitted, the CLI detects the package manager from the user agent or available package managers
- the scaffold builds TypeScript after installing dependencies
- the `example` app is created only when examples are enabled; `--no-example` skips it
- `--with-readme` and `--with-changelog` opt into those files

The generated standalone scripts include `build`, `clean`, `test`, `prepare`, `open:ios`, and `open:android`.

## add-platform-support

Use this subcommand when an existing Expo module needs another supported platform.

Interactive usage from the module root:

```bash
npx create-expo-module@latest add-platform-support
```

Explicit usage:

```bash
npx create-expo-module@latest add-platform-support --platform android
```

You can also pass the module path:

```bash
npx create-expo-module@latest add-platform-support ./packages/expo-key-value-store --platform web
```

Important behaviors:

- supported values are `apple`, `android`, and `web`
- in non-interactive mode, `--platform` is required
- the command only adds platforms that are not already present in `expo-module.config.json`
- it refuses to overwrite existing `android/` or `ios/` directories
- for native modules, it only works with modules that use the Expo Modules API DSL
- older module formats are not supported

### Feature detection

`add-platform-support` tries to detect the existing module's feature examples from the native module definition. This is best effort.

Use `--features` to override the detected feature examples when:

- the module is unusual
- the module uses generated code
- the definition is spread across multiple files
- the generated files do not match the existing module's shape

If no features are detected or provided, the command creates a minimal scaffold for the new platform.

## Environment Variables

- `EXPO_BETA`: use the next template version
- `EXPO_DEBUG`: enable debug logs
- `EXPO_NO_TELEMETRY`: disable telemetry
- `EXPO_NONINTERACTIVE`: force non-interactive mode
- `CI`: same as `EXPO_NONINTERACTIVE`, used in CI environments
