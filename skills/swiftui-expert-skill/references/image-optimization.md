# SwiftUI Image Optimization Reference

## Table of Contents

- [AsyncImage Best Practices](#asyncimage-best-practices)
- [Image Decoding and Downsampling (Optional Optimization)](#image-decoding-and-downsampling-optional-optimization)
- [UIImage Loading and Memory](#uiimage-loading-and-memory)
- [SF Symbols](#sf-symbols)
- [Summary Checklist](#summary-checklist)

## AsyncImage Best Practices

### Basic AsyncImage with Phase Handling

```swift
// Good - handles loading and error states
AsyncImage(url: imageURL) { phase in
    switch phase {
    case .empty:
        ProgressView()
    case .success(let image):
        image
            .resizable()
            .aspectRatio(contentMode: .fit)
    case .failure:
        Image(systemName: "photo")
            .foregroundStyle(.secondary)
    @unknown default:
        EmptyView()
    }
}
.frame(width: 200, height: 200)
```

For custom placeholders, replace `ProgressView()` in the `.empty` case with your placeholder view. Add `.transition(.opacity)` to the success case and `.animation(.easeInOut, value: imageURL)` to the container for fade-in transitions.

## Image Decoding and Downsampling (Optional Optimization)

**When you encounter `UIImage(data:)` usage, consider suggesting image downsampling as a potential performance improvement**, especially for large images in lists or grids.

### Current Pattern That Could Be Optimized

```swift
// Current pattern - decodes full image on main thread
// Unsafe - force unwrap can crash if imageData is invalid
Image(uiImage: UIImage(data: imageData)!)
    .resizable()
    .aspectRatio(contentMode: .fit)
    .frame(width: 200, height: 200)
```

### Suggested Optimization Pattern

```swift
// Suggested optimization - decode and downsample off main thread
struct OptimizedImageView: View {
    let imageData: Data
    let targetSize: CGSize
    @State private var processedImage: UIImage?

    var body: some View {
        Group {
            if let processedImage {
                Image(uiImage: processedImage)
                    .resizable()
                    .aspectRatio(contentMode: .fit)
            } else {
                ProgressView()
            }
        }
        .task {
            processedImage = await decodeAndDownsample(imageData, targetSize: targetSize)
        }
    }

    private func decodeAndDownsample(_ data: Data, targetSize: CGSize) async -> UIImage? {
        await Task.detached {
            guard let source = CGImageSourceCreateWithData(data as CFData, nil) else {
                return nil
            }

            let options: [CFString: Any] = [
                kCGImageSourceThumbnailMaxPixelSize: max(targetSize.width, targetSize.height),
                kCGImageSourceCreateThumbnailFromImageAlways: true,
                kCGImageSourceCreateThumbnailWithTransform: true
            ]

            guard let cgImage = CGImageSourceCreateThumbnailAtIndex(source, 0, options as CFDictionary) else {
                return nil
            }

            return UIImage(cgImage: cgImage)
        }.value
    }
}

// Usage
OptimizedImageView(
    imageData: imageData,
    targetSize: CGSize(width: 200, height: 200)
)
```

### Reusable Downsampling Actor

For production use, wrap the logic in an `actor` with scale-aware sizing and cache-disabled source options:

```swift
actor ImageProcessor {
    func downsample(data: Data, targetSize: CGSize) -> UIImage? {
        let scale = await UIScreen.main.scale
        let maxPixel = max(targetSize.width, targetSize.height) * scale
        let sourceOptions: [CFString: Any] = [kCGImageSourceShouldCache: false]
        guard let source = CGImageSourceCreateWithData(data as CFData, sourceOptions as CFDictionary) else { return nil }
        let downsampleOptions: [CFString: Any] = [
            kCGImageSourceCreateThumbnailFromImageAlways: true,
            kCGImageSourceThumbnailMaxPixelSize: maxPixel,
            kCGImageSourceCreateThumbnailWithTransform: true,
            kCGImageSourceShouldCacheImmediately: true
        ]
        guard let cgImage = CGImageSourceCreateThumbnailAtIndex(source, 0, downsampleOptions as CFDictionary) else { return nil }
        return UIImage(cgImage: cgImage)
    }
}
```

Key details: `kCGImageSourceShouldCache: false` on the source prevents the full-resolution image from being cached in memory. Multiplying `targetSize` by `UIScreen.main.scale` ensures the thumbnail is sharp on Retina displays. `kCGImageSourceShouldCacheImmediately: true` on the thumbnail forces decoding at creation time rather than at first render.

### When to Suggest This Optimization

Mention this optimization when you see `UIImage(data:)` usage, particularly in:
- Scrollable content (List, ScrollView with LazyVStack/LazyHStack)
- Grid layouts with many images
- Image galleries or carousels
- Any scenario where large images are displayed at smaller sizes

**Don't automatically apply it**—present it as an optional improvement for performance-sensitive scenarios.

## UIImage Loading and Memory

### UIImage(named:) Caches in System Cache

`UIImage(named:)` adds images to the system cache, which can cause memory spikes when loading many images (e.g., in a slider or gallery). For single-use or frequently-rotated images, use `UIImage(contentsOfFile:)` to bypass the cache:

```swift
// Caches in system cache -- memory builds up
let image = UIImage(named: "Wallpapers/image_001.jpg")

// No system caching -- memory stays flat
guard let path = Bundle.main.path(forResource: "Wallpapers/image_001.jpg", ofType: nil) else { return nil }
let image = UIImage(contentsOfFile: path)
```

### NSCache for Controlled Image Caching

When image processing (resizing, filtering) is needed, use `NSCache` with a `countLimit` to bound memory instead of relying on system caching:

```swift
struct ImageCache {
    private let cache = NSCache<NSString, UIImage>()

    init(countLimit: Int = 50) {
        cache.countLimit = countLimit
    }

    subscript(key: String) -> UIImage? {
        get { cache.object(forKey: key as NSString) }
        nonmutating set {
            if let newValue {
                cache.setObject(newValue, forKey: key as NSString)
            } else {
                cache.removeObject(forKey: key as NSString)
            }
        }
    }
}
```

## SF Symbols

```swift
Image(systemName: "star.fill")
    .foregroundStyle(.yellow)
    .symbolRenderingMode(.multicolor)     // or .hierarchical, .palette, .monochrome

// Animated symbols (iOS 17+)
Image(systemName: "antenna.radiowaves.left.and.right")
    .symbolEffect(.variableColor)
```

Variants are available via naming convention: `star.circle.fill`, `star.square.fill`, `folder.badge.plus`.

## Summary Checklist

- [ ] Use `AsyncImage` with proper phase handling
- [ ] Handle empty, success, and failure states
- [ ] Consider downsampling for `UIImage(data:)` in performance-sensitive scenarios
- [ ] Decode and downsample images off the main thread
- [ ] Use appropriate target sizes for downsampling
- [ ] Consider image caching for frequently accessed images
- [ ] Use SF Symbols with appropriate rendering modes

**Performance Note**: Image downsampling is an optional optimization. Only suggest it when you encounter `UIImage(data:)` usage in performance-sensitive contexts like scrollable lists or grids.
