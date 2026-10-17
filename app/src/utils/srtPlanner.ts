import { clamp } from "./time";
import { effectsById } from "../data/effectRegistry";
import type {
  EffectId,
  ModuleVariant,
  OverlayClip,
  SubtitleCategory,
  SrtCue,
} from "../types";

type DraftSpec = {
  effectId: EffectId;
  label: string;
  text: string;
  kicker: string;
  subtitle: string;
  startIndex: number;
  endIndex: number;
  x: number;
  y: number;
  scale: number;
  lane: number;
  panelTone?: OverlayClip["params"]["panelTone"];
  align?: OverlayClip["params"]["align"];
  cardTheme?: OverlayClip["params"]["cardTheme"];
  moduleVariant?: ModuleVariant;
};

type SemanticAnalysis = {
  category: SubtitleCategory;
  intent:
    | "结论"
    | "增长对比"
    | "比例"
    | "普通数值"
    | "流程"
    | "清单"
    | "项目对比"
    | "重点短语"
    | "辅助说明";
  priority: "high" | "medium" | "low";
  shouldAnimate: boolean;
  skipReason?: string;
};

export type SrtSemanticPlan = SemanticAnalysis & {
  index: number;
  start: number;
  end: number;
  text: string;
  recommendedEffect: EffectId | null;
};

export function classifySubtitle(text: string): SubtitleCategory {
  const normalized = normalizeRouteText(text);
  const lines = normalized
    .split(/[|｜\n]/)
    .map((line) => line.trim())
    .filter(Boolean);
  const compact = normalized.replace(/\s+/g, "");
  const isShortTag =
    compact.length <= 10 &&
    !/[。！？.!?]/.test(compact) &&
    !/\d/.test(compact);
  if (isShortTag) return "短标签";
  if (hasStepSignal(normalized))
    return "规则步骤";
  if (
    /%|％|百分比|占比|完成率|转化率|错误率|成功率|命中率|收入|金额|成本|耗时|增长|下降|提升|降低|播放|人数|数量|数据|指标|\d/.test(
      normalized,
    )
  )
    return "数据内容";
  if (lines.length >= 3) return "多条清单";
  if (
    /结论|核心|关键|观点|判断|总之|所以|因此|最重要|重点|必须|一定/.test(
      normalized,
    )
  )
    return "主观点";
  if (/说明|解释|补充|比如|例如|原因|背景|辅助|参考|备注|注释/.test(normalized))
    return "辅助说明";
  return lines.length > 1 ? "多条清单" : "辅助说明";
}

function analyzeSubtitle(text: string): SemanticAnalysis {
  const normalized = normalizeRouteText(text);
  const category = classifySubtitle(normalized);
  const hasPercent = hasPercentSignal(normalized);
  const hasTrend = hasTrendSignal(normalized);
  const hasComparison = /对比|比较|差异|分别|优于|低于|高于|更快|更慢|最好|最差/.test(
    normalized,
  );
  const hasProcess = hasStepSignal(normalized);
  const hasList = /、|，|,/.test(normalized) && normalized.length >= 8;
  const hasHighlight = /最重要的是|真正重要的是|重点是|关键是|核心是|记住|也就是说/.test(
    normalized,
  );
  const hasNumber = /\d/.test(normalized);

  let intent: SemanticAnalysis["intent"] = "辅助说明";
  if (hasPercent) intent = "比例";
  else if (hasTrend) intent = "增长对比";
  else if (hasComparison) intent = "项目对比";
  else if (hasProcess) intent = "流程";
  else if (hasList) intent = "清单";
  else if (hasHighlight) intent = "重点短语";
  else if (hasNumber) intent = "普通数值";
  else if (category === "主观点") intent = "结论";

  const isFiller = fillerPatterns.some((pattern) => pattern.test(normalized));
  const isLowInfo =
    isFiller ||
    category === "短标签" ||
    (category === "辅助说明" && !hasNumber && !hasComparison && !hasHighlight);
  const shouldAnimate = !isLowInfo && normalized.length >= 5;
  return {
    category,
    intent,
    priority:
      hasPercent || hasTrend || hasComparison || hasHighlight || category === "主观点"
        ? "high"
        : shouldAnimate
          ? "medium"
          : "low",
    shouldAnimate,
    skipReason: shouldAnimate ? undefined : isFiller ? "口头填充" : "信息增量不足",
  };
}

