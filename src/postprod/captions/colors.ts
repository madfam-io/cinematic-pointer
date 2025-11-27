/**
 * Color Conversion Utilities for Captions
 */

/**
 * Named color map to ASS format.
 */
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

/**
 * Convert color name or hex to ASS color format (&HAABBGGRR).
 */
export function colorToASS(color: string): string {
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
