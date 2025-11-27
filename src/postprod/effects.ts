/**
 * Video Effects
 *
 * FFmpeg filter generators for cinematic effects like zoom, pan, and speed ramps.
 */

export interface ZoomPanKeyframe {
  time: number; // seconds
  zoom: number; // 1.0 = 100%, 1.5 = 150%
  x: number; // focus x coordinate (0-1 normalized)
  y: number; // focus y coordinate (0-1 normalized)
  ease?: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut';
}

export interface SpeedSegment {
  start: number; // seconds
  end: number; // seconds
  speed: number; // 1.0 = normal, 2.0 = 2x, 0.5 = half
}

export interface VideoInfo {
  width: number;
  height: number;
  duration: number;
  fps: number;
}

/**
 * Generate FFmpeg zoompan filter for Ken Burns effect.
 */
export function generateZoomPanFilter(
  keyframes: ZoomPanKeyframe[],
  video: VideoInfo,
  outputSize?: { width: number; height: number },
): string {
  if (keyframes.length === 0) {
    return '';
  }

  const outW = outputSize?.width ?? video.width;
  const outH = outputSize?.height ?? video.height;
  const totalFrames = Math.ceil(video.duration * video.fps);

  // Sort keyframes by time
  const sorted = [...keyframes].sort((a, b) => a.time - b.time);

  // Build expression for zoom based on keyframes
  const zoomExpr = buildKeyframeExpression(sorted, video.fps, 'zoom', 1);
  const xExpr = buildKeyframeExpression(sorted, video.fps, 'x', 0.5);
  const yExpr = buildKeyframeExpression(sorted, video.fps, 'y', 0.5);

  // Calculate zoom and position expressions
  // zoompan expects: z=zoom, x=pan_x, y=pan_y
  const filter = [
    `zoompan=`,
    `z='${zoomExpr}'`,
    `:x='iw/2-(iw/zoom/2)+((${xExpr})-0.5)*iw/zoom'`,
    `:y='ih/2-(ih/zoom/2)+((${yExpr})-0.5)*ih/zoom'`,
    `:d=${totalFrames}`,
    `:s=${outW}x${outH}`,
    `:fps=${video.fps}`,
  ].join('');

  return filter;
}

/**
 * Build an FFmpeg expression for interpolating between keyframes.
 */
function buildKeyframeExpression(
  keyframes: ZoomPanKeyframe[],
  fps: number,
  property: 'zoom' | 'x' | 'y',
  defaultValue: number,
): string {
  if (keyframes.length === 0) {
    return String(defaultValue);
  }

  if (keyframes.length === 1) {
    return String(keyframes[0][property]);
  }

  // Build nested if expressions for each segment
  const expressions: string[] = [];

  for (let i = 0; i < keyframes.length - 1; i++) {
    const kf1 = keyframes[i];
    const kf2 = keyframes[i + 1];
    const startFrame = Math.floor(kf1.time * fps);
    const endFrame = Math.floor(kf2.time * fps);
    const v1 = kf1[property];
    const v2 = kf2[property];

    // Linear interpolation between keyframes
    const progress = `(on-${startFrame})/${endFrame - startFrame}`;
    const interp = `${v1}+(${v2}-${v1})*${progress}`;

    expressions.push(`if(between(on,${startFrame},${endFrame}),${interp}`);
  }

  // Close all if statements and add default
  const lastValue = keyframes[keyframes.length - 1][property];
  return expressions.join(',') + `,${lastValue}` + ')'.repeat(expressions.length);
}

/**
 * Generate a simple zoom effect centered on a region.
 */
export function generateSimpleZoomFilter(
  startZoom: number,
  endZoom: number,
  centerX: number, // 0-1
  centerY: number, // 0-1
  video: VideoInfo,
  duration?: number,
): string {
  const d = duration ?? video.duration;
  const totalFrames = Math.ceil(d * video.fps);

  // Interpolate zoom over duration
  const zoomExpr = `${startZoom}+(${endZoom}-${startZoom})*on/${totalFrames}`;

  // Pan to keep center point in view
  const xExpr = `iw/2-(iw/zoom/2)+${centerX - 0.5}*iw/zoom`;
  const yExpr = `ih/2-(ih/zoom/2)+${centerY - 0.5}*ih/zoom`;

  return `zoompan=z='${zoomExpr}':x='${xExpr}':y='${yExpr}':d=${totalFrames}:s=${video.width}x${video.height}:fps=${video.fps}`;
}

/**
 * Generate setpts filter for speed changes.
 */
export function generateSpeedFilter(segments: SpeedSegment[], _video: VideoInfo): string {
  if (segments.length === 0) {
    return '';
  }

  // Sort segments by start time
  const sorted = [...segments].sort((a, b) => a.start - b.start);

  // Build expression for PTS adjustment
  // setpts adjusts presentation timestamps
  // PTS/speed makes video faster (speed > 1) or slower (speed < 1)
  const expressions: string[] = [];

  for (const seg of sorted) {
    const startPts = seg.start;
    const endPts = seg.end;
    const factor = 1 / seg.speed; // PTS factor is inverse of speed

    expressions.push(`if(between(T,${startPts},${endPts}),PTS*${factor}`);
  }

  // Default: normal speed
  const expr = expressions.join(',') + ',PTS' + ')'.repeat(expressions.length);

  return `setpts='${expr}'`;
}