function normalizeCueText(text: string) {
  return text
    .replace(/\s+/g, " ")
    .replace(/^[,，、。.!！?？\s]+|[,，、。.!！?？\s]+$/g, "")
    .trim();
}

function isIncompleteCue(text: string) {
  return /[,，、:：及和与或的]$/u.test(text) || text.length <= 8;
}

function mergeSemanticCues(cues: SrtCue[]) {
  const ordered = cues
    .filter((cue) => hasChinese(cue.text))
    .sort((a, b) => a.start - b.start);
  const merged: SrtCue[] = [];
  for (const cue of ordered) {
    const text = normalizeCueText(cue.text);
    if (!text) continue;
    const previous = merged.at(-1);
    if (previous && normalizeCueText(previous.text) === text) continue;
    const gap = previous ? cue.start - previous.end : Number.POSITIVE_INFINITY;
    const previousAnalysis = previous ? analyzeSubtitle(previous.text) : null;
    const canMerge =
      previous &&
      gap >= -0.05 &&
      gap <= 0.45 &&
      isIncompleteCue(previous.text) &&
      previousAnalysis?.intent !== "比例" &&
      previousAnalysis?.intent !== "增长对比";
    if (canMerge) {
      previous.text = `${normalizeCueText(previous.text)}${text}`;
      previous.end = Math.max(previous.end, cue.end);
      continue;
    }
    merged.push({ ...cue, text });
  }
  return merged;
}

function categoryPriority(category: SubtitleCategory) {
  switch (category) {
    case "主观点":
      return 0;
    case "数据内容":
      return 1;
    case "规则步骤":
      return 2;
    case "多条清单":
      return 3;
    case "辅助说明":
      return 4;
    case "短标签":
      return 5;
    default:
      return 6;
  }
}

function hasChinese(text: string) {
  return /[\u4e00-\u9fff]/.test(text);
}

function pickPrimaryLanguageCues(cues: SrtCue[]) {
  const chineseCues = cues.filter((cue) => hasChinese(cue.text));
  return chineseCues.length ? chineseCues : cues;
}

// Four-second buckets allow a dense cut of up to about 15 cards per minute.
// Low-information and duplicate cues are still filtered before selection.
const motionBucketSeconds = 4;

const fillerPatterns = [
  /^(然后|但是|就是|其实|这个|那个|所以|因为|而且|还有|对吧|嘛|啊|嗯|呃|有点|可能|感觉)$/,
  /^(然后呢|就是这个|差不多|大概|可以说|这样子|那种)$/,
];

const motionKeywords = [
  "步骤",
  "流程",
  "对比",
  "排名",
  "结论",
  "重点",
  "增长",
  "下降",
  "提升",
  "成本",
  "耗时",
  "转化",
  "错误率",
  "参数",
  "位置",
  "大小",
  "颜色",
  "字体",
  "节奏",
  "控制",
  "标题",
  "卡片",
  "项目",
  "素材",
  "复刻",
  "沉淀",
  "库",
  "视频",
  "SRT",
  "JSON",
  "时间轴",
  "APP",
  "图标",
  "模型",
  "数据",
  "数字",
  "百分比",
  "人脸",
  "安全区",
  "分屏",
];

function scoreCueForMotion(cue: SrtCue) {
  const text = cue.text.replace(/\s+/g, " ").trim();
  const compact = text.replace(/[^\u4e00-\u9fffA-Za-z0-9%|：:·./-]/g, "");
  let score = 0;

  if (fillerPatterns.some((pattern) => pattern.test(text))) score -= 6;
  if (text.length <= 4) score -= 4;
  if (text.length <= 8) score -= 2;
  const analysis = analyzeSubtitle(text);
  const category = analysis.category;
  if (category === "短标签") score -= 2;
  if (category === "辅助说明") score -= 1;
  if (category === "多条清单") score += 2;
  if (category === "规则步骤") score += 3;
  if (category === "数据内容") score += 4;
  if (category === "主观点") score += 5;
  if (analysis.priority === "high") score += 3;
  if (!analysis.shouldAnimate) score -= 8;
  if (text.length >= 12) score += 2;
  if (text.length >= 24) score += 2;
  if (text.includes("\n")) score += 3;
  if (/[|｜：:]/.test(text)) score += 3;
  if (/[0-9]+/.test(text)) score += 4;
  if (/%/.test(text)) score += 5;
  if (/[A-Z]{2,}/.test(text)) score += 2;
  if (
    /对比|比较|差异|反而|而是|不是|但是|结论|重点|核心|关键|总之|所以|因此/.test(
      text,
    )
  )
    score += 4;
  if (/增长|下降|提升|成本|耗时|转化|错误率|收益|结果|效率/.test(text))
    score += 3;
  if (text.length >= 18) score += 1;
  if (compact.length >= 10) score += 1;
  for (const keyword of motionKeywords) {
    if (text.includes(keyword)) score += 2;
  }

  return score;
}

