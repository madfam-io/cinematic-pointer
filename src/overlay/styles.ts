/**
 * Cursor Overlay Styles
 *
 * CSS for cinematic cursor effects including:
 * - Custom cursor with smooth movement
 * - Trail ghosts
 * - Click ripples
 * - Focus ring
 */

export interface OverlayTheme {
  cursorColor: string;
  cursorSize: number;
  trailColor: string;
  trailCount: number;
  rippleColor: string;
  rippleSize: number;
  focusRingColor: string;
  focusRingWidth: number;
}

export const defaultTheme: OverlayTheme = {
  cursorColor: '#00E0A4',
  cursorSize: 20,
  trailColor: 'rgba(0, 224, 164, 0.3)',
  trailCount: 5,
  rippleColor: 'rgba(0, 224, 164, 0.4)',
  rippleSize: 60,
  focusRingColor: 'rgba(0, 224, 164, 0.6)',
  focusRingWidth: 3,
};

export function generateOverlayCSS(theme: OverlayTheme = defaultTheme): string {
  return `
/* Cinematic Pointer Overlay Styles */

/* Hide native cursor when overlay is active */
.cp-overlay-active,
.cp-overlay-active * {
  cursor: none !important;
}

/* Main cursor element */
.cp-cursor {
  position: fixed;
  width: ${theme.cursorSize}px;
  height: ${theme.cursorSize}px;
  border-radius: 50%;
  background: ${theme.cursorColor};
  pointer-events: none;
  z-index: 999999;
  transform: translate(-50%, -50%);
  transition: transform 0.1s ease-out, width 0.15s ease, height 0.15s ease;
  box-shadow: 0 0 10px ${theme.cursorColor}40, 0 0 20px ${theme.cursorColor}20;
  mix-blend-mode: normal;
}

/* Cursor inner dot */
.cp-cursor::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 6px;
  height: 6px;
  background: white;
  border-radius: 50%;
  transform: translate(-50%, -50%);
}

/* Cursor states */
.cp-cursor.cp-clicking {
  transform: translate(-50%, -50%) scale(0.8);
}

.cp-cursor.cp-hovering {
  width: ${theme.cursorSize * 1.5}px;
  height: ${theme.cursorSize * 1.5}px;
}

/* Trail ghost elements */
.cp-trail {
  position: fixed;
  width: ${theme.cursorSize * 0.6}px;
  height: ${theme.cursorSize * 0.6}px;
  border-radius: 50%;
  background: ${theme.trailColor};
  pointer-events: none;
  z-index: 999998;
  transform: translate(-50%, -50%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

${Array.from(
  { length: theme.trailCount },
  (_, i) => `
.cp-trail-${i} {
  transition-delay: ${i * 0.02}s;
}
`,
).join('')}

/* Click ripple effect */
.cp-ripple {
  position: fixed;
  width: ${theme.rippleSize}px;
  height: ${theme.rippleSize}px;
  border-radius: 50%;
  background: transparent;
  border: 2px solid ${theme.rippleColor};
  pointer-events: none;
  z-index: 999997;
  transform: translate(-50%, -50%) scale(0);
  opacity: 1;
  animation: cp-ripple-expand 0.6s ease-out forwards;
}

@keyframes cp-ripple-expand {
  0% {
    transform: translate(-50%, -50%) scale(0);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -50%) scale(2);
    opacity: 0;
  }
}

/* Focus ring for active elements */
.cp-focus-ring {
  position: fixed;
  border: ${theme.focusRingWidth}px solid ${theme.focusRingColor};
  border-radius: 4px;
  pointer-events: none;
  z-index: 999996;
  transition: all 0.2s ease-out;
  box-shadow: 0 0 10px ${theme.focusRingColor}40;
}

/* Highlight effect for hovered elements */
.cp-highlight {
  position: fixed;
  background: ${theme.cursorColor}10;
  border-radius: 4px;
  pointer-events: none;
  z-index: 999995;
  transition: all 0.2s ease-out;
}

/* Beat marker animation (for camera sync) */
.cp-beat {
  position: fixed;
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: ${theme.cursorColor}20;
  pointer-events: none;
  z-index: 999994;
  transform: translate(-50%, -50%) scale(0);
  animation: cp-beat-pulse 0.4s ease-out forwards;
}

@keyframes cp-beat-pulse {
  0% {
    transform: translate(-50%, -50%) scale(0);
    opacity: 1;
  }
  50% {
    transform: translate(-50%, -50%) scale(1.5);
    opacity: 0.5;
  }
  100% {
    transform: translate(-50%, -50%) scale(2);
    opacity: 0;
  }
}
`.trim();
}
