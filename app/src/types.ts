export type AspectRatio = '16:9' | '9:16' | '4:5' | '4:3';
export type SplitBackground = 'brand' | 'white' | 'gray' | 'dark';

export type StyleId = 'tech-hud' | 'amber-process';

export type ModuleVariant =
  | 'orbit-glass-cards'
  | 'app-icon-orbit'
  | 'timeline-progress-bar'
  | 'beat-step-list-theme-cycle'
  | 'odometer-digit-roll'
  | 'episode-counter-card'
  | 'project-comparison-card'
  | 'split-evidence-layout'
  | 'metric-arrow-card'
  | 'amber-proof-title'
  | 'amber-progress-ring'
  | 'amber-scene-steps'
  | 'amber-replicate-flow'
  | 'amber-library-grid'
  | 'income-split-card'
  | 'dot-grid-stat-card'
  | 'three-layer-mind-map'
  | 'glass-process-bubble'
  | 'chain-bubble-flow'
  | 'review-split-card'
  | 'pressure-bar-comparison'
  | 'numeric-punch-card'
  | 'three-step-action-card'
  | 'three-step-checklist-card'
  | 'dual-metric-ruler-card'
  | 'workflow-action-list-card'
  | 'task-module-breakdown-card'
  | 'large-number-dot-matrix-card'
  | 'multi-step-toolchain-card'
  | 'key-phrase-highlight-card'
  | 'falling-word-field-card'
  ;

export type SubtitleCategory =
  | '主观点'
  | '辅助说明'
  | '数据内容'
  | '规则步骤'
  | '多条清单'
  | '短标签';

export type EffectId =
  | 'ambient-wash'
  | 'section-head'
  | 'info-board'
  | 'strike-flip'
  | 'metric-arrow'
  | 'odometer-digit-roll'
  | 'episode-counter-card'
  | 'project-comparison'
  | 'split-evidence'
  | 'amber-proof-title'
  | 'amber-progress-ring'
  | 'amber-scene-steps'
  | 'amber-replicate-flow'
  | 'amber-library-grid'
  | 'income-split-card'
  | 'dot-grid-stat-card'
  | 'three-layer-mind-map'
  | 'glass-process-bubble'
  | 'chain-bubble-flow'
  | 'review-split-card'
  | 'pressure-bar-comparison'
  | 'numeric-punch-card'
  | 'three-step-action-card'
  | 'three-step-checklist'
  | 'dual-metric-ruler'
  | 'workflow-action-list'
  | 'task-module-breakdown'
  | 'large-number-dot-matrix'
  | 'multi-step-toolchain'
  | 'key-phrase-highlight';

export type ClipParams = {
  x: number;
  y: number;
  scale: number;
  accent: string;
  intensity: number;
  speed: number;
  kicker?: string;
  subtitle?: string;
  fadeAt?: number;
  soundCue?: string;
  cardTheme?: 'bright' | 'dim';
  panelTone?: 'none' | 'dark-glass' | 'light-glass';
  align?: 'left' | 'center' | 'right';
  offsetX?: number;
  widthScale?: number;
  heightScale?: number;
  titleColor?: string;
  moduleVariant?: ModuleVariant;
  contentRole?: SubtitleCategory;
  splitLayout?: 'side-by-side' | 'stacked';
  splitRatio?: number;
  splitType?: 'web-demo' | 'ai-animation' | 'material';
};

export type OverlayClip = {
  id: string;
  effectId: EffectId;
  label: string;
  text: string;
  start: number;
  duration: number;
  lane: number;
  enabled: boolean;
  params: ClipParams;
};

export type EffectDefinition = {
  id: EffectId;
  name: string;
  role: string;
  bestFor: string;
  defaultDuration: number;
  defaultParams: ClipParams;
};

export type OverlayProject = {
  title: string;
  styleId: StyleId;
  globalTitleColor?: string;
  showSafeZones?: boolean;
  meta?: {
    appVersion?: string;
    cardLibrarySignature?: string;
    savedAt?: string;
  };
  canvas: {
    aspectRatio: AspectRatio;
    width: number;
    height: number;
    fps: number;
  };
  clips: OverlayClip[];
};

export type SrtCue = {
  index: number;
  start: number;
  end: number;
  text: string;
};

export type StylePreset = {
  id: StyleId;
  name: string;
  source: string;
  tagline: string;
  bestFor: string;
  tokens: {
    paper: string;
    ink: string;
    muted: string;
    panel: string;
    line: string;
    accent: string;
    accentSoft: string;
    shadow: string;
    stage: string;
  };
};

export type HyperframesStylePreset = {
  slug: string;
  name: string;
  quality: 'ready' | 'draft';
  path: string;
  scheme: 'light' | 'dark' | 'mixed';
  density: string;
  tagline: string;
  bestFor: string;
  avoidFor: string;
  mood: string[];
  tone: string[];
  occasion: string[];
};
