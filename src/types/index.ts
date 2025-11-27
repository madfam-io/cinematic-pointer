export interface Meta {
  name: string;
  viewport: {
    w: number;
    h: number;
    deviceScaleFactor?: number;
  };
  canvas?: 'web' | 'desktop';
  journeyId?: string;
  runId?: string;
  brandTheme?: string;
}

export interface JourneyStep {
  comment?: string;
  action:
    | 'click'
    | 'fill'
    | 'scroll'
    | 'hover'
    | 'press'
    | 'waitFor'
    | 'cameraMark'
    | 'pause'
    | 'navigate';
  locator?: Selector;
  text?: string;
  key?: string;
  to?: string | { x: number; y: number };
  durationMs?: number;
  mask?: boolean;
  cursor?: {
    trail?: boolean;
    ripple?: boolean;
  };
  cinema?: {
    beat?: 'impact' | 'smooth' | 'dramatic';
    ripple?: boolean;
    zoom?: number;
  };
  target?: Selector;
  timeoutMs?: number;
}

export interface Journey {
  meta: Meta;
  start: {
    url: string;
  };
  steps: JourneyStep[];
  output: {
    preset: 'trailer' | 'howto' | 'teaser';
    aspect: '16:9' | '1:1' | '9:16';
    music?: string;
    captions?: boolean;
  };
}

export interface Selector {
  by?: 'role' | 'label' | 'placeholder' | 'testid' | 'css' | 'xpath' | 'text';
  value?: string;
  name?: string;
  role?: string;
  placeholder?: string;
  text?: string;
}

export interface Point {
  x: number;
  y: number;
}

export interface Region {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface UesEvent {
  ts: number;
  t: string;
  data?: Record<string, unknown>;
  to?: number[];
  from?: number[];
  ease?: string;
  button?: string;
  key?: string;
  text?: string;
  selector?: Selector;
  desc?: string;
  zoom?: number;
  focus?: { region: number[] };
  target?: { selector: Selector };
}

export interface Driver {
  init(meta: Meta): Promise<void>;
  goto(url: string): Promise<void>;
  resolveTarget(sel: Selector): Promise<Point | Region>;
  hover(sel: Selector): Promise<void>;
  click(sel: Selector, button?: 'left' | 'right' | 'middle'): Promise<void>;
  fill(sel: Selector, text: string, mask?: boolean): Promise<void>;
  press(key: string): Promise<void>;
  scroll(
    to: 'top' | 'bottom' | 'center' | { x: number; y: number },
    durationMs?: number,
  ): Promise<void>;
  waitFor(cond: Condition, timeoutMs?: number): Promise<void>;
  teardown(): Promise<void>;
}

export interface Recorder {
  start(meta: Meta): Promise<void>;
  mark(event: UesEvent): void;
  stop(): Promise<RecordingArtifacts>;
}

export interface RecordingArtifacts {
  videoPath?: string;
  videoPaths?: string[];
  eventsPath: string;
  screenshotsPath?: string;
}

export interface Condition {
  type: 'visible' | 'text' | 'url' | 'networkIdle';
  selector?: Selector;
  text?: string;
  url?: string;
}
