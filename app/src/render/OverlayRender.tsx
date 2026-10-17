import type { CSSProperties } from "react";
import { stylePresets, stylesById } from "../data/stylePresets";
import type { OverlayProject } from "../types";
import { clamp, easeOutCubic } from "../utils/time";
import {
  anchorFor,
  adaptClipLayout,
  calculateCardScale,
  customCardSizeStyle,
  resolveEffectComponent,
  titlePalette,
} from "../components/PreviewStage";

// Deterministic render-only stage. Mirrors PreviewStage clip math with a fixed
// canvas so headless frame capture matches the workbench preview exactly.

function titleToneFromColor(color: string) {
  const match = /^#?([0-9a-f]{6})$/i.exec(color.trim());
  if (!match) {
    return {
      title: color,
      soft: "rgba(255, 255, 255, 0.72)",
      glow: "rgba(255, 255, 255, 0.16)",
      shadow: "rgba(0, 0, 0, 0.22)",
    };
  }
  const value = Number.parseInt(match[1], 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  const isLight = luminance >= 0.62;
  return {
    title: color,
    soft: isLight ? "rgba(255, 255, 255, 0.72)" : "rgba(17, 24, 39, 0.68)",
    glow: isLight ? "rgba(255, 255, 255, 0.18)" : "rgba(0, 0, 0, 0.14)",
    shadow: "rgba(0, 0, 0, 0.24)",
  };
}

const defaultTitleTone = {
  title: "#eaf7ff",
  soft: "rgba(96, 176, 255, 0.18)",
  glow: "rgba(96, 176, 255, 0.18)",
  shadow: "rgba(0, 0, 0, 0.24)",
};

export function OverlayRender({
  project,
  currentTime,
}: {
  project: OverlayProject;
  currentTime: number;
}) {
  const style = stylesById[project.styleId] || stylePresets[0];
  const { width, height } = project.canvas;
  const titleTone = project.globalTitleColor
    ? titleToneFromColor(project.globalTitleColor)
    : defaultTitleTone;
  const styleVars = {
    "--ink": style.tokens.ink,
    "--muted": style.tokens.muted,
    "--paper": style.tokens.paper,
    "--panel": style.tokens.panel,
    "--line": style.tokens.line,
    "--accent": style.tokens.accent,
    "--accent-soft": style.tokens.accentSoft,
    "--shadow": style.tokens.shadow,
    "--title-ink": titleTone.title,
    "--title-soft": titleTone.soft,
    "--title-glow": titleTone.glow,
    "--title-shadow": titleTone.shadow,
    "--stage-bg": "transparent",
    "--overlay-font-factor": 1,
    "--video-scale": 1,
  } as CSSProperties;

  const visibleClips = project.clips.filter((clip) => {
    // End on the exact clip boundary so semi-transparent exit frames cannot
    // leave a colored halo after the card should be gone in Jianying.
    const clipEnd = clip.start + clip.duration;
    return (
      clip.enabled && currentTime >= clip.start && currentTime < clipEnd
    );
  });

  return (
    <div
      className="studio-app render-root"
      data-stage-mode="bright"
      data-style={style.id}
      data-shell="tech"
      style={styleVars}
    >
      <section
        className="preview-shell render-stage"
        style={{ width, height }}
      >
        {visibleClips.map((clip) => {
          const layoutClip = adaptClipLayout(clip, project.canvas.aspectRatio);
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
          // Transparent exports use a hard cut at clipEnd. A fade leaves
          // colored borders behind when composited by Jianying.
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
          const clipTitleTone = clip.params.titleColor
            ? titlePalette(clip.params.titleColor)
            : null;
          const widthScale = layoutClip.params.widthScale || 1;
          const heightScale = layoutClip.params.heightScale || 1;
          const sizeStyle = customCardSizeStyle(layoutClip, project.canvas.aspectRatio);
          const scale = calculateCardScale(layoutClip, width, height);
          const isCustomSized =
            clip.params.widthScale !== undefined ||
            clip.params.heightScale !== undefined;
          return (
            <div
              className={`effect-hitbox effect-anchor-${anchor} effect-theme-${clip.params.cardTheme || "auto"} effect-panel-${clip.params.panelTone || "none"} ${clip.params.moduleVariant ? `effect-module-${clip.params.moduleVariant}` : ""} ${clip.params.moduleVariant?.startsWith("amber-") ? "effect-module-amber" : ""} ${isCustomSized ? "is-custom-sized" : ""}`}
              key={clip.id}
              style={{
                ...sizeStyle,
                left: `${layoutClip.params.x}%`,
                top: `${layoutClip.params.y}%`,
                "--card-width-scale": widthScale,
                "--card-height-scale": heightScale,
                transform: `${translate} ${slideIn} scale(${scale})`,
                transformOrigin: isTimelineProgress ? "top left" : undefined,
                ...(clipTitleTone
                  ? ({
                      "--title-ink": clipTitleTone.ink,
                      "--title-soft": clipTitleTone.soft,
                      "--title-glow": clipTitleTone.glow,
                      "--title-shadow": clipTitleTone.shadow,
                    } as CSSProperties)
                  : {}),
              } as CSSProperties}
            >
              <Effect
                aspectRatio={project.canvas.aspectRatio}
                clip={clip}
                progress={effectiveLocal}
                exitProgress={exitProgress}
              />
            </div>
          );
        })}
      </section>
    </div>
  );
}
