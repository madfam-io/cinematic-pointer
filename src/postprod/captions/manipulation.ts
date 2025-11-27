/**
 * Caption Manipulation
 *
 * Utilities for merging, splitting, and transforming captions.
 */

import { Caption } from './types';

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

/**
 * Offset all caption times by a given amount.
 */
export function offsetCaptions(captions: Caption[], offsetSeconds: number): Caption[] {
  return captions.map((caption) => ({
    ...caption,
    start: caption.start + offsetSeconds,
    end: caption.end + offsetSeconds,
  }));
}

/**
 * Scale caption times by a factor (for speed changes).
 */
export function scaleCaptionTimes(captions: Caption[], factor: number): Caption[] {
  return captions.map((caption) => ({
    ...caption,
    start: caption.start * factor,
    end: caption.end * factor,
  }));
}

/**
 * Filter captions to a time range.
 */
export function filterCaptionsByTimeRange(
  captions: Caption[],
  startTime: number,
  endTime: number,
): Caption[] {
  return captions
    .filter((caption) => caption.end > startTime && caption.start < endTime)
    .map((caption) => ({
      ...caption,
      start: Math.max(caption.start, startTime),
      end: Math.min(caption.end, endTime),
    }));
}