function computeTotalDuration(cues: SrtCue[], maxDuration: number) {
  const lastCueEnd = cues.reduce((max, cue) => Math.max(max, cue.end), 0);
  return Math.max(0, Math.min(maxDuration, lastCueEnd));
}

function selectMotionCues(cues: SrtCue[], maxDuration: number) {
  const totalDuration = computeTotalDuration(cues, maxDuration);
  if (!totalDuration) return [];

  const bucketCount = Math.max(
    1,
    Math.ceil(totalDuration / motionBucketSeconds),
  );
  const buckets = Array.from(
    { length: bucketCount },
    () => [] as Array<{ cue: SrtCue; score: number }>,
  );

  for (const cue of cues) {
    if (cue.start >= totalDuration || cue.end <= 0) continue;
    const score = scoreCueForMotion(cue);
    const firstBucket = Math.max(
      0,
      Math.floor(cue.start / motionBucketSeconds),
    );
    const lastBucket = Math.max(
      firstBucket,
      Math.min(
        bucketCount - 1,
        Math.floor(
          (Math.max(cue.end - 0.01, cue.start) - 0.01) / motionBucketSeconds,
        ),
      ),
    );
    for (
      let bucketIndex = firstBucket;
      bucketIndex <= lastBucket;
      bucketIndex += 1
    ) {
      buckets[bucketIndex].push({ cue, score });
    }
  }

  const selected = new Set<number>();
  const seenTopics = new Set<string>();
  const output: SrtCue[] = [];
  for (const bucket of buckets) {
    const best = bucket
      .filter(({ cue }) => !selected.has(cue.index))
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        const durationDiff =
          b.cue.end - b.cue.start - (a.cue.end - a.cue.start);
        if (durationDiff !== 0) return durationDiff;
        return a.cue.start - b.cue.start;
      })[0];

    if (!best) continue;
    const analysis = analyzeSubtitle(best.cue.text);
    if (!analysis.shouldAnimate || best.score < 1) continue;
    const topicKey = normalizeCueText(best.cue.text)
      .replace(/[0-9%％.,，。！？!?]/g, "")
      .slice(0, 18);
    if (topicKey && seenTopics.has(topicKey)) continue;
    selected.add(best.cue.index);
    if (topicKey) seenTopics.add(topicKey);
    output.push(best.cue);
  }

  return output.sort((a, b) => a.start - b.start);
}

function safeRange(cues: SrtCue[], startIndex: number, endIndex: number) {
  const safeStart = Math.max(0, Math.min(startIndex, cues.length - 1));
  const safeEnd = Math.max(safeStart, Math.min(endIndex, cues.length - 1));
  const startCue = cues[safeStart];
  const endCue = cues[safeEnd];
  const start = Number((startCue?.start ?? 0).toFixed(2));
  const end = Number((endCue?.end ?? start + 2).toFixed(2));
  return { start, end };
}

type RoutePreset = {
  effectId: EffectId;
  label: string;
  kicker: string;
  subtitle: string;
  x: number;
  y: number;
  scale: number;
  lane: number;
  align?: OverlayClip["params"]["align"];
  panelTone?: OverlayClip["params"]["panelTone"];
  cardTheme?: OverlayClip["params"]["cardTheme"];
  moduleVariant?: ModuleVariant;
};

