import { useEffect, useRef, useState } from "react";
import { OrbitGlassCards } from "./OrbitGlassCards";
import { AppIconOrbit } from "./AppIconOrbit";
import { BehindPerson } from "./BehindPerson";
import type { CSSProperties, JSX, ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  DotsThreeVertical,
  Plus,
  X,
  ArrowClockwise,
  ArrowsDownUp,
  Brain,
  Camera,
  ChartBar,
  ChatCircle,
  CheckCircle,
  CodeSimple,
  FileText,
  ImageSquare,
  Lightbulb,
  MagnifyingGlass,
  Microphone,
  Robot,
  Scissors,
  ShieldCheck,
  SquaresFour,
  Stack,
  User,
  VideoCamera,
  Wrench,
} from "@phosphor-icons/react";
import type { AspectRatio, EffectId, OverlayClip, SplitBackground } from "../types";
import { clamp, easeInOut, easeOutCubic, formatTime } from "../utils/time";

type PreviewStageProps = {
  aspectRatio: AspectRatio;
  clips: OverlayClip[];
  currentTime: number;
  isPlaying: boolean;
  videoUrl: string;
  videoName: string;
  secondaryVideoUrl: string;
  secondaryVideoName: string;
  splitModeEnabled: boolean;
  splitLayoutMode: 'side-by-side' | 'stacked';
  splitRatio: number;
  splitBackground: SplitBackground;
  selectedClipId: string;
  globalScale: number;
  videoScale: number;
  playbackRate: number;
  showSafeZones: boolean;
  onVideoMeta: (meta: {
    duration: number;
    width: number;
    height: number;
  }) => void;
  onVideoError: (message: string) => void;
  onSelectClip: (clipId: string) => void;
};

export type EffectProps = {
  aspectRatio?: AspectRatio;
  clip: OverlayClip;
  progress: number;
  exitProgress: number;
  currentTime?: number;
  isPlaying?: boolean;
  primaryVideoUrl?: string;
  secondaryVideoUrl?: string;
  secondaryVideoName?: string;
};

export const effectComponents: Record<EffectId, (props: EffectProps) => JSX.Element> =
  {
    "ambient-wash": AmbientWash,
    "section-head": SectionHead,
    "info-board": InfoBoard,
    "strike-flip": StrikeFlip,
    "metric-arrow": MetricArrowCard,
    "odometer-digit-roll": OdometerDigitRoll,
    "episode-counter-card": EpisodeCounterCard,
    "project-comparison": ProjectComparisonCard,
    "split-evidence": SplitEvidenceLayout,
    "amber-proof-title": SectionHead,
    "amber-progress-ring": AmberProgressRing,
    "amber-scene-steps": AmberSceneSteps,
    "amber-replicate-flow": AmberReplicateFlow,
    "amber-library-grid": AmberLibraryGrid,
    "income-split-card": IncomeSplitCard,
    "dot-grid-stat-card": DotGridStatCard,
    "three-layer-mind-map": ThreeLayerMindMap,
    "glass-process-bubble": GlassProcessBubble,
    "chain-bubble-flow": ChainBubbleFlow,
    "review-split-card": ReviewSplitCard,
    "pressure-bar-comparison": PressureBarComparison,
    "numeric-punch-card": NumericPunchCard,
    "three-step-action-card": ThreeStepActionCard,
    "three-step-checklist": ThreeStepChecklistCard,
    "dual-metric-ruler": DualMetricRulerCard,
    "workflow-action-list": WorkflowActionListCard,
    "task-module-breakdown": TaskModuleBreakdownCard,
    "large-number-dot-matrix": LargeNumberDotMatrixCard,
    "multi-step-toolchain": MultiStepToolchainCard,
    "key-phrase-highlight": KeyPhraseHighlightCard,
  };

export const cardSizeBase: Record<string, { width: number; height?: number }> = {
  "ambient-wash": { width: 860 },
  "section-head": { width: 720 },
  "info-board": { width: 720 },
  "strike-flip": { width: 860 },
  "metric-arrow": { width: 820, height: 420 },
  "metric-arrow-card": { width: 820, height: 420 },
  "orbit-glass-cards": { width: 1280, height: 820 },
  "app-icon-orbit": { width: 1280, height: 620 },
  "timeline-progress-bar": { width: 1500, height: 116 },
  "beat-step-list-theme-cycle": { width: 760, height: 560 },
  "odometer-digit-roll": { width: 760, height: 380 },
  "episode-counter-card": { width: 600, height: 340 },
  "project-comparison-card": { width: 1240, height: 560 },
  "split-evidence-layout": { width: 1420, height: 610 },
  "amber-proof-title": { width: 980 },
  "amber-progress-ring": { width: 420, height: 460 },
  "amber-scene-steps": { width: 920, height: 760 },
  "amber-replicate-flow": { width: 1160, height: 540 },
  "amber-library-grid": { width: 1180, height: 560 },
  "income-split-card": { width: 520 },
  "dot-grid-stat-card": { width: 520 },
  "three-layer-mind-map": { width: 560 },
  "glass-process-bubble": { width: 560, height: 560 },
  "chain-bubble-flow": { width: 1180, height: 660 },
  "review-split-card": { width: 880, height: 560 },
  "pressure-bar-comparison": { width: 920, height: 560 },
  "numeric-punch-card": { width: 620, height: 230 },
  "three-step-action-card": { width: 1120, height: 560 },
  "three-step-checklist-card": { width: 1280, height: 620 },
  "dual-metric-ruler-card": { width: 1280, height: 580 },
  "workflow-action-list-card": { width: 920, height: 620 },
  "task-module-breakdown-card": { width: 820, height: 720 },
  "large-number-dot-matrix-card": { width: 860, height: 620 },
  "multi-step-toolchain-card": { width: 660, height: 760 },
  "key-phrase-highlight-card": { width: 940, height: 620 },
  "falling-word-field-card": { width: 1280, height: 820 },
};

export function calculateCardScale(
  clip: OverlayClip,
  stageWidth: number,
  stageHeight: number,
  globalScale = 1,
) {
  const baseKey = clip.params.moduleVariant || clip.effectId;
  const baseSize = baseKey === "orbit-glass-cards"
    ? { width: 1280, height: stageWidth < stageHeight ? 2240 : 820 }
    : baseKey === "app-icon-orbit" ? { width: 1280, height: stageWidth < stageHeight ? 1800 : 820 }
    : cardSizeBase[baseKey] || cardSizeBase[clip.effectId] || null;
  const rawScale = clip.params.scale * globalScale;
  if (!baseSize || !stageWidth || !stageHeight) return rawScale;

  const widthScale = clip.params.widthScale || 1;
  const heightScale = clip.params.heightScale || 1;
  const leftPx = stageWidth * (clip.params.x / 100);
  const topPx = stageHeight * (clip.params.y / 100);
  const maxScaleX =
    (stageWidth - leftPx - 18) / (baseSize.width * widthScale);
  const maxScaleY =
    baseKey !== "timeline-progress-bar" && baseSize.height
      ? (Math.min(topPx, stageHeight - topPx) * 2 - 18) /
        (baseSize.height * heightScale)
      : Number.POSITIVE_INFINITY;

  // JSON scale is the intended delivery size. Runtime scaling only prevents
  // clipping at the canvas edge; it must not shrink cards a second time.
  return Math.max(0.18 * globalScale, Math.min(rawScale, maxScaleX, maxScaleY));
}

export function adaptClipLayout(
  clip: OverlayClip,
  aspectRatio: AspectRatio,
) {
  if (clip.params.moduleVariant === "orbit-glass-cards" || clip.params.moduleVariant === "app-icon-orbit") return clip;
  if (aspectRatio !== "9:16") return clip;
  if (clip.params.moduleVariant === "timeline-progress-bar") {
    return { ...clip, params: { ...clip.params, x: 3, y: 0 } };
  }

  // Portrait footage has no useful side column beside a centered speaker.
  // Move only center-zone cards into the upper/lower bands; explicit manual
  // placement in either band remains untouched.
  if (clip.params.y <= 20 || clip.params.y >= 76) return clip;
  const key = clip.params.moduleVariant || clip.effectId;
  const projectedHeight =
    (cardSizeBase[key]?.height || 0) * clip.params.scale;
  const prefersBottom = projectedHeight > 300 || clip.lane % 2 === 1;
  return {
    ...clip,
    params: {
      ...clip.params,
      x: Math.min(clip.params.x, 6),
      y: prefersBottom ? 84 : 15,
      align: "left" as const,
    },
  };
}

export function resolveEffectComponent(clip: OverlayClip) {
  switch (clip.params.moduleVariant) {
    case "orbit-glass-cards":
      return OrbitGlassCards;
    case "app-icon-orbit":
      return AppIconOrbit;
    case "timeline-progress-bar":
      return TimelineProgressBar;
    case "beat-step-list-theme-cycle":
      return BeatStepListThemeCycle;
    case "falling-word-field-card":
      return FallingWordFieldCard;
    default:
      return effectComponents[clip.effectId];
  }
}

export function customCardSizeStyle(clip: OverlayClip, aspectRatio?: AspectRatio) {
  if (clip.params.moduleVariant === "app-icon-orbit") {
    return { width: "1280px", height: aspectRatio === "9:16" || aspectRatio === "4:5" ? "1800px" : "820px", maxWidth: "none", maxHeight: "none" };
  }
  if (clip.params.moduleVariant === "orbit-glass-cards") {
    return { width: "1280px", height: aspectRatio === "9:16" || aspectRatio === "4:5" ? "2240px" : "820px", maxWidth: "none", maxHeight: "none" };
  }
  const widthScale = clip.params.widthScale;
  const heightScale = clip.params.heightScale;
  if (!widthScale && !heightScale) return {};
  const key = clip.params.moduleVariant || clip.effectId;
  const base = cardSizeBase[key] || cardSizeBase[clip.effectId] || { width: 720 };
  const style: CSSProperties = {};
  if (widthScale) {
    style.width = `${Math.round(base.width * widthScale)}px`;
    style.maxWidth = "calc(100% - 96px)";
  }
  if (heightScale && base.height) {
    style.height = `${Math.round(base.height * heightScale)}px`;
    style.maxHeight = "calc(100% - 80px)";
  }
  return style;
}

export function anchorFor(x: number) {
  return x <= 35 ? "left" : "left";
}

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

function isLightHexColor(hex: string) {
  const rgb = hexToRgb(hex);
  if (!rgb) return true;
  const luminance = (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
  return luminance >= 0.62;
}

export function titlePalette(titleColor: string) {
  const isLight = isLightHexColor(titleColor);
  return {
    ink: titleColor,
    soft: isLight ? "rgba(255, 255, 255, 0.72)" : "rgba(17, 24, 39, 0.68)",
    glow: isLight ? "rgba(255, 255, 255, 0.18)" : "rgba(0, 0, 0, 0.14)",
    shadow: "rgba(0, 0, 0, 0.24)",
  };
}

function splitLines(text: string | undefined) {
  return (text || "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

const keywordPatternSource =
  "(百分比|完成率|转化率|错误率|成功率|系统|流程|链路|收入|播放|金额|自动化|效率|基金|AI)";

function renderKeywordHighlights(text: string): ReactNode[] {
  const pattern = new RegExp(keywordPatternSource, "gi");
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      nodes.push(text.slice(lastIndex, index));
    }
    nodes.push(
      <mark className="keyword-highlight" key={`${match[0]}-${index}`}>
        {match[0]}
      </mark>,
    );
    lastIndex = index + match[0].length;
  }
  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }
  return nodes.length ? nodes : [text];
}

function extractOdometerValue(text: string | undefined) {
  const source = splitLines(text)[0] || text || "";
  const match = source.match(/[-+]?\d[\d,]*(?:\.\d+)?\s*[%％]?/);
  return (match?.[0] || source || "99.98%").trim();
}

function extractCounterValue(text: string | undefined) {
  const source = splitLines(text)[0] || text || "";
  const match = source.match(/[-+]?\d[\d,]*(?:\.\d+)?(?:\s*[%％+]?)?/);
  if (!match) return "300,000+";
  const value = match[0].trim();
  return value.endsWith("+") || /[%％]$/.test(value) ? value : `${value}+`;
}

function splitEditablePair(text: string | undefined) {
  const [main = "", meta = ""] = (text || "")
    .split("|")
    .map((part) => part.trim());
  return { main, meta };
}

function splitTripleSegments(text: string) {
  const [main = "", meta = "", extra = ""] = text
    .split("|")
    .map((part) => part.trim());
  return { main, meta, extra };
}

