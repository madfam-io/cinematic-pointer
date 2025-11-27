/**
 * Brand Theme Type Definitions
 *
 * Types for theme configuration and customization.
 */

/**
 * Color values in CSS-compatible format.
 */
export type CSSColor = string;

/**
 * Font configuration.
 */
export interface FontConfig {
  /** Primary font family */
  family: string;
  /** Fallback fonts */
  fallback?: string[];
  /** Font weight for normal text */
  weight?: number;
  /** Font weight for bold/headers */
  weightBold?: number;
}

/**
 * Cursor appearance configuration.
 */
export interface CursorConfig {
  /** Cursor size in pixels */
  size: number;
  /** Cursor color */
  color: CSSColor;
  /** Border color (optional) */
  borderColor?: CSSColor;
  /** Border width in pixels */
  borderWidth?: number;
  /** Cursor shape: circle, arrow, crosshair */
  shape: 'circle' | 'arrow' | 'crosshair';
  /** Drop shadow */
  shadow?: string;
}

/**
 * Ripple effect configuration.
 */
export interface RippleConfig {
  /** Ripple color */
  color: CSSColor;
  /** Maximum ripple size in pixels */
  size: number;
  /** Animation duration in ms */
  duration: number;
  /** Number of ripples on click */
  count: number;
}

/**
 * Trail effect configuration.
 */
export interface TrailConfig {
  /** Enable trails */
  enabled: boolean;
  /** Trail color */
  color: CSSColor;
  /** Trail length (number of points) */
  length: number;
  /** Trail fade duration in ms */
  fadeDuration: number;
  /** Minimum distance between trail points */
  minDistance: number;
}

/**
 * Focus ring configuration.
 */
export interface FocusRingConfig {
  /** Ring color */
  color: CSSColor;
  /** Ring width in pixels */
  width: number;
  /** Ring padding around element */
  padding: number;
  /** Border radius */
  borderRadius: number;
  /** Animation style */
  animation: 'pulse' | 'solid' | 'dashed';
}

/**
 * Logo watermark configuration.
 */
export interface LogoConfig {
  /** Path to logo image */
  path?: string;
  /** Logo position */
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  /** Logo size (percentage of viewport width) */
  size: number;
  /** Logo opacity */
  opacity: number;
  /** Padding from edges in pixels */
  padding: number;
}

/**
 * Caption styling configuration.
 */
export interface CaptionConfig {
  /** Font size in pixels */
  fontSize: number;
  /** Font color */
  color: CSSColor;
  /** Background color */
  backgroundColor: CSSColor;
  /** Background opacity */
  backgroundOpacity: number;
  /** Padding in pixels */
  padding: number;
  /** Border radius */
  borderRadius: number;
  /** Position */
  position: 'top' | 'bottom';
  /** Margin from edge in pixels */
  margin: number;
}

/**
 * Camera beat effect configuration.
 */
export interface BeatConfig {
  /** Zoom scale for impact beats */
  impactZoom: number;
  /** Duration of zoom effect in ms */
  zoomDuration: number;
  /** Easing function */
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'cubic-bezier';
  /** Screen flash on impact */
  flash: boolean;
  /** Flash color */
  flashColor?: CSSColor;
}

/**
 * Complete brand theme configuration.
 */
export interface BrandTheme {
  /** Theme name */
  name: string;
  /** Theme description */
  description?: string;

  /** Primary brand color */
  primary: CSSColor;
  /** Accent/secondary color */
  accent: CSSColor;
  /** Background color for overlays */
  background: CSSColor;
  /** Text color */
  text: CSSColor;
  /** Error/warning color */
  error: CSSColor;
  /** Success color */
  success: CSSColor;

  /** Font configuration */
  font: FontConfig;

  /** Cursor configuration */
  cursor: CursorConfig;

  /** Ripple effect configuration */
  ripple: RippleConfig;

  /** Trail effect configuration */
  trail: TrailConfig;

  /** Focus ring configuration */
  focusRing: FocusRingConfig;

  /** Logo watermark configuration */
  logo?: LogoConfig;

  /** Caption styling */
  captions: CaptionConfig;

  /** Camera beat effects */
  beats: BeatConfig;

  /** Custom CSS to inject */
  customCss?: string;
}

/**
 * Partial theme for overrides.
 */
export type PartialTheme = Partial<{
  [K in keyof BrandTheme]: BrandTheme[K] extends object ? Partial<BrandTheme[K]> : BrandTheme[K];
}>;

/**
 * Preset theme names.
 */
export type PresetThemeName =
  | 'default'
  | 'madfam_trailer'
  | 'madfam_howto'
  | 'madfam_teaser'
  | 'minimal'
  | 'dark'
  | 'light';
