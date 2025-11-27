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

/**
 * Motion blur segment definition.
 */
export interface MotionBlurSegment {
  start: number; // seconds
  end: number; // seconds
  strength: number; // 0-1, where 1 is maximum blur
}

/**
 * Generate motion blur filter using tblend.
 * Creates a trailing effect by blending consecutive frames.
 */
export function generateMotionBlurFilter(
  strength: number = 0.5,
  _mode: 'all' | 'fast_cursor' = 'all',
): string {
  // Clamp strength between 0 and 1
  const s = Math.max(0, Math.min(1, strength));

  // Calculate blend factor (0.5 = 50% current, 50% previous)
  const blendFactor = s * 0.5;

  // tblend blends the current frame with the previous frame
  // Using average mode with adjusted weights for motion blur effect
  return `tblend=all_mode=average:all_opacity=${blendFactor}`;
}

/**
 * Generate adaptive motion blur based on cursor velocity.
 * Uses minterpolate for smoother motion blur effect.
 */
export function generateAdaptiveMotionBlurFilter(fps: number = 30): string {
  // minterpolate can create motion blur by generating intermediate frames
  // mi_mode=blend creates a blur effect
  return `minterpolate=fps=${fps * 2}:mi_mode=blend,fps=${fps}`;
}

/**
 * Generate segment-based motion blur.
 * Applies blur only during specified time segments.
 */
export function generateSegmentedMotionBlurFilter(
  segments: MotionBlurSegment[],
  _fps: number,
): string {
  if (segments.length === 0) {
    return '';
  }

  // Build enable expression for when blur should be active
  const enableExprs = segments.map((seg) => `between(t,${seg.start},${seg.end})`);
  const enableExpr = enableExprs.join('+');

  // Use average strength across segments for simplicity
  const avgStrength = segments.reduce((sum, seg) => sum + seg.strength, 0) / segments.length;
  const blendFactor = avgStrength * 0.5;

  return `tblend=all_mode=average:all_opacity=${blendFactor}:enable='${enableExpr}'`;
}

/**
 * Audio ducking configuration.
 */
export interface DuckingConfig {
  /** Times when ducking should occur (in seconds) */
  duckPoints: Array<{
    time: number;
    duration: number;
    level: number; // 0-1, target volume level during duck
  }>;
  /** Attack time in ms */
  attack?: number;
  /** Release time in ms */
  release?: number;
}

/**
 * Generate audio ducking filter.
 * Lowers music volume when other audio (like voiceover) is playing.
 */
export function generateAudioDuckingFilter(config: DuckingConfig): string {
  const { duckPoints, attack = 50, release = 200 } = config;

  if (duckPoints.length === 0) {
    return '';
  }

  // Build volume expression with smooth transitions
  const expressions: string[] = [];

  for (const point of duckPoints) {
    const startTime = point.time;
    const endTime = point.time + point.duration;
    const level = point.level;

    // Create smooth duck: attack -> hold -> release
    const attackEnd = startTime + attack / 1000;
    const releaseStart = endTime - release / 1000;

    // Attack phase: 1 -> level
    expressions.push(
      `if(between(t,${startTime},${attackEnd}),1-(1-${level})*(t-${startTime})/${attack / 1000}`,
    );
    // Hold phase: level
    expressions.push(`if(between(t,${attackEnd},${releaseStart}),${level}`);
    // Release phase: level -> 1
    expressions.push(
      `if(between(t,${releaseStart},${endTime}),${level}+(1-${level})*(t-${releaseStart})/${release / 1000}`,
    );
  }

  // Default: full volume
  const expr = expressions.join(',') + ',1' + ')'.repeat(expressions.length);

  return `volume='${expr}'`;
}

/**
 * Generate simple sidechain ducking filter.
 * Ducks audio when another audio stream is present.
 */
export function generateSidechainDuckFilter(
  threshold: number = 0.015,
  ratio: number = 3,
  attack: number = 20,
  release: number = 250,
): string {
  // sidechaincompress: compresses audio based on another audio signal
  return [
    'sidechaincompress=',
    `threshold=${threshold}`,
    `:ratio=${ratio}`,
    `:attack=${attack}`,
    `:release=${release}`,
    ':level_in=1',
    ':level_sc=1',
    ':mix=1',
  ].join('');
}

/**
 * Generate audio fade filter.
 */
export function generateAudioFadeFilter(
  fadeIn?: number,
  fadeOut?: number,
  duration?: number,
): string {
  const filters: string[] = [];

  if (fadeIn && fadeIn > 0) {
    filters.push(`afade=t=in:st=0:d=${fadeIn}`);
  }

  if (fadeOut && fadeOut > 0 && duration) {
    const startTime = Math.max(0, duration - fadeOut);
    filters.push(`afade=t=out:st=${startTime}:d=${fadeOut}`);
  }

  return filters.join(',');
}

/**
 * Generate audio volume adjustment filter.
 */
export function generateVolumeFilter(level: number): string {
  return `volume=${level}`;
}

/**
 * Generate audio normalization filter.
 */
export function generateNormalizeFilter(
  target: number = -16, // target loudness in LUFS
): string {
  return `loudnorm=I=${target}:TP=-1.5:LRA=11`;
}

/**
 * Generate complete audio processing chain.
 */
export function generateAudioProcessingChain(options: {
  normalize?: boolean;
  volume?: number;
  fadeIn?: number;
  fadeOut?: number;
  duration?: number;
  ducking?: DuckingConfig;
}): string {
  const filters: string[] = [];

  // Normalize first
  if (options.normalize) {
    filters.push(generateNormalizeFilter());
  }

  // Apply ducking
  if (options.ducking) {
    const duckFilter = generateAudioDuckingFilter(options.ducking);
    if (duckFilter) {
      filters.push(duckFilter);
    }
  }

  // Adjust volume
  if (options.volume !== undefined && options.volume !== 1) {
    filters.push(generateVolumeFilter(options.volume));
  }

  // Apply fades
  const fadeFilter = generateAudioFadeFilter(options.fadeIn, options.fadeOut, options.duration);
  if (fadeFilter) {
    filters.push(fadeFilter);
  }

  return filters.join(',');
}
