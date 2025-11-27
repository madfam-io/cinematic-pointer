/**
 * Caption Rendering
 *
 * Generates FFmpeg filters and subtitle files for video captions.
 */

import { writeFile } from 'fs/promises';

export interface Caption {
  start: number; // seconds
  end: number; // seconds
  text: string;
  style?: CaptionStyle;
}

export interface CaptionStyle {
  fontFamily?: string;
  fontSize?: number;
  fontColor?: string;
  backgroundColor?: string;
  position?: 'top' | 'center' | 'bottom';
  alignment?: 'left' | 'center' | 'right';
  outline?: number;
  outlineColor?: string;
  shadow?: number;
  bold?: boolean;
  italic?: boolean;
}

export const defaultCaptionStyle: CaptionStyle = {
  fontFamily: 'Arial',
  fontSize: 48,
  fontColor: 'white',
  backgroundColor: 'black@0.5',
  position: 'bottom',
  alignment: 'center',
  outline: 2,
  outlineColor: 'black',
  shadow: 1,
  bold: false,
  italic: false,
};

/**
 * Generate ASS (Advanced SubStation Alpha) subtitle file.
 */
export function generateASSSubtitles(
  captions: Caption[],
  videoWidth: number,
  videoHeight: number,
  style: CaptionStyle = defaultCaptionStyle,
): string {
  const mergedStyle = { ...defaultCaptionStyle, ...style };

  // Calculate position
  let alignment = 2; // Bottom center by default
  let marginV = 50;

  switch (mergedStyle.position) {
    case 'top':
      alignment = 8; // Top center
      marginV = 30;
      break;
    case 'center':
      alignment = 5; // Middle center
      marginV = 0;
      break;
    case 'bottom':
    default:
      alignment = 2; // Bottom center
      marginV = 50;
  }

  // Alignment adjustment for left/right
  if (mergedStyle.alignment === 'left') {
    alignment = alignment === 8 ? 7 : alignment === 5 ? 4 : 1;
  } else if (mergedStyle.alignment === 'right') {
    alignment = alignment === 8 ? 9 : alignment === 5 ? 6 : 3;
  }

  // Convert hex color to ASS BGR format
  const primaryColor = colorToASS(mergedStyle.fontColor || 'white');
  const outlineColor = colorToASS(mergedStyle.outlineColor || 'black');
  const backColor = colorToASS(mergedStyle.backgroundColor || 'black');

  const header = `[Script Info]
Title: Cinematic Pointer Captions
ScriptType: v4.00+
PlayResX: ${videoWidth}
PlayResY: ${videoHeight}
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${mergedStyle.fontFamily},${mergedStyle.fontSize},${primaryColor},${primaryColor},${outlineColor},${backColor},${mergedStyle.bold ? 1 : 0},${mergedStyle.italic ? 1 : 0},0,0,100,100,0,0,1,${mergedStyle.outline},${mergedStyle.shadow},${alignment},20,20,${marginV},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const events = captions
    .map((caption) => {
      const start = formatASSTime(caption.start);
      const end = formatASSTime(caption.end);
      const text = escapeASSText(caption.text);
      return `Dialogue: 0,${start},${end},Default,,0,0,0,,${text}`;
    })
    .join('\n');

  return header + events;
}

/**
 * Format time as ASS timestamp (H:MM:SS.CC).
 */
function formatASSTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const cs = Math.floor((seconds % 1) * 100);
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

/**
 * Escape special characters for ASS format.
 */
function escapeASSText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace(/\n/g, '\\N');
}

/**
 * Convert color name or hex to ASS color format (&HAABBGGRR).
 */
function colorToASS(color: string): string {
  const colorMap: Record<string, string> = {
    white: '&H00FFFFFF',
    black: '&H00000000',
    red: '&H000000FF',
    green: '&H0000FF00',
    blue: '&H00FF0000',
    yellow: '&H0000FFFF',
    cyan: '&H00FFFF00',
    magenta: '&H00FF00FF',
    'black@0.5': '&H80000000',
    'black@0.7': '&H4D000000',
  };

  if (colorMap[color]) {
    return colorMap[color];
  }

  // Parse hex color
  const hexMatch = color.match(/^#?([0-9A-Fa-f]{6})$/);
  if (hexMatch) {
    const hex = hexMatch[1];
    const r = hex.substring(0, 2);
    const g = hex.substring(2, 4);
    const b = hex.substring(4, 6);
    return `&H00${b}${g}${r}`.toUpperCase();
  }

  // Parse hex with alpha
  const hexAlphaMatch = color.match(/^#?([0-9A-Fa-f]{8})$/);
  if (hexAlphaMatch) {
    const hex = hexAlphaMatch[1];
    const a = hex.substring(0, 2);
    const r = hex.substring(2, 4);
    const g = hex.substring(4, 6);
    const b = hex.substring(6, 8);
    return `&H${a}${b}${g}${r}`.toUpperCase();
  }

  return '&H00FFFFFF'; // Default to white
}

/**
 * Generate SRT subtitle file.
 */
export function generateSRTSubtitles(captions: Caption[]): string {
  return captions
    .map((caption, index) => {
      const start = formatSRTTime(caption.start);
      const end = formatSRTTime(caption.end);
      return `${index + 1}\n${start} --> ${end}\n${caption.text}\n`;
    })
    .join('\n');
}

/**
 * Format time as SRT timestamp (HH:MM:SS,mmm).
 */
function formatSRTTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

/**
 * Generate FFmpeg drawtext filter for captions.
 * Note: For complex captions, using subtitles filter with ASS is preferred.
 */
export function generateDrawTextFilter(
  text: string,
  startTime: number,
  endTime: number,
  style: CaptionStyle = defaultCaptionStyle,
): string {
  const mergedStyle = { ...defaultCaptionStyle, ...style };

  // Calculate y position
  let yPos: string;
  switch (mergedStyle.position) {
    case 'top':
      yPos = '50';
      break;
    case 'center':
      yPos = '(h-th)/2';
      break;
    case 'bottom':
    default:
      yPos = 'h-th-50';
  }

  // Calculate x position
  let xPos: string;
  switch (mergedStyle.alignment) {
    case 'left':
      xPos = '50';
      break;
    case 'right':
      xPos = 'w-tw-50';
      break;
    case 'center':
    default:
      xPos = '(w-tw)/2';
  }

  const escapedText = text.replace(/'/g, "'\\''").replace(/:/g, '\\:');

  return [
    `drawtext=text='${escapedText}'`,
    `:fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf`,
    `:fontsize=${mergedStyle.fontSize}`,
    `:fontcolor=${mergedStyle.fontColor}`,
    `:x=${xPos}`,
    `:y=${yPos}`,
    `:enable='between(t,${startTime},${endTime})'`,
    mergedStyle.outline
      ? `:borderw=${mergedStyle.outline}:bordercolor=${mergedStyle.outlineColor}`
      : '',
    mergedStyle.shadow ? `:shadowx=${mergedStyle.shadow}:shadowy=${mergedStyle.shadow}` : '',
  ]
    .filter(Boolean)
    .join('');
}

/**
 * Generate subtitles filter to overlay ASS file.
 */
export function generateSubtitlesFilter(assFilePath: string): string {
  // Escape special characters in path
  const escapedPath = assFilePath.replace(/([\\:'])/g, '\\$1');
  return `subtitles='${escapedPath}'`;
}

/**
 * Write captions to ASS file.
 */
export async function writeCaptionsToFile(
  captions: Caption[],
  outputPath: string,
  videoWidth: number,
  videoHeight: number,
  style?: CaptionStyle,
): Promise<string> {
  const assContent = generateASSSubtitles(captions, videoWidth, videoHeight, style);
  const assPath = outputPath.endsWith('.ass') ? outputPath : `${outputPath}.ass`;
  await writeFile(assPath, assContent, 'utf-8');
  return assPath;
}

/**
 * Extract captions from UES events.
 */
export function extractCaptionsFromEvents(
  events: Array<{ ts: number; t: string; text?: string }>,
): Caption[] {
  const captions: Caption[] = [];
  let currentCaption: Partial<Caption> | null = null;

  for (const event of events) {
    if (event.t === 'caption.set' && event.text) {
      // Start a new caption
      if (currentCaption && currentCaption.start !== undefined) {
        currentCaption.end = event.ts / 1000;
        captions.push(currentCaption as Caption);
      }

      currentCaption = {
        start: event.ts / 1000,
        text: event.text,
      };
    } else if (event.t === 'caption.clear') {
      // End current caption
      if (currentCaption && currentCaption.start !== undefined) {
        currentCaption.end = event.ts / 1000;
        captions.push(currentCaption as Caption);
        currentCaption = null;
      }
    }
  }

  // Handle caption that extends to end
  if (currentCaption && currentCaption.start !== undefined) {
    // Will be set to video end time by caller
    currentCaption.end = currentCaption.start + 5; // Default 5 second duration
    captions.push(currentCaption as Caption);
  }

  return captions;
}

/**
 * Auto-generate captions from step comments.
 */
export function generateCaptionsFromSteps(
  events: Array<{ ts: number; t: string; data?: { comment?: string } }>,
  defaultDuration: number = 3,
): Caption[] {
  const captions: Caption[] = [];

  const stepStarts = events.filter((e) => e.t === 'step.start' && e.data?.comment);

  for (let i = 0; i < stepStarts.length; i++) {
    const event = stepStarts[i];
    const nextEvent = stepStarts[i + 1];

    const start = event.ts / 1000;
    const end = nextEvent ? nextEvent.ts / 1000 : start + defaultDuration;

    captions.push({
      start,
      end: Math.min(end, start + 10), // Cap at 10 seconds
      text: event.data!.comment!,
    });
  }

  return captions;
}

/**
 * Generate WebVTT subtitle file.
 */
export function generateVTTSubtitles(captions: Caption[]): string {
  const header = 'WEBVTT\n\n';

  const cues = captions
    .map((caption, index) => {
      const start = formatVTTTime(caption.start);
      const end = formatVTTTime(caption.end);
      return `${index + 1}\n${start} --> ${end}\n${caption.text}\n`;
    })
    .join('\n');

  return header + cues;
}

/**
 * Format time as WebVTT timestamp (HH:MM:SS.mmm).
 */
function formatVTTTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
}

/**
 * Write SRT subtitles to file.
 */
export async function writeSRTToFile(captions: Caption[], outputPath: string): Promise<string> {
  const srtContent = generateSRTSubtitles(captions);
  const srtPath = outputPath.endsWith('.srt') ? outputPath : `${outputPath}.srt`;
  await writeFile(srtPath, srtContent, 'utf-8');
  return srtPath;
}

/**
 * Write VTT subtitles to file.
 */
export async function writeVTTToFile(captions: Caption[], outputPath: string): Promise<string> {
  const vttContent = generateVTTSubtitles(captions);
  const vttPath = outputPath.endsWith('.vtt') ? outputPath : `${outputPath}.vtt`;
  await writeFile(vttPath, vttContent, 'utf-8');
  return vttPath;
}

/**
 * Export captions to all subtitle formats.
 */
export async function exportAllCaptionFormats(
  captions: Caption[],
  basePath: string,
  videoWidth: number,
  videoHeight: number,
  style?: CaptionStyle,
): Promise<{ srt: string; vtt: string; ass: string }> {
  const [srt, vtt, ass] = await Promise.all([
    writeSRTToFile(captions, `${basePath}.srt`),
    writeVTTToFile(captions, `${basePath}.vtt`),
    writeCaptionsToFile(captions, `${basePath}.ass`, videoWidth, videoHeight, style),
  ]);

  return { srt, vtt, ass };
}

/**
 * Caption format type.
 */
export type CaptionFormat = 'srt' | 'vtt' | 'ass';

/**
 * Export captions to specified format.
 */
export async function exportCaptions(
  captions: Caption[],
  outputPath: string,
  format: CaptionFormat,
  options?: {
    videoWidth?: number;
    videoHeight?: number;
    style?: CaptionStyle;
  },
): Promise<string> {
  switch (format) {
    case 'srt':
      return writeSRTToFile(captions, outputPath);

    case 'vtt':
      return writeVTTToFile(captions, outputPath);

    case 'ass':
      return writeCaptionsToFile(
        captions,
        outputPath,
        options?.videoWidth ?? 1920,
        options?.videoHeight ?? 1080,
        options?.style,
      );

    default:
      throw new Error(`Unknown caption format: ${format}`);
  }
}

/**
 * Merge overlapping captions.
 */
export function mergeCaptions(captions: Caption[], gapThreshold: number = 0.5): Caption[] {
  if (captions.length === 0) return [];

  const sorted = [...captions].sort((a, b) => a.start - b.start);
  const merged: Caption[] = [{ ...sorted[0] }];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const last = merged[merged.length - 1];

    // If this caption starts before the last one ends (with threshold), merge
    if (current.start <= last.end + gapThreshold && current.text === last.text) {
      last.end = Math.max(last.end, current.end);
    } else {
      merged.push({ ...current });
    }
  }

  return merged;
}

/**
 * Split long captions into shorter ones.
 */
export function splitLongCaptions(
  captions: Caption[],
  maxChars: number = 80,
  maxDuration: number = 8,
): Caption[] {
  const result: Caption[] = [];

  for (const caption of captions) {
    const duration = caption.end - caption.start;

    // Check if needs splitting
    if (caption.text.length <= maxChars && duration <= maxDuration) {
      result.push(caption);
      continue;
    }

    // Split by sentence or length
    const sentences = caption.text.split(/(?<=[.!?])\s+/);
    const chunks: string[] = [];
    let currentChunk = '';

    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length <= maxChars) {
        currentChunk += (currentChunk ? ' ' : '') + sentence;
      } else {
        if (currentChunk) chunks.push(currentChunk);
        currentChunk = sentence;
      }
    }
    if (currentChunk) chunks.push(currentChunk);

    // Distribute time across chunks
    const chunkDuration = duration / chunks.length;
    for (let i = 0; i < chunks.length; i++) {
      result.push({
        start: caption.start + i * chunkDuration,
        end: caption.start + (i + 1) * chunkDuration,
        text: chunks[i],
        style: caption.style,
      });
    }
  }

  return result;
}