const baseRoutePresets = {
  sectionHead: {
    effectId: "section-head",
    label: "段落标题",
    kicker: "SECTION",
    subtitle: "关键段落开始",
    x: 13,
    y: 22,
    scale: 0.72,
    lane: 0,
    align: "left",
    panelTone: "light-glass",
  },
  infoBoard: {
    effectId: "info-board",
    label: "信息板",
    kicker: "BOARD",
    subtitle: "用换行拆成多条",
    x: 10,
    y: 58,
    scale: 0.58,
    lane: 1,
    align: "left",
    panelTone: "light-glass",
  },
  strikeFlip: {
    effectId: "strike-flip",
    label: "反转打脸",
    kicker: "FLIP",
    subtitle: "不是这样，而是这样",
    x: 10,
    y: 28,
    scale: 0.58,
    lane: 1,
    align: "left",
    panelTone: "none",
  },
  ambientWash: {
    effectId: "ambient-wash",
    label: "氛围色洗",
    kicker: "ATMOSPHERE",
    subtitle: "soft edge wash",
    x: 12,
    y: 84,
    scale: 0.5,
    lane: 2,
    align: "left",
    panelTone: "none",
  },
  metricArrow: {
    effectId: "metric-arrow",
    label: "数字箭头卡",
    kicker: "METRIC ARROW",
    subtitle: "单指标变化 / 上升下降",
    x: 8,
    y: 47,
    scale: 0.6,
    lane: 0,
    align: "left",
    panelTone: "none",
    moduleVariant: "metric-arrow-card",
  },
  episodeCounter: {
    effectId: "episode-counter-card",
    label: "播放计数卡",
    kicker: "LAST EPISODE",
    subtitle: "VIEWS / 播放",
    x: 10,
    y: 18,
    scale: 0.62,
    lane: 1,
    align: "left",
    panelTone: "none",
    moduleVariant: "episode-counter-card",
  },
  odometer: {
    effectId: "odometer-digit-roll",
    label: "里程表数字滚动",
    kicker: "ODOMETER",
    subtitle: "数字滚轮",
    x: 10,
    y: 32,
    scale: 0.52,
    lane: 1,
    align: "left",
    panelTone: "none",
    moduleVariant: "odometer-digit-roll",
  },
  projectComparison: {
    effectId: "project-comparison",
    label: "项目对比卡",
    kicker: "PROJECT MATRIX",
    subtitle: "项目 / 方案 / 能力对比",
    x: 8,
    y: 78,
    scale: 0.42,
    lane: 2,
    align: "left",
    panelTone: "light-glass",
    moduleVariant: "project-comparison-card",
  },

  splitEvidence: {
    effectId: "split-evidence",
    label: "分屏材料卡",
    kicker: "SPLIT VIEW",
    subtitle: "材料 / 证据 / 人物解释",
    x: 8,
    y: 78,
    scale: 0.48,
    lane: 0,
    align: "left",
    panelTone: "dark-glass",
    moduleVariant: "split-evidence-layout",
  },
  reviewSplitCard: {
    effectId: "review-split-card",
    label: "评审对比卡",
    kicker: "ROUND 1 · REVIEW",
    subtitle: "场景 / 人物 / 风格评审",
    x: 10,
    y: 45,
    scale: 0.54,
    lane: 0,
    align: "left",
    panelTone: "none",
    moduleVariant: "review-split-card",
  },
  pressureBarComparison: {
    effectId: "pressure-bar-comparison",
    label: "压力条对比卡",
    kicker: "报告已摘取",
    subtitle: "横向对比 / 压力条",
    x: 10,
    y: 50,
    scale: 0.56,
    lane: 1,
    align: "left",
    panelTone: "dark-glass",
    moduleVariant: "pressure-bar-comparison",
  },
  threeStepActionCard: {
    effectId: "three-step-action-card",
    label: "三步行动卡",
    kicker: "01 · RESET THE GAUGE",
    subtitle: "三条动作 / 状态分级",
    x: 8,
    y: 52,
    scale: 0.48,
    lane: 0,
    align: "left",
    panelTone: "light-glass",
    moduleVariant: "three-step-action-card",
  },
  threeStepChecklist: {
    effectId: "three-step-checklist",
    label: "三步流程清单卡",
    kicker: "BACK TO THE QUESTION",
    subtitle: "三段流程 / 逐项完成",
    x: 7,
    y: 38,
    scale: 0.52,
    lane: 0,
    align: "left",
    panelTone: "none",
    moduleVariant: "three-step-checklist-card",
  },
  dualMetricRuler: {
    effectId: "dual-metric-ruler",
    label: "双轨数据标尺卡",
    kicker: "THIS TIME · A WHOLE PRODUCTION LINE",
    subtitle: "量级标尺 / 数据位置",
    x: 7,
    y: 36,
    scale: 0.54,
    lane: 1,
    align: "left",
    panelTone: "none",
    moduleVariant: "dual-metric-ruler-card",
  },
  workflowActionList: {
    effectId: "workflow-action-list",
    label: "工作流行动列表卡",
    kicker: "OPEN THE WORKFLOW",
    subtitle: "动作清单 / 逐项出现",
    x: 8,
    y: 38,
    scale: 0.58,
    lane: 0,
    align: "left",
    panelTone: "none",
    moduleVariant: "workflow-action-list-card",
  },
  taskModuleBreakdown: {
    effectId: "task-module-breakdown",
    label: "任务模块拆解卡",
    kicker: "ROLE ASSETS · BRIEF",
    subtitle: "任务组成 / 模块拆解",
    x: 8,
    y: 48,
    scale: 0.42,
    lane: 0,
    align: "left",
    panelTone: "none",
    moduleVariant: "task-module-breakdown-card",
  },
  largeNumberDotMatrix: {
    effectId: "large-number-dot-matrix",
    label: "大数字资产点阵卡",
    kicker: "VERIFIED SCALE",
    subtitle: "规模结果 / 资产总量",
    x: 8,
    y: 46,
    scale: 0.42,
    lane: 1,
    align: "left",
    panelTone: "none",
    moduleVariant: "large-number-dot-matrix-card",
  },
  multiStepToolchain: {
    effectId: "multi-step-toolchain",
    label: "多步骤工具链卡",
    kicker: "MY WORKFLOW · MULTI STEP",
    subtitle: "多步骤 / 连续工具链",
    x: 8,
    y: 48,
    scale: 0.42,
    lane: 0,
    align: "left",
    panelTone: "none",
    moduleVariant: "multi-step-toolchain-card",
  },
  keyPhraseHighlight: {
    effectId: "key-phrase-highlight",
    label: "重点短语高亮卡",
    kicker: "KEY POINT",
    subtitle: "一句话重点 / 核心短语",
    x: 8,
    y: 46,
    scale: 0.42,
    lane: 0,
    align: "left",
    panelTone: "none",
    moduleVariant: "key-phrase-highlight-card",
  },

  numericPunchCard: {
    effectId: "numeric-punch-card",
    label: "数字强调卡",
    kicker: "NUMERIC PUNCH",
    subtitle: "SAME RESULT",
    x: 10,
    y: 32,
    scale: 0.62,
    lane: 1,
    align: "left",
    panelTone: "none",
    moduleVariant: "numeric-punch-card",
  },
  amberProof: {
    effectId: "amber-proof-title",
    label: "橙标大结论",
    kicker: "AMBER PROOF",
    subtitle: "大标题 + 强结论",
    x: 12,
    y: 25,
    scale: 0.56,
    lane: 0,
    align: "left",
    panelTone: "none",
    moduleVariant: "amber-proof-title",
  },

  amberProgressRing: {
    effectId: "amber-progress-ring",
    label: "百分比环",
    kicker: "03",
    subtitle: "PERCENT / COMPLETION",
    x: 14,
    y: 42,
    scale: 0.58,
    lane: 1,
    align: "left",
    panelTone: "light-glass",
    cardTheme: "bright",
    moduleVariant: "amber-progress-ring",
  },

  amberSceneSteps: {
    effectId: "amber-scene-steps",
    label: "竖向流程步骤",
    kicker: "SCENE 01",
    subtitle: "流程步骤 / SOP",
    x: 12,
    y: 52,
    scale: 0.58,
    lane: 0,
    align: "left",
    panelTone: "none",
    moduleVariant: "amber-scene-steps",
  },

  amberReplicateFlow: {
    effectId: "amber-replicate-flow",
    label: "复刻流程链",
    kicker: "FULL CONTROL",
    subtitle: "每一张动效卡",
    x: 8,
    y: 40,
    scale: 0.56,
    lane: 0,
    align: "left",
    panelTone: "none",
    moduleVariant: "amber-replicate-flow",
  },
  amberLibraryGrid: {
    effectId: "amber-library-grid",
    label: "素材库格子",
    kicker: "YOUR LIBRARY",
    subtitle: "素材沉淀 / 复用资产",
    x: 22,
    y: 68,
    scale: 0.48,
    lane: 0,
    align: "left",
    panelTone: "dark-glass",
    moduleVariant: "amber-library-grid",
  },
  incomeSplitCard: {
    effectId: "income-split-card",
    label: "收入分栏卡",
    kicker: "REVENUE SPLIT",
    subtitle: "收入拆分 / 资金构成",
    x: 10,
    y: 50,
    scale: 0.6,
    lane: 1,
    align: "left",
    panelTone: "light-glass",
    moduleVariant: "income-split-card",
  },
  dotGridStatCard: {
    effectId: "dot-grid-stat-card",
    label: "点阵统计卡",
    kicker: "DOT GRID",
    subtitle: "点阵统计 / 热力分布",
    x: 10,
    y: 48,
    scale: 0.62,
    lane: 1,
    align: "left",
    panelTone: "dark-glass",
    moduleVariant: "dot-grid-stat-card",
  },
  threeLayerMindMap: {
    effectId: "three-layer-mind-map",
    label: "三层思维导图",
    kicker: "MIND MAP",
    subtitle: "三层规则 / 单线展开",
    x: 10,
    y: 34,
    scale: 0.62,
    lane: 0,
    align: "left",
    panelTone: "none",
    moduleVariant: "three-layer-mind-map",
  },
  glassProcessBubble: {
    effectId: "glass-process-bubble",
    label: "流程气泡",
    kicker: "PROCESS BUBBLE",
    subtitle: "AI 自动化流程 / 内容创作提效",
    x: 10,
    y: 52,
    scale: 0.64,
    lane: 0,
    align: "left",
    panelTone: "dark-glass",
    moduleVariant: "glass-process-bubble",
  },
  chainBubbleFlow: {
    effectId: "chain-bubble-flow",
    label: "链路气泡",
    kicker: "THE LOGIC",
    subtitle: "列表 / 环形 / 格子 / 曲线 / 卡片 / 复制",
    x: 7,
    y: 52,
    scale: 0.56,
    lane: 0,
    align: "left",
    panelTone: "none",
    moduleVariant: "chain-bubble-flow",
  },
} satisfies Record<string, RoutePreset>;

