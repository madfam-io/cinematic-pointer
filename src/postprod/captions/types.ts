/**
 * Caption Types
 */

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

export type CaptionFormat = 'srt' | 'vtt' | 'ass';
