/**
 * Caption Format Generators
 *
 * Generate subtitle files in ASS, SRT, and VTT formats.
 */

import { writeFile } from 'fs/promises';

import { TimeFormatter } from '../../utils/time-format';

import { colorToASS } from './colors';
import { Caption, CaptionStyle, defaultCaptionStyle } from './types';

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
 * Calculate ASS alignment value from position and alignment.
 */
function calculateASSAlignment(
  position: 'top' | 'center' | 'bottom',
  alignment: 'left' | 'center' | 'right',
): { alignment: number; marginV: number } {
  // ASS alignment numpad layout: 7 8 9 / 4 5 6 / 1 2 3
  let baseAlignment: number;
  let marginV: number;

  switch (position) {
    case 'top':
      baseAlignment = 8; // Top center
      marginV = 30;
      break;
    case 'center':
      baseAlignment = 5; // Middle center
      marginV = 0;
      break;
    case 'bottom':
    default:
      baseAlignment = 2; // Bottom center
      marginV = 50;
  }

  // Adjust for horizontal alignment
  if (alignment === 'left') {
    baseAlignment = baseAlignment === 8 ? 7 : baseAlignment === 5 ? 4 : 1;
  } else if (alignment === 'right') {
    baseAlignment = baseAlignment === 8 ? 9 : baseAlignment === 5 ? 6 : 3;
  }

  return { alignment: baseAlignment, marginV };
}

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

  const { alignment, marginV } = calculateASSAlignment(
    mergedStyle.position || 'bottom',
    mergedStyle.alignment || 'center',
  );

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
      const start = TimeFormatter.ass(caption.start);
      const end = TimeFormatter.ass(caption.end);
      const text = escapeASSText(caption.text);
      return `Dialogue: 0,${start},${end},Default,,0,0,0,,${text}`;
    })
    .join('\n');

  return header + events;
}

/**
 * Generate SRT subtitle file.
 */
export function generateSRTSubtitles(captions: Caption[]): string {
  return captions
    .map((caption, index) => {
      const start = TimeFormatter.srt(caption.start);
      const end = TimeFormatter.srt(caption.end);
      return `${index + 1}\n${start} --> ${end}\n${caption.text}\n`;
    })
    .join('\n');
}

/**
 * Generate WebVTT subtitle file.
 */
export function generateVTTSubtitles(captions: Caption[]): string {
  const header = 'WEBVTT\n\n';

  const cues = captions
    .map((caption, index) => {
      const start = TimeFormatter.vtt(caption.start);
      const end = TimeFormatter.vtt(caption.end);
      return `${index + 1}\n${start} --> ${end}\n${caption.text}\n`;
    })
    .join('\n');

  return header + cues;
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
 * Export captions to specified format.
 */
export async function exportCaptions(
  captions: Caption[],
  outputPath: string,
  format: 'srt' | 'vtt' | 'ass',
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