const safeFallbackRoutes = [
  baseRoutePresets.sectionHead,
  baseRoutePresets.infoBoard,
  baseRoutePresets.amberProof,
  baseRoutePresets.strikeFlip,
  baseRoutePresets.ambientWash,
];

function titleHas(text: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(text));
}

function normalizeRouteText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function hasPercentSignal(text: string) {
  return /%|％|百分比|百分之|占比|完成率|转化率|错误率|成功率|命中率/.test(
    text,
  );
}

function hasStepSignal(text: string) {
  return /步骤|流程|顺序|SOP|流程图|链路|工具链|多步骤|阶段|第(?:\d+|[零〇一二两三四五六七八九十百千万亿]+)步|(?:\d+|[零〇一二两三四五六七八九十百千万亿]+)(?:个|大)?(?:步骤|阶段|核心规则|规则|原则)|(?:先[^。！？；]*再|首先[^。！？；]*(?:然后|接着|最后))/.test(
    text,
  );
}

function hasNumberSignal(text: string) {
  return /\d|[零〇一二两三四五六七八九十百千万亿]+(?:个|种|张|次|轮|万|亿|%|％|秒|分钟|小时|年|元|块|倍|层|条|位|名|套|页|篇|卡|项|分|天|家|款|点)|第(?:\d+|[零〇一二两三四五六七八九十百千万亿]+)/.test(text);
}

