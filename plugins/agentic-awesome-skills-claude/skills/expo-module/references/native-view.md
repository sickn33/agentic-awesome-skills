# Native View Reference

Native views let you render platform UI components (UIView on iOS, Android View on Android) as React components.

## Defining a View

**Swift:**

```swift
public class MyViewModule: Module {
  public func definition() -> ModuleDefinition {
    Name("MyView")

    View(MyNativeView.self) {
      Prop("title") { (view: MyNativeView, title: String) in
        view.titleLabel.text = title
      }

      Events("onPress", "onLoad")

      AsyncFunction("reset") { (view: MyNativeView) in
        view.reset()
      }
    }
  }
}

class MyNativeView: ExpoView {
  let titleLabel = UILabel()

  required init(appContext: AppContext) {
    super.init(appContext: appContext)
    clipsToBounds = true
    addSubview(titleLabel)
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    titleLabel.frame = bounds
  }
}
```

**Kotlin:**

```kotlin
class MyViewModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("MyView")

    View(MyNativeView::class) {
      Prop("title") { view: MyNativeView, title: String ->
        view.titleView.text = title
      }

      Events("onPress", "onLoad")

      AsyncFunction("reset") { view: MyNativeView ->
        view.reset()
      }
    }
  }
}

class MyNativeView(context: Context, appContext: AppContext) : ExpoView(context, appContext) {
  val titleView = TextView(context).also {
    addView(it, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT))
  }
}
```

**TypeScript:**

```typescript
import { requireNativeView } from "expo";

export type MyViewProps = {
  title?: string;
  onPress?: (event: { nativeEvent: { x: number; y: number } }) => void;
  onLoad?: () => void;
} & ViewProps;

const NativeView = requireNativeView<MyViewProps>("MyView");

export function MyView(props: MyViewProps) {
  return <NativeView {...props} />;
}
```

## View Event Dispatching

**Swift:**

```swift
class MyNativeView: ExpoView {
  let onPress = EventDispatcher()

  func handleTap(at point: CGPoint) {
    onPress(["x": point.x, "y": point.y])
  }
}
```

**Kotlin:**

```kotlin
class MyNativeView(context: Context, appContext: AppContext) : ExpoView(context, appContext) {
  private val onPress by EventDispatcher()

  fun handleTap(x: Float, y: Float) {
    onPress(mapOf("x" to x, "y" to y))
  }
}
```

## View Lifecycle

```swift
// Called after all props have been set
OnViewDidUpdateProps { (view: MyNativeView) in
  view.applyChanges()
}
```

```kotlin
// Android only - called when view is no longer used
OnViewDestroys { view: MyNativeView ->
  view.cleanup()
}
```

## AsyncFunction on Views

Functions defined inside `View` are accessible via React ref:

```typescript
const ref = useRef<MyView>(null);
// Call native function
await ref.current?.reset();
```

## PropGroup (Android)

Batch-register multiple props with shared setter logic:

```kotlin
View(MyNativeView::class) {
  PropGroup("border", "width" to Float::class, "color" to Int::class) { view, index, value ->
    when (index) {
      0 -> view.borderWidth = value as Float
      1 -> view.borderColor = value as Int
    }
  }
}
```

## GroupView (Android)

Enable view group functionality for managing child views:

```kotlin
View(MyContainerView::class) {
  GroupView {
    AddChildView { parent, child, index -> parent.addView(child, index) }
    GetChildCount { parent -> parent.childCount }
    GetChildViewAt { parent, index -> parent.getChildAt(index) }
    RemoveChildView { parent, child -> parent.removeView(child) }
    RemoveChildViewAt { parent, index -> parent.removeViewAt(index) }
  }
}
```
