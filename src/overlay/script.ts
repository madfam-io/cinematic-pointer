/**
 * Cursor Overlay Script
 *
 * JavaScript to be injected into the page for cinematic cursor effects.
 * This code runs in the browser context.
 */

export interface OverlayConfig {
  trailCount: number;
  trailDecay: number;
  easing: number;
  clickRipple: boolean;
  focusRing: boolean;
  beatMarkers: boolean;
}

export const defaultConfig: OverlayConfig = {
  trailCount: 5,
  trailDecay: 0.92,
  easing: 0.15,
  clickRipple: true,
  focusRing: true,
  beatMarkers: true,
};

/**
 * Generate the overlay script to be injected into the page.
 * This script creates and manages all cursor overlay elements.
 */
export function generateOverlayScript(config: OverlayConfig = defaultConfig): string {
  return `
(function() {
  'use strict';

  // Configuration
  const CONFIG = ${JSON.stringify(config)};

  // State
  let mouseX = 0;
  let mouseY = 0;
  let cursorX = 0;
  let cursorY = 0;
  let isClicking = false;
  let isHovering = false;
  let animationFrameId = null;
  const trailPositions = [];

  // Initialize trail positions
  for (let i = 0; i < CONFIG.trailCount; i++) {
    trailPositions.push({ x: 0, y: 0 });
  }

  // Create overlay elements
  function createOverlayElements() {
    // Add active class to body
    document.body.classList.add('cp-overlay-active');

    // Create main cursor
    const cursor = document.createElement('div');
    cursor.className = 'cp-cursor';
    cursor.id = 'cp-cursor';
    document.body.appendChild(cursor);

    // Create trail elements
    for (let i = 0; i < CONFIG.trailCount; i++) {
      const trail = document.createElement('div');
      trail.className = 'cp-trail cp-trail-' + i;
      trail.id = 'cp-trail-' + i;
      document.body.appendChild(trail);
    }

    // Create focus ring element
    if (CONFIG.focusRing) {
      const focusRing = document.createElement('div');
      focusRing.className = 'cp-focus-ring';
      focusRing.id = 'cp-focus-ring';
      focusRing.style.display = 'none';
      document.body.appendChild(focusRing);
    }
  }

  // Update cursor position with easing
  function updateCursor() {
    // Ease cursor towards mouse position
    cursorX += (mouseX - cursorX) * CONFIG.easing;
    cursorY += (mouseY - cursorY) * CONFIG.easing;

    // Update main cursor
    const cursor = document.getElementById('cp-cursor');
    if (cursor) {
      cursor.style.left = cursorX + 'px';
      cursor.style.top = cursorY + 'px';
    }

    // Update trail positions with decay
    for (let i = CONFIG.trailCount - 1; i > 0; i--) {
      trailPositions[i].x += (trailPositions[i - 1].x - trailPositions[i].x) * CONFIG.trailDecay;
      trailPositions[i].y += (trailPositions[i - 1].y - trailPositions[i].y) * CONFIG.trailDecay;
    }
    trailPositions[0].x = cursorX;
    trailPositions[0].y = cursorY;

    // Update trail elements
    for (let i = 0; i < CONFIG.trailCount; i++) {
      const trail = document.getElementById('cp-trail-' + i);
      if (trail) {
        trail.style.left = trailPositions[i].x + 'px';
        trail.style.top = trailPositions[i].y + 'px';
        trail.style.opacity = (1 - (i / CONFIG.trailCount)) * 0.5;
      }
    }

    animationFrameId = requestAnimationFrame(updateCursor);
  }

  // Create click ripple effect
  function createRipple(x, y) {
    if (!CONFIG.clickRipple) return;

    const ripple = document.createElement('div');
    ripple.className = 'cp-ripple';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    document.body.appendChild(ripple);

    // Remove after animation
    setTimeout(() => {
      ripple.remove();
    }, 600);
  }

  // Create beat marker effect
  function createBeat(x, y) {
    if (!CONFIG.beatMarkers) return;

    const beat = document.createElement('div');
    beat.className = 'cp-beat';
    beat.style.left = x + 'px';
    beat.style.top = y + 'px';
    document.body.appendChild(beat);

    // Remove after animation
    setTimeout(() => {
      beat.remove();
    }, 400);
  }

  // Update focus ring position around element
  function updateFocusRing(element) {
    if (!CONFIG.focusRing) return;

    const focusRing = document.getElementById('cp-focus-ring');
    if (!focusRing) return;

    if (!element) {
      focusRing.style.display = 'none';
      return;
    }

    const rect = element.getBoundingClientRect();
    const padding = 4;

    focusRing.style.display = 'block';
    focusRing.style.left = (rect.left - padding) + 'px';
    focusRing.style.top = (rect.top - padding) + 'px';
    focusRing.style.width = (rect.width + padding * 2) + 'px';
    focusRing.style.height = (rect.height + padding * 2) + 'px';
  }

  // Event handlers
  function handleMouseMove(e) {
    mouseX = e.clientX;
    mouseY = e.clientY;
  }

  function handleMouseDown(e) {
    isClicking = true;
    const cursor = document.getElementById('cp-cursor');
    if (cursor) {
      cursor.classList.add('cp-clicking');
    }
    createRipple(e.clientX, e.clientY);
  }

  function handleMouseUp() {
    isClicking = false;
    const cursor = document.getElementById('cp-cursor');
    if (cursor) {
      cursor.classList.remove('cp-clicking');
    }
  }

  function handleMouseOver(e) {
    const target = e.target;
    const isInteractive = target.matches('a, button, input, select, textarea, [role="button"], [onclick], [tabindex]');

    if (isInteractive) {
      isHovering = true;
      const cursor = document.getElementById('cp-cursor');
      if (cursor) {
        cursor.classList.add('cp-hovering');
      }
      updateFocusRing(target);
    }
  }

  function handleMouseOut(e) {
    const target = e.target;
    const isInteractive = target.matches('a, button, input, select, textarea, [role="button"], [onclick], [tabindex]');

    if (isInteractive) {
      isHovering = false;
      const cursor = document.getElementById('cp-cursor');
      if (cursor) {
        cursor.classList.remove('cp-hovering');
      }
      updateFocusRing(null);
    }
  }

  // Initialization
  function init() {
    createOverlayElements();

    // Add event listeners
    document.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('mouseout', handleMouseOut);

    // Start animation loop
    animationFrameId = requestAnimationFrame(updateCursor);

    // Expose API for external control
    window.__cpOverlay = {
      createRipple: createRipple,
      createBeat: createBeat,
      updateFocusRing: updateFocusRing,
      setPosition: function(x, y) {
        mouseX = x;
        mouseY = y;
      },
      destroy: function() {
        document.body.classList.remove('cp-overlay-active');
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mousedown', handleMouseDown);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('mouseover', handleMouseOver);
        document.removeEventListener('mouseout', handleMouseOut);
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
        }
        // Remove all overlay elements
        document.querySelectorAll('[id^="cp-"]').forEach(el => el.remove());
        document.querySelectorAll('.cp-ripple, .cp-beat').forEach(el => el.remove());
      }
    };

    console.log('[Cinematic Pointer] Overlay initialized');
  }

  // Wait for DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
`.trim();
}