function hasTrendSignal(text: string) {
  return /增长|下降|提升|降低|减少|变多|变少|涨|降|回落|拉升|压低|成本|耗时|收入|收益|转化|错误率|效率|速度|金额|token|Token|TOKEN/.test(
    text,
  );
}

function hasLargeNumberSignal(text: string) {
  if (/\d+(?:\.\d+)?\s*[万亿]/.test(text)) return true;
  return [...text.matchAll(/\d[\d,]*/g)].some((match) => {
    const value = Number.parseInt(match[0].replace(/,/g, ""), 10);
    return Number.isFinite(value) && value >= 10000;
  });
}

function pickRoutePreset(text: string, index: number) {
  const normalized = normalizeRouteText(text);
  const analysis = analyzeSubtitle(normalized);

  // Keep automatic output coherent: only explicit semantic signals leave the default card.
  if (hasPercentSignal(normalized)) return baseRoutePresets.amberProgressRing;
  if (analysis.intent === "流程") return baseRoutePresets.threeStepActionCard;
  if (hasNumberSignal(normalized)) return baseRoutePresets.numericPunchCard;
  return baseRoutePresets.keyPhraseHighlight;
}

function buildClipFromRoute(
  cue: SrtCue,
  index: number,
  accent: string,
  preset: RoutePreset,
): OverlayClip {
  const effect = effectsById[preset.effectId];
  const duration = Math.max(1.6, cue.end - cue.start);
  const lines = cue.text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const label = lines[0] || preset.label;
  const subtitle = lines.slice(1).join(" ") || preset.subtitle;
  const contentRole = classifySubtitle(cue.text);
  return {
    id: `srt-${cue.index}-${Date.now()}`,
    effectId: preset.effectId,
    label,
    text: cue.text,
    start: Number(cue.start.toFixed(2)),
    duration: Number(duration.toFixed(2)),
    lane: preset.lane ?? index % 3,
    enabled: true,
    params: {
      ...effect.defaultParams,
      x: clamp(preset.x, 8, 35),
      y: clamp(
        preset.y,
        preset.moduleVariant === "timeline-progress-bar" ? -16 : 12,
        preset.moduleVariant === "timeline-progress-bar" ? 0 : 86,
      ),
      scale: preset.scale,
      accent,
      intensity: 70,
      speed: 1,
      kicker: preset.kicker,
      subtitle,
      align: "left",
      panelTone: preset.panelTone,
      cardTheme: preset.cardTheme,
      moduleVariant: preset.moduleVariant,
      contentRole,
    },
  };
}