function splitMetaList(text: string | undefined) {
  return (text || "")
    .split(/[|/]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function splitMetricLine(text: string) {
  const match = text.match(/^([\d,.]+%?)\s*(.*)$/);
  if (!match) return [text, ""] as const;
  return [match[1], match[2]] as const;
}

function extractNumbers(text: string | undefined) {
  return (text || "")
    .match(/\d[\d,]*(?:\.\d+)?/g)
    ?.map((value) => Number(value.replace(/,/g, "")))
    .filter((value) => Number.isFinite(value)) || [];
}

function splitPipeOrLine(text: string | undefined) {
  return (text || "")
    .split(/[|/]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function parseRatio(text: string | undefined) {
  const match = (text || "").match(/([\d.]+)\s*[%％]/);
  return match ? Number(match[1]) : null;
}

function formatRatioText(value: number, source: string) {
  const hasDecimal = /\d+\.\d+\s*[%％]/.test(source);
  if (!hasDecimal || Math.abs(value - Math.round(value)) < 0.05) {
    return String(Math.round(value));
  }
  return value.toFixed(1).replace(/\.0$/, "");
}

function formatClock(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const rest = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

function AmberProofTitle({ clip, progress, exitProgress }: EffectProps) {
  const entry = easeOutCubic(progress / 0.24);
  const chipEntry = easeOutCubic((progress - 0.22) / 0.22);
  const chips = splitLines(clip.params.subtitle).slice(0, 3);
  return (
    <div
      className="amber-proof-title"
      style={
        {
          "--accent": clip.params.accent,
          opacity: entry * (1 - exitProgress),
          transform: `translateY(${(1 - entry) * 18}px)`,
        } as CSSProperties
      }
    >
      <span>{renderKeywordHighlights(clip.params.kicker || "")}</span>
      <div className="amber-proof-main">
        <b aria-hidden="true">
          <i />
        </b>
        <strong>{renderKeywordHighlights(clip.text)}</strong>
      </div>
      <div className="amber-proof-chips" style={{ opacity: chipEntry }}>
        {(chips.length ? chips : ["不用复杂工具", "零基础也能做"]).map(
          (chip) => (
            <em key={chip}>
              <i />
              {chip}
            </em>
          ),
        )}
      </div>
    </div>
  );
}

function BeatStepListThemeCycle({ clip, progress, exitProgress }: EffectProps) {
  const entry = easeOutCubic(progress / 0.26);
  const words = (
    splitLines(clip.text).length
      ? splitLines(clip.text)
      : ["modern", "playful", "expressive"]
  ).slice(0, 5);
  const activeIndex = Math.min(
    words.length - 1,
    Math.floor(progress * words.length),
  );
  return (
    <div
      className="beat-step-list-theme-cycle"
      style={
        {
          "--accent": clip.params.accent,
          opacity: entry * (1 - exitProgress),
        } as CSSProperties
      }
    >
      <section className="beat-step-list-theme-cycle__stage">
        <div className="beat-step-list-theme-cycle__halo" />
        <div className="beat-step-list-theme-cycle__stack">
          {words.map((word, index) => (
            <div
              className={`beat-step-list-theme-cycle__word ${index === activeIndex ? "is-active" : ""}`}
              key={`${word}-${index}`}
              style={{
                transform: `translate(-50%, -50%) translateY(${(index - activeIndex) * 58}px)`,
              }}
            >
              {renderKeywordHighlights(word)}
            </div>
          ))}
        </div>
        <div className="beat-step-list-theme-cycle__spotlight">
          <span className="beat-step-list-theme-cycle__spotlight-core" />
          <strong>{words[activeIndex]}</strong>
        </div>
      </section>
    </div>
  );
}



function Carousel3D({ clip, progress, exitProgress }: EffectProps) {
  const entry = easeOutCubic(progress / 0.28);
  const lines = splitLines(clip.text);
  const cards = (lines.length
    ? lines
    : ["CARD 01 | orbit", "CARD 02 | depth", "CARD 03 | focus"]
  ).slice(0, 8);
  const orbitSpin = progress * Math.PI * 2 * 0.38 - Math.PI / 2;
  return (
    <div
      className="carousel-3d"
      style={
        {
          "--accent": clip.params.accent,
          opacity: entry * (1 - exitProgress),
        } as CSSProperties
      }
    >
      <section className="carousel-3d__stage">
        <div className="carousel-3d__glow" />
        <div className="carousel-3d__ring" />
        <div className="carousel-3d__axis" />
        <div className="carousel-3d__hub">
          <span>CAROUSEL · 3D ORBIT</span>
          <strong>{clip.params.kicker || "环形画廊"}</strong>
          <p>{clip.params.subtitle || "卡片围绕中心轮转，前景突出，中心保持留白"}</p>
        </div>
        <div className="carousel-3d__scene">
          {cards.map((line, index) => {
            const [title = `CARD ${index + 1}`, subtitle = "depth"] = line
              .split("|")
              .map((part) => part.trim());
            const count = Math.max(cards.length, 1);
            const angle = orbitSpin + (index / count) * Math.PI * 2;
            const depth = (Math.sin(angle) + 1) / 2;
            const x = Math.cos(angle) * 272;
            const y = Math.sin(angle) * 104;
            const scale = 0.76 + depth * 0.32;
            const tiltY = Math.sin(angle) * 38;
            const tiltZ = Math.cos(angle) * 7;
            const opacity = 0.38 + depth * 0.62;
            const blur = (1 - depth) * 1.15;
            return (
              <article
                className={`carousel-3d__card ${depth > 0.58 ? "is-front" : "is-back"}`}
                key={`${title}-${index}`}
                style={
                  {
                    "--card-color": clip.params.accent,
                    "--card-opacity": opacity,
                    "--card-blur": `${blur}px`,
                    zIndex: Math.round(100 + depth * 100),
                    transform: `translate(-50%, -50%) translate3d(${x}px, ${y}px, ${depth * 180}px) rotateY(${tiltY}deg) rotateZ(${tiltZ}deg) scale(${scale})`,
                  } as CSSProperties
                }
              >
                <em
                  className={`carousel-3d__mark carousel-3d__mark--${index % 4}`}
                />
                <i className="carousel-3d__chip">{String(index + 1).padStart(2, "0")}</i>
                <strong>{title}</strong>
                <span>{subtitle}</span>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export function PreviewStage({
  aspectRatio,
  clips,
  currentTime,
  isPlaying,
  videoUrl,
  videoName,
  secondaryVideoUrl,
  secondaryVideoName,
  splitModeEnabled,
  splitLayoutMode,
  splitRatio,
  splitBackground,
  selectedClipId,
  globalScale,
  videoScale,
  playbackRate,
  showSafeZones,
  onVideoMeta,
  onVideoError,
  onSelectClip,
}: PreviewStageProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const shellRef = useRef<HTMLElement | null>(null);
  const [videoState, setVideoState] = useState<
    "idle" | "loading" | "ready" | "error"
  >(videoUrl ? "loading" : "idle");
  const [videoMeta, setVideoMeta] = useState<{
    duration: number;
    width: number;
    height: number;
  } | null>(null);
  const [shellSize, setShellSize] = useState({ width: 0, height: 0 });
  const visibleClips = clips.filter((clip) => {
    const clipEnd = clip.start + clip.duration;
    return (
      clip.enabled && currentTime >= clip.start && currentTime < clipEnd
    );
  });

  useEffect(() => {
    if (!videoUrl) {
      setVideoState("idle");
      setVideoMeta(null);
      return;
    }
    setVideoState("loading");
    setVideoMeta(null);
  }, [videoUrl]);

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;
    const updateSize = () => {
      const rect = shell.getBoundingClientRect();
      setShellSize({ width: rect.width, height: rect.height });
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(shell);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoUrl || videoState === "error") return;
    video.playbackRate = playbackRate;
    if (
      video.readyState >= 1 &&
      Number.isFinite(video.duration) &&
      video.duration > 0
    ) {
      const safeTime = clamp(
        currentTime,
        0,
        Math.max(0, video.duration - 0.05),
      );
      const drift = Math.abs(video.currentTime - safeTime);
      if (drift > 0.12) {
        try {
          video.currentTime = safeTime;
        } catch {
          // Some codecs reject seeks while still warming up.
        }
      }
    }
    if (isPlaying) {
      void video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [currentTime, isPlaying, playbackRate, videoState, videoUrl]);

  return (
    <section
      className={`preview-shell ratio-${aspectRatio.replace(":", "-")} ${videoUrl ? "has-video" : ""}`}
      ref={shellRef}
    >
      <div className="preview-alpha-stage" aria-hidden="true">
        <div className="preview-alpha-stage__grid" />
        <div className="preview-alpha-stage__scan scan-one" />
        <div className="preview-alpha-stage__scan scan-two" />
      </div>
      {videoUrl ? (
        <video
          ref={videoRef}
          className="preview-video-stage__video"
          key={videoUrl}
          src={videoUrl}
          muted
          playsInline
          preload="auto"
          onLoadedData={() => {
            const video = videoRef.current;
            if (!video) return;
            video.playbackRate = playbackRate;
            const duration = Number.isFinite(video.duration)
              ? video.duration
              : 0;
            const safeTime =
              duration > 0
                ? clamp(currentTime, 0, Math.max(0, duration - 0.05))
                : currentTime;
            try {
              video.currentTime = safeTime;
            } catch {
              // Keep the frame we already have if the browser refuses the seek.
            }
            setVideoState("ready");
            const meta = {
              duration,
              width: video.videoWidth,
              height: video.videoHeight,
            };
            setVideoMeta(meta);
            onVideoMeta(meta);
            if (!isPlaying) video.pause();
          }}
          onError={() => {
            setVideoState("error");
            setVideoMeta(null);
            onVideoError(
              "口播视频已导入，但当前浏览器无法解码这段视频。建议换 H.264/MP4 重新导入。",
            );
          }}
        />
      ) : null}
      {splitModeEnabled ? (
        <FullSplitStage
          primaryVideoUrl={videoUrl}
          secondaryVideoUrl={secondaryVideoUrl}
          secondaryVideoName={secondaryVideoName}
          currentTime={currentTime}
          isPlaying={isPlaying}
          layout={splitLayoutMode}
          ratio={splitRatio}
          background={splitBackground}
        />
      ) : null}
      <div className="stage-grid" />
      {showSafeZones ? (
        <>
          <div className="stage-person-guide" aria-hidden="true">
            <span>
              {aspectRatio === "9:16"
                ? "竖屏人物核心安全区"
                : "中间 40% 人物核心安全区"}
            </span>
          </div>
          <div className="stage-safe stage-safe-title" />
          <div className="stage-safe stage-safe-subtitle" />
        </>
      ) : null}
      {visibleClips.map((clip) => {
        const layoutClip = adaptClipLayout(clip, aspectRatio);
        const local = clamp(
          ((currentTime - clip.start) * (clip.params.speed || 1)) /
            Math.max(clip.duration, 0.1),
          0,
          1,
        );
        const isTimelineProgress =
          clip.params.moduleVariant === "timeline-progress-bar";
        const timelineLocal = clamp(
          (currentTime - clip.start) / Math.max(clip.duration, 0.1),
          0,
          1,
        );
        const effectiveLocal = isTimelineProgress ? timelineLocal : local;
        // Match the transparent exporter: cards disappear at the exact end.
        const exitProgress = 0;
        const Effect = resolveEffectComponent(clip);
        const anchor = anchorFor(layoutClip.params.x);
        const entrySlide = easeOutCubic(effectiveLocal / 0.24);
        const slideIn = isTimelineProgress
          ? "translateX(0)"
          : `translateX(${(1 - entrySlide) * -72}px)`;
        const translate = isTimelineProgress
          ? anchor === "left"
            ? "translate(0, 0)"
            : anchor === "right"
              ? "translate(-100%, 0)"
              : "translate(-50%, 0)"
          : anchor === "left"
            ? "translate(0, -50%)"
            : anchor === "right"
              ? "translate(-100%, -50%)"
              : "translate(-50%, -50%)";
        const titleTone = clip.params.titleColor
          ? titlePalette(clip.params.titleColor)
          : null;
        const widthScale = layoutClip.params.widthScale || 1;
        const heightScale = layoutClip.params.heightScale || 1;
        const sizeStyle = customCardSizeStyle(layoutClip, aspectRatio);
        const scale = calculateCardScale(
          layoutClip,
          shellSize.width,
          shellSize.height,
          globalScale,
        );
        const isCustomSized =
          clip.params.widthScale !== undefined ||
          clip.params.heightScale !== undefined;
        const content = (
          <button
            className={`effect-hitbox effect-anchor-${anchor} effect-theme-${clip.params.cardTheme || "auto"} effect-panel-${clip.params.panelTone || "none"} ${clip.params.moduleVariant ? `effect-module-${clip.params.moduleVariant}` : ""} ${clip.params.moduleVariant?.startsWith("amber-") ? "effect-module-amber" : ""} ${isCustomSized ? "is-custom-sized" : ""} ${selectedClipId === clip.id ? "is-selected" : ""}`}
            key={clip.id}
            style={{
              ...sizeStyle,
              left: `${layoutClip.params.x}%`,
              top: `${layoutClip.params.y}%`,
              "--card-width-scale": widthScale,
              "--card-height-scale": heightScale,
              transform: `${translate} ${slideIn} scale(${scale})`,
          transformOrigin: isTimelineProgress ? "top left" : undefined,
              ...(titleTone
                ? ({
                    "--title-ink": titleTone.ink,
                    "--title-soft": titleTone.soft,
                    "--title-glow": titleTone.glow,
                    "--title-shadow": titleTone.shadow,
                  } as CSSProperties)
                : {}),
            } as CSSProperties}
            onClick={() => onSelectClip(clip.id)}
            type="button"
          >
            <Effect
              aspectRatio={aspectRatio}
              clip={clip}
              progress={effectiveLocal}
              exitProgress={exitProgress}
              currentTime={currentTime}
              isPlaying={isPlaying}
              primaryVideoUrl={videoUrl}
              secondaryVideoUrl={secondaryVideoUrl}
              secondaryVideoName={secondaryVideoName}
            />
          </button>
        );
        return clip.params.moduleVariant === "app-icon-orbit"
          ? <BehindPerson key={clip.id} videoRef={videoRef} videoUrl={videoUrl} onError={onVideoError}>{content}</BehindPerson>
          : content;
      })}
    </section>
  );
}

function FullSplitStage({
  background,
  primaryVideoUrl,
  secondaryVideoUrl,
  secondaryVideoName,
  currentTime,
  isPlaying,
  layout,
  ratio,
}: {
  background: SplitBackground;
  primaryVideoUrl: string;
  secondaryVideoUrl: string;
  secondaryVideoName: string;
  currentTime: number;
  isPlaying: boolean;
  layout: 'side-by-side' | 'stacked';
  ratio: number;
}) {
  const primaryRef = useRef<HTMLVideoElement | null>(null);
  const secondaryRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    [primaryRef.current, secondaryRef.current].forEach((video) => {
      if (!video) return;
      if (video.readyState >= 1 && Number.isFinite(video.duration)) {
        const target = clamp(currentTime, 0, Math.max(0, video.duration - 0.05));
        if (Math.abs(video.currentTime - target) > 0.12) video.currentTime = target;
      }
      if (isPlaying) void video.play().catch(() => {});
      else video.pause();
    });
  }, [currentTime, isPlaying, primaryVideoUrl, secondaryVideoUrl]);

  return (
    <div
      className={`full-split-stage full-split-stage--${layout} full-split-background--${background}`}
      style={{ '--split-ratio': `${ratio}%` } as CSSProperties}
    >
      {background !== 'dark' && <div className="split-brand-mark">夏哥研究室</div>}
      <div className="full-split-pane full-split-pane--person">
        {primaryVideoUrl ? (
          <video ref={primaryRef} src={primaryVideoUrl} muted playsInline preload="auto" />
        ) : <div className="full-split-empty">请先上传人物口播视频</div>}
        <span>人物口播</span>
      </div>
      <div className="full-split-pane full-split-pane--demo">
        {(background === 'brand' || background === 'gray') && <div className="split-browser-chrome" aria-hidden="true">
          <div className="split-browser-tabs">
            <div className="split-browser-lights"><i /><i /><i /></div>
            <div className="split-browser-tab"><span>{secondaryVideoName || '演示画面'}</span><X size={11} /></div>
            <Plus size={12} />
          </div>
          <div className="split-browser-toolbar">
            <ArrowLeft size={13} /><ArrowRight size={13} /><ArrowClockwise size={13} />
            <div className="split-browser-address">本地演示</div>
            <DotsThreeVertical size={14} />
          </div>
        </div>}
        <div className="split-browser-content">
        {secondaryVideoUrl ? (
          <video ref={secondaryRef} src={secondaryVideoUrl} muted playsInline preload="auto" />
        ) : <div className="full-split-empty">请上传演示视频</div>}
        </div>
      </div>
    </div>
  );
}

function AmbientWash({ clip, progress, exitProgress }: EffectProps) {
  const entry = easeOutCubic(progress / 0.3);
  const opacity =
    (0.12 + clip.params.intensity / 180) * entry * (1 - exitProgress * 0.55);
  return (
    <div
      className="ambient-wash"
      style={{ "--accent": clip.params.accent, opacity } as CSSProperties}
    >
      <span>{clip.params.kicker}</span>
      <strong>{clip.text}</strong>
      <em>{clip.params.subtitle}</em>
    </div>
  );
}

function SectionHead({ clip, progress, exitProgress }: EffectProps) {
  if (clip.params.moduleVariant === "amber-proof-title") {
    return (
      <AmberProofTitle
        clip={clip}
        progress={progress}
        exitProgress={exitProgress}
      />
    );
  }
  const entry = easeOutCubic(progress / 0.35);
  const lineScale = easeOutCubic(progress / 0.2);
  const opacity = entry * (1 - exitProgress);
  return (
    <div
      className="section-head-card"
      style={
        {
          "--accent": clip.params.accent,
          opacity,
          transform: `translate3d(0, ${(1 - entry) * 14}px, 0)`,
        } as CSSProperties
      }
    >
      <i style={{ transform: `scaleY(${lineScale})` }} />
      <span>{clip.params.kicker}</span>
      <h2>{renderKeywordHighlights(clip.text)}</h2>
      <p>{renderKeywordHighlights(clip.params.subtitle || "")}</p>
    </div>
  );
}

function AmberProgressRing({ clip, progress, exitProgress }: EffectProps) {
  const entry = easeOutCubic(progress / 0.24);
  const headEntry = easeOutCubic((progress - 0.05) / 0.16);
  const dialEntry = easeOutCubic((progress - 0.09) / 0.24);
  const footerEntry = easeOutCubic((progress - 0.18) / 0.16);
  const lines = splitLines(clip.text);
  const textIndex = /^\d{1,2}$/.test(lines[0] || "") ? lines[0] : "";
  const contentStart = textIndex ? 1 : 0;
  const percentLine =
    lines.find((line) => /[%％]/.test(line)) ||
    lines[contentStart + 2] ||
    lines[contentStart + 1] ||
    clip.params.subtitle ||
    "75%";
  const ringValue = clamp(parseRatio(percentLine) ?? 75, 0, 100);
  const ringAngle = `${ringValue * 3.6 * clamp(dialEntry, 0, 1)}deg`;
  const indexLabel = textIndex || clip.params.kicker || "03";
  const title = lines[contentStart] || clip.label || "完成率提升";
  const subtitle =
    clip.params.subtitle ||
    lines[contentStart + 1] ||
    "PERCENT / COMPLETION";
  const footerCandidate = lines[contentStart + 3] || lines[contentStart + 2];
  const footer =
    footerCandidate && footerCandidate !== percentLine
      ? footerCandidate
      : "数字更小一档，百分号更轻，中心更干净";
  const isDarkTheme = clip.params.cardTheme === "dim";
  const numberText = formatRatioText(ringValue, percentLine);
  return (
    <div
      className={`amber-progress-ring ${isDarkTheme ? "is-dark" : "is-bright"}`}
      style={
        {
          "--accent": clip.params.accent,
          "--ring-angle": ringAngle,
          opacity: entry * (1 - exitProgress),
          transform: `translateY(${(1 - entry) * 16}px) scale(${0.985 + entry * 0.015})`,
        } as CSSProperties
      }
    >
      <div className="amber-progress-ring__head" style={{ opacity: headEntry }}>
        <div className="amber-progress-ring__index">
          <span>{indexLabel}</span>
        </div>
        <strong>
          <span className="amber-progress-ring__count">{title}</span>
          <span className="amber-progress-ring__label">{subtitle}</span>
        </strong>
      </div>
      <div className="amber-progress-ring__dial" style={{ opacity: dialEntry }}>
        <div className="amber-progress-ring__dial-frame">
          <div className="amber-progress-ring__donut">
            <div className="amber-progress-ring__center">
              <strong>
                <span className="amber-progress-ring__number">
                  {numberText}
                </span>
                <span className="amber-progress-ring__percent">%</span>
              </strong>
            </div>
          </div>
        </div>
      </div>
      <p className="amber-progress-ring__footer" style={{ opacity: footerEntry }}>
        {footer}
      </p>
    </div>
  );
}

function AmberSceneSteps({ clip, progress, exitProgress }: EffectProps) {
  const entry = easeOutCubic(progress / 0.26);
  const headEntry = easeOutCubic((progress - 0.02) / 0.18);
  const subtitleParts = (clip.params.subtitle || "")
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);
  const headerSubtitle = subtitleParts[0] || "上传 SRT · 自动配动效";
  const labelSource = subtitleParts.slice(1).join(" · ");
  const labelList = labelSource
    .split(/[·•,，]/)
    .map((part) => part.trim())
    .filter(Boolean);
  const textLines = splitLines(clip.text);
  const titleLines =
    textLines.length > 1
      ? textLines
      : (textLines[0] || "")
          .split(/[|/]/)
          .map((part) => part.trim())
          .filter(Boolean);
  const fallbackTitles = [
    "直接上传SRT口播稿",
    "大模型做语义分割",
    "配适合的动效",
    "输出JSON，卡点呈现",
  ];
  const fallbackLabels = ["DROP SRT", "AUTO SPLIT", "MOTION MATCH", "ON BEAT"];
  const steps = Array.from({ length: Math.max(4, Math.min(4, titleLines.length || 4)) }, (_, index) => {
    const source = titleLines[index] || fallbackTitles[index];
    const { main, meta } = splitEditablePair(source);
    return {
      title: main || fallbackTitles[index],
      label: meta || labelList[index] || fallbackLabels[index],
    };
  });
  return (
    <div
      className="amber-scene-steps"
      style={
        {
          "--accent": clip.params.accent,
          opacity: entry * (1 - exitProgress),
          transform: `translate3d(0, ${(1 - entry) * 18}px, 0)`,
        } as CSSProperties
      }
    >
      <div className="amber-scene-head" style={{ opacity: headEntry }}>
        <i style={{ transform: `scaleY(${easeOutCubic(progress / 0.22)})` }} />
        <div>
          <strong>{renderKeywordHighlights(clip.params.kicker || "SCENE 01")}</strong>
          <span>{renderKeywordHighlights(headerSubtitle)}</span>
        </div>
      </div>
      <div className="amber-step-track">
        <i
          className="amber-step-line"
          style={{ transform: `scaleY(${easeOutCubic((progress - 0.12) / 0.56)})` }}
        />
        {steps.map((step, index) => {
          const itemEntry = easeOutCubic((progress - 0.14 - index * 0.11) / 0.26);
          return (
            <div
              className="amber-step-item"
              key={`${step.title}-${index}`}
              style={
                {
                  opacity: itemEntry,
                  transform: `translateX(${(1 - itemEntry) * -24}px)`,
                } as CSSProperties
              }
            >
              <b>{String(index + 1).padStart(2, "0")}</b>
              <div>
                <strong>{renderKeywordHighlights(step.title)}</strong>
                <span>{renderKeywordHighlights(step.label)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatCompactNumber(value: number) {
  return Number.isFinite(value) ? value.toLocaleString("zh-CN") : String(value);
}

function IncomeSplitCard({ clip, progress, exitProgress }: EffectProps) {
  const entry = easeOutCubic(progress / 0.26);
  const numbers = extractNumbers(clip.text);
  const total = numbers[0] || 14000;
  const fund = numbers[1] || Math.round(total * 0.9);
  const share = clamp(Math.round((fund / Math.max(total, 1)) * 100), 0, 100);
  const headline = splitLines(clip.text)[0] || "上月自媒体总收入";
  const detail = splitLines(clip.text)[1] || "其中AI创作基金";
  const bars = [42, 56, 64, 74, 88, share];
  return (
    <div
      className="income-split-card"
      style={
        {
          "--accent": clip.params.accent,
          opacity: entry * (1 - exitProgress),
          transform: `translate3d(0, ${(1 - entry) * 16}px, 0)`,
        } as CSSProperties
      }
    >
      <div className="income-split-card__head">
        <span>{renderKeywordHighlights(clip.params.kicker || "REVENUE SPLIT")}</span>
        <div className="income-split-card__title">
          <strong>{renderKeywordHighlights(headline)}</strong>
          <p>{renderKeywordHighlights(detail)}</p>
        </div>
      </div>
      <div className="income-split-card__stats">
        <div className="income-split-card__metric">
          <em>TOTAL</em>
          <b>
            {formatCompactNumber(total)}
            <small>元</small>
          </b>
        </div>
        <div className="income-split-card__metric income-split-card__metric--accent">
          <em>FUND</em>
          <b>
            {formatCompactNumber(fund)}
            <small>元</small>
          </b>
        </div>
      </div>
      <div className="income-split-card__bars">
        {bars.map((bar, index) => (
          <i
            key={bar}
            style={{
              height: `${bar}%`,
              transform: `scaleY(${easeOutCubic((progress - index * 0.04) / 0.18)})`,
            }}
          />
        ))}
      </div>
      <div className="income-split-card__foot">
        <span>{share}%</span>
        <b>资金占比</b>
      </div>
    </div>
  );
}

function DotGridStatCard({ clip, progress, exitProgress }: EffectProps) {
  const entry = easeOutCubic(progress / 0.26);
  const percent = clamp(parseRatio(clip.text) ?? 73, 0, 100);
  const activeDots = Math.max(1, Math.round((percent / 100) * 36));
  const lines = splitLines(clip.text);
  const headline = lines[0] || "拆解 200 家 AI 创业公司";
  const subline = lines[1] || "73% 都是套壳产品";
  return (
    <div
      className="dot-grid-stat-card"
      style={
        {
          "--accent": clip.params.accent,
          opacity: entry * (1 - exitProgress),
          transform: `translate3d(0, ${(1 - entry) * 16}px, 0)`,
        } as CSSProperties
      }
    >
      <div className="dot-grid-stat-card__head">
        <span>{renderKeywordHighlights(clip.params.kicker || "DOT GRID")}</span>
        <strong>{renderKeywordHighlights(headline)}</strong>
        <p>{renderKeywordHighlights(subline)}</p>
      </div>
      <div className="dot-grid-stat-card__body">
        <div className="dot-grid-stat-card__hero">
          <b>{formatRatioText(percent, `${percent}%`)}</b>
          <span>套壳</span>
        </div>
        <div className="dot-grid-stat-card__grid">
          {Array.from({ length: 36 }, (_, index) => (
            <i
              key={index}
              className={index < activeDots ? "is-active" : ""}
              style={{
                opacity:
                  0.36 +
                  easeOutCubic((progress - index * 0.006) / 0.2) * 0.64,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ThreeLayerMindMap({ clip, progress, exitProgress }: EffectProps) {
  const entry = easeOutCubic(progress / 0.28);
  const lines = splitLines(clip.text);
  const branches = splitPipeOrLine(clip.params.subtitle || clip.text)
    .filter(Boolean)
    .slice(0, 3);
  const branchLabels =
    branches.length >= 3
      ? branches
      : ["开头钩子", "中段密度", "结尾转化"];
  return (
    <div
      className="three-layer-mind-map"
      style={
        {
          "--accent": clip.params.accent,
          opacity: entry * (1 - exitProgress),
          transform: `translate3d(0, ${(1 - entry) * 14}px, 0)`,
        } as CSSProperties
      }
    >
      <div className="three-layer-mind-map__head">
        <span>{renderKeywordHighlights(clip.params.kicker || "MIND MAP")}</span>
        <strong>{renderKeywordHighlights(lines[0] || clip.text)}</strong>
      </div>
      <div className="three-layer-mind-map__rail">
        <i
          className="three-layer-mind-map__spine"
          style={{ transform: `scaleX(${easeOutCubic(progress / 0.28)})` }}
        />
        {branchLabels.map((label, index) => {
          const nodeEntry = easeOutCubic((progress - 0.08 - index * 0.08) / 0.2);
          return (
            <div
              key={`${label}-${index}`}
              className="three-layer-mind-map__branch"
              style={
                {
                  left: `${18 + index * 30}%`,
                  opacity: nodeEntry,
                } as CSSProperties
              }
            >
              <b>0{index + 1}</b>
              <span>{renderKeywordHighlights(label)}</span>
            </div>
          );
        })}
      </div>
      <p>{renderKeywordHighlights(clip.params.subtitle || "单线展开的规则结构")}</p>
    </div>
  );
}

function GlassProcessBubble({ clip, progress, exitProgress }: EffectProps) {
  const entry = easeOutCubic(progress / 0.28);
  const steps = splitPipeOrLine(clip.params.subtitle || clip.text)
    .filter(Boolean)
    .slice(0, 4);
  const flowSteps =
    steps.length >= 3 ? steps : ["采集", "生成", "复核", "交付"];
  return (
    <div
      className="glass-process-bubble"
      style={
        {
          "--accent": clip.params.accent,
          opacity: entry * (1 - exitProgress),
          transform: `translate3d(0, ${(1 - entry) * 14}px, 0)`,
        } as CSSProperties
      }
    >
      <div className="glass-process-bubble__bubble">
        <span>{renderKeywordHighlights(clip.params.kicker || "PROCESS BUBBLE")}</span>
        <strong>{renderKeywordHighlights(clip.text)}</strong>
        <p>{renderKeywordHighlights(clip.params.subtitle || "")}</p>
      </div>
      <div className="glass-process-bubble__flow">
        <i className="glass-process-bubble__line" />
        {flowSteps.map((step, index) => {
          const nodeEntry = easeOutCubic((progress - 0.14 - index * 0.08) / 0.18);
          return (
            <div
              key={`${step}-${index}`}
              className="glass-process-bubble__node"
              style={
                {
                  opacity: nodeEntry,
                  transform: `translateX(${(1 - nodeEntry) * -10}px)`,
                } as CSSProperties
              }
            >
              <b />
              <span>{renderKeywordHighlights(step)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ChainBubbleFlow({ clip, progress, exitProgress }: EffectProps) {
  const entry = easeOutCubic(progress / 0.26);
  const topEntry = easeOutCubic((progress - 0.03) / 0.22);
  const gridEntry = easeOutCubic((progress - 0.14) / 0.3);
  const deckEntry = easeOutCubic((progress - 0.34) / 0.28);
  const pillEntry = easeOutCubic((progress - 0.54) / 0.26);
  const lines = splitLines(clip.text);
  const logicTitle = lines[0] || "编辑台的逻辑";
  const stepOne = lines[1] || "先按自己的喜好 · 建一个动效素材库";
  const stepTwo = lines[2] || "再搭建一个编辑台";
  const finalLine = lines[3] || "以后每条视频 · 只需几分钟";
  const gridLabels = splitPipeOrLine(clip.params.subtitle || "")
    .filter(Boolean)
    .slice(0, 6);
  const cells = gridLabels.length ? gridLabels : ["list", "ring", "grid", "line", "card", "copy"];

  return (
    <div
      className="chain-bubble-flow"
      style={
        {
          "--accent": clip.params.accent,
          opacity: entry * (1 - exitProgress),
          transform: `translate3d(${(1 - entry) * -28}px, ${(1 - entry) * 12}px, 0)`,
        } as CSSProperties
      }
    >
      <div
        className="chain-logic-kicker"
        style={{
          opacity: topEntry,
          transform: `translateX(${(1 - topEntry) * -18}px)`,
        }}
      >
        <i />
        <span>{renderKeywordHighlights(clip.params.kicker || "THE LOGIC")}</span>
        <b>·</b>
        <em>{renderKeywordHighlights(logicTitle)}</em>
      </div>
      <section className="chain-logic-step chain-logic-step--library">
        <div className="chain-step-heading" style={{ opacity: topEntry }}>
          <strong>01</strong>
          <span>MOTION LIBRARY</span>
          <h2>{renderKeywordHighlights(stepOne)}</h2>
        </div>
        <div className="chain-library-wall" style={{ opacity: gridEntry }}>
          {Array.from({ length: 12 }, (_, index) => {
            const cellEntry = easeOutCubic((progress - 0.14 - index * 0.025) / 0.18);
            const kind = index % 6;
            return (
              <i
                className={`chain-library-cell cell-${kind}`}
                key={`${cells[index % cells.length]}-${index}`}
                style={
                  {
                    opacity: cellEntry,
                    transform: `translateY(${(1 - cellEntry) * 12}px) scale(${0.94 + cellEntry * 0.06})`,
                  } as CSSProperties
                }
              />
            );
          })}
        </div>
      </section>
      <section className="chain-logic-step chain-logic-step--deck">
        <div className="chain-step-heading" style={{ opacity: deckEntry }}>
          <strong>02</strong>
          <span>THE DECK</span>
          <h2>{renderKeywordHighlights(stepTwo)}</h2>
        </div>
        <div
          className="chain-editor-deck"
          style={{
            opacity: deckEntry,
            transform: `translateY(${(1 - deckEntry) * 18}px)`,
          }}
        >
          <div className="chain-deck-dots">
            <i />
            <i />
            <i />
          </div>
          <div className="chain-deck-slot">
            {[0, 1, 2].map((index) => {
              const barEntry = easeOutCubic((progress - 0.45 - index * 0.08) / 0.22);
              return (
                <i
                  key={index}
                  style={{
                    transform: `scaleX(${barEntry})`,
                  }}
                />
              );
            })}
          </div>
        </div>
      </section>
      <div
        className="chain-result-pill"
        style={{
          opacity: pillEntry,
          transform: `translateY(${(1 - pillEntry) * 22}px) scale(${0.96 + pillEntry * 0.04})`,
        }}
      >
        <strong>{renderKeywordHighlights(finalLine)}</strong>
        <span>MINUTES PER EPISODE</span>
      </div>
      <div className="chain-logic-glow" aria-hidden="true" />
    </div>
  );
}

function ReviewSplitCard({ clip, progress, exitProgress }: EffectProps) {
  const entry = easeOutCubic(progress / 0.26);
  const titleEntry = easeOutCubic((progress - 0.03) / 0.18);
  const leftEntry = easeOutCubic((progress - 0.14) / 0.28);
  const rightEntry = easeOutCubic((progress - 0.25) / 0.24);
  const pillEntry = easeOutCubic((progress - 0.46) / 0.22);
  const lines = splitLines(clip.text);
  const product = lines[0] || "AI 视觉工作流";
  const sceneLabel = lines[1] || "场景";
  const sceneScale = lines[2] || "VAST";
  const personLabel = lines[3] || "人物";
  const personScale = lines[4] || "TINY";
  const conclusion = lines[5] || "建筑更简洁";
  const conclusionTag = lines[6] || "MINIMAL";

  return (
    <div
      className="review-split-card"
      style={
        {
          "--accent": clip.params.accent,
          opacity: entry * (1 - exitProgress),
          transform: `translate3d(${(1 - entry) * -28}px, ${(1 - entry) * 10}px, 0)`,
        } as CSSProperties
      }
    >
      <div className="review-split-title" style={{ opacity: titleEntry }}>
        <i />
        <strong>{renderKeywordHighlights(clip.params.kicker || "ROUND 1 · REVIEW")}</strong>
      </div>
      <div className="review-split-bg-word" aria-hidden="true">OR</div>
      <div className="review-split-browser" aria-hidden="true">
        <div className="review-browser-logo">
          <i />
          <span>{product}</span>
        </div>
        <b />
        <b />
        <b />
      </div>
      <section
        className="review-panel review-panel--scene"
        style={{
          opacity: leftEntry,
          transform: `translate3d(${(1 - leftEntry) * -18}px, ${(1 - leftEntry) * 10}px, 0) scale(${0.96 + leftEntry * 0.04})`,
        }}
      >
        <div className="review-scene-icon" aria-hidden="true">
          <i />
        </div>
        <div className="review-panel-label">
          <span>↗</span>
          <strong>{renderKeywordHighlights(sceneLabel)}</strong>
          <em>{renderKeywordHighlights(sceneScale)}</em>
        </div>
      </section>
      <section
        className="review-panel review-panel--person"
        style={{
          opacity: rightEntry,
          transform: `translate3d(${(1 - rightEntry) * 18}px, ${(1 - rightEntry) * 10}px, 0) scale(${0.96 + rightEntry * 0.04})`,
        }}
      >
        <div className="review-person-icon" aria-hidden="true">
          <User weight="regular" />
        </div>
        <div className="review-panel-label">
          <span>↘</span>
          <strong>{renderKeywordHighlights(personLabel)}</strong>
          <em>{renderKeywordHighlights(personScale)}</em>
        </div>
      </section>
      <div
        className="review-result-pill"
        style={{
          opacity: pillEntry,
          transform: `translateY(${(1 - pillEntry) * 16}px) scale(${0.96 + pillEntry * 0.04})`,
        }}
      >
        <i />
        <strong>{renderKeywordHighlights(conclusion)}</strong>
        <span>{renderKeywordHighlights(conclusionTag)}</span>
      </div>
    </div>
  );
}

function PressureBarComparison({ clip, progress, exitProgress }: EffectProps) {
  const entry = easeOutCubic(progress / 0.26);
  const rowsEntry = easeOutCubic((progress - 0.18) / 0.28);
  const noteEntry = easeOutCubic((progress - 0.58) / 0.22);
  const lines = splitLines(clip.text);
  const title = lines[0] || "资本开支压力";
  const rows = Array.from({ length: 4 }, (_, index) => {
    const fallback = [
      "微软 CY2026 | 约 $190B | 92",
      "Meta 2025 指引 | $125B-145B | 68",
      "亚马逊 P&E 增量 | +$59.3B | 38",
      "苹果 | 相对稳定 | 16",
    ][index];
    const parts = (lines[index + 1] || fallback)
      .split("|")
      .map((part) => part.trim());
    const label = parts[0] || `对比项 ${index + 1}`;
    const value = parts[1] || "";
    const score = clamp(Number.parseFloat(parts[2] || "") || [92, 68, 38, 16][index], 6, 100);
    return { label, value, score, index };
  });
  const note =
    lines[5] ||
    clip.params.subtitle ||
    "重点不是谁花最多，而是这些支出什么时候停止稀释毛利率与自由现金流。";

  return (
    <div
      className="pressure-bar-comparison"
      style={
        {
          "--accent": clip.params.accent,
          opacity: entry * (1 - exitProgress),
          transform: `translate3d(${(1 - entry) * -28}px, ${(1 - entry) * 12}px, 0) scale(${0.98 + entry * 0.02})`,
        } as CSSProperties
      }
    >
      <header className="pressure-bar-head">
        <h2>{renderKeywordHighlights(title)}</h2>
        <span>{renderKeywordHighlights(clip.params.kicker || "报告已摘取")}</span>
      </header>
      <div className="pressure-bar-list" style={{ opacity: rowsEntry }}>
        {rows.map((row) => {
          const barEntry = easeOutCubic((progress - 0.2 - row.index * 0.08) / 0.24);
          return (
            <div className="pressure-bar-row" key={`${row.label}-${row.index}`}>
              <div className="pressure-bar-row__meta">
                <strong>{renderKeywordHighlights(row.label)}</strong>
                <b>{renderKeywordHighlights(row.value)}</b>
              </div>
              <div className="pressure-bar-track">
                <i
                  style={{
                    width: `${row.score}%`,
                    transform: `scaleX(${barEntry})`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div
        className="pressure-bar-note"
        style={{
          opacity: noteEntry,
          transform: `translateY(${(1 - noteEntry) * 12}px)`,
        }}
      >
        {renderKeywordHighlights(note)}
      </div>
    </div>
  );
}

function NumericPunchCard({ clip, progress, exitProgress }: EffectProps) {
  const entry = easeOutCubic(progress / 0.22);
  const numberEntry = easeOutCubic((progress - 0.04) / 0.2);
  const labelEntry = easeOutCubic((progress - 0.2) / 0.22);
  const lines = splitLines(clip.text);
  const source = lines.join(" ") || "5 MIN 同款复刻 SAME RESULT";
  const numberMatch = source.match(/[-+]?\d[\d,]*(?:\.\d+)?/);
  const number = lines[0]?.match(/[-+]?\d[\d,]*(?:\.\d+)?/)?.[0] || numberMatch?.[0] || "5";
  const unit =
    lines[1]?.replace(number, "").trim() ||
    source.slice((numberMatch?.index || 0) + number.length).match(/^[\s·:：-]*([A-Za-z%％倍分钟秒小时天]+)/)?.[1] ||
    "MIN";
  const zhLabel = lines[2] || source.match(/[\u4e00-\u9fa5][\u4e00-\u9fa5\s]{1,8}/)?.[0]?.trim() || "同款复刻";
  const enLabel = lines[3] || clip.params.subtitle || "SAME RESULT";
  const numberFit = number.length <= 2 ? 1 : number.length === 3 ? 0.78 : number.length === 4 ? 0.62 : 0.5;

  return (
    <div
      className="numeric-punch-card"
      style={
        {
          "--accent": clip.params.accent,
          "--number-fit": numberFit,
          opacity: entry * (1 - exitProgress),
          transform: `translate3d(${(1 - entry) * -22}px, ${(1 - entry) * 8}px, 0)`,
        } as CSSProperties
      }
    >
      <div
        className="numeric-punch-main"
        style={{
          transform: `translateY(${(1 - numberEntry) * 12}px) scale(${0.9 + numberEntry * 0.1})`,
        }}
      >
        <strong>{number}</strong>
        <b>{renderKeywordHighlights(unit)}</b>
      </div>
      <div
        className="numeric-punch-labels"
        style={{
          opacity: labelEntry,
          transform: `translateX(${(1 - labelEntry) * 14}px)`,
        }}
      >
        <span>{renderKeywordHighlights(zhLabel)}</span>
        <em>{renderKeywordHighlights(enLabel)}</em>
      </div>
      <i className="numeric-punch-rail" aria-hidden="true" />
    </div>
  );
}

function ThreeStepActionCard({ clip, progress, exitProgress }: EffectProps) {
  const entry = easeOutCubic(progress / 0.24);
  const headEntry = easeOutCubic((progress - 0.05) / 0.22);
  const panelEntry = easeOutCubic((progress - 0.16) / 0.28);
  const lines = splitLines(clip.text);
  const headline = lines[0] || "把满格调回 20 万";
  const { main: headlineMain, meta: headlineAccent } = splitEditablePair(headline);
  const headerNumber = (clip.params.kicker || "01").match(/\d+/)?.[0] || "01";
  const headerLabel = (clip.params.kicker || "RESET THE GAUGE").replace(/^\d+\s*[·.、-]?\s*/, "") || "RESET THE GAUGE";
  const subtitle = clip.params.subtitle || "Claude Code 给我的三条药方";
  const stepSources = lines.slice(1, 4);
  const fallbackSteps = [
    "动作 1|状态栏校准|满格 100 万 → 20 万，显示绝对数字",
    "动作 2|到线就清理|黄/红就动手，clear 或重开对话",
    "动作 3|及时开新对话|新话题新窗口，别让一个对话塞几千轮",
  ];
  const steps = Array.from({ length: 3 }, (_, index) => {
    const source = stepSources[index] || fallbackSteps[index];
    const parts = source.split(/[|｜]/).map((part) => part.trim()).filter(Boolean);
    return {
      chip: parts[0] || `动作 ${index + 1}`,
      title: parts[1] || fallbackSteps[index].split("|")[1],
      body: parts[2] || fallbackSteps[index].split("|")[2],
    };
  });
  const statusSource = lines[4] || "绿 · 随便干|黄 · 准备换气|红 · 已在付价";
  const statuses = statusSource
    .split(/[|｜]/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 3);
  const statusItems = statuses.length === 3 ? statuses : ["绿 · 随便干", "黄 · 准备换气", "红 · 已在付价"];

  return (
    <div
      className="three-step-action-card"
      style={
        {
          "--accent": clip.params.accent,
          opacity: entry * (1 - exitProgress),
          transform: `translate3d(${(1 - entry) * -28}px, ${(1 - entry) * 10}px, 0)`,
        } as CSSProperties
      }
    >
      <header className="three-step-action-hero" style={{ opacity: headEntry }}>
        <strong>{headerNumber.padStart(2, "0")}</strong>
        <div>
          <span>{renderKeywordHighlights(headerLabel)}</span>
          <h2>
            {renderKeywordHighlights(headlineMain)}
            {headlineAccent && <em>{renderKeywordHighlights(headlineAccent)}</em>}
          </h2>
          <p>{renderKeywordHighlights(subtitle)}</p>
        </div>
      </header>

      <section
        className="three-step-action-panel"
        style={{
          opacity: panelEntry,
          transform: `translateY(${(1 - panelEntry) * 20}px) scale(${0.96 + panelEntry * 0.04})`,
        }}
      >
        <div className="three-step-action-panel-head">
          <span>-- ACTION · 三步动作</span>
          <b>123</b>
        </div>
        <div className="three-step-action-grid">
          {steps.map((step, index) => {
            const itemEntry = easeOutCubic((progress - 0.28 - index * 0.1) / 0.28);
            return (
              <article
                key={`${step.title}-${index}`}
                style={{
                  opacity: itemEntry,
                  transform: `translateY(${(1 - itemEntry) * 16}px)`,
                }}
              >
                <span>{renderKeywordHighlights(step.chip)}</span>
                <strong>{renderKeywordHighlights(step.title)}</strong>
                <p>{renderKeywordHighlights(step.body)}</p>
              </article>
            );
          })}
        </div>
        <div className="three-step-status-row">
          {statusItems.map((item, index) => (
            <i key={`${item}-${index}`}>
              <span>{renderKeywordHighlights(item)}</span>
            </i>
          ))}
        </div>
      </section>
    </div>
  );
}

function ThreeStepChecklistCard({ clip, progress, exitProgress }: EffectProps) {
  const entry = easeOutCubic(progress / 0.24);
  const headerEntry = easeOutCubic((progress - 0.04) / 0.22);
  const lines = splitLines(clip.text);
  const title = lines[0] || "哪几步是 AI 干的？";
  const subtitle = lines[1] || clip.params.subtitle || "回到问题 / 看完整流程";
  const fallbackSteps = [
    "创意|想法 / 大纲 / 分镜",
    "资产|素材 / 模板 / 数据",
    "成片|生成 / 合成 / 审核",
  ];
  const stepSources = lines.slice(2, 5);
  const steps = Array.from({ length: 3 }, (_, index) => {
    const source = stepSources[index] || fallbackSteps[index];
    const parts = source.split(/[|｜]/).map((part) => part.trim()).filter(Boolean);
    return {
      title: parts[0] || `步骤 ${index + 1}`,
      tags: parts.slice(1).length ? parts.slice(1) : ["待补充"],
    };
  });
  return (
    <div
      className="three-step-checklist-card"
      style={
        {
          "--accent": clip.params.accent,
          opacity: entry * (1 - exitProgress),
          transform: `translate3d(${(1 - entry) * -26}px, 0, 0)`,
        } as CSSProperties
      }
    >
      <header className="three-step-checklist-head" style={{ opacity: headerEntry }}>
        <i />
        <div>
          <span>{renderKeywordHighlights(clip.params.kicker || "BACK TO THE QUESTION")}</span>
          <h2>{renderKeywordHighlights(title)}</h2>
          <p>{renderKeywordHighlights(subtitle)}</p>
        </div>
      </header>
      <div className="three-step-checklist-list">
        {steps.map((step, index) => {
          const itemEntry = easeOutCubic((progress - 0.16 - index * 0.1) / 0.25);
          return (
            <article
              key={`${step.title}-${index}`}
              style={{
                opacity: itemEntry,
                transform: `translateY(${(1 - itemEntry) * 18}px)`,
              }}
            >
              <b>{String(index + 1).padStart(2, "0")}</b>
              <strong>{renderKeywordHighlights(step.title)}</strong>
              <div>
                {step.tags.slice(0, 3).map((tag) => (
                  <span key={tag}>{renderKeywordHighlights(tag)}</span>
                ))}
              </div>
              <i className="three-step-checklist-check" aria-hidden="true">✓</i>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function DualMetricRulerCard({ clip, progress, exitProgress }: EffectProps) {
  const entry = easeOutCubic(progress / 0.24);
  const lines = splitLines(clip.text);
  const title = lines[0] || "一整条生产链";
  const subtitle = clip.params.subtitle || "双轨数据 / 量级标尺";
  const fallbackRows = [
    "上回 · 方案 A|结果 A|22",
    "这回 · 方案 B|结果 B|82",
  ];
  const rowSources = lines.slice(1, 3);
  const rows = Array.from({ length: 2 }, (_, index) => {
    const source = rowSources[index] || fallbackRows[index];
    const parts = source.split(/[|｜]/).map((part) => part.trim()).filter(Boolean);
    const progressValue = Number.parseFloat(parts[2] || "");
    return {
      label: parts[0] || `数据轨道 ${index + 1}`,
      value: parts[1] || `结果 ${index + 1}`,
      progress: Number.isFinite(progressValue) ? clamp(progressValue, 8, 94) : index ? 82 : 22,
    };
  });
  const ticks = ["10万", "100万", "1,000万", "1亿", "10亿"];
  return (
    <div
      className="dual-metric-ruler-card"
      style={
        {
          "--accent": clip.params.accent,
          opacity: entry * (1 - exitProgress),
          transform: `translate3d(0, ${(1 - entry) * 18}px, 0)`,
        } as CSSProperties
      }
    >
      <header className="dual-metric-ruler-head">
        <i />
        <span>{renderKeywordHighlights(clip.params.kicker || "THIS TIME · A WHOLE PRODUCTION LINE")}</span>
        <h2>{renderKeywordHighlights(title)}</h2>
      </header>
      <div className="dual-metric-ruler-list">
        {rows.map((row, index) => {
          const rowEntry = easeOutCubic((progress - 0.12 - index * 0.13) / 0.3);
          return (
            <article key={`${row.label}-${index}`} style={{ opacity: rowEntry }}>
              <div className="dual-metric-ruler-meta">
                <strong>{renderKeywordHighlights(row.label)}</strong>
                <b>{renderKeywordHighlights(row.value)}</b>
              </div>
              <div className="dual-metric-ruler-track">
                <i style={{ transform: `scaleX(${(row.progress / 100) * rowEntry})` }} />
                <em style={{ left: `${row.progress}%`, opacity: rowEntry }} />
              </div>
              {index === 1 ? (
                <div className="dual-metric-ruler-ticks">
                  {ticks.map((tick) => <span key={tick}>{tick}</span>)}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
      <p>{renderKeywordHighlights(subtitle)}</p>
    </div>
  );
}

function TaskModuleBreakdownCard({ clip, progress, exitProgress }: EffectProps) {
  const entry = easeOutCubic(progress / 0.22);
  const lines = splitLines(clip.text);
  const inlineBreakdown = (lines[0] || "").match(
    /^(.+?)(?:包括|包含|分为|由)(.+?)(?:组成|构成)?[。！？]?$/,
  );
  const inlineItems = inlineBreakdown
    ? inlineBreakdown[2]
        .replace(/(?:等)?[两三四五2-5]个?(?:部分|模块|板块|环节|交付项)$/u, "")
        .split(/[、,，；;]|以及|和|与/u)
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 5)
    : [];
  const title = inlineBreakdown?.[1]?.trim() || lines[0] || "内容生产系统";
  const subtitle =
    (lines.length >= 2 ? lines[1] : "") ||
    clip.params.subtitle ||
    "CONTENT PRODUCTION SYSTEM";
  const fallbackItems = ["实拍素材", "多视图资产", "肖像风险控制"];
  const suppliedItems = lines.slice(2, 7);
  const items =
    suppliedItems.length >= 2
      ? suppliedItems
      : inlineItems.length >= 2
        ? inlineItems
        : fallbackItems;
  const icons = [Camera, SquaresFour, ShieldCheck, Stack, CheckCircle];

  return (
    <div
      className={`task-module-breakdown-card task-module-breakdown-count-${items.length}`}
      style={
        {
          "--accent": clip.params.accent,
          opacity: entry * (1 - exitProgress),
          transform: `translate3d(${(1 - entry) * -28}px, 0, 0)`,
        } as CSSProperties
      }
    >
      <header className="task-module-breakdown-head">
        <h2>{renderKeywordHighlights(title)}</h2>
        <p>{renderKeywordHighlights(subtitle)}</p>
      </header>
      <div
        className="task-module-breakdown-kicker"
        style={{
          opacity: easeOutCubic((progress - 0.08) / 0.2),
          transform: `translateX(${(1 - easeOutCubic((progress - 0.08) / 0.2)) * -18}px)`,
        }}
      >
        <i />
        <span>{renderKeywordHighlights(clip.params.kicker || "ROLE ASSETS · BRIEF")}</span>
        <i />
      </div>
      <div className="task-module-breakdown-list">
        {items.map((item, index) => {
          const itemEntry = easeOutCubic((progress - 0.16 - index * 0.08) / 0.24);
          const Icon = icons[index % icons.length];
          return (
            <article
              key={`${item}-${index}`}
              style={{
                opacity: itemEntry,
                transform: `translateX(${(1 - itemEntry) * -42}px)`,
              }}
            >
              <span className="task-module-breakdown-icon" aria-hidden="true">
                <Icon weight="bold" />
              </span>
              <strong>{renderKeywordHighlights(item)}</strong>
              <em>{String(index + 1).padStart(2, "0")}</em>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function LargeNumberDotMatrixCard({ clip, progress, exitProgress }: EffectProps) {
  const lines = splitLines(clip.text);
  const rawNumber = lines[0] || "30,000";
  const numberMatch = rawNumber.match(/[-+]?\d[\d,]*(?:\.\d+)?/);
  const numericTarget = Number.parseFloat((numberMatch?.[0] || "30000").replace(/,/g, ""));
  const decimals = numberMatch?.[0].split(".")[1]?.length || 0;
  const countEntry = easeOutCubic(clamp((progress - 0.04) / 0.44, 0, 1));
  const currentValue = Number.isFinite(numericTarget)
    ? numericTarget * countEntry
    : 30000 * countEntry;
  const formattedValue = currentValue.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  const numberPrefix = numberMatch
    ? rawNumber.slice(0, numberMatch.index).match(/[$¥￥]$/)?.[0] || ""
    : "";
  const numberTail = numberMatch
    ? rawNumber.slice((numberMatch.index || 0) + numberMatch[0].length)
    : "";
  const inferredUnit =
    numberTail.match(
      /^(?:万|亿)?(?:套|个|张|家|次|条|位|元|块|人|份|页|篇|用户|素材|资产)?\+?/,
    )?.[0] || "";
  const unit = lines[1] || inferredUnit || "套";
  const subtitle = lines[2] || clip.params.subtitle || "VERIFIED SCALE";
  const tags = lines.slice(3, 5).length
    ? lines.slice(3, 5)
    : ["角色资产", "场景资产"];
  const cardEntry = easeOutCubic(progress / 0.22);
  const dotEntry = easeOutCubic(clamp((progress - 0.2) / 0.48, 0, 1));
  const dots = Array.from({ length: 84 }, (_, index) => index);

  return (
    <div
      className="large-number-dot-matrix-card"
      style={
        {
          "--accent": clip.params.accent,
          opacity: cardEntry * (1 - exitProgress),
          transform: `translate3d(${(1 - cardEntry) * -34}px, 0, 0)`,
        } as CSSProperties
      }
    >
      <header className="large-number-dot-matrix-value">
        <strong>
          {numberPrefix}
          {formattedValue}
        </strong>
        <b>{unit}</b>
      </header>
      <div className="large-number-dot-matrix-rule" />
      <p>{renderKeywordHighlights(subtitle)}</p>
      <div className="large-number-dot-matrix-grid" aria-hidden="true">
        {dots.map((dot) => {
          const lit = dot < Math.round(dots.length * dotEntry);
          return (
            <i
              className={lit ? "is-lit" : ""}
              key={dot}
              style={{ opacity: lit ? 1 : 0.16 }}
            />
          );
        })}
      </div>
      <footer>
        {tags.map((tag, index) => (
          <span
            key={`${tag}-${index}`}
            style={{
              opacity: easeOutCubic((progress - 0.54 - index * 0.08) / 0.2),
              transform: `translateY(${(1 - easeOutCubic((progress - 0.54 - index * 0.08) / 0.2)) * 12}px)`,
            }}
          >
            <SquaresFour weight="bold" aria-hidden="true" />
            {renderKeywordHighlights(tag)}
          </span>
        ))}
      </footer>
    </div>
  );
}

function MultiStepToolchainCard({ clip, progress, exitProgress }: EffectProps) {
  const lines = splitLines(clip.text);
  const inlineSteps = (lines[0] || "")
    .replace(/^.*?(?:包括|包含|分为|依次是|流程是)/u, "")
    .replace(/(?:等)?[三四五六3-6]个?(?:步骤|环节|流程|部分)$/u, "")
    .split(/[、，,→]/u)
    .map((item) => item.trim())
    .filter(Boolean);
  const fallbackSteps = ["脚本", "图片", "视频", "配音", "剪辑"];
  const stepSources =
    lines.length >= 3
      ? lines.slice(0, 6)
      : inlineSteps.length >= 3
        ? inlineSteps.slice(0, 6)
        : fallbackSteps;
  const icons = [FileText, ImageSquare, VideoCamera, Microphone, Scissors, Stack];
  const entry = easeOutCubic(progress / 0.22);

  return (
    <div
      className={`multi-step-toolchain-card multi-step-toolchain-count-${stepSources.length}`}
      style={
        {
          "--accent": clip.params.accent,
          opacity: entry * (1 - exitProgress),
          transform: `translate3d(${(1 - entry) * -30}px, 0, 0)`,
        } as CSSProperties
      }
    >
      <header>
        <i />
        <span>{renderKeywordHighlights(clip.params.kicker || "MY WORKFLOW")}</span>
        <i />
      </header>
      <div className="multi-step-toolchain-list">
        {stepSources.map((source, index) => {
          const [title = `步骤 ${index + 1}`, meta = ""] = source
            .split(/[|｜]/)
            .map((part) => part.trim());
          const itemEntry = easeOutCubic((progress - 0.12 - index * 0.09) / 0.24);
          const Icon = icons[index % icons.length];
          return (
            <article key={`${title}-${index}`}>
              <div
                className="multi-step-toolchain-node"
                style={{
                  opacity: itemEntry,
                  transform: `scale(${0.82 + itemEntry * 0.18})`,
                }}
              >
                <Icon weight="regular" aria-hidden="true" />
              </div>
              <div
                className="multi-step-toolchain-copy"
                style={{
                  opacity: itemEntry,
                  transform: `translateX(${(1 - itemEntry) * -18}px)`,
                }}
              >
                <strong>{renderKeywordHighlights(title)}</strong>
                {meta ? <span>{renderKeywordHighlights(meta)}</span> : null}
              </div>
              {index < stepSources.length - 1 ? (
                <div className="multi-step-toolchain-link" aria-hidden="true">
                  <ArrowsDownUp weight="bold" style={{ opacity: itemEntry }} />
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}

function KeyPhraseHighlightCard({ clip, progress, exitProgress }: EffectProps) {
  const promptPattern =
    /^(?:.*?)(?:最重要的是|真正重要的是|重点是|关键是|核心是|记住|也就是说)[：:，,\s]*/u;
  const sourceLines = splitLines(clip.text);
  const explicitItems = sourceLines
    .map((line) => line.replace(promptPattern, "").trim())
    .filter(Boolean);
  const firstLine = explicitItems[0] || "一句话重点";
  const inferredItems = firstLine
    .split(/[、，,]/u)
    .map((item) => item.trim())
    .filter(Boolean);
  const itemSources =
    explicitItems.length > 1
      ? explicitItems.slice(0, 3)
      : inferredItems.length >= 2 && inferredItems.length <= 3
        ? inferredItems
        : [firstLine];
  const icons = [Wrench, Robot, ChartBar];
  const widthClasses = ["is-medium", "is-wide", "is-compact"];
  const cardEntry = easeOutCubic(progress / 0.22);

  return (
    <div
      className={`key-phrase-highlight-card key-phrase-highlight-count-${itemSources.length}`}
      style={
        {
          "--accent": clip.params.accent,
          opacity: cardEntry * (1 - exitProgress),
          transform: `translate3d(${(1 - cardEntry) * -34}px, 0, 0)`,
        } as CSSProperties
      }
    >
      <div className="key-phrase-highlight-list">
        {itemSources.map((source, index) => {
          const [title = `重点 ${index + 1}`, meta = ""] = source
            .split(/[|｜]/u)
            .map((part) => part.trim());
          const itemEntry = easeOutCubic(
            clamp((progress - 0.08 - index * 0.13) / 0.28, 0, 1),
          );
          const iconEntry = easeOutCubic(
            clamp((progress - 0.18 - index * 0.13) / 0.2, 0, 1),
          );
          const metaEntry = easeOutCubic(
            clamp((progress - 0.26 - index * 0.13) / 0.2, 0, 1),
          );
          const Icon = icons[index % icons.length];
          const fallbackMeta =
            itemSources.length === 1
              ? clip.params.subtitle || clip.params.kicker || "KEY POINT"
              : clip.params.kicker || "KEY POINT";

          return (
            <article
              className={`key-phrase-highlight-item ${widthClasses[index]}`}
              key={`${title}-${index}`}
              style={{
                opacity: itemEntry,
                transform: `translate3d(${(1 - itemEntry) * -42}px, 0, 0) scale(${0.96 + itemEntry * 0.04})`,
              }}
            >
              <div
                className="key-phrase-highlight-icon"
                style={{
                  opacity: iconEntry,
                  transform: `scale(${0.72 + iconEntry * 0.28})`,
                }}
              >
                <Icon weight="regular" aria-hidden="true" />
              </div>
              <div className="key-phrase-highlight-copy">
                <strong>{renderKeywordHighlights(title)}</strong>
                <span style={{ opacity: metaEntry }}>
                  {renderKeywordHighlights(meta || fallbackMeta)}
                </span>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function WorkflowActionListCard({ clip, progress, exitProgress }: EffectProps) {
  const entry = easeOutCubic(progress / 0.24);
  const lines = splitLines(clip.text);
  const fallbackItems = [
    "拆解工作流|OPEN THE WORKFLOW",
    "丢一个想法|DROP ONE IDEA",
    "评论区反馈|TELL ME IN COMMENTS",
  ];
  const itemSources = lines.length >= 3 ? lines.slice(0, 3) : fallbackItems;
  const icons = [MagnifyingGlass, Lightbulb, ChatCircle];
  return (
    <div
      className="workflow-action-list-card"
      style={
        {
          "--accent": clip.params.accent,
          opacity: entry * (1 - exitProgress),
          transform: `translate3d(${(1 - entry) * -22}px, 0, 0)`,
        } as CSSProperties
      }
    >
      {itemSources.slice(0, 3).map((source, index) => {
        const parts = source.split(/[|｜]/).map((part) => part.trim()).filter(Boolean);
        const itemEntry = easeOutCubic((progress - index * 0.13) / 0.28);
        const Icon = icons[index];
        return (
          <article
            key={`${source}-${index}`}
            style={{ opacity: itemEntry, transform: `translateY(${(1 - itemEntry) * 18}px)` }}
          >
            <div className="workflow-action-list-icon"><Icon weight="regular" /></div>
            <div>
              <strong>{renderKeywordHighlights(parts[0] || `行动 ${index + 1}`)}</strong>
              <span>{renderKeywordHighlights(parts[1] || "ACTION / NEXT")}</span>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function AmberReplicateFlow({ clip, progress, exitProgress }: EffectProps) {
  const entry = easeOutCubic(progress / 0.26);
  const headlineEntry = easeOutCubic((progress - 0.06) / 0.2);
  const pillEntry = easeOutCubic((progress - 0.18) / 0.2);
  const iconEntry = easeOutCubic((progress - 0.28) / 0.34);
  const lines = splitLines(clip.text);
  const number = lines[0]?.match(/\d+/)?.[0] || "01";
  const eyebrow = clip.params.kicker || lines[1] || "FULL CONTROL";
  const headlineSource = lines[2] || lines[0] || "所有动效 · 你自己";
  const [headlineMain = "所有动效", headlineAccent = "你自己"] =
    headlineSource
      .replace(/^[\d\s.、-]+/, "")
      .split(/[·|｜]/)
      .map((part) => part.trim())
      .filter(Boolean);
  const pill = lines[3] || clip.params.subtitle || "每一张动效卡";
  const controlLabels = [
    lines[4] || "位置",
    lines[5] || "大小",
    lines[6] || "颜色",
    lines[7] || "字体",
    lines[8] || "快慢",
  ];

  return (
    <div
      className="amber-replicate-flow"
      style={
        {
          "--accent": clip.params.accent,
          opacity: entry * (1 - exitProgress),
          transform: `translate3d(${(1 - entry) * -28}px, ${(1 - entry) * 10}px, 0)`,
        } as CSSProperties
      }
    >
      <div className="amber-control-hero">
        <strong
          className="amber-control-index"
          style={{
            transform: `translate3d(${(1 - entry) * -22}px, 0, 0) scale(${0.92 + entry * 0.08})`,
          }}
        >
          {number.padStart(2, "0")}
        </strong>
        <div
          className="amber-control-headline"
          style={{
            opacity: headlineEntry,
            transform: `translate3d(${(1 - headlineEntry) * 18}px, 0, 0)`,
          }}
        >
          <span>{renderKeywordHighlights(eyebrow)}</span>
          <h2>
            {renderKeywordHighlights(headlineMain)}
            <i>·</i>
            <em>{renderKeywordHighlights(headlineAccent)}</em>
          </h2>
        </div>
      </div>
      <div
        className="amber-control-pill"
        style={{
          opacity: pillEntry,
          transform: `translate3d(${(1 - pillEntry) * -18}px, 0, 0) scaleX(${0.96 + pillEntry * 0.04})`,
        }}
      >
        <i className="amber-dot-grid" />
        <b>{renderKeywordHighlights(pill)}</b>
      </div>
      <div className="amber-control-icon-row" style={{ opacity: iconEntry }}>
        {controlLabels.map((label, index) => {
          const itemEntry = easeOutCubic((progress - 0.28 - index * 0.055) / 0.22);
          return (
            <div
              className="amber-control-icon-item"
              key={`${label}-${index}`}
              style={{
                transform: `translateY(${(1 - itemEntry) * 16}px)`,
                opacity: itemEntry,
              }}
            >
              <i className={`amber-control-symbol symbol-${index}`} />
              <span>{renderKeywordHighlights(label)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AmberLibraryGrid({ clip, progress, exitProgress }: EffectProps) {
  const entry = easeOutCubic(progress / 0.28);
  const chainEntry = easeOutCubic((progress - 0.04) / 0.22);
  const libraryEntry = easeOutCubic((progress - 0.22) / 0.24);
  const lines = splitLines(clip.text);
  const title = lines[0] || "沉淀进你的素材库";
  const chainLabels = (lines.length >= 4 ? lines.slice(1, 4) : [])
    .map((line) => splitEditablePair(line).main)
    .filter(Boolean);
  const labels = chainLabels.length >= 3
    ? chainLabels
    : ["在别人视频里看到", "扔给大模型", "几分钟复刻"];
  const rawKicker = clip.params.kicker || "REPLICATE · 看到好的就复制进来";
  const [kickerMain, kickerNote = "看到好的就复制进来"] = rawKicker
    .split(/[·|]/)
    .map((part) => part.trim());
  const libraryLabel = clip.params.subtitle || "YOUR LIBRARY";
  const icons = [MagnifyingGlass, Brain, ArrowClockwise];
  const filledCells = clamp(Math.round((clip.params.intensity / 100) * 12), 3, 10);
  return (
    <div
      className="amber-library-grid"
      style={
        {
          "--accent": clip.params.accent,
          opacity: entry * (1 - exitProgress),
          transform: `translate3d(0, ${(1 - entry) * 16}px, 0)`,
        } as CSSProperties
      }
    >
      <div className="amber-library-kicker" style={{ opacity: chainEntry }}>
        <i />
        <strong>{renderKeywordHighlights(kickerMain || "REPLICATE")}</strong>
        <span>{renderKeywordHighlights(kickerNote)}</span>
      </div>
      <div className="amber-library-chain">
        {labels.map((label, index) => {
          const Icon = icons[index] || MagnifyingGlass;
          const nodeEntry = easeOutCubic((progress - 0.1 - index * 0.1) / 0.22);
          const lineEntry = easeOutCubic((progress - 0.18 - index * 0.1) / 0.2);
          return (
            <div
              className="amber-library-chain__group"
              key={`${label}-${index}`}
              style={{ opacity: nodeEntry } as CSSProperties}
            >
              <div className="amber-library-chain__node">
                <Icon weight="regular" />
              </div>
              {index < labels.length - 1 ? (
                <i
                  className="amber-library-chain__line"
                  style={{ transform: `scaleX(${lineEntry})` }}
                />
              ) : null}
              <b>{renderKeywordHighlights(label)}</b>
            </div>
          );
        })}
      </div>
      <div className="amber-library-title" style={{ opacity: libraryEntry }}>
        <strong>{renderKeywordHighlights(title)}</strong>
        <span>{renderKeywordHighlights(libraryLabel)}</span>
      </div>
      <div className="amber-grid-cells">
        {Array.from({ length: 12 }, (_, index) => {
          const cellEntry = easeOutCubic((progress - 0.32 - index * 0.035) / 0.2);
          const isFilled = index < filledCells;
          return (
            <i
              className={isFilled ? "is-filled" : "is-empty"}
              key={index}
              style={
                {
                  opacity: 0.34 + cellEntry * 0.66,
                  transform: `translateY(${(1 - cellEntry) * 10}px) scale(${0.96 + cellEntry * 0.04})`,
                } as CSSProperties
              }
            />
          );
        })}
      </div>
    </div>
  );
}

function SplitEvidenceLayout({
  clip,
  progress,
  exitProgress,
  currentTime = 0,
  isPlaying = false,
  primaryVideoUrl,
  secondaryVideoUrl,
  secondaryVideoName,
}: EffectProps) {
  const secondaryVideoRef = useRef<HTMLVideoElement | null>(null);
  const primaryVideoRef = useRef<HTMLVideoElement | null>(null);
  const entry = easeOutCubic(progress / 0.28);
  const copyEntry = easeOutCubic((progress - 0.03) / 0.22);
  const materialEntry = easeOutCubic((progress - 0.08) / 0.28);
  const subjectEntry = easeOutCubic((progress - 0.12) / 0.24);
  const lines = splitLines(clip.text);
  const pageTitle = lines[0] || "体验账单：钱去哪了";
  const cardTitle = lines[1] || "真正拿到手的内容";
  const percentText =
    lines.join(" ").match(/\d+(?:\.\d+)?\s*[%％]/)?.[0].replace("％", "%") ||
    "17%";
  const conclusion = lines[2] || `只占不到 ${percentText}`;
  const chips = splitPipeOrLine(clip.params.subtitle)
    .filter((item) => item !== conclusion)
    .slice(0, 3);
  const metaChips = chips.length
    ? chips
    : ["以 Claude Code 为例", "账单拆解", "材料视图"];
  const numericValues = extractNumbers(clip.text);
  const rawSegments = numericValues.length >= 3 ? numericValues.slice(0, 4) : [58.8, 24.2, 16.2, 0.8];
  const total = rawSegments.reduce((sum, value) => sum + Math.max(value, 0), 0) || 100;
  const segments = rawSegments.map((value, index) => ({
    value,
    width: clamp((value / total) * 100, 4, 72),
    label: [`反复读取`, `新内容写入`, `真正拿到手`, `新增`][index] || `材料 ${index + 1}`,
  }));
  const hasDualVideo = Boolean(primaryVideoUrl && secondaryVideoUrl);

  useEffect(() => {
    [primaryVideoRef.current, secondaryVideoRef.current].forEach((video) => {
      if (!video) return;
      if (video.readyState >= 1 && Number.isFinite(video.duration)) {
        const target = clamp(currentTime, 0, Math.max(0, video.duration - 0.05));
        if (Math.abs(video.currentTime - target) > 0.12) video.currentTime = target;
      }
      if (isPlaying) void video.play().catch(() => {});
      else video.pause();
    });
  }, [currentTime, isPlaying, primaryVideoUrl, secondaryVideoUrl]);

  return (
    <div
      className={`split-evidence-layout${hasDualVideo ? " is-dual-video" : ""}${clip.params.splitLayout === "stacked" ? " is-stacked" : ""}${clip.params.splitType ? ` is-${clip.params.splitType}` : ""}`}
      style={
        {
          "--accent": clip.params.accent,
          "--split-ratio": `${clip.params.splitRatio || 52}%`,
          opacity: entry * (1 - exitProgress),
          transform: `translate3d(0, ${(1 - entry) * 18}px, 0) scale(${0.985 + entry * 0.015})`,
        } as CSSProperties
      }
    >
      <div className="split-evidence-panels">
        <div
          className="split-evidence-left"
          style={{
            opacity: copyEntry,
            transform: `translate3d(${(1 - copyEntry) * -20}px, 0, 0)`,
          }}
        >
          <div className="split-evidence-copy">
            <span>{renderKeywordHighlights(clip.params.kicker || "THE BILL")}</span>
            <h2>{renderKeywordHighlights(pageTitle)}</h2>
            <em>
              <i />
              {renderKeywordHighlights(metaChips[0])}
            </em>
          </div>
          <section
            className="split-evidence-pane split-evidence-pane--subject"
            style={{ opacity: subjectEntry }}
          >
            <div className="split-subject-window">
              {hasDualVideo ? (
                <video
                  className="split-video"
                  ref={primaryVideoRef}
                  src={primaryVideoUrl}
                  muted
                  playsInline
                  autoPlay={isPlaying}
                  preload="auto"
                  aria-label="人物视频"
                />
              ) : null}
              {hasDualVideo ? <span className="split-video-label">人物讲解</span> : null}
              <div className="split-subject-corners" />
              <div className="split-subject-sheen" />
            </div>
          </section>
        </div>
        <article
          className={`split-evidence-pane split-evidence-pane--material${hasDualVideo ? " split-evidence-pane--demo" : ""}`}
          style={{ opacity: materialEntry }}
        >
          <div className="split-pane-head">
            <span>
              <i />
              {clip.params.splitType === "web-demo"
                ? "WEB DEMO · 网页演示"
                : clip.params.splitType === "ai-animation"
                  ? "AI MOTION · 动画演示"
                  : "COST · 材料演示"}
            </span>
            <b>{renderKeywordHighlights(cardTitle)}</b>
            <strong>{renderKeywordHighlights(conclusion)}</strong>
          </div>
          {hasDualVideo ? (
            <div className="split-material-window split-demo-window">
              <video
                ref={secondaryVideoRef}
                className="split-video"
                src={secondaryVideoUrl}
                muted
                playsInline
                preload="auto"
                aria-label={secondaryVideoName || "演示视频"}
              />
              <span className="split-video-label">{secondaryVideoName || (clip.params.splitType === "web-demo" ? "网页演示画面" : clip.params.splitType === "ai-animation" ? "AI 动画画面" : "演示画面")}</span>
              <div className="split-demo-corners" />
            </div>
          ) : <div className="split-material-window">
            <div className="split-material-title">上下文相关合计 / 结构占比</div>
            <div className="split-material-stack">
              {segments.map((segment, index) => {
                const segEntry = easeOutCubic((progress - 0.18 - index * 0.07) / 0.2);
                return (
                  <i
                    key={`${segment.label}-${index}`}
                    style={
                      {
                        width: `${segment.width}%`,
                        transform: `scaleX(${segEntry})`,
                      } as CSSProperties
                    }
                  >
                    <b>{segment.value.toFixed(segment.value % 1 ? 1 : 0)}%</b>
                  </i>
                );
              })}
            </div>
            <div className="split-material-legend">
              {segments.map((segment, index) => (
                <span key={`${segment.label}-legend-${index}`}>
                  <i />
                  {segment.label} {segment.value.toFixed(segment.value % 1 ? 1 : 0)}%
                </span>
              ))}
            </div>
            <div className="split-material-play" aria-hidden="true">
              <i />
            </div>
          </div>}
        </article>
        <div className="split-evidence-connector" aria-hidden="true">
          <i style={{ transform: `scaleX(${easeOutCubic((progress - 0.2) / 0.26)})` }} />
          <b>PLAY</b>
        </div>
      </div>
    </div>
  );
}

function ProjectComparisonCard({ clip, progress, exitProgress }: EffectProps) {
  const entry = easeOutCubic(progress / 0.26);
  const lines = splitLines(clip.text);
  // The first line is the card headline when five or more lines are supplied.
  // Do not feed it into the 2x2 grid as a fifth piece of project data.
  const cardLines = lines.length >= 5 ? lines.slice(1, 5) : lines;
  const cards = Array.from({ length: 4 }, (_, index) => {
    const line = cardLines[index] || `项目 ${String.fromCharCode(65 + index)} | 说明 | 一句判断 | ${92 - index * 6}`;
    const parts = line.split("|").map((part) => part.trim());
    const title = parts[0] || `项目 ${String.fromCharCode(65 + index)}`;
    const meta = parts[1] || "对比项";
    const note = parts[2] || parts[1] || "一句判断";
    const scoreText = parts[3] || parts[parts.length - 1] || `${92 - index * 6}`;
    const detail = parts[4] || "";
    const score = Number.parseFloat(scoreText) || 92 - index * 6;
    const isPrimary = index === 0;
    return { title, meta, note, detail, score, isPrimary, index };
  });
  const activeIndex = Math.min(
    cards.length - 1,
    Math.floor(clamp(progress, 0, 1) * cards.length),
  );
  return (
    <div
      className="project-comparison-card"
      style={
        {
          "--accent": clip.params.accent,
          opacity: entry * (1 - exitProgress),
          transform: `translate3d(0, ${(1 - entry) * 16}px, 0)`,
        } as CSSProperties
      }
    >
      <div className="project-comparison-header">
        <span>{renderKeywordHighlights(clip.params.kicker || "PROJECT MATRIX")}</span>
        <strong>{renderKeywordHighlights(clip.text.split("\n")[0] || clip.label)}</strong>
        <p>{renderKeywordHighlights(clip.params.subtitle || "")}</p>
      </div>
      <div className="project-comparison-grid">
        <div className="project-comparison-halo" aria-hidden="true" />
        {cards.map((card) => {
          const progressValue = easeOutCubic(
            (progress - 0.06 - card.index * 0.04) / 0.18,
          );
          return (
            <article
              key={card.index}
              className={`project-card project-card--${card.index} ${card.isPrimary ? "is-primary" : ""} ${card.index === activeIndex ? "is-active" : ""}`}
              style={
                {
                  opacity: progressValue * (1 - exitProgress * 0.6),
                  transform: `translateY(${(1 - progressValue) * 12}px)`,
                } as CSSProperties
              }
            >
              <div className="project-card-topline">
                <strong>{renderKeywordHighlights(card.title)}</strong>
                <b>{String(card.index + 1).padStart(2, "0")}</b>
              </div>
              <span>
                <i />
                {renderKeywordHighlights(card.meta)}
              </span>
              <div className="project-card-title">
                {renderKeywordHighlights(card.note)}
              </div>
              <p>
                {renderKeywordHighlights(card.detail || "可替换为真实判断")}
              </p>
              <div className="project-card-meter">
                <i style={{ transform: `scaleX(${clamp(card.score / 100, 0.12, 1)})` }} />
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function TimelineProgressBar({ clip, progress, exitProgress }: EffectProps) {
  const entry = 1;
  const fill = easeInOut(clamp(progress, 0, 1));
  const labels = splitLines(clip.text).slice(0, 5);
  const steps =
    labels.length >= 2
      ? labels
      : ["导入素材", "提取重点", "添加动效", "导出透明"];
  const activeIndex = Math.min(
    steps.length - 1,
    Math.floor(fill * steps.length),
  );
  const currentSeconds = fill * clip.duration;
  const timecode = `${formatClock(currentSeconds)} / ${formatClock(clip.duration)}`;
  return (
    <div
      className="timeline-progress-bar"
      style={
        {
          "--accent": clip.params.accent,
          "--timeline-fill": fill,
          opacity: entry * (1 - exitProgress),
          transform: "translateY(0)",
        } as CSSProperties
      }
    >
      <div className="timeline-progress-head">
        <span>
          {renderKeywordHighlights(clip.params.kicker || "TIMELINE · ACTIVE")}
        </span>
        <b>{timecode}</b>
      </div>
      <div className="timeline-progress-track">
        <i
          className="timeline-progress-fill"
          style={{ transform: `scaleX(${fill})` }}
        />
        <i
          className="timeline-progress-cursor"
          style={{ left: `${fill * 100}%` }}
        />
        {steps.map((step, index) => {
          const position = steps.length === 1 ? 0 : index / (steps.length - 1);
          const nodeEntry = 1;
          const isActive = fill >= position || index === activeIndex;
          return (
            <div
              className={`timeline-progress-node ${isActive ? "is-active" : ""}`}
              key={`${step}-${index}`}
              style={{
                left: `${position * 100}%`,
                opacity: nodeEntry,
                transform: `translateX(-50%) scale(${0.82 + nodeEntry * 0.18})`,
              }}
            >
              <b>{String(index + 1).padStart(2, "0")}</b>
              <span>{renderKeywordHighlights(step)}</span>
            </div>
          );
        })}
      </div>
      <p>
        {renderKeywordHighlights(
          clip.params.subtitle || "跟随当前片段播放进度",
        )}
      </p>
    </div>
  );
}

function OdometerDigitRoll({ clip, progress, exitProgress }: EffectProps) {
  const entry = easeOutCubic(progress / 0.3);
  const titleEntry = easeOutCubic((progress - 0.04) / 0.22);
  const valueEntry = easeOutCubic((progress - 0.1) / 0.3);
  const barsEntry = easeOutCubic((progress - 0.28) / 0.18);
  const rawValue = extractOdometerValue(clip.text);
  const title = clip.params.kicker || "ODOMETER DIGIT ROLL";
  const chars = Array.from(rawValue);
  const visibleChars = chars.filter(
    (char) => char.trim() || char === "." || char === "%",
  );
  return (
    <div
      className="odometer-digit-roll"
      style={
        {
          "--accent": clip.params.accent,
          opacity: entry * (1 - exitProgress),
          transform: `translateY(${(1 - entry) * 16}px) scale(${0.985 + entry * 0.015})`,
        } as CSSProperties
      }
    >
      <div
        className="odometer-digit-roll__head"
        style={{ opacity: titleEntry }}
      >
        <span>{title}</span>
      </div>
      <div className="odometer-digit-roll__value-wrap">
        <div
          className="odometer-digit-roll__value"
          style={{ opacity: valueEntry }}
        >
          {visibleChars.map((char, index) => {
            if (char === ".") {
              return (
                <span
                  className="odometer-digit-roll__symbol odometer-digit-roll__symbol--dot"
                  key={`dot-${index}`}
                >
                  {char}
                </span>
              );
            }
            if (char === "%") {
              return (
                <span
                  className="odometer-digit-roll__symbol odometer-digit-roll__symbol--percent"
                  key={`percent-${index}`}
                >
                  {char}
                </span>
              );
            }
            const targetDigit = Number.parseInt(char, 10);
            if (Number.isNaN(targetDigit)) {
              return (
                <span className="odometer-digit-roll__symbol" key={`${char}-${index}`}>
                  {char}
                </span>
              );
            }
            const digitProgress = easeOutCubic(
              clamp((progress - 0.08 - index * 0.045) / 0.28, 0, 1),
            );
            const startDigit = (targetDigit + 7 + index) % 10;
            const travel = ((targetDigit - startDigit + 10) % 10) + 20;
            const current = startDigit + digitProgress * travel;
            const digits = Array.from({ length: 40 }, (_, digitIndex) => digitIndex % 10);
            return (
              <span
                className="odometer-digit-roll__reel"
                key={`${char}-${index}`}
              >
                <i style={{ transform: `translateY(${-(current % 40)}em)` }}>
                  {digits.map((digit, digitIndex) => (
                    <b key={`${digit}-${digitIndex}`}>{digit}</b>
                  ))}
                </i>
              </span>
            );
          })}
        </div>
      </div>
      <div className="odometer-digit-roll__bars" style={{ opacity: barsEntry }}>
        <i
          className="odometer-digit-roll__bars-primary"
          style={{ transform: `scaleX(${barsEntry})` }}
        />
        <i
          className="odometer-digit-roll__bars-secondary"
          style={{ transform: `scaleX(${clamp(barsEntry - 0.08, 0, 1)})` }}
        />
      </div>
    </div>
  );
}

function EpisodeCounterCard({ clip, progress, exitProgress }: EffectProps) {
  const entry = easeOutCubic(progress / 0.24);
  const titleEntry = easeOutCubic((progress - 0.03) / 0.18);
  const valueEntry = easeOutCubic((progress - 0.08) / 0.28);
  const footEntry = easeOutCubic((progress - 0.16) / 0.18);
  const lines = splitLines(clip.text);
  const counterValue = extractCounterValue(lines[0] || clip.text || "300,000+");
  const titleLine = lines[1] || "AIGC 全链路 · 那期";
  const footerLine = lines[2] || clip.params.subtitle || "VIEWS · 播放";
  const visualUnits = Array.from(counterValue);
  const counterWidthUnits = visualUnits.reduce((sum, char) => {
    if (/\d/.test(char)) return sum + 0.68;
    if (char === "," || char === ".") return sum + 0.28;
    if (char === "%" || char === "+") return sum + 0.46;
    return sum + 0.6;
  }, 0);
  const counterFontScale = clamp(5.15 / Math.max(counterWidthUnits, 1), 0.72, 1);
  return (
    <div
      className="episode-counter-card"
      style={
        {
          "--accent": clip.params.accent,
          "--counter-font-scale": counterFontScale,
          opacity: entry * (1 - exitProgress),
          transform: `translate3d(0, ${(1 - entry) * 18}px, 0) scale(${0.985 + entry * 0.015})`,
        } as CSSProperties
      }
    >
      <div className="episode-counter-card__head" style={{ opacity: titleEntry }}>
        <span>{renderKeywordHighlights(clip.params.kicker || "LAST EPISODE")}</span>
        <strong>{renderKeywordHighlights(titleLine)}</strong>
      </div>
      <div className="episode-counter-card__value-wrap">
        <div className="episode-counter-card__value" style={{ opacity: valueEntry }}>
          {visualUnits.map((char, index) => {
            if (char === "," ) {
              return (
                <span className="episode-counter-card__symbol" key={`comma-${index}`}>
                  {char}
                </span>
              );
            }
            if (char === "." ) {
              return (
                <span
                  className="episode-counter-card__symbol episode-counter-card__symbol--dot"
                  key={`dot-${index}`}
                >
                  {char}
                </span>
              );
            }
            if (char === "%" || char === "+") {
              return (
                <span
                  className="episode-counter-card__symbol episode-counter-card__symbol--suffix"
                  key={`${char}-${index}`}
                >
                  {char}
                </span>
              );
            }
            const targetDigit = Number.parseInt(char, 10);
            if (Number.isNaN(targetDigit)) {
              return (
                <span className="episode-counter-card__symbol" key={`${char}-${index}`}>
                  {char}
                </span>
              );
            }
            const digitProgress = easeOutCubic(
              clamp((progress - 0.06 - index * 0.038) / 0.28, 0, 1),
            );
            const startDigit = (targetDigit + 6 + index) % 10;
            const travel = ((targetDigit - startDigit + 10) % 10) + 20;
            const current = startDigit + digitProgress * travel;
            const digits = Array.from({ length: 40 }, (_, digitIndex) => digitIndex % 10);
            return (
              <span className="episode-counter-card__reel" key={`${char}-${index}`}>
                <i style={{ transform: `translateY(${-(current % 40)}em)` }}>
                  {digits.map((digit, digitIndex) => (
                    <b key={`${digit}-${digitIndex}`}>{digit}</b>
                  ))}
                </i>
              </span>
            );
          })}
        </div>
      </div>
      <div className="episode-counter-card__foot" style={{ opacity: footEntry }}>
        <span>{renderKeywordHighlights(footerLine)}</span>
        <b>{renderKeywordHighlights(clip.params.subtitle || "Counter / 播放")}</b>
      </div>
    </div>
  );
}

function MetricArrowCard({ clip, progress, exitProgress }: EffectProps) {
  const entry = easeOutCubic(progress / 0.24);
  const heroEntry = easeOutCubic((progress - 0.03) / 0.2);
  const copyEntry = easeOutCubic((progress - 0.1) / 0.18);
  const valuesEntry = easeOutCubic((progress - 0.14) / 0.24);
  const lines = splitLines(clip.text);
  const title = lines[0] || clip.label || "数字箭头卡";
  const subtitle = clip.params.subtitle || lines[1] || "单指标变化 / 上升下降";
  const metricTokens: string[] =
    clip.text.match(/[-+]?\d[\d,]*(?:\.\d+)?\s*(?:万|亿|元|块|%|％)?/g) || [];
  const deltaToken =
    metricTokens.find((token) => /[-+]|%|％/.test(token)) || "-88%";
  const valueTokens = metricTokens.filter((token) => token !== deltaToken);
  const beforeText = valueTokens[0] || "52万";
  const afterText = valueTokens[valueTokens.length - 1] || "6.6万";
  const deltaText = deltaToken;
  const copyLine =
    lines.find((line) => !metricTokens.includes(line) && line !== title) ||
    "关键指标 / 真的有效 / 需要替换真实来源";
  const draw = easeOutCubic((progress - 0.16) / 0.36);
  const arrowPath = "M 18 34 L 86 82 L 146 54 L 218 118 L 282 86 L 354 142";
  const markerId = `metric-arrow-head-${clip.id.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <div
      className="metric-arrow-card"
      style={
        {
          "--accent": clip.params.accent,
          opacity: entry * (1 - exitProgress),
          transform: `translate3d(0, ${(1 - entry) * 18}px, 0)`,
        } as CSSProperties
      }
    >
      <div className="metric-arrow-hero" style={{ opacity: heroEntry }}>
        <b>01</b>
        <div className="metric-arrow-copy">
          <em>{renderKeywordHighlights(clip.params.kicker || "METRIC ARROW")}</em>
          <strong>{renderKeywordHighlights(title)}</strong>
          <small>{renderKeywordHighlights(subtitle)}</small>
        </div>
        <div className="metric-arrow-delta">
          <span>{renderKeywordHighlights("CHANGE")}</span>
          <strong>{renderKeywordHighlights(deltaText)}</strong>
        </div>
      </div>
      <div className="metric-arrow-values" style={{ opacity: valuesEntry }}>
        <div className="metric-arrow-before">
          <span>{renderKeywordHighlights("BEFORE")}</span>
          <strong>{renderKeywordHighlights(beforeText)}</strong>
        </div>
        <svg
          className="metric-arrow-path"
          viewBox="0 0 380 170"
          aria-hidden="true"
        >
          <defs>
            <marker
              id={markerId}
              markerHeight="72"
              markerUnits="userSpaceOnUse"
              markerWidth="72"
              orient="auto"
              refX="60"
              refY="36"
              viewBox="0 0 72 72"
            >
              <path className="metric-arrow-head" d="M 8 8 L 66 36 L 8 64 Z" />
            </marker>
          </defs>
          <path className="metric-arrow-ribbon-shadow" d={arrowPath} />
          <path
            className="metric-arrow-ribbon"
            d={arrowPath}
            markerEnd={`url(#${markerId})`}
            pathLength="1"
            style={{
              strokeDasharray: 1,
              strokeDashoffset: 1 - draw,
            }}
          />
          <path
            className="metric-arrow-ridge"
            d={arrowPath}
            pathLength="1"
            style={{
              strokeDasharray: 1,
              strokeDashoffset: 1 - draw,
            }}
          />
        </svg>
        <div className="metric-arrow-after">
          <span>{renderKeywordHighlights("AFTER")}</span>
          <strong>{renderKeywordHighlights(afterText)}</strong>
        </div>
      </div>
      <p style={{ opacity: copyEntry }}>
        {renderKeywordHighlights(copyLine)}
      </p>
    </div>
  );
}

function FallingWordFieldCard({ clip, progress, exitProgress }: EffectProps) {
  const entry = easeOutCubic(progress / 0.3);
  const lines = splitLines(clip.text);
  const words = lines.length ? lines : [
    "AI", "系统", "流程", "链路", "收入", "播放", "知识图谱", "自动化",
    "内容", "增长", "效率", "方法", "工具", "结果",
  ];
  const placements = [
    { x: 3, y: 6, r: -8, size: 40 },
    { x: 18, y: 20, r: 5, size: 34 },
    { x: 5, y: 38, r: -4, size: 32 },
    { x: 23, y: 51, r: 7, size: 38 },
    { x: 2, y: 70, r: -6, size: 36 },
    { x: 19, y: 82, r: 4, size: 30 },
    { x: 73, y: 7, r: 6, size: 35 },
    { x: 83, y: 19, r: -7, size: 38 },
    { x: 74, y: 34, r: 4, size: 31 },
    { x: 86, y: 49, r: -5, size: 35 },
    { x: 72, y: 64, r: 8, size: 39 },
    { x: 84, y: 79, r: -4, size: 32 },
    { x: 2, y: 92, r: 5, size: 28 },
    { x: 76, y: 92, r: -6, size: 30 },
  ];
  return (
    <div
      className="falling-word-field-card"
      style={{
        "--accent": clip.params.accent,
        opacity: entry * (1 - exitProgress),
      } as CSSProperties}
    >
      <div className="falling-word-field-card__safe-glow" aria-hidden="true" />
      {words.slice(0, placements.length).map((word, index) => {
        const placement = placements[index];
        const itemEntry = easeOutCubic((progress - index * 0.035) / 0.22);
        const drop = (1 - itemEntry) * -120 - (index % 3) * 28;
        return (
          <span
            className={`falling-word-field-card__word word-tone-${index % 3}`}
            key={`${word}-${index}`}
            style={{
              left: `${placement.x}%`,
              top: `${placement.y}%`,
              fontSize: `${placement.size}px`,
              opacity: itemEntry,
              transform: `translate3d(0, ${drop}px, 0) rotate(${placement.r}deg)`,
            }}
          >
            {renderKeywordHighlights(word)}
          </span>
        );
      })}
      <div className="falling-word-field-card__caption">
        <i />
        <span>{clip.params.kicker || "CONCEPT FIELD"}</span>
      </div>
    </div>
  );
}

function InfoBoard({ clip, progress, exitProgress }: EffectProps) {
  const entry = easeOutCubic(progress / 0.28);
  const lines = clip.text.split("\n").filter(Boolean);
  return (
    <div
      className="info-board-card"
      style={
        {
          "--accent": clip.params.accent,
          opacity: entry * (1 - exitProgress),
          transform: `translateY(${(1 - entry) * 24}px) rotateX(${(1 - entry) * 10}deg)`,
        } as CSSProperties
      }
    >
      <div className="board-kicker">{clip.params.kicker}</div>
      <ul>
        {lines.map((line, index) => {
          const itemEntry = easeOutCubic((progress - index * 0.09) / 0.28);
          return (
            <li
              key={`${line}-${index}`}
              style={{
                opacity: itemEntry,
                transform: `translateX(${(1 - itemEntry) * 18}px)`,
              }}
            >
              <b>{String(index + 1).padStart(2, "0")}</b>
              <span>{renderKeywordHighlights(line)}</span>
            </li>
          );
        })}
      </ul>
      <p>{renderKeywordHighlights(clip.params.subtitle || "")}</p>
    </div>
  );
}

function StrikeFlip({ clip, progress, exitProgress }: EffectProps) {
  const [before = clip.text, after = clip.params.subtitle || "换一种做法"] =
    clip.text.split("/").map((part) => part.trim());
  const flip = easeInOut((progress - 0.26) / 0.42);
  const entry = easeOutCubic(progress / 0.22);
  const strike = easeOutCubic((progress - 0.16) / 0.22);
  return (
    <div
      className="strike-flip-card"
      style={
        {
          "--accent": clip.params.accent,
          opacity: entry * (1 - exitProgress),
        } as CSSProperties
      }
    >
      <span>{clip.params.kicker}</span>
      <div className="strike-word">
        <strong
          style={{ transform: `rotateX(${flip * 90}deg)`, opacity: 1 - flip }}
        >
          {renderKeywordHighlights(before)}
        </strong>
        <i style={{ transform: `scaleX(${strike})` }} />
      </div>
      <div
        className="flip-word"
        style={{ transform: `rotateX(${(1 - flip) * -90}deg)`, opacity: flip }}
      >
        {renderKeywordHighlights(after)}
      </div>
    </div>
  );
}
