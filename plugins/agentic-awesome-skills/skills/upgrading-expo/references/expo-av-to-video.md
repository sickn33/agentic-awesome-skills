# Migrating from expo-av to expo-video

## Imports

```tsx
// Before
import { Video, ResizeMode } from 'expo-av';

// After
import { useVideoPlayer, VideoView, VideoSource } from 'expo-video';
import { useEvent, useEventListener } from 'expo';
```

## Video Playback

### Before (expo-av)

```tsx
const videoRef = useRef<Video>(null);
const [status, setStatus] = useState({});

<Video
  ref={videoRef}
  source={{ uri: 'https://example.com/video.mp4' }}
  style={{ width: 350, height: 200 }}
  resizeMode={ResizeMode.CONTAIN}
  isLooping
  onPlaybackStatusUpdate={setStatus}
/>

// Control
videoRef.current?.playAsync();
videoRef.current?.pauseAsync();
```

### After (expo-video)

```tsx
const player = useVideoPlayer('https://example.com/video.mp4', player => {
  player.loop = true;
});

const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });

<VideoView
  player={player}
  style={{ width: 350, height: 200 }}
  contentFit="contain"
/>

// Control
player.play();
player.pause();
```

## Status Updates

### Before (expo-av)

```tsx
<Video
  onPlaybackStatusUpdate={status => {
    if (status.isLoaded) {
      console.log(status.positionMillis, status.durationMillis, status.isPlaying);
      if (status.didJustFinish) console.log('finished');
    }
  }}
/>
```

### After (expo-video)

```tsx
// Reactive state
const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });

// Side effects
useEventListener(player, 'playToEnd', () => console.log('finished'));

// Direct access
console.log(player.currentTime, player.duration, player.playing);
```

## Local Files

### Before (expo-av)

```tsx
<Video source={require('./video.mp4')} />
```

### After (expo-video)

```tsx
const player = useVideoPlayer({ assetId: require('./video.mp4') });
```

## Fullscreen and PiP

```tsx
<VideoView
  player={player}
  allowsFullscreen
  allowsPictureInPicture
  onFullscreenEnter={() => {}}
  onFullscreenExit={() => {}}
/>
```

For PiP and background playback, add to app.json:

```json
{
  "expo": {
    "plugins": [
      ["expo-video", { "supportsBackgroundPlayback": true, "supportsPictureInPicture": true }]
    ]
  }
}
```

## API Mapping

| expo-av | expo-video |
|---------|------------|
| `<Video>` | `<VideoView>` |
| `ref={videoRef}` | `player={useVideoPlayer()}` |
| `source={{ uri }}` | Pass to `useVideoPlayer(uri)` |
| `resizeMode={ResizeMode.CONTAIN}` | `contentFit="contain"` |
| `isLooping` | `player.loop = true` |
| `shouldPlay` | `player.play()` in setup |
| `isMuted` | `player.muted = true` |
| `useNativeControls` | `nativeControls={true}` |
| `onPlaybackStatusUpdate` | `useEvent` / `useEventListener` |
| `videoRef.current.playAsync()` | `player.play()` |
| `videoRef.current.pauseAsync()` | `player.pause()` |
| `videoRef.current.replayAsync()` | `player.replay()` |
| `videoRef.current.setPositionAsync(ms)` | `player.currentTime = seconds` |
| `status.positionMillis` | `player.currentTime` (seconds) |
| `status.durationMillis` | `player.duration` (seconds) |
| `status.didJustFinish` | `useEventListener(player, 'playToEnd')` |

## Key Differences

- **Separate player and view**: Player logic decoupled from the view—one player can be used across multiple views
- **Time in seconds**: Uses seconds, not milliseconds
- **Event system**: Uses `useEvent`/`useEventListener` from `expo` instead of callback props
- **Video preloading**: Create a player without mounting a VideoView to preload for faster transitions
- **Built-in caching**: Set `useCaching: true` in VideoSource for persistent offline caching

## Known Issues

- **Uninstall expo-av first**: On Android, having both expo-av and expo-video installed can cause VideoView to show a black screen. Uninstall expo-av before installing expo-video
- **Android: Reusing players**: Mounting the same player in multiple VideoViews simultaneously can cause black screens on Android (works on iOS)
- **Android: currentTime in setup**: Setting `player.currentTime` in the `useVideoPlayer` setup callback may not work on Android—set it after mount instead
- **Changing source**: Use `player.replace(newSource)` to change videos without recreating the player

## API Reference

https://docs.expo.dev/versions/latest/sdk/video/