const draftSpecs: DraftSpec[] = [
  {
    effectId: "strike-flip",
    label: "问题反转",
    text: "动效不满意怎么办 / 先把生成和调整拆开",
    kicker: "QUESTION · 01",
    subtitle: "改一次就重烧 token 的问题，先拆开",
    startIndex: 0,
    endIndex: 6,
    x: 12,
    y: 22,
    scale: 0.72,
    lane: 0,
    panelTone: "none",
    align: "left",
  },
  {
    effectId: "section-head",
    label: "分工方式",
    text: "生成交给 AI",
    kicker: "SPLIT WORK",
    subtitle: "调整交给我自己搭的动效工作台",
    startIndex: 14,
    endIndex: 17,
    x: 14,
    y: 20,
    scale: 0.72,
    lane: 0,
    panelTone: "light-glass",
    align: "left",
  },
  {
    effectId: "info-board",
    label: "工作台概念",
    text: [
      "把生成和调整拆开",
      "生成交给 AI",
      "调整交给工作台",
      "你自己在界面上拖两下就完成了",
      "一分钱不花",
    ].join("\n"),
    kicker: "WORKBENCH",
    subtitle: "不要让大模型每次都重写",
    startIndex: 18,
    endIndex: 27,
    x: 10,
    y: 58,
    scale: 0.58,
    lane: 2,
    panelTone: "light-glass",
    align: "left",
  },
  {
    effectId: "odometer-digit-roll",
    label: "卡片数量",
    text: "30",
    kicker: "CARD COUNT",
    subtitle: "已经累积了 30 张动效卡片",
    startIndex: 28,
    endIndex: 31,
    x: 14,
    y: 63,
    scale: 0.64,
    lane: 0,
    panelTone: "none",
    align: "left",
    moduleVariant: "odometer-digit-roll",
  },
  {
    effectId: "info-board",
    label: "环绕动效",
    text: [
      "脚本拆解",
      "信息卡",
      "流程节点",
      "证据图表",
      "标题动效",
      "素材沉淀",
      "参数控制",
      "结果复盘",
    ].join("\n"),
    kicker: "TECH GLASS",
    subtitle: "环绕卡片、亮底暗底和多种配色都能切",
    startIndex: 32,
    endIndex: 36,
    x: 8,
    y: 78,
    scale: 0.46,
    lane: 1,
    panelTone: "light-glass",
    align: "left",
    moduleVariant: "orbit-glass-cards",
  },
  {
    effectId: "section-head",
    label: "工作台收益",
    text: [
      "自己说了算 | 资产归你 | 卡片全由你控制 | 不用再去抽盲盒 | 96",
      "TOKEN 更少 | 后续微调少花钱 | 改一次不重烧 token | 配色字体节奏都能拖 | 92",
      "更有人味 | 贴合你的审美 | 不是模板批发 | 作品更顺手 | 88",
      "可持续扩充 | 库越做越值钱 | 看到好效果就沉淀 | 复用率越来越高 | 94",
    ].join("\n"),
    kicker: "BENEFITS",
    subtitle: "风格、节奏、配色都归你",
    startIndex: 37,
    endIndex: 45,
    x: 8,
    y: 78,
    scale: 0.44,
    lane: 2,
    panelTone: "light-glass",
    align: "left",
    moduleVariant: "project-comparison-card",
  },
  {
    effectId: "info-board",
    label: "素材库沉淀",
    text: ["看到好看的动效", "截图丢给 AI 复刻", "沉淀进自己的素材库"].join(
      "\n",
    ),
    kicker: "EVIDENCE / REPLICATE",
    subtitle: "REFERENCE MATERIAL | AI REPLICATION",
    startIndex: 46,
    endIndex: 51,
    x: 8,
    y: 78,
    scale: 0.46,
    lane: 0,
    panelTone: "dark-glass",
    align: "left",
    moduleVariant: "split-evidence-layout",
  },
  {
    effectId: "section-head",
    label: "收尾 CTA",
    text: "等做成熟了会开源",
    kicker: "OPEN SOURCE",
    subtitle: "评论区告诉我最想要哪种风格的动效卡",
    startIndex: 52,
    endIndex: 60,
    x: 14,
    y: 20,
    scale: 0.72,
    lane: 1,
    panelTone: "light-glass",
    align: "left",
  },
];

