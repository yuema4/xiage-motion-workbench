import { effectsById } from "../data/effectRegistry";
import { stylesById } from "../data/stylePresets";
import { classifySubtitle } from "./srtPlanner";
import type {
  EffectId,
  OverlayClip,
  OverlayProject,
  SrtCue,
  StyleId,
} from "../types";

const defaultEffectOrder: EffectId[] = [
  "section-head",
  "info-board",
  "strike-flip",
];

const srtSafePositions: Record<EffectId, Array<{ x: number; y: number }>> = {
  "ambient-wash": [
    { x: 12, y: 84 },
    { x: 24, y: 84 },
  ],
  "section-head": [
    { x: 10, y: 20 },
    { x: 24, y: 20 },
    { x: 12, y: 84 },
  ],
  "info-board": [
    { x: 10, y: 58 },
    { x: 10, y: 28 },
    { x: 24, y: 84 },
  ],
  "strike-flip": [
    { x: 10, y: 28 },
    { x: 10, y: 72 },
  ],
  "metric-arrow": [
    { x: 10, y: 47 },
    { x: 10, y: 78 },
  ],
  "episode-counter-card": [
    { x: 10, y: 18 },
    { x: 10, y: 26 },
  ],
  "odometer-digit-roll": [
    { x: 10, y: 32 },
    { x: 24, y: 84 },
  ],
  "project-comparison": [{ x: 10, y: 78 }],
  "split-evidence": [{ x: 10, y: 78 }],
  "amber-proof-title": [
    { x: 10, y: 25 },
    { x: 10, y: 78 },
  ],
  "amber-progress-ring": [
    { x: 10, y: 42 },
    { x: 10, y: 78 },
  ],
  "amber-scene-steps": [
    { x: 10, y: 52 },
    { x: 10, y: 78 },
  ],
  "amber-replicate-flow": [
    { x: 10, y: 43 },
    { x: 10, y: 78 },
  ],
  "amber-library-grid": [
    { x: 10, y: 72 },
    { x: 24, y: 84 },
  ],
  "income-split-card": [
    { x: 10, y: 50 },
    { x: 24, y: 84 },
  ],
  "dot-grid-stat-card": [
    { x: 10, y: 48 },
    { x: 24, y: 84 },
  ],
  "three-layer-mind-map": [
    { x: 10, y: 34 },
    { x: 24, y: 84 },
  ],
  "glass-process-bubble": [
    { x: 10, y: 52 },
    { x: 24, y: 84 },
  ],
  "chain-bubble-flow": [
    { x: 7, y: 52 },
    { x: 10, y: 68 },
  ],
  "review-split-card": [
    { x: 10, y: 45 },
    { x: 10, y: 68 },
  ],
  "pressure-bar-comparison": [
    { x: 10, y: 50 },
    { x: 10, y: 72 },
  ],
  "numeric-punch-card": [
    { x: 10, y: 32 },
    { x: 10, y: 72 },
  ],
  "three-step-action-card": [
    { x: 8, y: 52 },
    { x: 8, y: 72 },
  ],
  "three-step-checklist": [
    { x: 7, y: 38 },
    { x: 7, y: 64 },
  ],
  "dual-metric-ruler": [
    { x: 7, y: 36 },
    { x: 7, y: 68 },
  ],
  "workflow-action-list": [
    { x: 8, y: 38 },
    { x: 8, y: 66 },
  ],
  "task-module-breakdown": [
    { x: 8, y: 48 },
    { x: 8, y: 62 },
  ],
  "large-number-dot-matrix": [
    { x: 8, y: 46 },
    { x: 8, y: 66 },
  ],
  "multi-step-toolchain": [
    { x: 8, y: 48 },
    { x: 8, y: 62 },
  ],
  "key-phrase-highlight": [
    { x: 8, y: 46 },
    { x: 8, y: 66 },
  ],
};

function safePositionFor(effectId: EffectId, index: number) {
  const positions = srtSafePositions[effectId];
  return positions[index % positions.length];
}

