import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  DownloadSimple,
  FileText,
  Pause,
  Play,
  Plus,
  Sparkle,
  UploadSimple,
} from "@phosphor-icons/react";
import { Inspector } from "./components/Inspector";
import { PreviewStage } from "./components/PreviewStage";
import { Timeline } from "./components/Timeline";
import { effectRegistry, effectsById } from "./data/effectRegistry";
import {
  allTechModules,
  type EffectCardTemplate,
} from "./data/effectTemplates";
import { stylePresets, stylesById } from "./data/stylePresets";
import { sampleProject } from "./data/sampleProject";
import type {
  AspectRatio,
  SplitBackground,
  EffectId,
  OverlayClip,
  OverlayProject,
  StyleId,
} from "./types";
import { cueToClip, downloadJson, normalizeProject } from "./utils/project";
import { parseSrt } from "./utils/srt";
import { buildFullMotionClipsFromSrt } from "./utils/srtPlanner";
import { clamp, formatTime } from "./utils/time";

const appVersion = "2026.10.15-falling-word-field-v1";
const storageKey = "motion-overlay-studio-project-v6-card-lock";
const legacyStorageKeys = [
  "motion-overlay-studio-project-v5-current-cards",
  "motion-overlay-studio-project-v4-compact-overlay",
  "motion-overlay-studio-project-v3",
  "motion-overlay-studio-project-v2",
];
const legacyProjectTitle = "Overlay Studio Blueprint";
const legacyStudioTitle = "夏哥视效Studio";
const legacyWorkspaceTitle = "视效工作台";
const defaultProjectTitle = "夏哥视效工作台";

function hashString(value: string) {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33) ^ value.charCodeAt(index);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function cloneProject(project: OverlayProject) {
  return JSON.parse(JSON.stringify(project)) as OverlayProject;
}

function createLibrarySignature() {
  const payload = {
    appVersion,
    effects: effectRegistry.map((effect) => ({
      id: effect.id,
      name: effect.name,
      params: effect.defaultParams,
    })),
    techModules: allTechModules.map((module) => ({
      id: module.id,
      name: module.name,
      effectId: module.effectId,
      text: module.text,
      params: module.params,
    })),
    styles: stylePresets.map((style) => ({
      id: style.id,
      name: style.name,
      tokens: style.tokens,
    })),
  };
  return `${appVersion}-${hashString(JSON.stringify(payload))}`;
}

const cardLibrarySignature = createLibrarySignature();

function withProjectMeta(project: OverlayProject): OverlayProject {
  return {
    ...project,
    meta: {
      ...project.meta,
      appVersion,
      cardLibrarySignature,
      savedAt: new Date().toISOString(),
    },
  };
}

function createFreshProject(showSafeZones = false) {
  return withProjectMeta({
    ...cloneProject(sampleProject),
    title: defaultProjectTitle,
    showSafeZones,
  });
}

function isSavedProjectFresh(project: Partial<OverlayProject>) {
  return project.meta?.cardLibrarySignature === cardLibrarySignature;
}

type TitleToneId = "ice-white" | "blue-white" | "warm-white";

const titleTonePresets: Array<{
  id: TitleToneId;
  name: string;
  hint: string;
  title: string;
  soft: string;
  glow: string;
  shadow: string;
}> = [
  {
    id: "ice-white",
    name: "冷白",
    hint: "更干净，适合蓝色科技玻璃",
    title: "#f8fdff",
    soft: "rgba(0, 229, 255, 0.18)",
    glow: "rgba(0, 229, 255, 0.16)",
    shadow: "rgba(0, 0, 0, 0.22)",
  },
  {
    id: "blue-white",
    name: "蓝白",
    hint: "略带蓝感，识别度更强",
    title: "#eaf7ff",
    soft: "rgba(96, 176, 255, 0.18)",
    glow: "rgba(96, 176, 255, 0.18)",
    shadow: "rgba(0, 0, 0, 0.24)",
  },
  {
    id: "warm-white",
    name: "暖白",
    hint: "更柔和，适合琥珀科技风",
    title: "#fff8e8",
    soft: "rgba(255, 173, 68, 0.18)",
    glow: "rgba(255, 173, 68, 0.16)",
    shadow: "rgba(50, 40, 24, 0.18)",
  },
];

