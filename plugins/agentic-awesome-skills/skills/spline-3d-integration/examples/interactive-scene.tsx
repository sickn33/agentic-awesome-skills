// interactive-scene.tsx
// Full interactive Spline example — React
// Demonstrates: events, object manipulation, animation triggers, variable access
//
// Usage: drop this into a React/Next.js project and replace the scene URL

import { useRef, useState, useCallback } from 'react';
import Spline from '@splinetool/react-spline';
import type { Application } from '@splinetool/runtime';

const SCENE_URL = 'https://prod.spline.design/REPLACE_ME/scene.splinecode';

export default function InteractiveScene() {
  const splineApp = useRef<Application>();
  const [isLoaded, setIsLoaded] = useState(false);
  const [lastEvent, setLastEvent] = useState<string>('');

  // --- Called when scene finishes loading ---
  function onLoad(app: Application) {
    splineApp.current = app;
    setIsLoaded(true);
    console.log('Scene loaded');
  }

  // --- Listen to events from inside the Spline scene ---
  function onMouseDown(e: any) {
    setLastEvent(`mouseDown on: ${e.target?.name}`);
    console.log('mouseDown event:', e.target);
  }

  function onMouseHover(e: any) {
    setLastEvent(`mouseHover on: ${e.target?.name}`);
  }

  // --- Programmatically move an object ---
  const moveObject = useCallback(() => {
    if (!splineApp.current) return;

    const obj = splineApp.current.findObjectByName('Cube');
    if (!obj) return console.warn('Object "Cube" not found — check the name in Spline editor');

    obj.position.x += 50; // move right
  }, []);

  // --- Trigger an animation event ---
  const triggerAnimation = useCallback(() => {
    if (!splineApp.current) return;
    splineApp.current.emitEvent('mouseHover', 'Cube'); // triggers the mouseHover event on 'Cube'
  }, []);

  // --- Trigger animation in reverse (useful for toggle effects) ---
  const reverseAnimation = useCallback(() => {
    if (!splineApp.current) return;
    splineApp.current.emitEventReverse('mouseHover', 'Cube');
  }, []);

  // --- Rotate object (RADIANS not degrees!) ---
  const rotateObject = useCallback(() => {
    if (!splineApp.current) return;

    const obj = splineApp.current.findObjectByName('Cube');
    if (!obj) return;

    // 90 degrees = Math.PI / 2
    obj.rotation.y += Math.PI / 2;
  }, []);

  // --- Change object scale ---
  const scaleObject = useCallback((factor: number) => {
    if (!splineApp.current) return;

    const obj = splineApp.current.findObjectByName('Cube');
    if (!obj) return;

    obj.scale.x = factor;
    obj.scale.y = factor;
    obj.scale.z = factor;
  }, []);

  // --- Read/write Spline variables ---
  const updateVariable = useCallback(() => {
    if (!splineApp.current) return;

    // Get a variable defined in the Spline editor
    const score = splineApp.current.getVariable('score');
    console.log('Current score variable:', score);

    // Set a variable
    splineApp.current.setVariable('score', (score as number) + 1);
  }, []);

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>

      {/* Spline scene */}
      <Spline
        scene={SCENE_URL}
        onLoad={onLoad}
        onMouseDown={onMouseDown}
        onMouseHover={onMouseHover}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          zIndex: 0,
        }}
      />

      {/* Control panel — sits on top of the scene */}
      {isLoaded && (
        <div style={{
          position: 'absolute',
          bottom: 40,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10,
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap',
          justifyContent: 'center',
          background: 'rgba(0,0,0,0.6)',
          padding: '16px 24px',
          borderRadius: 12,
          backdropFilter: 'blur(8px)',
        }}>
          <button onClick={moveObject}>Move Right</button>
          <button onClick={rotateObject}>Rotate 90°</button>
          <button onClick={() => scaleObject(2)}>Scale Up</button>
          <button onClick={() => scaleObject(1)}>Reset Scale</button>
          <button onClick={triggerAnimation}>Trigger Hover</button>
          <button onClick={reverseAnimation}>Reverse Hover</button>
          <button onClick={updateVariable}>Increment Variable</button>
        </div>
      )}

      {/* Event log */}
      {lastEvent && (
        <div style={{
          position: 'absolute',
          top: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10,
          color: 'white',
          background: 'rgba(0,0,0,0.5)',
          padding: '8px 16px',
          borderRadius: 8,
          fontSize: 14,
          fontFamily: 'monospace',
        }}>
          {lastEvent}
        </div>
      )}

      {/* Loading state */}
      {!isLoaded && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: 18,
          zIndex: 10,
          background: '#0a0a0a',
        }}>
          Loading scene...
        </div>
      )}
    </div>
  );
}

/*
NOTES FOR AGENT:

1. Replace 'Cube' with the actual object name from the Spline editor
   (right-click object in editor → "Copy Development Object ID" for the UUID,
   or just use the display name shown in the Objects panel)

2. Rotation uses RADIANS:
   90°  = Math.PI / 2
   180° = Math.PI
   360° = Math.PI * 2
   Convert: const toRad = (deg) => deg * (Math.PI / 180)

3. Variables must be defined in the Spline editor first
   (right sidebar → Variables panel → add variable)

4. All available event types for onXxx props:
   onMouseDown, onMouseUp, onMouseHover, onMousePress,
   onKeyDown, onKeyUp, onStart, onScroll

5. If getting hydration errors in Next.js, wrap with:
   const Spline = dynamic(() => import('@splinetool/react-spline/next'), { ssr: false })
*/
