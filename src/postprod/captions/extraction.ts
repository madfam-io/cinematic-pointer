/**
 * Caption Extraction
 *
 * Extract captions from UES events and step data.
 */

import { Caption } from './types';

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