/**
 * Generate atempo filter for audio speed changes.
 * Note: atempo only supports values between 0.5 and 2.0,
 * so we chain multiple filters for larger changes.
 */
export function generateAudioSpeedFilter(speed: number): string {
  const filters: string[] = [];
  let remaining = speed;

  while (remaining > 2.0) {
    filters.push('atempo=2.0');
    remaining /= 2.0;
  }
  while (remaining < 0.5) {
    filters.push('atempo=0.5');
    remaining /= 0.5;
  }

  if (remaining !== 1.0) {
    filters.push(`atempo=${remaining}`);
  }

  return filters.length > 0 ? filters.join(',') : '';
}

/**
 * Generate a smooth speed ramp (slow to fast or vice versa).
 */
export function generateSpeedRampFilter(
  startSpeed: number,
  endSpeed: number,
  video: VideoInfo,
): string {
  // Create a smooth speed transition using setpts
  // The expression needs to integrate speed over time
  const duration = video.duration;

  // Linear speed ramp: speed(t) = startSpeed + (endSpeed - startSpeed) * t / duration
  // PTS = integral of 1/speed dt
  // For linear ramp, this involves logarithmic integration

  // Simplified: use discrete segments
  const numSegments = 10;
  const segments: SpeedSegment[] = [];

  for (let i = 0; i < numSegments; i++) {
    const t1 = (i / numSegments) * duration;
    const t2 = ((i + 1) / numSegments) * duration;
    const avgT = (t1 + t2) / 2;
    const speed = startSpeed + ((endSpeed - startSpeed) * avgT) / duration;

    segments.push({ start: t1, end: t2, speed });
  }

  return generateSpeedFilter(segments, video);
}

/**
 * Generate fade in/out filter.
 */
export function generateFadeFilter(
  fadeIn?: number, // seconds
  fadeOut?: number, // seconds
  duration?: number, // total duration for fade out calculation
): string {
  const filters: string[] = [];

  if (fadeIn && fadeIn > 0) {
    filters.push(`fade=t=in:st=0:d=${fadeIn}`);
  }

  if (fadeOut && fadeOut > 0 && duration) {
    const startTime = duration - fadeOut;
    filters.push(`fade=t=out:st=${startTime}:d=${fadeOut}`);
  }

  return filters.join(',');
}

/**
 * Generate crossfade transition between two clips.
 */
export function generateCrossfadeFilter(
  duration: number,
  input1: string,
  input2: string,
  output: string,
): string {
  return `${input1}${input2}xfade=transition=fade:duration=${duration}:offset=0${output}`;
}

/**
 * Generate scale filter for resolution changes.
 */
export function generateScaleFilter(
  width: number,
  height: number,
  maintainAspect: boolean = true,
): string {
  if (maintainAspect) {
    return `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`;
  }
  return `scale=${width}:${height}`;
}

/**
 * Generate crop filter for aspect ratio changes.
 */
export function generateCropFilter(
  inputWidth: number,
  inputHeight: number,
  targetAspect: number,
  focusX: number = 0.5, // 0-1
  focusY: number = 0.5, // 0-1
): string {
  const inputAspect = inputWidth / inputHeight;

  let cropW: number, cropH: number;

  if (inputAspect > targetAspect) {
    // Input is wider, crop sides
    cropH = inputHeight;
    cropW = Math.floor(inputHeight * targetAspect);
  } else {
    // Input is taller, crop top/bottom
    cropW = inputWidth;
    cropH = Math.floor(inputWidth / targetAspect);
  }

  // Calculate crop position based on focus point
  const maxX = inputWidth - cropW;
  const maxY = inputHeight - cropH;
  const x = Math.floor(focusX * maxX);
  const y = Math.floor(focusY * maxY);

  return `crop=${cropW}:${cropH}:${x}:${y}`;
}

/**
 * Generate vignette filter for cinematic look.
 */
export function generateVignetteFilter(intensity: number = 0.3): string {
  const angle = Math.PI / 4 + intensity * (Math.PI / 4);
  return `vignette=angle=${angle}`;
}

/**
 * Generate color grading filter for cinematic look.
 */
export function generateColorGradeFilter(preset: 'warm' | 'cool' | 'dramatic' | 'none'): string {
  switch (preset) {
    case 'warm':
      return 'colorbalance=rs=0.1:gs=0:bs=-0.1:rm=0.1:gm=0:bm=-0.05';
    case 'cool':
      return 'colorbalance=rs=-0.1:gs=0:bs=0.1:rm=-0.05:gm=0:bm=0.1';
    case 'dramatic':
      return 'eq=contrast=1.1:saturation=0.9:brightness=-0.05';
    default:
      return '';
  }
}
