import type { StylePreset } from '../types';

export const stylePresets: StylePreset[] = [
  {
    id: 'tech-hud',
    name: 'Tech Glass 科技玻璃',
    source: 'XHS Video Overlay Packaging + Apple Glass',
    tagline: '白底系统感玻璃 + 高亮电蓝 HUD，干净但更有识别度。',
    bestFor: 'AI 工具、产品演示、自动化流程、证据讲解、增长趋势、系统记录感视频。',
    tokens: {
      paper: '#f5f8fb',
      ink: '#17212f',
      muted: '#65717f',
      panel: 'rgba(255, 255, 255, 0.74)',
      line: 'rgba(0, 119, 170, 0.16)',
      accent: '#00e5ff',
      accentSoft: 'rgba(0, 229, 255, 0.16)',
      shadow: '0 24px 80px rgba(30, 82, 120, 0.13)',
      stage: 'transparent',
    },
  },
];

export const stylesById = Object.fromEntries(
  [
    ...stylePresets.map((style) => [style.id, style]),
    // Keep old amber projects readable while the picker uses one unified Tech Glass style.
    ['amber-process', stylePresets[0]],
  ],
) as Record<StylePreset['id'], StylePreset>;