function hexToRgb(hex: string) {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return null;
  const value = Number.parseInt(match[1], 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function titleToneFromColor(color: string) {
  const rgb = hexToRgb(color);
  if (!rgb) {
    return {
      title: color,
      soft: "rgba(255, 255, 255, 0.72)",
      glow: "rgba(255, 255, 255, 0.16)",
      shadow: "rgba(0, 0, 0, 0.22)",
    };
  }
  const luminance = (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
  const isLight = luminance >= 0.62;
  return {
    title: color,
    soft: isLight ? "rgba(255, 255, 255, 0.72)" : "rgba(17, 24, 39, 0.68)",
    glow: isLight ? "rgba(255, 255, 255, 0.18)" : "rgba(0, 0, 0, 0.14)",
    shadow: "rgba(0, 0, 0, 0.24)",
  };
}

const safeDropZones: Record<EffectId, Array<{ x: number; y: number }>> = {
  "ambient-wash": [
    { x: 12, y: 84 },
    { x: 28, y: 84 },
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

function leftSafePositionFor(effectId: EffectId, index: number) {
  const zones = safeDropZones[effectId] || safeDropZones["section-head"];
  return zones[index % zones.length];
}

function forceLeftSafeParams(
  effectId: EffectId,
  params: OverlayClip["params"],
  index: number,
) {
  if (params.moduleVariant === "timeline-progress-bar") {
    return { ...params, x: 3, y: 0, align: "left" as const };
  }
  if (params.moduleVariant) {
    return { ...params, align: "left" as const };
  }
  return { ...params, ...leftSafePositionFor(effectId, index), align: "left" as const };
}

function defaultTextForEffect(effectId: EffectId) {
  switch (effectId) {
    case "info-board":
      return "第一条要点\n第二条要点\n第三条要点";
    case "strike-flip":
      return "原来的判断 / 新的判断";
    case "metric-arrow":
      return "把指标拉回安全线\n实测方案给出的三步动作\n关键指标\n真的有效\n52万\n-88%\n6.6万\n优化后";
    case "odometer-digit-roll":
      return "99.98%";
    case "episode-counter-card":
      return "300,000+\nAIGC 全链路 · 那期\nVIEWS · 播放";
    case "project-comparison":
      return "项目 A | 速度最快 | 自动化能力 | 适合快速验证，后续再精修。 | 92\n项目 B | 稳定性强 | 流程完整 | 适合正式交付，但启动成本更高。 | 86\n项目 C | 成本更低 | 手动调整 | 适合轻量任务，复杂项目会吃力。 | 74\n项目 D | 可扩展 | 长期资产 | 前期慢一点，但复用价值更高。 | 69";
    case "split-evidence":
      return "人物讲解\n演示画面\n重点结论";
    case "amber-proof-title":
      return "只花了几分钟";
    case "amber-progress-ring":
      return "03\n完成率提升\nPERCENT / COMPLETION\n75%\n数字更小一档，百分号更克制，中心更干净";
    case "amber-scene-steps":
      return "直接上传 SRT 口播稿\n大模型做语义分割\n配适合的动效\n输出 JSON 卡点呈现";
    case "amber-replicate-flow":
      return "01\nFULL CONTROL\n所有动效 · 你自己\n每一张动效卡\n位置\n大小\n颜色\n字体\n快慢";
    case "amber-library-grid":
      return "提示框\n流程线\n参数条\n标题卡\n证据卡\n增长 +1";
    case "income-split-card":
      return "上月自媒体总收入14000元，其中AI创作基金12636元";
    case "dot-grid-stat-card":
      return "拆解200家AI创业公司，73%都是套壳产品";
    case "three-layer-mind-map":
      return "短视频破十万播放三大核心规则";
    case "glass-process-bubble":
      return "AI自动化流程能大幅提升内容创作效率";
    case "chain-bubble-flow":
      return "编辑台的逻辑\n先按自己的喜好 · 建一个动效素材库\n再搭建一个编辑台\n以后每条视频 · 只需几分钟";
    case "review-split-card":
      return "AI 视觉工作流\n场景\nVAST\n人物\nTINY\n建筑更简洁\nMINIMAL";
    case "pressure-bar-comparison":
      return "资本开支压力\n微软 CY2026 | 约 $190B | 92\nMeta 2025 指引 | $125B-145B | 68\n亚马逊 P&E 增量 | +$59.3B | 38\n苹果 | 相对稳定 | 16\n重点不是谁花最多，而是这些支出什么时候停止稀释毛利率与自由现金流。";
    case "numeric-punch-card":
      return "5\nMIN\n同款复刻\nSAME RESULT";
    case "three-step-action-card":
      return "把满格调回 20 万\n动作 1|状态栏校准|满格 100 万 → 20 万，显示绝对数字\n动作 2|到线就清理|黄/红就动手，clear 或重开对话\n动作 3|及时开新对话|新话题新窗口，别让一个对话塞几千轮\n绿 · 随便干|黄 · 准备换气|红 · 已在付价";
    case "three-step-checklist":
      return "哪几步是 AI 干的？\n回到问题 / 看完整流程\n创意|想法 / 大纲 / 分镜\n资产|素材 / 模板 / 数据\n成片|生成 / 合成 / 审核";
    case "dual-metric-ruler":
      return "一整条生产链\n上回 · 方案 A|结果 A|22\n这回 · 方案 B|结果 B|82";
    case "workflow-action-list":
      return "拆解工作流|OPEN THE WORKFLOW\n丢一个想法|DROP ONE IDEA\n评论区反馈|TELL ME IN COMMENTS";
    case "task-module-breakdown":
      return "内容生产系统\nCONTENT PRODUCTION SYSTEM\n实拍素材\n多视图资产\n肖像风险控制";
    case "large-number-dot-matrix":
      return "30,000\n套\nFILM-GRADE ASSETS · VERIFIED\n角色资产\n场景资产";
    case "multi-step-toolchain":
      return "脚本|SCRIPT\n图片|IMAGE\n视频|VIDEO\n配音|VOICE\n剪辑|EDIT";
    case "key-phrase-highlight":
      return "核心运营能力|OPEN WORKFLOW\n评论区智能体|COMMENT AGENT\n数据看板|DATA DASHBOARD";
    default:
      return "新的动效文案";
  }
}

function defaultTitleColorForBaseEffect(effectId: EffectId) {
  if (effectId === "info-board") return "#111111";
  if (effectId === "ambient-wash")
    return "#ffffff";
  if (effectId === "amber-progress-ring") return "#1f2937";
  if (effectId === "odometer-digit-roll")
    return "#111111";
  if (effectId === "episode-counter-card") return "#4dd0ff";
  if (effectId === "income-split-card") return "#111111";
  if (effectId === "dot-grid-stat-card") return "#f8fdff";
  if (effectId === "three-layer-mind-map") return "#f8fdff";
  if (effectId === "glass-process-bubble") return "#f8fdff";
  if (effectId === "chain-bubble-flow") return "#f8fdff";
  if (effectId === "review-split-card") return "#f8fdff";
  if (effectId === "pressure-bar-comparison") return "#f8fdff";
  if (effectId === "numeric-punch-card") return "#f8fdff";
  if (effectId === "three-step-action-card") return "#12213a";
  if (effectId.startsWith("amber-")) return "#fff8e8";
  return undefined;
}

function inferContentRole(effectId: EffectId, text: string): "主观点" | "辅助说明" | "数据内容" | "规则步骤" | "多条清单" | "短标签" {
  const source = `${text} ${effectId}`;
  if (/步骤|流程|顺序|第一步|第二步|第三步|先|再|最后|SOP/.test(source)) return "规则步骤";
  if (/%|％|百分比|完成率|转化率|错误率|成功率|收入|播放|金额|\d/.test(source)) return "数据内容";
  if (/\n|\|/.test(text)) return "多条清单";
  if (/结论|重点|核心|观点|判断|必须|一定|所以|因此/.test(source)) return "主观点";
  if ((text || "").trim().length <= 10) return "短标签";
  return "辅助说明";
}

function clampToStageBounds(
  key: keyof OverlayClip["params"],
  value: string | number,
  clip?: OverlayClip,
) {
  if (typeof value !== "number") return value;
  if (key === "x") {
    const isTimeline = clip?.params.moduleVariant === "timeline-progress-bar";
    return clamp(value, 3, isTimeline ? 97 : 72);
  }
  if (key === "y") {
    const isTimeline = clip?.params.moduleVariant === "timeline-progress-bar";
    const minY = isTimeline ? -16 : 12;
    const maxY = isTimeline ? 0 : 86;
    return clamp(value, minY, maxY);
  }
  if (key === "widthScale") return clamp(value, 0.65, 1.6);
  if (key === "heightScale") return clamp(value, 0.7, 1.5);
  return value;
}

function isTimelineProgressClip(clip: OverlayClip) {
  return clip.params.moduleVariant === "timeline-progress-bar";
}

const activePipelines = [
  {
    id: "xhs-video-overlay-packaging",
    name: "粗剪叠加透明动效",
    output: "ProRes 4444 MOV",
    detail: "粗剪视频 + SRT -> 动效规划表 -> 透明 overlay -> 剪映上方轨道",
    prompt: "用 xhs-video-overlay-packaging 给这条粗剪视频做透明动效包装",
  },
];

const dimStageBackground =
  "radial-gradient(circle at 18% 20%, rgba(0, 229, 255, 0.18), transparent 26%), radial-gradient(circle at 82% 26%, rgba(124, 255, 107, 0.14), transparent 20%), linear-gradient(90deg, rgba(0, 229, 255, 0.06) 1px, transparent 1px), linear-gradient(0deg, rgba(124, 255, 107, 0.04) 1px, transparent 1px), linear-gradient(135deg, #101724, #152131 58%, #0f1724)";
const amberBrightStageBackground =
  "radial-gradient(circle at 86% 68%, color-mix(in srgb, var(--accent) 15%, transparent), transparent 20%), radial-gradient(circle at 14% 18%, rgba(255, 255, 255, 0.94), transparent 24%), linear-gradient(90deg, color-mix(in srgb, var(--accent) 5%, transparent) 1px, transparent 1px), linear-gradient(0deg, rgba(17, 24, 39, 0.035) 1px, transparent 1px), linear-gradient(135deg, #fffdf8 0%, #f7f3ea 52%, #ece7dc 100%)";

export function App() {
  const [project, setProject] = useState<OverlayProject>(() => {
    const saved = localStorage.getItem(storageKey);
    legacyStorageKeys.forEach((key) => localStorage.removeItem(key));
    if (!saved) return createFreshProject(false);
    try {
      const parsed = JSON.parse(saved) as Partial<OverlayProject>;
      if (!isSavedProjectFresh(parsed)) {
        localStorage.removeItem(storageKey);
        return createFreshProject(false);
      }
      const restoredProject = normalizeProject(
        parsed,
        sampleProject,
      );
      const title = [
        legacyProjectTitle,
        legacyStudioTitle,
        legacyWorkspaceTitle,
      ].includes(restoredProject.title)
        ? defaultProjectTitle
        : restoredProject.title;
      return withProjectMeta({ ...restoredProject, title });
    } catch {
      localStorage.removeItem(storageKey);
      return createFreshProject(false);
    }
  });
  const [selectedClipId, setSelectedClipId] = useState(
    project.clips[0]?.id || "",
  );
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [copiedPipelineId, setCopiedPipelineId] = useState("");
  const [stageMode, setStageMode] = useState<"bright" | "dim">("bright");
  const [effectCategory, setEffectCategory] = useState<"base" | "tech">("base");
  const [videoScale, setVideoScale] = useState(100);
  const [globalEffectScale, setGlobalEffectScale] = useState(100);
  const [globalSpeed, setGlobalSpeed] = useState(1);
  const [globalFontScale, setGlobalFontScale] = useState(100);
  const [oralVideoName, setOralVideoName] = useState("");
  const [oralVideoUrl, setOralVideoUrl] = useState("");
  const [demoVideoName, setDemoVideoName] = useState("");
  const [demoVideoUrl, setDemoVideoUrl] = useState("");
  const [splitModeEnabled, setSplitModeEnabled] = useState(false);
  const [splitLayoutMode, setSplitLayoutMode] = useState<"side-by-side" | "stacked">("side-by-side");
  const [splitRatio, setSplitRatio] = useState(18);
  const [splitBackground, setSplitBackground] = useState<SplitBackground>(() => {
    const saved = localStorage.getItem('studio-split-background');
    return saved === 'white' || saved === 'gray' || saved === 'dark' ? saved : 'brand';
  });
  useEffect(() => {
    localStorage.setItem('studio-split-background', splitBackground);
  }, [splitBackground]);
  const [sourceVideoDuration, setSourceVideoDuration] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef<number | null>(null);

  const duration = useMemo(() => {
    const contentClips = project.clips.filter(
      (clip) => !isTimelineProgressClip(clip),
    );
    return Math.max(
      sourceVideoDuration || 18,
      ...contentClips.map((clip) => clip.start + clip.duration + 1),
    );
  }, [project.clips, sourceVideoDuration]);
  const selectedClip = project.clips.find((clip) => clip.id === selectedClipId);
  const availableEffectCardCount =
    effectRegistry.filter((effect) => effect.id !== "split-evidence").length +
    allTechModules.filter((module) => !module.id.startsWith("split-")).length;
  const availableStyleCount = stylePresets.length;
  const selectedClipIndex = Math.max(
    0,
    project.clips.findIndex((clip) => clip.id === selectedClipId),
  );
  const selectedStyle = stylesById[project.styleId] || stylePresets[0];
  const selectedTitleTone =
    project.styleId === "amber-process"
      ? titleTonePresets.find((tone) => tone.id === "warm-white")
      : titleTonePresets.find((tone) => tone.id === "blue-white");
  const defaultTitleTone = selectedTitleTone || titleTonePresets[0];
  const globalTitleTone = project.globalTitleColor
    ? titleToneFromColor(project.globalTitleColor)
    : defaultTitleTone;
  const effectiveStageMode = stageMode;
  const styleVars = {
    "--ink": selectedStyle.tokens.ink,
    "--muted": selectedStyle.tokens.muted,
    "--paper": selectedStyle.tokens.paper,
    "--panel": selectedStyle.tokens.panel,
    "--line": selectedStyle.tokens.line,
    "--accent": selectedStyle.tokens.accent,
    "--accent-soft": selectedStyle.tokens.accentSoft,
    "--shadow": selectedStyle.tokens.shadow,
    "--title-ink": globalTitleTone.title,
    "--title-soft": globalTitleTone.soft,
    "--title-glow": globalTitleTone.glow,
    "--title-shadow": globalTitleTone.shadow,
    "--stage-bg": "transparent",
    "--overlay-font-factor": globalFontScale / 100,
    "--video-scale": videoScale / 100,
  } as CSSProperties;

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(withProjectMeta(project)));
  }, [project]);

  useEffect(() => {
    return () => {
      if (oralVideoUrl) URL.revokeObjectURL(oralVideoUrl);
    };
  }, [oralVideoUrl]);

  useEffect(() => {
    return () => {
      if (demoVideoUrl) URL.revokeObjectURL(demoVideoUrl);
    };
  }, [demoVideoUrl]);

  useEffect(() => {
    const hasOutOfSyncTimeline = project.clips.some(
      (clip) =>
        isTimelineProgressClip(clip) &&
        (clip.start !== 0 ||
          Math.abs(clip.duration - duration) > 0.01 ||
          clip.params.x !== 3 ||
          clip.params.y !== 0),
    );
    if (!hasOutOfSyncTimeline) return;
    setProject((current) => ({
      ...current,
      clips: current.clips.map((clip) =>
        isTimelineProgressClip(clip)
          ? {
              ...clip,
              start: 0,
              duration,
              params: { ...clip.params, x: 3, y: 0, align: "left" },
            }
          : clip,
      ),
    }));
  }, [duration, project.clips]);

  useEffect(() => {
    if (!isPlaying) {
      lastTickRef.current = null;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }

    function tick(now: number) {
      if (lastTickRef.current === null) lastTickRef.current = now;
      const delta = ((now - lastTickRef.current) / 1000) * globalSpeed;
      lastTickRef.current = now;
      setCurrentTime((time) => {
        const next = time + delta;
        return next > duration ? 0 : next;
      });
      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [duration, globalSpeed, isPlaying]);

  function patchProject(patch: Partial<OverlayProject>) {
    setProject((current) => ({ ...current, ...patch }));
  }

  function updateClip(clipId: string, patch: Partial<OverlayClip>) {
    setProject((current) => ({
      ...current,
      clips: current.clips.map((clip) =>
        clip.id === clipId ? { ...clip, ...patch } : clip,
      ),
    }));
  }

  function updateParam(
    clipId: string,
    key: keyof OverlayClip["params"],
    value: string | number,
  ) {
    setProject((current) => ({
      ...current,
      clips: current.clips.map((clip) =>
        clip.id === clipId
          ? {
              ...clip,
              params: {
                ...clip.params,
                [key]: clampToStageBounds(key, value, clip),
              },
            }
          : clip,
      ),
    }));
  }

  function addClip(effectId: EffectId = "section-head") {
    const effect = effectsById[effectId];
    const start = Number(Math.min(duration - 1, currentTime).toFixed(1));
    const position = leftSafePositionFor(effectId, project.clips.length);
    const nextClip: OverlayClip = {
      id: `clip-${crypto.randomUUID()}`,
      effectId,
      label: effect.name,
      text: defaultTextForEffect(effectId),
      start,
      duration: effect.defaultDuration,
      lane: project.clips.length % 3,
      enabled: true,
      params: {
        ...effect.defaultParams,
        ...position,
        align: "left",
        accent: effectId.startsWith("amber-")
          ? effect.defaultParams.accent
          : selectedStyle.tokens.accent,
        ...(defaultTitleColorForBaseEffect(effectId)
          ? { titleColor: defaultTitleColorForBaseEffect(effectId) }
          : {}),
        contentRole: inferContentRole(effectId, defaultTextForEffect(effectId)),
      },
    };
    setProject((current) => ({
      ...current,
      clips: [...current.clips, nextClip],
    }));
    setSelectedClipId(nextClip.id);
    setCurrentTime(start + 0.05);
  }

  function addTemplateModule(module: EffectCardTemplate) {
    const effect = effectsById[module.effectId];
    const templateStyle = stylesById[module.styleId];
    const isGlobalTimeline =
      module.params.moduleVariant === "timeline-progress-bar";
    const start = isGlobalTimeline
      ? 0
      : Number(Math.min(duration - 1, currentTime).toFixed(1));
    const nextClip: OverlayClip = {
      id: `module-${module.id}-${crypto.randomUUID()}`,
      effectId: module.effectId,
      label: module.label,
      text: module.text,
      start,
      duration: isGlobalTimeline
        ? duration
        : module.duration ||
          Math.max(effect.defaultDuration, module.id === "rec" ? 6 : 3.2),
      lane: project.clips.length % 3,
      enabled: true,
      params: forceLeftSafeParams(
        module.effectId,
        {
          ...effect.defaultParams,
          ...module.params,
          accent: module.params.accent || templateStyle.tokens.accent,
          speed: 1,
          titleColor: module.params.titleColor ?? "",
        },
        project.clips.length,
      ),
    };
    setProject((current) => ({
      ...current,
      styleId: module.styleId,
      clips: [...current.clips, nextClip],
    }));
    setSelectedClipId(nextClip.id);
    setCurrentTime(isGlobalTimeline ? currentTime : start + 0.05);
    setStatusMessage(
      isGlobalTimeline
        ? `已添加「${module.name}」全片时间轴：从 00:00 开始，持续 ${formatTime(duration)}，默认贴在视频最上方。`
        : `已添加「${module.name}」模板卡。先改右侧文案，再拖时间轴对齐。`,
    );
  }

  function replaceClipWithTemplate(clipId: string, module: EffectCardTemplate) {
    const effect = effectsById[module.effectId];
    const templateStyle = stylesById[module.styleId];
    const isGlobalTimeline =
      module.params.moduleVariant === "timeline-progress-bar";
    setProject((current) => ({
      ...current,
      styleId: module.styleId,
      clips: current.clips.map((clip, index) => {
        if (clip.id !== clipId) return clip;
        const start = isGlobalTimeline ? 0 : clip.start;
        const nextDuration = isGlobalTimeline
          ? duration
          : Math.max(clip.duration, module.duration || effect.defaultDuration);
        return {
          ...clip,
          effectId: module.effectId,
          label: module.label,
          text: module.text,
          start,
          duration: nextDuration,
          params: forceLeftSafeParams(
            module.effectId,
            {
              ...effect.defaultParams,
              ...module.params,
              accent:
                module.params.accent ||
                clip.params.accent ||
                templateStyle.tokens.accent,
              speed: clip.params.speed || 1,
              titleColor: module.params.titleColor ?? "",
              fadeAt: clip.params.fadeAt,
              soundCue: clip.params.soundCue,
            },
            index,
          ),
        };
      }),
    }));
    setSelectedClipId(clipId);
    setStatusMessage(
      `已把当前卡片替换成「${module.name}」，高级动效已并入更换列表。`,
    );
  }

  function duplicateClip(clipId: string) {
    const original = project.clips.find((clip) => clip.id === clipId);
    if (!original) return;
    const copy = {
      ...original,
      id: `clip-${crypto.randomUUID()}`,
      label: `${original.label} copy`,
      start: Number((original.start + 0.4).toFixed(1)),
      lane: (original.lane + 1) % 3,
    };
    setProject((current) => ({ ...current, clips: [...current.clips, copy] }));
    setSelectedClipId(copy.id);
  }

  function deleteClip(clipId: string) {
    setProject((current) => ({
      ...current,
      clips: current.clips.filter((clip) => clip.id !== clipId),
    }));
    const next = project.clips.find((clip) => clip.id !== clipId);
    setSelectedClipId(next?.id || "");
  }

  function clearClips() {
    setProject((current) => ({ ...current, clips: [] }));
    setSelectedClipId("");
    setCurrentTime(0);
    setStatusMessage("已清空当前动效卡，项目风格和画布保留。");
  }

  function resetToLatestLibrary() {
    const nextProject = createFreshProject(project.showSafeZones ?? false);
    localStorage.removeItem(storageKey);
    legacyStorageKeys.forEach((key) => localStorage.removeItem(key));
    setProject(nextProject);
    setSelectedClipId(nextProject.clips[0]?.id || "");
    setCurrentTime(0);
    setStatusMessage(
      `已恢复最新动效卡库，当前库版本 ${cardLibrarySignature.slice(-8)}。旧缓存不会再覆盖新卡片。`,
    );
  }

  async function importSrt(file: File) {
    const text = await file.text();
    const cues = parseSrt(text);
    const clips = buildFullMotionClipsFromSrt(
      cues,
      selectedStyle.tokens.accent,
      sourceVideoDuration || 240,
    );
    setProject((current) => ({
      ...current,
      title: file.name.replace(/\.srt$/i, ""),
      clips,
    }));
    setSelectedClipId(clips[0]?.id || "");
    setCurrentTime(clips[0]?.start || 0);
    setStatusMessage(
      `已完成语义规划并生成 ${clips.length} 张；默认使用重点短语卡，明确百分比、步骤、数字时切换专用卡，低信息句子会跳过。`,
    );
  }

  async function importJson(file: File) {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as Partial<OverlayProject>;
      if (!parsed || !Array.isArray(parsed.clips)) {
        throw new Error("JSON 里没有 clips 数组");
      }
      const imported = normalizeProject(parsed, sampleProject);
      if (!imported.clips.length) {
        throw new Error("JSON 里的 clips 是空数组");
      }
      setProject(imported);
      setSelectedClipId(imported.clips[0]?.id || "");
      setCurrentTime(imported.clips[0]?.start || 0);
      setStatusMessage(
        `已导入 ${imported.clips.length} 张卡片，标题：${imported.title || file.name}。`,
      );
    } catch (error) {
      const reason = error instanceof Error ? error.message : "文件格式不正确";
      setStatusMessage(`JSON 导入失败：${reason}。请选择工作台导出的 overlay JSON。`);
    }
  }

  function applyStyle(styleId: StyleId) {
    const nextStyle = stylesById[styleId];
    setProject((current) => ({
      ...current,
      styleId,
      clips: current.clips.map((clip) => ({
        ...clip,
        params: { ...clip.params, accent: nextStyle.tokens.accent },
      })),
    }));
  }

  function changeAspectRatio(aspectRatio: AspectRatio) {
    const dimensions = {
      "16:9": { width: 1920, height: 1080 },
      "9:16": { width: 1080, height: 1920 },
      "4:5": { width: 1080, height: 1350 },
      "4:3": { width: 1440, height: 1080 },
    }[aspectRatio];
    setProject((current) => ({
      ...current,
      canvas: { ...current.canvas, aspectRatio, ...dimensions },
    }));
  }

  async function copyPipelinePrompt(pipelineId: string, prompt: string) {
    await navigator.clipboard.writeText(prompt);
    setCopiedPipelineId(pipelineId);
    setStatusMessage("已复制调用语，可以直接发给 Codex 继续跑透明动效。");
    window.setTimeout(() => setCopiedPipelineId(""), 1600);
  }

  async function copyExportTimelinePrompt() {
    await navigator.clipboard.writeText(
      `把当前 ${project.title} 的 overlay JSON 导出为 1920x1080 ProRes 4444 透明 MOV，并检查人脸安全区和字幕安全区。`,
    );
    setStatusMessage("已复制整条时间轴导出指令；V2 会把它做成一键透明 MOV。");
  }

  function handleVideoFile(file: File) {
    setOralVideoName(file.name);
    setSourceVideoDuration(0);
    if (oralVideoUrl) URL.revokeObjectURL(oralVideoUrl);
    const videoUrl = URL.createObjectURL(file);
    setOralVideoUrl(videoUrl);
    setStatusMessage("口播视频已导入，正在读取首帧和时长...");
  }

  function handleDemoVideoFile(file: File) {
    setDemoVideoName(file.name);
    if (demoVideoUrl) URL.revokeObjectURL(demoVideoUrl);
    setDemoVideoUrl(URL.createObjectURL(file));
    setStatusMessage("演示视频已导入；添加“双视频分屏”卡即可同时预览两路画面。");
  }

  function handleVideoMeta(meta: {
    duration: number;
    width: number;
    height: number;
  }) {
    const detectedDuration = Number.isFinite(meta.duration) ? meta.duration : 0;
    setSourceVideoDuration(detectedDuration);
    setStatusMessage(
      detectedDuration
        ? `已加载口播视频 ${meta.width}×${meta.height} · ${formatTime(detectedDuration)}；当前预览保持透明 alpha 视图。`
        : `已加载口播视频 ${meta.width}×${meta.height}；但时长没读到，当前预览保持透明 alpha 视图。`,
    );
  }

  function handleVideoError(message: string) {
    setSourceVideoDuration(0);
    setStatusMessage(message);
  }

  return (
    <main
      className="studio-app"
      data-stage-mode={effectiveStageMode}
      data-style={selectedStyle.id}
      data-shell="tech"
      style={styleVars}
    >
      <header className="topbar">
        <div>
          <span className="eyebrow">REC · LOCAL MOTION BENCH</span>
          <h1 className="workspace-title">夏哥视效工作台</h1>
          <p
            className={`source-video-name${oralVideoName ? "" : " is-empty"}`}
            title={oralVideoName || "还没有上传视频"}
          >
            {oralVideoName
              ? `当前视频：${oralVideoName}`
              : "当前视频：尚未上传"}
          </p>
          <div className="topbar-meta" aria-label="工作台状态">
            <span>SOURCE SRT/JSON</span>
            <span>VOICE HUMAN</span>
            <span>RENDER ALPHA</span>
          </div>
        </div>
        <nav className="topbar-actions" aria-label="项目操作">
          <label className="file-action">
            <UploadSimple size={16} /> 导入 SRT
            <input
              type="file"
              accept=".srt"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) importSrt(file);
                event.currentTarget.value = "";
              }}
            />
          </label>
          <label className="file-action">
            <FileText size={16} /> 导入 JSON
            <input
              type="file"
              accept="application/json,.json"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) importJson(file);
                event.currentTarget.value = "";
              }}
            />
          </label>
          <button type="button" onClick={() => downloadJson(project)}>
            <DownloadSimple size={16} /> 导出 JSON
          </button>
        </nav>
      </header>

      <section className="studio-layout">
        <aside className="asset-rail">
          <div className="rail-block source-tools-panel">
            <div className="block-heading">
              <span>WORKSPACE TOOLS</span>
              <strong className="current-style">{selectedStyle.name}</strong>
            </div>
            <div className="toolbar-grid style-top-actions">
              <label className="file-action secondary-action">
                上传视频
                <input
                  type="file"
                  accept="video/*"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) handleVideoFile(file);
                    event.currentTarget.value = "";
                  }}
                />
              </label>
              <label className="file-action secondary-action">
                上传演示视频
                <input
                  type="file"
                  accept="video/*"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) handleDemoVideoFile(file);
                    event.currentTarget.value = "";
                  }}
                />
              </label>
              <button type="button" onClick={clearClips}>
                清除
              </button>
              <label className="file-action secondary-action">
                导入 JSON
                <input
                  type="file"
                  accept="application/json,.json"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) importJson(file);
                    event.currentTarget.value = "";
                  }}
                />
              </label>
              <button type="button" onClick={() => downloadJson(project)}>
                导出
              </button>
              <button type="button" onClick={resetToLatestLibrary}>
                恢复最新库
              </button>
            </div>
          </div>

          <div className="rail-block intro-block">
            <span>STEP 01</span>
            <h1>先调动效卡，再交给 AI 批量编排。</h1>
            <p>这里沉淀的是长期资产：风格、卡片、规则和 overlay JSON。</p>
          </div>

          <div className="rail-block stats-block">
            <div
              title={`${effectRegistry.length} 张基础动效 + ${allTechModules.length} 张高级动效`}
            >
              <b>{availableEffectCardCount}</b>
              <span>可选卡片</span>
            </div>
            <div title="当前已经注册的可选视觉风格">
              <b>{availableStyleCount}</b>
              <span>可选风格</span>
            </div>
            <div title="动效卡库版本，用来防止浏览器缓存旧卡片">
              <b>{cardLibrarySignature.slice(-4).toUpperCase()}</b>
              <span>库版本</span>
            </div>
            <button
              type="button"
              className={`split-mode-launch${splitModeEnabled ? " is-active" : ""}`}
              onClick={() => setSplitModeEnabled((enabled) => !enabled)}
            >
              <b>分屏</b>
              <span>{splitModeEnabled ? "退出分屏" : "全画布演示"}</span>
            </button>
          </div>

          {splitModeEnabled && (
            <div className="rail-block split-mode-panel">
              <div className="block-heading">
                <span>SPLIT SCREEN</span>
                <strong className="current-style">独立功能</strong>
              </div>
              <p>人物视频 + 演示视频，直接占满整个画面。</p>
              <div className="segmented-control">
                <button className={splitLayoutMode === "side-by-side" ? "is-active" : ""} type="button" onClick={() => setSplitLayoutMode("side-by-side")}>左右分屏</button>
                <button className={splitLayoutMode === "stacked" ? "is-active" : ""} type="button" onClick={() => setSplitLayoutMode("stacked")}>上下分屏</button>
              </div>
              <label>
                人物 {splitRatio}% · 演示 {100 - splitRatio}%
                <input aria-label="人物画面占比" type="range" min="12" max="65" value={splitRatio} onChange={(event) => setSplitRatio(Number(event.target.value))} />
              </label>
              <button type="button" className="split-mode-close" onClick={() => setSplitModeEnabled(false)}>退出分屏演示</button>
              <label>
                分屏背景
                <select aria-label="分屏背景" value={splitBackground} onChange={(event) => setSplitBackground(event.target.value as SplitBackground)}>
                  <option value="brand">夏哥研究室 · 品牌浅色</option>
                  <option value="white">米色</option>
                  <option value="gray">浅蓝色 · 毛玻璃</option>
                  <option value="dark">深色</option>
                </select>
              </label>
            </div>
          )}

          <div className="rail-block">
            <div className="block-heading">
              <span>EFFECT CARDS</span>
              <button
                type="button"
                onClick={() =>
                  effectCategory === "base"
                    ? addClip()
                    : addTemplateModule(allTechModules[0])
                }
              >
                <Plus size={14} /> 添加默认
              </button>
            </div>
            <div className="segmented-control effect-category-tabs">
              <button
                className={effectCategory === "base" ? "is-active" : ""}
                type="button"
                onClick={() => setEffectCategory("base")}
              >
                基础动效 {effectRegistry.filter((effect) => effect.id !== "split-evidence").length}
              </button>
              <button
                className={effectCategory === "tech" ? "is-active" : ""}
                type="button"
                onClick={() => setEffectCategory("tech")}
              >
                高级动效 {allTechModules.filter((module) => !module.id.startsWith("split-")).length}
              </button>
            </div>
            <div className="effect-list">
              {effectCategory === "base" &&
                effectRegistry.filter((effect) => effect.id !== "split-evidence").map((effect) => (
                  <button
                    type="button"
                    key={effect.id}
                    onClick={() => addClip(effect.id)}
                  >
                    <strong>{effect.name}</strong>
                    <span>{effect.role}</span>
                  </button>
                ))}
              {effectCategory === "tech" && (
                <>
                  <div className="effect-group-label">
                    TECH GLASS · 蓝色科技
                  </div>
                  {allTechModules.filter((module) => !module.id.startsWith("split-")).map((module) => (
                    <button
                      className="is-tech-template"
                      key={module.id}
                      type="button"
                      onClick={() => addTemplateModule(module)}
                    >
                      <strong>{module.name}</strong>
                      <span>{module.detail}</span>
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>

          <div className="rail-block global-panel">
            <div className="block-heading">
              <span>GLOBAL · 所有卡片</span>
              <strong className="current-style">全局控制</strong>
            </div>

            <div className="segmented-control">
              <button
                className={effectiveStageMode === "dim" ? "is-active" : ""}
                type="button"
                onClick={() => setStageMode("dim")}
              >
                黑夜
              </button>
              <button
                className={effectiveStageMode === "bright" ? "is-active" : ""}
                type="button"
                onClick={() => setStageMode("bright")}
              >
                白天
              </button>
            </div>

            <div className="segmented-control">
              <button
                className={project.showSafeZones ? "" : "is-active"}
                type="button"
                onClick={() =>
                  setProject((current) => ({
                    ...current,
                    showSafeZones: false,
                  }))
                }
              >
                安全区关
              </button>
              <button
                className={project.showSafeZones ? "is-active" : ""}
                type="button"
                onClick={() =>
                  setProject((current) => ({
                    ...current,
                    showSafeZones: true,
                  }))
                }
              >
                安全区开
              </button>
            </div>

            <label>
              风格(所有卡片)
              <select
                value={project.styleId}
                onChange={(event) => applyStyle(event.target.value as StyleId)}
              >
                {stylePresets.map((style) => (
                  <option key={style.id} value={style.id}>
                    {style.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="slider-stack">
              <label>
                <span>视频画面缩放</span>
                <b>{videoScale}%</b>
                <input
                  type="range"
                  min="70"
                  max="130"
                  value={videoScale}
                  onChange={(event) =>
                    setVideoScale(Number(event.target.value))
                  }
                />
              </label>
              <label>
                <span>特效整体大小</span>
                <b>{globalEffectScale}%</b>
                <input
                  type="range"
                  min="45"
                  max="120"
                  value={globalEffectScale}
                  onChange={(event) =>
                    setGlobalEffectScale(Number(event.target.value))
                  }
                />
              </label>
              <label>
                <span>动画速度</span>
                <b>{globalSpeed.toFixed(2)}x</b>
                <input
                  type="range"
                  min="0.5"
                  max="1.6"
                  step="0.05"
                  value={globalSpeed}
                  onChange={(event) =>
                    setGlobalSpeed(Number(event.target.value))
                  }
                />
              </label>
              <label>
                <span>全局字体</span>
                <b>{globalFontScale}%</b>
                <input
                  type="range"
                  min="70"
                  max="115"
                  value={globalFontScale}
                  onChange={(event) =>
                    setGlobalFontScale(Number(event.target.value))
                  }
                />
              </label>
            </div>
          </div>

          <div className="rail-block">
            <div className="block-heading">
              <span>ACTIVE PIPELINE</span>
              <strong className="current-style">透明动效</strong>
            </div>
            <div className="pipeline-list">
              {activePipelines.map((pipeline) => (
                <article key={pipeline.id}>
                  <div>
                    <strong>{pipeline.name}</strong>
                    <span>{pipeline.output}</span>
                  </div>
                  <p>{pipeline.detail}</p>
                  <button
                    type="button"
                    onClick={() =>
                      copyPipelinePrompt(pipeline.id, pipeline.prompt)
                    }
                  >
                    {copiedPipelineId === pipeline.id
                      ? "已复制调用语"
                      : "复制调用语"}
                  </button>
                </article>
              ))}
            </div>
          </div>

          <div className="rail-block style-panel">
            <div className="block-heading">
              <span>VISUAL STYLES</span>
              <strong className="current-style">低频风格选择</strong>
            </div>
            <div className="style-list">
              {stylePresets.map((style) => (
                <button
                  className={project.styleId === style.id ? "is-active" : ""}
                  key={style.id}
                  onClick={() => applyStyle(style.id)}
                  type="button"
                >
                  <i style={{ background: style.tokens.accent }} />
                  <strong>{style.name}</strong>
                  <span>{style.tagline}</span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        <section className="workbench">
          <div className="transport-row">
            <button
              className="play-button"
              type="button"
              onClick={() => setIsPlaying((value) => !value)}
            >
              {isPlaying ? (
                <Pause size={18} weight="fill" />
              ) : (
                <Play size={18} weight="fill" />
              )}
              {isPlaying ? "暂停" : "播放"}
            </button>
            <input
              type="range"
              min="0"
              max={duration}
              step="0.01"
              value={currentTime}
              onChange={(event) => setCurrentTime(Number(event.target.value))}
            />
            <strong>{formatTime(currentTime)}</strong>
            <div className="aspect-switch">
              {(["16:9", "9:16", "4:3", "4:5"] as AspectRatio[]).map((ratio) => (
                <button
                  className={
                    project.canvas.aspectRatio === ratio ? "is-active" : ""
                  }
                  key={ratio}
                  type="button"
                  onClick={() => changeAspectRatio(ratio)}
                >
                  {ratio}
                </button>
              ))}
            </div>
          </div>

          <PreviewStage
            aspectRatio={project.canvas.aspectRatio}
            clips={project.clips}
            currentTime={currentTime}
            isPlaying={isPlaying}
            videoUrl={oralVideoUrl}
            videoName={oralVideoName}
            secondaryVideoUrl={demoVideoUrl}
            secondaryVideoName={demoVideoName}
            splitModeEnabled={splitModeEnabled}
            splitLayoutMode={splitLayoutMode}
            splitRatio={splitRatio}
            splitBackground={splitBackground}
            selectedClipId={selectedClipId}
            globalScale={globalEffectScale / 100}
            videoScale={videoScale / 100}
            playbackRate={globalSpeed}
            showSafeZones={project.showSafeZones ?? false}
            onVideoMeta={handleVideoMeta}
            onVideoError={handleVideoError}
            onSelectClip={setSelectedClipId}
          />

          <Timeline
            clips={project.clips}
            currentTime={currentTime}
            duration={duration}
            selectedClipId={selectedClipId}
            onSeek={(time) => setCurrentTime(clamp(time, 0, duration))}
            onSelectClip={setSelectedClipId}
          />
        </section>

        <Inspector
          clip={selectedClip}
          clipIndex={selectedClipIndex}
          duration={duration}
          techTemplates={allTechModules}
          projectTitleColor={project.globalTitleColor}
          onProjectUpdate={patchProject}
          onUpdate={updateClip}
          onParamUpdate={updateParam}
          onReplaceWithTemplate={replaceClipWithTemplate}
          onDuplicate={duplicateClip}
          onDelete={deleteClip}
        />
      </section>

      <footer className="system-note">
        <Sparkle size={14} /> 当前风格：{selectedStyle.name}。
        {statusMessage ||
          "AI 入口只需要产出 styleId + overlay JSON；动效卡代码由工作台统一维护。"}
      </footer>
    </main>
  );
}