function clampPercent(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function keepInsideStage(params: OverlayClip["params"]) {
  return {
    ...params,
    x: clampPercent(
      params.x,
      3,
      params.moduleVariant === "timeline-progress-bar" ? 97 : 72,
    ),
    y: clampPercent(params.y, params.moduleVariant === "timeline-progress-bar" ? -16 : 12, params.moduleVariant === "timeline-progress-bar" ? 0 : 86),
  };
}

function avoidFaceZone(
  effectId: EffectId,
  params: OverlayClip["params"],
  index: number,
) {
  if (params.moduleVariant === "timeline-progress-bar") {
    return keepInsideStage({ ...params, x: 3, y: 0, align: "left" });
  }
  if (params.moduleVariant) {
    return keepInsideStage({ ...params, align: "left" });
  }
  return keepInsideStage({
    ...params,
    ...safePositionFor(effectId, index),
    align: "left",
  });
}

function migrateLegacyModule(clip: OverlayClip, params: OverlayClip["params"]) {
  const marker = `${clip.id} ${clip.label}`.toLowerCase();
  if (clip.effectId === "amber-progress-ring") {
    const shouldRestoreRingPreview =
      /3,400 轮流浪对话/.test(clip.text) ||
      /STRAY CHATS/.test(clip.text) ||
      /41,000 轮/.test(clip.text) ||
      params.subtitle === "NO HOME" ||
      params.kicker === "PROGRESS";
    const accent =
      !params.accent ||
      (shouldRestoreRingPreview && params.accent.toLowerCase() === "#ffad44")
        ? "#ea545c"
        : params.accent;
    return {
      ...params,
      accent,
      kicker:
        !params.kicker || params.kicker === "PROGRESS" ? "03" : params.kicker,
      subtitle:
        !params.subtitle || params.subtitle === "NO HOME"
          ? "PERCENT / COMPLETION"
          : params.subtitle,
      titleColor: params.titleColor || "#1f2937",
      cardTheme: params.cardTheme || ("bright" as const),
      moduleVariant: "amber-progress-ring" as const,
    };
  }
  if (params.moduleVariant === "timeline-progress-bar") {
    return {
      ...params,
      x: 3,
      y: 0,
      align: "left" as const,
      panelTone: "light-glass" as const,
    };
  }
  if (!params.moduleVariant && marker.includes("orbit")) {
    return {
      ...params,
      x: 10,
      y: 50,
      scale: Math.min(params.scale || 0.68, 0.68),
      align: "center" as const,
      panelTone: "light-glass" as const,
      moduleVariant: "orbit-glass-cards" as const,
    };
  }
  if (
    !params.moduleVariant &&
    (marker.includes("split") || clip.label.includes("分屏材料"))
  ) {
    return {
      ...params,
      x: 10,
      y: 52,
      scale: Math.min(params.scale || 0.64, 0.64),
      align: "center" as const,
      panelTone: "dark-glass" as const,
      moduleVariant: "split-evidence-layout" as const,
    };
  }
  if (
    !params.moduleVariant &&
    (marker.includes("metric-arrow") ||
      clip.label.includes("数字+箭头") ||
      clip.label.includes("数字箭头"))
  ) {
    return {
      ...params,
      x: 10,
      y: 47,
      scale: Math.min(params.scale || 0.66, 0.66),
      accent: params.accent || "#6ee09a",
      align: "left" as const,
      panelTone: "none" as const,
      moduleVariant: "metric-arrow-card" as const,
    };
  }
  if (
    !params.moduleVariant &&
    (marker.includes("evidence") ||
      clip.label.includes("证据图表") ||
      clip.label.includes("排名对比"))
  ) {
    return {
      ...params,
      x: 10,
      y: 78,
      scale: Math.min(params.scale || 0.54, 0.54),
      align: "left" as const,
      panelTone: "light-glass" as const,
      moduleVariant: "project-comparison-card" as const,
    };
  }
  if (
    !params.moduleVariant &&
    (marker.includes("module-hero") ||
      marker.includes("project-compare") ||
      clip.label.includes("标题信息面板") ||
      clip.label.includes("标题面板") ||
      clip.label.includes("项目对比"))
  ) {
    return {
      ...params,
      x: 10,
      y: 58,
      scale: Math.min(params.scale || 0.54, 0.54),
      align: "center" as const,
      panelTone: "light-glass" as const,
      moduleVariant: "project-comparison-card" as const,
    };
  }
  if (
    !params.moduleVariant &&
    (marker.includes("income-split") ||
      clip.label.includes("收入分栏") ||
      clip.label.includes("收入拆分"))
  ) {
    return {
      ...params,
      x: 10,
      y: 50,
      scale: Math.min(params.scale || 0.6, 0.6),
      align: "left" as const,
      panelTone: "light-glass" as const,
      moduleVariant: "income-split-card" as const,
    };
  }
  if (
    !params.moduleVariant &&
    (marker.includes("dot-grid") ||
      clip.label.includes("点阵统计") ||
      clip.label.includes("热力"))
  ) {
    return {
      ...params,
      x: 10,
      y: 48,
      scale: Math.min(params.scale || 0.62, 0.62),
      align: "left" as const,
      panelTone: "dark-glass" as const,
      moduleVariant: "dot-grid-stat-card" as const,
    };
  }
  if (
    !params.moduleVariant &&
    (marker.includes("mind-map") ||
      clip.label.includes("三层思维导图") ||
      clip.label.includes("三大核心规则"))
  ) {
    return {
      ...params,
      x: 10,
      y: 34,
      scale: Math.min(params.scale || 0.62, 0.62),
      align: "left" as const,
      panelTone: "none" as const,
      moduleVariant: "three-layer-mind-map" as const,
    };
  }
  if (
    !params.moduleVariant &&
    (marker.includes("process-bubble") ||
      clip.label.includes("流程气泡") ||
      clip.label.includes("自动化流程"))
  ) {
    return {
      ...params,
      x: 10,
      y: 52,
      scale: Math.min(params.scale || 0.64, 0.64),
      align: "left" as const,
      panelTone: "dark-glass" as const,
      moduleVariant: "glass-process-bubble" as const,
    };
  }
  if (
    !params.moduleVariant &&
    (marker.includes("chain") ||
      clip.label.includes("链路气泡") ||
      clip.label.includes("三步链路"))
  ) {
    return {
      ...params,
      x: 10,
      y: 54,
      scale: Math.min(params.scale || 0.62, 0.62),
      align: "left" as const,
      panelTone: "none" as const,
      moduleVariant: "chain-bubble-flow" as const,
    };
  }
  return params;
}

function normalizeClipText(
  effectId: EffectId,
  text: string,
) {
  const safeText = (text || "").trim();
  if (!safeText) return "未命名动效";
  const fallback = legacyTextByEffect[effectId];
  if (fallback && isLegacyDefaultText(effectId, safeText)) {
    return fallback;
  }
  return safeText;
}

function isLegacyDefaultText(effectId: EffectId, text: string) {
  const safeText = (text || "").trim();
  if (!safeText) return false;
  if (effectId === "amber-progress-ring") {
    return /3,400 轮流浪对话|STRAY CHATS|41,000 轮/.test(safeText);
  }
  if (effectId === "numeric-punch-card") {
    return /同款复刻|SAME RESULT|5\s*MIN/.test(safeText);
  }
  if (effectId === "three-step-action-card") {
    return /把满格调回 20 万|Claude Code 给我的三条药方|状态栏校准/.test(safeText);
  }
  return false;
}

const legacyTextByEffect: Partial<Record<EffectId, string>> = {
  "amber-progress-ring":
    "03\n完成率提升\nPERCENT / COMPLETION\n75%\n数字更小一档，百分号更克制，中心更干净",
  "income-split-card": "上月自媒体总收入14000元，其中AI创作基金12636元",
  "dot-grid-stat-card": "拆解200家AI创业公司，73%都是套壳产品",
  "three-layer-mind-map": "短视频破十万播放三大核心规则",
  "glass-process-bubble": "AI自动化流程能大幅提升内容创作效率",
  "chain-bubble-flow":
    "编辑台的逻辑\n先按自己的喜好 · 建一个动效素材库\n再搭建一个编辑台\n以后每条视频 · 只需几分钟",
  "review-split-card": "AI 视觉工作流\n场景\nVAST\n人物\nTINY\n建筑更简洁\nMINIMAL",
  "pressure-bar-comparison":
    "资本开支压力\n微软 CY2026 | 约 $190B | 92\nMeta 2025 指引 | $125B-145B | 68\n亚马逊 P&E 增量 | +$59.3B | 38\n苹果 | 相对稳定 | 16\n重点不是谁花最多，而是这些支出什么时候停止稀释毛利率与自由现金流。",
  "numeric-punch-card": "5\nMIN\n同款复刻\nSAME RESULT",
  "three-step-action-card":
    "把满格调回 20 万\n动作 1|状态栏校准|满格 100 万 -> 20 万，显示绝对数字\n动作 2|到线就清理|黄/红就动手，clear 或重开对话\n动作 3|及时开新对话|新话题新窗口，别让一个对话塞几千轮\n绿 · 随便干|黄 · 准备换气|红 · 已在付价",
};

function normalizeTitleColorForModule(params: OverlayClip["params"]) {
  if (params.moduleVariant && !params.titleColor) {
    return { ...params, titleColor: "" };
  }
  return params;
}

export function cueToClip(
  cue: SrtCue,
  index: number,
  accent = "#c90000",
): OverlayClip {
  const effectId = defaultEffectOrder[index % defaultEffectOrder.length];
  const effect = effectsById[effectId];
  const duration = Math.max(1.6, cue.end - cue.start);
  const position = safePositionFor(effectId, index);
  const contentRole = classifySubtitle(cue.text);

  return {
    id: `srt-${cue.index}-${Date.now()}`,
    effectId,
    label: `字幕 ${cue.index}`,
    text: cue.text,
    start: Number(cue.start.toFixed(2)),
    duration: Number(
      Math.min(duration, effect.defaultDuration + 1.4).toFixed(2),
    ),
    lane: index % 3,
    enabled: true,
    params: {
      ...effect.defaultParams,
      accent,
      x: position.x,
      y: position.y,
      scale: effectId === "section-head" ? 0.68 : 0.72,
      contentRole,
    },
  };
}

export function normalizeProject(
  raw: Partial<OverlayProject>,
  fallback: OverlayProject,
): OverlayProject {
  const clips = Array.isArray(raw.clips) ? raw.clips : fallback.clips;
  const fallbackStyleId: StyleId = fallback.styleId || "tech-hud";
  const styleId =
    raw.styleId && stylesById[raw.styleId] ? raw.styleId : fallbackStyleId;
  return {
    title: raw.title || fallback.title,
    styleId,
    globalTitleColor:
      typeof raw.globalTitleColor === "string"
        ? raw.globalTitleColor
        : fallback.globalTitleColor,
    showSafeZones:
      typeof raw.showSafeZones === "boolean"
        ? raw.showSafeZones
        : fallback.showSafeZones,
    meta: raw.meta || fallback.meta,
    canvas: {
      ...fallback.canvas,
      ...raw.canvas,
    },
    clips: clips.map((clip, index) => {
      const effectId =
        clip.effectId && effectsById[clip.effectId]
          ? clip.effectId
          : "section-head";
      const effect = effectsById[effectId];
      const params = normalizeTitleColorForModule(
        migrateLegacyModule(clip as OverlayClip, {
          ...effect.defaultParams,
          ...clip.params,
        }),
      );
      return {
        id: clip.id || `clip-${index + 1}`,
        effectId,
        label: clip.label || effect.name,
        text: normalizeClipText(effectId, clip.text),
        start: Number.isFinite(clip.start) ? clip.start : index * 2,
        duration: Number.isFinite(clip.duration)
          ? clip.duration
          : effect.defaultDuration,
        lane: Number.isFinite(clip.lane) ? clip.lane : index % 3,
        enabled: clip.enabled ?? true,
        params: avoidFaceZone(effectId, {
          ...params,
          contentRole:
            params.contentRole || classifySubtitle(normalizeClipText(effectId, clip.text)),
        }, index),
      };
    }),
  };
}

export function downloadJson(project: OverlayProject) {
  const blob = new Blob([JSON.stringify(project, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  const fileName = project.title
    .trim()
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
  anchor.download = `${fileName || "overlay-project"}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}