export function buildMotionDraftFromSrt(cues: SrtCue[], accent: string) {
  const primaryCues = pickPrimaryLanguageCues(cues);
  if (primaryCues.length < 12) return [];

  return draftSpecs.map((spec, index) => {
    const { start, end } = safeRange(
      primaryCues,
      spec.startIndex,
      spec.endIndex,
    );
    const duration = Number(Math.max(1.6, end - start).toFixed(2));
    return {
      id: `draft-${index + 1}-${primaryCues[spec.startIndex]?.index ?? index + 1}`,
      effectId: spec.effectId,
      label: spec.label,
      text: spec.text,
      start,
      duration,
      lane: spec.lane,
      enabled: true,
      params: {
        x: spec.x,
        y: spec.y,
        scale: spec.scale,
        accent,
        intensity: 70,
        speed: 1,
        kicker: spec.kicker,
        subtitle: spec.subtitle,
        align: spec.align,
        panelTone: spec.panelTone,
        cardTheme: spec.cardTheme,
        moduleVariant: spec.moduleVariant,
      },
    } satisfies OverlayClip;
  });
}

export function buildFullMotionClipsFromSrt(
  cues: SrtCue[],
  accent: string,
  maxDuration = 240,
) {
  const filteredCues = mergeSemanticCues(
    cues.filter((cue) => cue.start < maxDuration && hasChinese(cue.text)),
  );
  const motionCues = selectMotionCues(filteredCues, maxDuration);
  return motionCues.map((cue, index) =>
    buildClipFromRoute(cue, index, accent, pickRoutePreset(cue.text, index)),
  );
}

export function planSrtSemantics(cues: SrtCue[], maxDuration = 240): SrtSemanticPlan[] {
  const semanticCues = mergeSemanticCues(
    cues.filter((cue) => cue.start < maxDuration && hasChinese(cue.text)),
  );
  return semanticCues.map((cue, index) => {
    const analysis = analyzeSubtitle(cue.text);
    return {
      ...analysis,
      index: cue.index,
      start: cue.start,
      end: cue.end,
      text: cue.text,
      recommendedEffect: analysis.shouldAnimate
        ? pickRoutePreset(cue.text, index).effectId
        : null,
    };
  });
}
